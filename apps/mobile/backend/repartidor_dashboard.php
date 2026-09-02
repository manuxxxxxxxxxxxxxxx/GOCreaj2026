<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user || $user['rol'] !== 'repartidor') jout(['ok' => false, 'error' => 'Acceso denegado'], 403);

// Autosana el despacho automático en cada request -- ver ofrecer_siguiente_repartidor()
// en conexion.php. La app del repartidor consulta 'mi_oferta' cada pocos segundos mientras
// está en línea, así que esto alcanza para expirar/cascadear sin WebSockets ni cron.
avanzar_despacho_global();

$action = $_GET['action'] ?? 'disponibles';
$data = jread();

// Configuración de comisiones: ver COMISION_PLATAFORMA_PCT / COMISION_REPARTIDOR_PCT
// en conexion.php (centralizada ahí junto con finalizar_entrega_pedido()).

// Secuencia de sub-estados de una entrega en curso
const PROGRESO_SECUENCIA = [null, 'camino_tienda', 'recolectado', 'camino_cliente'];

// Single Order Lock: un repartidor solo puede traer una entrega en curso a la vez.
const MAX_PEDIDOS_ACTIVOS = 1;

/** Agrega a cada pedido su lista de items con el stock actual del producto. */
function adjuntar_items_con_stock(array &$pedidos): void {
    if (!$pedidos) return;
    $st = db()->prepare(
        "SELECT i.pedido_id, i.producto_id, i.cantidad, i.precio_unitario,
                pr.nombre, pr.imagen, pr.stock, pr.estado_stock
         FROM pedido_items i
         JOIN productos pr ON pr.id = i.producto_id
         WHERE i.pedido_id = ?"
    );
    foreach ($pedidos as &$p) {
        $st->execute([$p['id']]);
        $p['items'] = $st->fetchAll();
    }
}

