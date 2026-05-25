<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user || $user['rol'] !== 'repartidor') jout(['ok' => false, 'error' => 'Acceso denegado'], 403);

$action = $_GET['action'] ?? 'disponibles';
$data = jread();

// Configuración de comisiones (centralizada)
const COMISION_PLATAFORMA_PCT = 0.10;   // 10% para la plataforma
const COMISION_REPARTIDOR_PCT = 0.20;   // 20% del subtotal para el repartidor (envío base)

switch ($action) {

    case 'disponibles':
        // Solo si el repartidor está EN LÍNEA verá pedidos. Si está fuera de línea, lista vacía.
        $r = db()->prepare("SELECT en_linea FROM usuarios WHERE id = ?");
        $r->execute([$user['id']]);
        $en_linea = (int)$r->fetchColumn();
        if (!$en_linea) { jout(['ok' => true, 'pedidos' => [], 'en_linea' => false]); }

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
             LEFT JOIN tiendas t ON t.vendedor_id = v.id
             WHERE p.repartidor_id IS NULL
               AND p.estado = 'preparacion'
               AND p.pago_estado = 'pagado'
             ORDER BY p.created_at ASC"
        );
        $st->execute([COMISION_REPARTIDOR_PCT]);
        jout(['ok' => true, 'pedidos' => $st->fetchAll(), 'en_linea' => true]);
        break;

    case 'aceptar':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];

        try {
            db()->beginTransaction();
            $check = db()->prepare("SELECT id, comprador_id, vendedor_id FROM pedidos WHERE id = ? AND repartidor_id IS NULL FOR UPDATE");
            $check->execute([$pid]);
            $row = $check->fetch();
            if (!$row) { db()->rollBack(); jout(['ok' => false, 'error' => 'Pedido ya tomado'], 409); }

            db()->prepare("UPDATE pedidos SET repartidor_id = ?, estado = 'en_camino' WHERE id = ?")
                ->execute([$user['id'], $pid]);

            // Notificar al comprador + vendedor
            $msg = "🛵 Tu pedido fue aceptado por el repartidor {$user['nombre']}. Va en camino.";
            $msgV = "🛵 Repartidor {$user['nombre']} aceptó el pedido #{$pid}.";
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$row['comprador_id'], $msg]);
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$row['vendedor_id'], $msgV]);

            db()->commit();
            jout(['ok' => true]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'rechazar':
        require_fields($data, ['pedido_id']);
        $st = db()->prepare("UPDATE pedidos SET estado = 'rechazado_repartidor' WHERE id = ?");
        $st->execute([$data['pedido_id']]);
        jout(['ok' => true]);
        break;

    case 'mis_entregas':
        $st = db()->prepare(
            "SELECT p.*, v.nombre as vendedor_nombre, c.nombre as comprador_nombre
             FROM pedidos p
             JOIN usuarios v ON v.id = p.vendedor_id
             JOIN usuarios c ON c.id = p.comprador_id
             WHERE p.repartidor_id = ? ORDER BY p.created_at DESC"
        );
        $st->execute([$user['id']]);
        jout(['ok' => true, 'pedidos' => $st->fetchAll()]);
        break;

    // ─── COMPLETAR PEDIDO — MOTOR DE COMISIONES TRANSACCIONAL ───
    case 'completar':
        require_fields($data, ['pedido_id']);
        $pid = (int)$data['pedido_id'];

        try {
            db()->beginTransaction();

            $sel = db()->prepare("SELECT * FROM pedidos WHERE id = ? AND repartidor_id = ? FOR UPDATE");
            $sel->execute([$pid, $user['id']]);
            $ped = $sel->fetch();
            if (!$ped) { db()->rollBack(); jout(['ok' => false, 'error' => 'Pedido no encontrado'], 404); }
            if ($ped['estado'] === 'entregado') { db()->rollBack(); jout(['ok' => false, 'error' => 'Pedido ya entregado'], 400); }

            $total = (float)$ped['total'];
            $comision    = round($total * COMISION_PLATAFORMA_PCT, 2);
            $ganancia_rp = round($total * COMISION_REPARTIDOR_PCT, 2);
            $ganancia_vd = round($total - $comision - $ganancia_rp, 2);

            // 1. Marcar pedido entregado y guardar los montos calculados
            db()->prepare(
                "UPDATE pedidos
                 SET estado = 'entregado',
                     comision_plataforma = ?,
                     total_repartidor = ?,
                     total_vendedor = ?
                 WHERE id = ?"
            )->execute([$comision, $ganancia_rp, $ganancia_vd, $pid]);

            // 2. Inyectar saldo neto al VENDEDOR
            db()->prepare(
                "INSERT INTO wallets (usuario_id, saldo) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)"
            )->execute([(int)$ped['vendedor_id'], $ganancia_vd]);
            db()->prepare(
                "INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia, pedido_id)
                 VALUES (?, 'venta', ?, 'Venta neta', ?)"
            )->execute([(int)$ped['vendedor_id'], $ganancia_vd, $pid]);

            // 3. Inyectar saldo neto al REPARTIDOR
            db()->prepare(
                "INSERT INTO wallets (usuario_id, saldo) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)"
            )->execute([$user['id'], $ganancia_rp]);
            db()->prepare(
                "INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia, pedido_id)
                 VALUES (?, 'entrega', ?, 'Entrega completada', ?)"
            )->execute([$user['id'], $ganancia_rp, $pid]);

            // 4. Notificar a las dos partes
            db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
                ->execute([$user['id'], (int)$ped['comprador_id'], '✅ Pedido entregado. ¡Gracias por preferirnos!']);

            db()->commit();
            jout([
                'ok' => true,
                'comision' => $comision,
                'ganancia_repartidor' => $ganancia_rp,
                'ganancia_vendedor' => $ganancia_vd,
            ]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
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

        // Estadísticas rápidas
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

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
