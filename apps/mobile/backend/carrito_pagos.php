<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'listar';
$data = jread();

// Los administradores no pueden comprar en la plataforma.
if ($user['rol'] === 'admin' && in_array($action, ['agregar', 'checkout'], true)) {
    jout(['ok' => false, 'error' => 'Las cuentas de administrador no pueden realizar compras'], 403);
}

switch ($action) {

    case 'listar':
        $st = db()->prepare(
            "SELECT c.id, c.cantidad, p.id as producto_id, p.nombre, p.precio,
                    p.precio_oferta, p.oferta_hasta,
                    IF(p.precio_oferta IS NOT NULL AND p.precio_oferta > 0 AND (p.oferta_hasta IS NULL OR p.oferta_hasta > NOW()), p.precio_oferta, p.precio) AS precio_efectivo,
                    p.imagen, p.stock, p.estado_stock, p.tienda_id, t.nombre as tienda_nombre, t.vendedor_id
             FROM carrito c JOIN productos p ON p.id = c.producto_id JOIN tiendas t ON t.id = p.tienda_id WHERE c.usuario_id = ?"
        );
        $st->execute([$user['id']]);
        $items = $st->fetchAll();
        $total = 0;
        foreach ($items as $it) $total += $it['precio_efectivo'] * $it['cantidad'];
        jout(['ok' => true, 'items' => $items, 'total' => round($total, 2)]);
        break;

    case 'agregar':
        require_fields($data, ['producto_id']);
        $cant = max(1, (int)($data['cantidad'] ?? 1));

        $pr = db()->prepare("SELECT stock, estado_stock, nombre FROM productos WHERE id = ? AND activo = 1");
        $pr->execute([$data['producto_id']]);
        $prod = $pr->fetch();
        if (!$prod) jout(['ok' => false, 'error' => 'Producto no encontrado'], 404);
        if ($prod['estado_stock'] === 'agotado' || (int)$prod['stock'] <= 0) {
            jout(['ok' => false, 'error' => "Sin stock: {$prod['nombre']}"], 400);
        }

        $ya = db()->prepare("SELECT cantidad FROM carrito WHERE usuario_id = ? AND producto_id = ?");
        $ya->execute([$user['id'], $data['producto_id']]);
        $enCarrito = (int)($ya->fetchColumn() ?: 0);
        if ($enCarrito + $cant > (int)$prod['stock']) {
            jout(['ok' => false, 'error' => "Solo hay {$prod['stock']} unidades disponibles de {$prod['nombre']}"], 400);
        }

        $st = db()->prepare("INSERT INTO carrito (usuario_id, producto_id, cantidad) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)");
        $st->execute([$user['id'], $data['producto_id'], $cant]);
        jout(['ok' => true]);
        break;

    case 'actualizar':
        require_fields($data, ['carrito_id','cantidad']);
        $cant = (int)$data['cantidad'];
        if ($cant <= 0) {
            db()->prepare("DELETE FROM carrito WHERE id = ? AND usuario_id = ?")->execute([$data['carrito_id'], $user['id']]);
        } else {
            $pr = db()->prepare(
                "SELECT p.stock, p.nombre FROM carrito c JOIN productos p ON p.id = c.producto_id
                 WHERE c.id = ? AND c.usuario_id = ?"
            );
            $pr->execute([$data['carrito_id'], $user['id']]);
            $prod = $pr->fetch();
            if (!$prod) jout(['ok' => false, 'error' => 'Item no encontrado'], 404);
            if ($cant > (int)$prod['stock']) {
                jout(['ok' => false, 'error' => "Solo hay {$prod['stock']} unidades disponibles de {$prod['nombre']}"], 400);
            }
            db()->prepare("UPDATE carrito SET cantidad = ? WHERE id = ? AND usuario_id = ?")->execute([$cant, $data['carrito_id'], $user['id']]);
        }
        jout(['ok' => true]);
        break;

    case 'eliminar':
        require_fields($data, ['carrito_id']);
        db()->prepare("DELETE FROM carrito WHERE id = ? AND usuario_id = ?")->execute([$data['carrito_id'], $user['id']]);
        jout(['ok' => true]);
        break;

    case 'checkout':
        require_fields($data, ['metodo_pago','direccion_entrega']);
        if (!in_array($data['metodo_pago'], ['efectivo','tarjeta','paypal'])) jout(['ok' => false, 'error' => 'Metodo invalido'], 400);

        // Validar zona de cobertura
        if (!empty($data['municipio'])) {
            $cob = db()->prepare("SELECT cobertura_activa FROM municipios_sv WHERE nombre = ? LIMIT 1");
            $cob->execute([$data['municipio']]);
            $activa = $cob->fetchColumn();
            if ($activa !== false && (int)$activa === 0) {
                jout(['ok' => false, 'error' => "Todavía no entregamos en {$data['municipio']}. Prueba con otra dirección."], 400);
            }
        }

        // ── Simulación de Pasarela (sandbox): si es tarjeta, valida Luhn y CVV ──
        $pago_estado = 'pendiente';
        $pago_ref = null;
        if ($data['metodo_pago'] === 'tarjeta') {
            if (!empty($data['metodo_pago_id'])) {
                // Tarjeta guardada: ya fue validada (Luhn) al momento de guardarla, solo confirmamos que es suya.
                $stTok = db()->prepare("SELECT id, marca, ultimos4 FROM metodos_pago WHERE id = ? AND usuario_id = ?");
                $stTok->execute([(int)$data['metodo_pago_id'], $user['id']]);
                $tok = $stTok->fetch();
                if (!$tok) jout(['ok' => false, 'error' => 'Método de pago no encontrado'], 404);
                $pago_estado = 'pagado';
                $pago_ref = 'SBX-' . strtoupper(bin2hex(random_bytes(4))) . '-' . $tok['ultimos4'];
            } else {
                $numero = preg_replace('/\D/', '', (string)($data['tarjeta_numero'] ?? ''));
                $cvv    = preg_replace('/\D/', '', (string)($data['tarjeta_cvv'] ?? ''));
                $exp    = (string)($data['tarjeta_exp'] ?? '');
                if (strlen($numero) < 13 || strlen($cvv) < 3 || !preg_match('/^\d{2}\/\d{2}$/', $exp)) {
                    jout(['ok' => false, 'error' => 'Datos de tarjeta inválidos'], 400);
                }
                $sum = 0; $alt = false;
                for ($i = strlen($numero) - 1; $i >= 0; $i--) {
                    $n = (int)$numero[$i];
                    if ($alt) { $n *= 2; if ($n > 9) $n -= 9; }
                    $sum += $n;
                    $alt = !$alt;
                }
                if ($sum % 10 !== 0) jout(['ok' => false, 'error' => 'Número de tarjeta no válido'], 400);
                $pago_estado = 'pagado';
                $pago_ref = 'SBX-' . strtoupper(bin2hex(random_bytes(4)));
                if (!empty($data['guardar_tarjeta'])) {
                    if (preg_match('/^4/', $numero)) $marcaG = 'visa';
                    elseif (preg_match('/^(5[1-5]|2[2-7])/', $numero)) $marcaG = 'mastercard';
                    elseif (preg_match('/^3[47]/', $numero)) $marcaG = 'amex';
                    else $marcaG = 'tarjeta';
                    preg_match('/^(\d{2})\/(\d{2})$/', $exp, $mExpG);
                    $tieneOtrasG = (int)db()->query("SELECT COUNT(*) FROM metodos_pago WHERE usuario_id = " . (int)$user['id'])->fetchColumn() > 0;
                    db()->prepare("INSERT INTO metodos_pago (usuario_id, token, marca, ultimos4, exp_mes, exp_anio, predeterminado) VALUES (?, ?, ?, ?, ?, ?, ?)")
                        ->execute([$user['id'], 'TOK-' . strtoupper(bin2hex(random_bytes(16))), $marcaG, substr($numero, -4), (int)$mExpG[1], 2000 + (int)$mExpG[2], $tieneOtrasG ? 0 : 1]);
                }
            }
        } elseif ($data['metodo_pago'] === 'paypal') {
            if (empty($data['paypal_codigo_2fa'])) jout(['ok' => false, 'error' => 'Código 2FA requerido'], 400);
            $pago_estado = 'pagado';
            $pago_ref = 'PP-' . strtoupper(bin2hex(random_bytes(4)));
        } else {
            $pago_estado = 'contraentrega';
            $pago_ref = 'COD-' . strtoupper(bin2hex(random_bytes(3)));
        }

        $efectivoPagaCon = null;
        if ($data['metodo_pago'] === 'efectivo' && isset($data['efectivo_paga_con']) && $data['efectivo_paga_con'] !== '') {
            $efectivoPagaCon = max(0, (float)$data['efectivo_paga_con']);
        }

        $st = db()->prepare(
            "SELECT c.cantidad, p.id as producto_id, p.nombre, p.stock, t.vendedor_id,
                    IF(p.precio_oferta IS NOT NULL AND p.precio_oferta > 0 AND (p.oferta_hasta IS NULL OR p.oferta_hasta > NOW()), p.precio_oferta, p.precio) AS precio
             FROM carrito c JOIN productos p ON p.id = c.producto_id JOIN tiendas t ON t.id = p.tienda_id WHERE c.usuario_id = ?"
        );
        $st->execute([$user['id']]);
        $items = $st->fetchAll();
        if (!$items) jout(['ok' => false, 'error' => 'Carrito vacio'], 400);

        foreach ($items as $it) {
            if ((int)$it['stock'] < (int)$it['cantidad']) {
                jout(['ok' => false, 'error' => "Sin stock: {$it['nombre']}"], 400);
            }
        }

        $porVendedor = [];
        foreach ($items as $it) $porVendedor[$it['vendedor_id']][] = $it;

        // ── Cupón de descuento (opcional): recalculado 100% en el servidor ──
        $subtotalGlobal = 0;
        foreach ($items as $it) $subtotalGlobal += $it['precio'] * $it['cantidad'];
        $cupon = null;
        $descuentoGlobal = 0;
        if (!empty($data['cupon_codigo'])) {
            $codigoCupon = strtoupper(trim($data['cupon_codigo']));
            $cSt = db()->prepare("SELECT * FROM cupones WHERE codigo = ? AND activo = 1");
            $cSt->execute([$codigoCupon]);
            $cupon = $cSt->fetch();
            if ($cupon) {
                $expirado = $cupon['expira_at'] && strtotime($cupon['expira_at']) < time();
                $agotado  = $cupon['usos_max'] !== null && (int)$cupon['usos_actuales'] >= (int)$cupon['usos_max'];
                $minOk    = $subtotalGlobal >= (float)$cupon['min_compra'];
                $usadoSt  = db()->prepare("SELECT COUNT(*) FROM cupones_usos WHERE cupon_id = ? AND usuario_id = ?");
                $usadoSt->execute([$cupon['id'], $user['id']]);
                $yaUsado  = (int)$usadoSt->fetchColumn() > 0;
                if (!$expirado && !$agotado && $minOk && !$yaUsado) {
                    $descuentoGlobal = $cupon['tipo'] === 'porcentaje'
                        ? round($subtotalGlobal * ((float)$cupon['valor'] / 100), 2)
                        : min((float)$cupon['valor'], $subtotalGlobal);
                } else {
                    $cupon = null;
                }
            }
        }

        // ── Costo de envío: se recalcula 100% en el servidor según el modo elegido ──
        $envioModo = ($data['envio_modo'] ?? 'estandar') === 'express' ? 'express' : 'estandar';
        $costoEnvioTotal = $envioModo === 'express' ? 4.99 : 2.50;
        $numVendedores = max(1, count($porVendedor));
        $costoEnvioPorVendedor = round($costoEnvioTotal / $numVendedores, 2);

        $pedidoIds = [];
        db()->beginTransaction();
        try {
            foreach ($porVendedor as $vendedor_id => $arr) {
                $subtotal = 0;
                foreach ($arr as $i) $subtotal += $i['precio'] * $i['cantidad'];
                $descuentoVendedor = ($cupon && $subtotalGlobal > 0)
                    ? round($descuentoGlobal * ($subtotal / $subtotalGlobal), 2)
                    : 0;
                $total = max(0, $subtotal - $descuentoVendedor) + $costoEnvioPorVendedor;
                $ins = db()->prepare(
                    "INSERT INTO pedidos
                     (comprador_id, vendedor_id, total, metodo_pago, direccion_entrega, lat_entrega, lng_entrega, pago_estado, pago_referencia, efectivo_paga_con, municipio_entrega, departamento_entrega, cupon_codigo, descuento_cupon, estado)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente_confirmacion')"
                );
                $ins->execute([
                    $user['id'], $vendedor_id, round($total, 2),
                    $data['metodo_pago'], $data['direccion_entrega'],
                    $data['lat'] ?? null, $data['lng'] ?? null,
                    $pago_estado, $pago_ref, $efectivoPagaCon,
                    $data['municipio'] ?? null, $data['departamento'] ?? null,
                    $cupon ? $cupon['codigo'] : null, $descuentoVendedor,
                ]);
                $pid = (int)db()->lastInsertId();
                $pedidoIds[] = $pid;

                $insItem = db()->prepare("INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
                // ── Decremento ATÓMICO de stock (ACID): el WHERE stock >= ? es la única fuente de verdad.
                // Si dos compradores piden al mismo tiempo más de lo disponible, la segunda transacción
                // que llegue aquí encontrará el stock ya descontado por la primera y afectará 0 filas.
                $decStock = db()->prepare(
                    "UPDATE productos
                     SET stock = stock - ?,
                         estado_stock = IF(stock - ? <= 0, 'agotado', 'disponible')
                     WHERE id = ? AND stock >= ?"
                );
                foreach ($arr as $i) {
                    $cant = (int)$i['cantidad'];
                    $decStock->execute([$cant, $cant, (int)$i['producto_id'], $cant]);
                    if ($decStock->rowCount() === 0) {
                        throw new RuntimeException("Sin stock suficiente de \"{$i['nombre']}\" — alguien más lo compró primero.");
                    }
                    $insItem->execute([$pid, $i['producto_id'], $cant, $i['precio']]);
                }

                db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                    ->execute([$user['id'], (int)$vendedor_id, "🛎️ Nuevo pedido #SV-{$pid} recibido. Total US$ " . number_format($total, 2)]);
                crear_notificacion((int)$vendedor_id, 'pedido', 'Nuevo pedido recibido', "Pedido #SV-{$pid} · US\$ " . number_format($total, 2), $pid);
            }
            if ($cupon && $descuentoGlobal > 0) {
                db()->prepare("INSERT INTO cupones_usos (cupon_id, usuario_id, pedido_id, monto_descontado) VALUES (?, ?, ?, ?)")
                    ->execute([$cupon['id'], $user['id'], $pedidoIds[0], $descuentoGlobal]);
                db()->prepare("UPDATE cupones SET usos_actuales = usos_actuales + 1 WHERE id = ?")->execute([$cupon['id']]);
            }

            db()->prepare("DELETE FROM carrito WHERE usuario_id = ?")->execute([$user['id']]);
            db()->commit();
            jout([
                'ok' => true,
                'pedidos' => $pedidoIds,
                'pago_estado' => $pago_estado,
                'pago_referencia' => $pago_ref,
                'descuento_aplicado' => $descuentoGlobal,
            ]);
        } catch (RuntimeException $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage(), 'motivo' => 'stock_insuficiente'], 409);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'mis_pedidos':
        $st = db()->prepare(
            "SELECT p.*, v.nombre as vendedor_nombre, r.nombre as repartidor_nombre,
                    cal.estrellas AS mi_calificacion, cal.comentario AS mi_comentario,
                    calr.estrellas AS mi_calificacion_repartidor, calr.comentario AS mi_comentario_repartidor
             FROM pedidos p
             JOIN usuarios v ON v.id = p.vendedor_id
             LEFT JOIN usuarios r ON r.id = p.repartidor_id
             LEFT JOIN calificaciones cal ON cal.pedido_id = p.id AND cal.comprador_id = p.comprador_id
             LEFT JOIN calificaciones_repartidor calr ON calr.pedido_id = p.id AND calr.comprador_id = p.comprador_id
             WHERE p.comprador_id = ? ORDER BY p.created_at DESC"
        );
        $st->execute([$user['id']]);
        $pedidos = $st->fetchAll();
        foreach ($pedidos as &$p) {
            $items = db()->prepare("SELECT i.*, pr.nombre, pr.imagen, pr.categoria FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id WHERE i.pedido_id = ?");
            $items->execute([$p['id']]);
            $p['items'] = $items->fetchAll();
        }
        jout(['ok' => true, 'pedidos' => $pedidos]);
        break;

    // ─── Cancelar pedido y reembolsar 100% a la wallet del comprador ───
    case 'cancelar':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];
        try {
            db()->beginTransaction();
            $sel = db()->prepare("SELECT * FROM pedidos WHERE id = ? AND comprador_id = ? FOR UPDATE");
            $sel->execute([$pid, $user['id']]);
            $ped = $sel->fetch();
            if (!$ped) { db()->rollBack(); jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404); }
            if (in_array($ped['estado'], ['entregado','cancelado'], true)) {
                db()->rollBack(); jout(['ok' => false, 'error' => 'No se puede cancelar este pedido'], 400);
            }
            if ($ped['estado'] === 'en_camino') {
                db()->rollBack(); jout(['ok' => false, 'error' => 'El pedido ya fue aceptado por el repartidor'], 400);
            }

            db()->prepare("UPDATE pedidos SET estado = 'cancelado', pago_estado = 'reembolsado' WHERE id = ?")->execute([$pid]);

            if (in_array($ped['pago_estado'], ['pagado'], true)) {
                $monto = (float)$ped['total'];
                db()->prepare("INSERT INTO wallets (usuario_id, saldo) VALUES (?, ?) ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)")
                    ->execute([$user['id'], $monto]);
                db()->prepare("INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia, pedido_id) VALUES (?, 'reembolso', ?, 'Cancelación del comprador', ?)")
                    ->execute([$user['id'], $monto, $pid]);
            }

            $items = db()->prepare("SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?");
            $items->execute([$pid]);
            $rest = db()->prepare("UPDATE productos SET stock = stock + ?, estado_stock = 'disponible' WHERE id = ?");
            foreach ($items->fetchAll() as $it) $rest->execute([(int)$it['cantidad'], (int)$it['producto_id']]);

            db()->commit();
            jout(['ok' => true]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    // ─── Calificar pedido entregado (tienda y opcionalmente repartidor) ───
    case 'calificar':
        require_fields($data, ['pedido_id','estrellas']);
        $pid = (int)$data['pedido_id'];
        $estrellas = max(1, min(5, (int)$data['estrellas']));
        $comentario = trim((string)($data['comentario'] ?? ''));

        try {
            db()->beginTransaction();
            $sel = db()->prepare("SELECT vendedor_id, repartidor_id, estado FROM pedidos WHERE id = ? AND comprador_id = ?");
            $sel->execute([$pid, $user['id']]);
            $p = $sel->fetch();
            if (!$p) { db()->rollBack(); jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404); }
            if ($p['estado'] !== 'entregado') { db()->rollBack(); jout(['ok' => false, 'error' => 'Solo se califica al entregar'], 400); }

            $tienda = db()->prepare("SELECT id FROM tiendas WHERE vendedor_id = ? LIMIT 1");
            $tienda->execute([(int)$p['vendedor_id']]);
            $tid = (int)$tienda->fetchColumn();

            db()->prepare(
                "INSERT INTO calificaciones (pedido_id, comprador_id, tienda_id, estrellas, comentario)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE estrellas = VALUES(estrellas), comentario = VALUES(comentario)"
            )->execute([$pid, $user['id'], $tid, $estrellas, $comentario]);

            $agg = db()->prepare("SELECT AVG(estrellas) AS prom, COUNT(*) AS total FROM calificaciones WHERE tienda_id = ?");
            $agg->execute([$tid]);
            $r = $agg->fetch();
            db()->prepare("UPDATE tiendas SET calificacion_promedio = ?, total_resenas = ? WHERE id = ?")
                ->execute([round((float)$r['prom'], 2), (int)$r['total'], $tid]);

            $repProm = null; $repTotal = null;
            if (!empty($p['repartidor_id']) && isset($data['estrellas_repartidor'])) {
                $estrellasRep = max(1, min(5, (int)$data['estrellas_repartidor']));
                $comentarioRep = trim((string)($data['comentario_repartidor'] ?? ''));
                $ridRep = (int)$p['repartidor_id'];

                db()->prepare(
                    "INSERT INTO calificaciones_repartidor (pedido_id, comprador_id, repartidor_id, estrellas, comentario)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE estrellas = VALUES(estrellas), comentario = VALUES(comentario)"
                )->execute([$pid, $user['id'], $ridRep, $estrellasRep, $comentarioRep]);

                $aggRep = db()->prepare("SELECT AVG(estrellas) AS prom, COUNT(*) AS total FROM calificaciones_repartidor WHERE repartidor_id = ?");
                $aggRep->execute([$ridRep]);
                $rr = $aggRep->fetch();
                $repProm = round((float)$rr['prom'], 2);
                $repTotal = (int)$rr['total'];
                db()->prepare("UPDATE usuarios SET repartidor_calificacion_promedio = ?, repartidor_total_resenas = ? WHERE id = ?")
                    ->execute([$repProm, $repTotal, $ridRep]);
            }

            db()->commit();
            jout([
                'ok' => true,
                'promedio' => (float)$r['prom'],
                'total' => (int)$r['total'],
                'promedio_repartidor' => $repProm,
                'total_repartidor' => $repTotal,
            ]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    // ═══ Métodos de pago guardados (tokenizados) ═══════════════════════════
    // No hay procesador de pagos real integrado en este proyecto (el checkout ya es
    // un sandbox propio que valida Luhn/CVV). Seguimos el mismo patrón: solo guardamos
    // un token opaco + marca + últimos 4 dígitos, NUNCA el número completo ni el CVV.
    // Si en el futuro se integra un procesador real (Stripe, etc.), aquí es donde se
    // reemplaza la generación del token por el token que devuelva ese procesador.

    case 'metodos_listar':
        $st = db()->prepare(
            "SELECT id, marca, ultimos4, exp_mes, exp_anio, predeterminado
             FROM metodos_pago WHERE usuario_id = ? ORDER BY predeterminado DESC, created_at DESC"
        );
        $st->execute([$user['id']]);
        jout(['ok' => true, 'metodos' => $st->fetchAll()]);
        break;

    case 'metodos_guardar':
        require_fields($data, ['tarjeta_numero', 'tarjeta_cvv', 'tarjeta_exp']);
        $numero = preg_replace('/\D/', '', (string)$data['tarjeta_numero']);
        $cvv    = preg_replace('/\D/', '', (string)$data['tarjeta_cvv']);
        $exp    = (string)$data['tarjeta_exp'];
        if (strlen($numero) < 13 || strlen($cvv) < 3 || !preg_match('/^(\d{2})\/(\d{2})$/', $exp, $mExp)) {
            jout(['ok' => false, 'error' => 'Datos de tarjeta inválidos'], 400);
        }
        $sum = 0; $alt = false;
        for ($i = strlen($numero) - 1; $i >= 0; $i--) {
            $n = (int)$numero[$i];
            if ($alt) { $n *= 2; if ($n > 9) $n -= 9; }
            $sum += $n;
            $alt = !$alt;
        }
        if ($sum % 10 !== 0) jout(['ok' => false, 'error' => 'Número de tarjeta no válido'], 400);

        if (preg_match('/^4/', $numero)) $marca = 'visa';
        elseif (preg_match('/^(5[1-5]|2[2-7])/', $numero)) $marca = 'mastercard';
        elseif (preg_match('/^3[47]/', $numero)) $marca = 'amex';
        else $marca = 'tarjeta';

        $token = 'TOK-' . strtoupper(bin2hex(random_bytes(16)));
        $ultimos4 = substr($numero, -4);
        $expMes = (int)$mExp[1];
        $expAnio = 2000 + (int)$mExp[2];

        if (!empty($data['predeterminado'])) {
            db()->prepare("UPDATE metodos_pago SET predeterminado = 0 WHERE usuario_id = ?")->execute([$user['id']]);
        }
        $tieneOtras = (int)db()->query("SELECT COUNT(*) FROM metodos_pago WHERE usuario_id = " . (int)$user['id'])->fetchColumn() > 0;
        $predeterminado = !empty($data['predeterminado']) || !$tieneOtras;
        if ($predeterminado && $tieneOtras) {
            db()->prepare("UPDATE metodos_pago SET predeterminado = 0 WHERE usuario_id = ?")->execute([$user['id']]);
        }

        $ins = db()->prepare(
            "INSERT INTO metodos_pago (usuario_id, token, marca, ultimos4, exp_mes, exp_anio, predeterminado)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $ins->execute([$user['id'], $token, $marca, $ultimos4, $expMes, $expAnio, $predeterminado ? 1 : 0]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'metodos_eliminar':
        require_fields($data, ['id']);
        db()->prepare("DELETE FROM metodos_pago WHERE id = ? AND usuario_id = ?")
            ->execute([(int)$data['id'], $user['id']]);
        jout(['ok' => true]);
        break;

    case 'metodos_predeterminado':
        require_fields($data, ['id']);
        db()->prepare("UPDATE metodos_pago SET predeterminado = 0 WHERE usuario_id = ?")->execute([$user['id']]);
        db()->prepare("UPDATE metodos_pago SET predeterminado = 1 WHERE id = ? AND usuario_id = ?")
            ->execute([(int)$data['id'], $user['id']]);
        jout(['ok' => true]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