switch ($action) {

    case 'disponibles':
        $r = db()->prepare("SELECT en_linea, lat, lng FROM usuarios WHERE id = ?");
        $r->execute([$user['id']]);
        $yo = $r->fetch();
        if (!$yo || !(int)$yo['en_linea']) { jout(['ok' => true, 'pedidos' => [], 'en_linea' => false]); }

        // Single Order Lock: con una entrega activa, no se muestran más solicitudes.
        $activos = (int)db()->query(
            "SELECT COUNT(*) FROM pedidos WHERE repartidor_id = {$user['id']} AND estado IN ('preparacion','en_camino')"
        )->fetchColumn();
        if ($activos >= MAX_PEDIDOS_ACTIVOS) {
            jout(['ok' => true, 'pedidos' => [], 'en_linea' => true, 'bloqueado_por_entrega_activa' => true]);
        }

        $st = db()->prepare(
            "SELECT p.*,
                    v.nombre AS vendedor_nombre,
                    c.nombre AS comprador_nombre,
                    t.nombre AS tienda_nombre,
                    t.lat AS tienda_lat, t.lng AS tienda_lng,
                    t.direccion AS tienda_direccion,
                    ROUND(p.total * ? , 2) AS ganancia_repartidor
             FROM pedidos p
             JOIN usuarios v ON v.id = p.vendedor_id
             JOIN usuarios c ON c.id = p.comprador_id
             LEFT JOIN (
                 SELECT i.pedido_id, MIN(t2.id) AS tienda_id
                 FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id JOIN tiendas t2 ON t2.id = pr.tienda_id
                 GROUP BY i.pedido_id
             ) pt ON pt.pedido_id = p.id
             LEFT JOIN tiendas t ON t.id = pt.tienda_id
             WHERE p.repartidor_id IS NULL
               AND p.estado = 'preparacion'
               AND p.tipo_entrega != 'recogida'
               AND p.pago_estado IN ('pagado', 'contraentrega')
               AND (p.oferta_repartidor_id IS NULL OR p.oferta_expira_at < NOW())
               AND NOT EXISTS (
                   SELECT 1 FROM pedido_repartidor_descartes d
                   WHERE d.pedido_id = p.id AND d.repartidor_id = ?
               )
             ORDER BY p.created_at ASC"
        );
        $st->execute([COMISION_REPARTIDOR_PCT, $user['id']]);
        $pedidos = $st->fetchAll();
        adjuntar_items_con_stock($pedidos);

        // Si conocemos la posición del repartidor, ordenamos "cercanos primero".
        if ($yo['lat'] !== null && $yo['lng'] !== null) {
            foreach ($pedidos as &$p) {
                $p['distancia_km'] = ($p['tienda_lat'] !== null && $p['tienda_lng'] !== null)
                    ? round(distancia_km((float)$yo['lat'], (float)$yo['lng'], (float)$p['tienda_lat'], (float)$p['tienda_lng']), 2)
                    : null;
            }
            usort($pedidos, function ($a, $b) {
                if ($a['distancia_km'] === null) return 1;
                if ($b['distancia_km'] === null) return -1;
                return $a['distancia_km'] <=> $b['distancia_km'];
            });
        }
        jout(['ok' => true, 'pedidos' => $pedidos, 'en_linea' => true]);
        break;

    // ─── Oferta individual del despacho automático (ver ofrecer_siguiente_repartidor()
    // en conexion.php) -- a diferencia de 'disponibles' (mercado abierto), esto es
    // EXCLUSIVO para este repartidor y tiene un timer corto. La app la consulta cada
    // pocos segundos mientras está en línea para que la oferta "aparezca" al toque. ───
    case 'mi_oferta':
        $st = db()->prepare(
            "SELECT p.id, p.numero_pedido, p.total,
                    ROUND(p.total * ?, 2) AS ganancia_repartidor,
                    GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), p.oferta_expira_at)) AS segundos_restantes,
                    p.municipio_entrega, p.lat_entrega, p.lng_entrega,
                    t.nombre AS tienda_nombre, t.lat AS tienda_lat, t.lng AS tienda_lng, t.direccion AS tienda_direccion,
                    c.nombre AS comprador_nombre
             FROM pedidos p
             LEFT JOIN (
                 SELECT i.pedido_id, MIN(t2.id) AS tienda_id
                 FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id JOIN tiendas t2 ON t2.id = pr.tienda_id
                 GROUP BY i.pedido_id
             ) pt ON pt.pedido_id = p.id
             LEFT JOIN tiendas t ON t.id = pt.tienda_id
             JOIN usuarios c ON c.id = p.comprador_id
             WHERE p.oferta_repartidor_id = ? AND p.oferta_expira_at > NOW()
             LIMIT 1"
        );
        $st->execute([COMISION_REPARTIDOR_PCT, $user['id']]);
        $oferta = $st->fetch();
        jout(['ok' => true, 'oferta' => $oferta ?: null, 'segundos_totales' => DESPACHO_OFERTA_SEGUNDOS]);
        break;

    case 'responder_oferta':
        require_fields($data, ['pedido_id', 'decision']);
        if (!in_array($data['decision'], ['aceptar', 'rechazar'], true)) jout(['ok' => false, 'error' => 'Decisión inválida'], 400);
        $pid = (int)$data['pedido_id'];

        // repartidor_id IS NULL de nuevo acá: si mientras tanto alguien lo asignó a mano
        // (ver vendedor_dashboard.php action=asignar_repartidor, todavía vigente en la web)
        // esta oferta ya no vale aunque no haya expirado por tiempo.
        $sel = db()->prepare("SELECT id, comprador_id, vendedor_id FROM pedidos WHERE id = ? AND oferta_repartidor_id = ? AND oferta_expira_at > NOW() AND repartidor_id IS NULL FOR UPDATE");

        if ($data['decision'] === 'rechazar') {
            $chk = db()->prepare("SELECT id FROM pedidos WHERE id = ? AND oferta_repartidor_id = ?");
            $chk->execute([$pid, $user['id']]);
            if (!$chk->fetch()) jout(['ok' => false, 'error' => 'Esta oferta ya expiró o ya no es tuya'], 410);

            db()->prepare("INSERT IGNORE INTO pedido_repartidor_descartes (pedido_id, repartidor_id) VALUES (?, ?)")->execute([$pid, $user['id']]);
            db()->prepare("UPDATE pedidos SET oferta_repartidor_id = NULL, oferta_expira_at = NULL WHERE id = ? AND oferta_repartidor_id = ?")->execute([$pid, $user['id']]);
            ofrecer_siguiente_repartidor($pid);
            jout(['ok' => true]);
        }

        $activos = (int)db()->query(
            "SELECT COUNT(*) FROM pedidos WHERE repartidor_id = {$user['id']} AND estado IN ('preparacion','en_camino')"
        )->fetchColumn();
        if ($activos >= MAX_PEDIDOS_ACTIVOS) {
            jout(['ok' => false, 'error' => "Ya tienes {$activos} entregas en curso. Completa alguna antes de aceptar otra."], 400);
        }

        try {
            db()->beginTransaction();
            $sel->execute([$pid, $user['id']]);
            $row = $sel->fetch();
            if (!$row) { db()->rollBack(); jout(['ok' => false, 'error' => 'Esta oferta ya expiró o ya no es tuya'], 410); }

            db()->prepare("UPDATE pedidos SET repartidor_id = ?, repartidor_asignado_at = NOW(), oferta_repartidor_id = NULL, oferta_expira_at = NULL WHERE id = ?")
                ->execute([$user['id'], $pid]);

            $msg = "🛵 El repartidor {$user['nombre']} tomó tu pedido y va a recogerlo a la tienda.";
            $msgV = "🛵 Repartidor {$user['nombre']} tomó el pedido #{$pid}. Confirma la recogida cuando llegue.";
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$row['comprador_id'], $msg]);
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$row['vendedor_id'], $msgV]);
            crear_notificacion((int)$row['comprador_id'], 'pedido', 'Repartidor asignado', $msg, $pid);
            crear_notificacion((int)$row['vendedor_id'], 'pedido', 'Repartidor en camino a tu tienda', $msgV, $pid);

            db()->commit();
            jout(['ok' => true]);
        } catch (Throwable $e) {
            if (db()->inTransaction()) db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'aceptar':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];

        $activos = (int)db()->query(
            "SELECT COUNT(*) FROM pedidos WHERE repartidor_id = {$user['id']} AND estado IN ('preparacion','en_camino')"
        )->fetchColumn();
        if ($activos >= MAX_PEDIDOS_ACTIVOS) {
            jout(['ok' => false, 'error' => "Ya tienes {$activos} entregas en curso. Completa alguna antes de aceptar otra."], 400);
        }

        try {
            db()->beginTransaction();
            // oferta_repartidor_id IS NULL OR ya venció: si el despacho automático tiene una
            // oferta exclusiva vigente para OTRO repartidor (ver ofrecer_siguiente_repartidor()
            // en conexion.php), este pedido no debe poder tomarse por acá todavía.
            $check = db()->prepare(
                "SELECT id, comprador_id, vendedor_id FROM pedidos
                 WHERE id = ? AND repartidor_id IS NULL AND tipo_entrega != 'recogida' AND (oferta_repartidor_id IS NULL OR oferta_expira_at < NOW())
                 FOR UPDATE"
            );
            $check->execute([$pid]);
            $row = $check->fetch();
            if (!$row) { db()->rollBack(); jout(['ok' => false, 'error' => 'Pedido ya tomado'], 409); }

            // Queda asignado pero AÚN NO "en_camino" — falta la confirmación doble de recogida en tienda.
            db()->prepare("UPDATE pedidos SET repartidor_id = ?, repartidor_asignado_at = NOW(), oferta_repartidor_id = NULL, oferta_expira_at = NULL WHERE id = ?")
                ->execute([$user['id'], $pid]);

            $msg = "🛵 El repartidor {$user['nombre']} tomó tu pedido y va a recogerlo a la tienda.";
            $msgV = "🛵 Repartidor {$user['nombre']} tomó el pedido #{$pid}. Confirma la recogida cuando llegue.";
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$row['comprador_id'], $msg]);
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$row['vendedor_id'], $msgV]);
            crear_notificacion((int)$row['comprador_id'], 'pedido', 'Repartidor asignado', $msg, $pid);
            crear_notificacion((int)$row['vendedor_id'], 'pedido', 'Repartidor en camino a tu tienda', $msgV, $pid);

            db()->commit();
            jout(['ok' => true]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    // ─── Confirmación (lado repartidor) de que recogió el pedido en la tienda ───
    // Exige el código QR que generó el vendedor, o su PIN de 6 dígitos como
    // respaldo (ver DESIGN.md "Flujo logístico") en vez de un tap "de honor" —
    // quien no tiene el código delante no puede confirmar. El PIN se bloquea
    // 15 min tras 3 intentos fallidos y alerta a soporte; el QR nunca se
    // bloquea (no es adivinable, sigue siendo la salida de emergencia).
    case 'confirmar_recogida':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];
        // El "bloqueado" se calcula en el propio SQL (pin_recogida_bloqueado_hasta > NOW())
        // en vez de comparar la fecha en PHP con strtotime()/time(): este servidor tiene el
        // reloj de PHP y el de MySQL en zonas horarias distintas, así que cualquier
        // comparación mixta queda mal por varias horas -- mejor dejar que MySQL compare
        // contra su propio NOW(), que es el mismo reloj que puso la fecha de bloqueo.
        $sel = db()->prepare("SELECT *, (pin_recogida_bloqueado_hasta > NOW()) AS pin_recogida_bloqueado FROM pedidos WHERE id = ? AND repartidor_id = ?");
        $sel->execute([$pid, $user['id']]);
        $ped = $sel->fetch();
        if (!$ped) jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404);

        $usaPin = empty($data['qr_token']) && !empty($data['pin']);
        if (!$usaPin) {
            if (empty($data['qr_token'])) jout(['ok' => false, 'error' => 'Falta el código QR o el PIN'], 400);
            if (!$ped['qr_recogida_token'] || !hash_equals($ped['qr_recogida_token'], (string)$data['qr_token'])) {
                jout(['ok' => false, 'error' => 'Código QR inválido, o el vendedor todavía no generó el código de recogida'], 400);
            }
        } else {
            if ((int)$ped['pin_recogida_bloqueado'] === 1) {
                jout(['ok' => false, 'error' => 'Demasiados intentos fallidos. Este PIN quedó bloqueado temporalmente -- usa el QR o contacta soporte.'], 423);
            }
            if (!$ped['pin_recogida'] || !hash_equals($ped['pin_recogida'], (string)$data['pin'])) {
                $r = registrar_intento_pin_fallido($pid, 'recogida', $user['id'], 'recogida');
                if ($r['bloqueado']) jout(['ok' => false, 'error' => 'PIN incorrecto 3 veces: se bloqueó 15 minutos y soporte fue notificado. Usa el QR mientras tanto.'], 423);
                jout(['ok' => false, 'error' => "PIN incorrecto ({$r['intentos']}/3 intentos)."], 400);
            }
        }

        db()->prepare("UPDATE pedidos SET confirmado_repartidor_recogida = 1, progreso_repartidor = 'recolectado', pin_recogida_intentos = 0 WHERE id = ?")->execute([$pid]);

        $yaConfirmadoVendedor = (int)$ped['confirmado_vendedor_recogida'] === 1;
        if ($yaConfirmadoVendedor) {
            db()->prepare("UPDATE pedidos SET estado = 'en_camino', progreso_repartidor = 'camino_cliente' WHERE id = ?")->execute([$pid]);
            crear_notificacion((int)$ped['comprador_id'], 'pedido', '¡Tu pedido va en camino!', "El repartidor recogió tu pedido #{$ped['numero_pedido']} y va hacia ti.", $pid);
        }
        jout(['ok' => true, 'en_camino' => $yaConfirmadoVendedor]);
        break;

    // ─── Genera el código QR de entrega al llegar al destino — el comprador
    // lo escanea desde pedidos_tracking.php (action=confirmar_entrega) para
    // cerrar el pedido. Reutilizable: si ya existe un token para este pedido
    // (p. ej. la pantalla se recargó) devuelve el mismo, no genera uno nuevo. ───
    case 'generar_qr_entrega':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];
        $sel = db()->prepare("SELECT * FROM pedidos WHERE id = ? AND repartidor_id = ? AND estado = 'en_camino'");
        $sel->execute([$pid, $user['id']]);
        $ped = $sel->fetch();
        if (!$ped) jout(['ok' => false, 'error' => 'Pedido no encontrado o no está en camino'], 404);

        $token = $ped['qr_entrega_token'] ?: bin2hex(random_bytes(16));
        $pin = $ped['pin_entrega'] ?: generar_pin();
        db()->prepare("UPDATE pedidos SET qr_entrega_token = ?, pin_entrega = ?, qr_entrega_generado_at = COALESCE(qr_entrega_generado_at, NOW()) WHERE id = ?")
            ->execute([$token, $pin, $pid]);
        jout(['ok' => true, 'qr_token' => $token, 'pin' => $pin]);
        break;

    // ─── Descartar un pedido disponible: NO lo bloquea para el resto de la flota ───
    case 'rechazar':
        require_fields($data, ['pedido_id']);
        $st = db()->prepare(
            "INSERT IGNORE INTO pedido_repartidor_descartes (pedido_id, repartidor_id) VALUES (?, ?)"
        );
        $st->execute([(int)$data['pedido_id'], $user['id']]);
        jout(['ok' => true]);
        break;

    case 'mis_entregas':
        $st = db()->prepare(
            "SELECT p.*,
                    v.nombre as vendedor_nombre,
                    c.nombre as comprador_nombre, c.telefono as comprador_telefono,
                    t.nombre AS tienda_nombre, t.lat AS tienda_lat, t.lng AS tienda_lng, t.direccion AS tienda_direccion
             FROM pedidos p
             JOIN usuarios v ON v.id = p.vendedor_id
             JOIN usuarios c ON c.id = p.comprador_id
             LEFT JOIN (
                 SELECT i.pedido_id, MIN(t2.id) AS tienda_id
                 FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id JOIN tiendas t2 ON t2.id = pr.tienda_id
                 GROUP BY i.pedido_id
             ) pt ON pt.pedido_id = p.id
             LEFT JOIN tiendas t ON t.id = pt.tienda_id
             WHERE p.repartidor_id = ? ORDER BY p.created_at DESC"
        );
        $st->execute([$user['id']]);
        $pedidos = $st->fetchAll();
        adjuntar_items_con_stock($pedidos);
        jout(['ok' => true, 'pedidos' => $pedidos]);
        break;

    // ─── Avanzar el sub-estado de una entrega en curso ───
    case 'avanzar_estado':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];

        $sel = db()->prepare("SELECT progreso_repartidor FROM pedidos WHERE id = ? AND repartidor_id = ? AND estado = 'en_camino'");
        $sel->execute([$pid, $user['id']]);
        if ($sel->rowCount() === 0) jout(['ok' => false, 'error' => 'Pedido no encontrado o no está en curso'], 404);
        $actual = $sel->fetchColumn();

        $idx = array_search($actual, PROGRESO_SECUENCIA, true);
        if ($idx === false || $idx === count(PROGRESO_SECUENCIA) - 1) {
            jout(['ok' => false, 'error' => 'No hay siguiente estado disponible'], 400);
        }
        $siguiente = PROGRESO_SECUENCIA[$idx + 1];

        if (isset($data['lat'], $data['lng'])) {
            db()->prepare("UPDATE pedidos SET progreso_repartidor = ?, repartidor_lat = ?, repartidor_lng = ? WHERE id = ?")
                ->execute([$siguiente, $data['lat'], $data['lng'], $pid]);
        } else {
            db()->prepare("UPDATE pedidos SET progreso_repartidor = ? WHERE id = ?")->execute([$siguiente, $pid]);
        }

        $compradorSt = db()->prepare("SELECT comprador_id FROM pedidos WHERE id = ?");
        $compradorSt->execute([$pid]);
        $compradorId = (int)$compradorSt->fetchColumn();
        $labels = ['camino_tienda' => 'El repartidor va hacia la tienda', 'recolectado' => 'El repartidor recolectó tu pedido', 'camino_cliente' => 'El repartidor va en camino a tu dirección'];
        if ($compradorId && isset($labels[$siguiente])) {
            crear_notificacion($compradorId, 'pedido', $labels[$siguiente], "Pedido #{$pid}", $pid);
        }

        jout(['ok' => true, 'progreso_repartidor' => $siguiente]);
        break;

    // ─── COMPLETAR PEDIDO — respaldo manual del repartidor. El camino principal
    // ahora es que el COMPRADOR escanee el QR de entrega (pedidos_tracking.php,
    // action=confirmar_entrega) — este endpoint queda para cuando el comprador
    // de verdad no puede escanear (sin smartphone, app caída, etc.). Usa la
    // misma función de liquidación que ese camino, ver conexion.php. ───
    case 'completar':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];
        try {
            $resultado = finalizar_entrega_pedido($pid, $user['id']);
        } catch (Throwable $e) {
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        jout(['ok' => true] + $resultado);
        break;

    // ─── Switch En línea / Fuera de línea ───
    case 'toggle_en_linea':
        $en = !empty($data['en_linea']) ? 1 : 0;
        $st = db()->prepare("UPDATE usuarios SET en_linea = ? WHERE id = ? AND rol = 'repartidor'");
        $st->execute([$en, $user['id']]);
        jout(['ok' => true, 'en_linea' => (bool)$en]);
        break;

    // ─── Wallet del repartidor ───
    case 'wallet':
        $w = db()->prepare("SELECT saldo FROM wallets WHERE usuario_id = ?");
        $w->execute([$user['id']]);
        $saldo = (float)($w->fetchColumn() ?: 0);

        $mov = db()->prepare(
            "SELECT id, tipo, monto, referencia, pedido_id, created_at
             FROM wallet_movimientos
             WHERE usuario_id = ?
             ORDER BY created_at DESC LIMIT 50"
        );
        $mov->execute([$user['id']]);

        $hoy   = (float)db()->query("SELECT COALESCE(SUM(monto),0) FROM wallet_movimientos WHERE usuario_id = {$user['id']} AND tipo = 'entrega' AND DATE(created_at) = CURDATE()")->fetchColumn();
        $semana = (float)db()->query("SELECT COALESCE(SUM(monto),0) FROM wallet_movimientos WHERE usuario_id = {$user['id']} AND tipo = 'entrega' AND YEARWEEK(created_at,1) = YEARWEEK(CURDATE(),1)")->fetchColumn();
        $entregas_hoy = (int)db()->query("SELECT COUNT(*) FROM pedidos WHERE repartidor_id = {$user['id']} AND estado = 'entregado' AND DATE(created_at) = CURDATE()")->fetchColumn();

        jout([
            'ok' => true,
            'saldo' => $saldo,
            'movimientos' => $mov->fetchAll(),
            'stats' => [
                'hoy' => $hoy,
                'semana' => $semana,
                'entregas_hoy' => $entregas_hoy,
            ],
        ]);
        break;

    // ─── Perfil del repartidor: foto + descripción personal ───
    case 'mi_perfil':
        $st = db()->prepare(
            "SELECT id, nombre, foto_perfil, descripcion, telefono,
                    repartidor_calificacion_promedio, repartidor_total_resenas
             FROM usuarios WHERE id = ?"
        );
        $st->execute([$user['id']]);
        $entregas = (int)db()->query("SELECT COUNT(*) FROM pedidos WHERE repartidor_id = {$user['id']} AND estado = 'entregado'")->fetchColumn();
        $perfil = $st->fetch();
        $perfil['entregas_completadas'] = $entregas;
        jout(['ok' => true, 'perfil' => $perfil]);
        break;

    case 'actualizar_perfil':
        $foto = null;
        if (!empty($data['foto_perfil']) && str_starts_with($data['foto_perfil'], 'data:image')) {
            $foto = save_base64_image($data['foto_perfil'], 'perfiles', 'rep_' . $user['id']);
        }
        $st = db()->prepare(
            "UPDATE usuarios SET
                descripcion = COALESCE(?, descripcion),
                foto_perfil = COALESCE(?, foto_perfil)
             WHERE id = ?"
        );
        $st->execute([$data['descripcion'] ?? null, $foto, $user['id']]);
        jout(['ok' => true, 'foto_perfil' => $foto]);
        break;

    // ─── Reseñas recibidas por el repartidor ───
    case 'mis_resenas':
        $st = db()->prepare(
            "SELECT cr.id, cr.estrellas, cr.comentario, cr.created_at, u.nombre AS comprador_nombre
             FROM calificaciones_repartidor cr
             JOIN usuarios u ON u.id = cr.comprador_id
             WHERE cr.repartidor_id = ?
             ORDER BY cr.created_at DESC LIMIT 100"
        );
        $st->execute([$user['id']]);
        jout(['ok' => true, 'resenas' => $st->fetchAll()]);
        break;

    // ─── Ganancias y tiempo invertido, agrupado por día (para la gráfica de "Mi cuenta") ───
    case 'ganancias':
        $stG = db()->prepare(
            "SELECT DATE(created_at) AS fecha, SUM(monto) AS monto
             FROM wallet_movimientos
             WHERE usuario_id = ? AND tipo = 'entrega'
             GROUP BY DATE(created_at) ORDER BY fecha ASC LIMIT 30"
        );
        $stG->execute([$user['id']]);

        $stT = db()->prepare(
            "SELECT DATE(updated_at) AS fecha, SUM(TIMESTAMPDIFF(MINUTE, repartidor_asignado_at, updated_at)) AS minutos
             FROM pedidos
             WHERE repartidor_id = ? AND estado = 'entregado' AND repartidor_asignado_at IS NOT NULL
             GROUP BY DATE(updated_at) ORDER BY fecha ASC LIMIT 30"
        );
        $stT->execute([$user['id']]);

        jout(['ok' => true, 'ganancias_por_dia' => $stG->fetchAll(), 'minutos_por_dia' => $stT->fetchAll()]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
