<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'listar';
$data = jread();

switch ($action) {

    case 'listar':
        $st = db()->prepare("SELECT c.id, c.cantidad, p.id as producto_id, p.nombre, p.precio, p.imagen, p.tienda_id, t.nombre as tienda_nombre, t.vendedor_id FROM carrito c JOIN productos p ON p.id = c.producto_id JOIN tiendas t ON t.id = p.tienda_id WHERE c.usuario_id = ?");
        $st->execute([$user['id']]);
        $items = $st->fetchAll();
        $total = 0;
        foreach ($items as $it) $total += $it['precio'] * $it['cantidad'];
        jout(['ok' => true, 'items' => $items, 'total' => round($total, 2)]);
        break;

    case 'agregar':
        require_fields($data, ['producto_id']);
        $cant = max(1, (int)($data['cantidad'] ?? 1));
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

        // ── Simulación de Pasarela (sandbox): si es tarjeta, valida Luhn y CVV ──
        $pago_estado = 'pendiente';
        $pago_ref = null;
        if ($data['metodo_pago'] === 'tarjeta') {
            $numero = preg_replace('/\D/', '', (string)($data['tarjeta_numero'] ?? ''));
            $cvv    = preg_replace('/\D/', '', (string)($data['tarjeta_cvv'] ?? ''));
            $exp    = (string)($data['tarjeta_exp'] ?? '');
            if (strlen($numero) < 13 || strlen($cvv) < 3 || !preg_match('/^\d{2}\/\d{2}$/', $exp)) {
                jout(['ok' => false, 'error' => 'Datos de tarjeta inválidos'], 400);
            }
            // Algoritmo Luhn
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
        } elseif ($data['metodo_pago'] === 'paypal') {
            // El frontend habrá pedido 2FA. Aquí solo lo registramos.
            if (empty($data['paypal_codigo_2fa'])) jout(['ok' => false, 'error' => 'Código 2FA requerido'], 400);
            $pago_estado = 'pagado';
            $pago_ref = 'PP-' . strtoupper(bin2hex(random_bytes(4)));
        } else {
            // efectivo: el pago se registra al entregar
            $pago_estado = 'contraentrega';
            $pago_ref = 'COD-' . strtoupper(bin2hex(random_bytes(3)));
        }

        $st = db()->prepare("SELECT c.cantidad, p.id as producto_id, p.nombre, p.precio, p.stock, t.vendedor_id FROM carrito c JOIN productos p ON p.id = c.producto_id JOIN tiendas t ON t.id = p.tienda_id WHERE c.usuario_id = ?");
        $st->execute([$user['id']]);
        $items = $st->fetchAll();
        if (!$items) jout(['ok' => false, 'error' => 'Carrito vacio'], 400);

        // Validar stock disponible antes de procesar
        foreach ($items as $it) {
            if ((int)$it['stock'] < (int)$it['cantidad']) {
                jout(['ok' => false, 'error' => "Sin stock: {$it['nombre']}"], 400);
            }
        }

        $porVendedor = [];
        foreach ($items as $it) $porVendedor[$it['vendedor_id']][] = $it;

        $pedidoIds = [];
        db()->beginTransaction();
        try {
            foreach ($porVendedor as $vendedor_id => $arr) {
                $total = 0;
                foreach ($arr as $i) $total += $i['precio'] * $i['cantidad'];
                $ins = db()->prepare(
                    "INSERT INTO pedidos
                     (comprador_id, vendedor_id, total, metodo_pago, direccion_entrega, lat_entrega, lng_entrega, pago_estado, pago_referencia, estado)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'preparacion')"
                );
                $ins->execute([
                    $user['id'], $vendedor_id, round($total, 2),
                    $data['metodo_pago'], $data['direccion_entrega'],
                    $data['lat'] ?? null, $data['lng'] ?? null,
                    $pago_estado, $pago_ref,
                ]);
                $pid = (int)db()->lastInsertId();
                $pedidoIds[] = $pid;

                $insItem = db()->prepare("INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
                $decStock = db()->prepare(
                    "UPDATE productos
                     SET stock = GREATEST(0, stock - ?),
                         estado_stock = IF(stock - ? <= 0, 'agotado', 'disponible')
                     WHERE id = ?"
                );
                foreach ($arr as $i) {
                    $insItem->execute([$pid, $i['producto_id'], $i['cantidad'], $i['precio']]);
                    $decStock->execute([(int)$i['cantidad'], (int)$i['cantidad'], (int)$i['producto_id']]);
                }

                // Notificar al vendedor: nuevo pedido
                db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                    ->execute([$user['id'], (int)$vendedor_id, "🛎️ Nuevo pedido #SV-{$pid} recibido. Total US$ " . number_format($total, 2)]);
            }
            db()->prepare("DELETE FROM carrito WHERE usuario_id = ?")->execute([$user['id']]);
            db()->commit();
            jout([
                'ok' => true,
                'pedidos' => $pedidoIds,
                'pago_estado' => $pago_estado,
                'pago_referencia' => $pago_ref,
            ]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'mis_pedidos':
        $st = db()->prepare("SELECT p.*, v.nombre as vendedor_nombre, r.nombre as repartidor_nombre FROM pedidos p JOIN usuarios v ON v.id = p.vendedor_id LEFT JOIN usuarios r ON r.id = p.repartidor_id WHERE p.comprador_id = ? ORDER BY p.created_at DESC");
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
            // Solo si aún no fue aceptado por repartidor (o explícitamente vencido)
            if ($ped['estado'] === 'en_camino') {
                db()->rollBack(); jout(['ok' => false, 'error' => 'El pedido ya fue aceptado por el repartidor'], 400);
            }

            db()->prepare("UPDATE pedidos SET estado = 'cancelado', pago_estado = 'reembolsado' WHERE id = ?")->execute([$pid]);

            // Reversión 100% si fue pago electrónico
            if (in_array($ped['pago_estado'], ['pagado'], true)) {
                $monto = (float)$ped['total'];
                db()->prepare("INSERT INTO wallets (usuario_id, saldo) VALUES (?, ?) ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)")
                    ->execute([$user['id'], $monto]);
                db()->prepare("INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia, pedido_id) VALUES (?, 'reembolso', ?, 'Cancelación del comprador', ?)")
                    ->execute([$user['id'], $monto, $pid]);
            }

            // Reincorporar stock
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

    // ─── Calificar pedido entregado (1..5 estrellas + comentario) ───
    case 'calificar':
        require_fields($data, ['pedido_id','estrellas']);
        $pid = (int)$data['pedido_id'];
        $estrellas = max(1, min(5, (int)$data['estrellas']));
        $comentario = trim((string)($data['comentario'] ?? ''));

        try {
            db()->beginTransaction();
            $sel = db()->prepare("SELECT vendedor_id, estado FROM pedidos WHERE id = ? AND comprador_id = ?");
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

            // Recalcular promedio
            $agg = db()->prepare(
                "SELECT AVG(estrellas) AS prom, COUNT(*) AS total FROM calificaciones WHERE tienda_id = ?"
            );
            $agg->execute([$tid]);
            $r = $agg->fetch();
            db()->prepare("UPDATE tiendas SET calificacion_promedio = ?, total_resenas = ? WHERE id = ?")
                ->execute([round((float)$r['prom'], 2), (int)$r['total'], $tid]);

            db()->commit();
            jout(['ok' => true, 'promedio' => (float)$r['prom'], 'total' => (int)$r['total']]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
