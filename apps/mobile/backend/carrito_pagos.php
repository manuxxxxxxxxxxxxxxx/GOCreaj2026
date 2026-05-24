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
        if (!in_array($data['metodo_pago'], ['efectivo','tarjeta'])) jout(['ok' => false, 'error' => 'Metodo invalido'], 400);

        $st = db()->prepare("SELECT c.cantidad, p.id as producto_id, p.precio, t.vendedor_id FROM carrito c JOIN productos p ON p.id = c.producto_id JOIN tiendas t ON t.id = p.tienda_id WHERE c.usuario_id = ?");
        $st->execute([$user['id']]);
        $items = $st->fetchAll();
        if (!$items) jout(['ok' => false, 'error' => 'Carrito vacio'], 400);

        $porVendedor = [];
        foreach ($items as $it) {
            $porVendedor[$it['vendedor_id']][] = $it;
        }

        $pedidoIds = [];
        db()->beginTransaction();
        try {
            foreach ($porVendedor as $vendedor_id => $arr) {
                $total = 0;
                foreach ($arr as $i) $total += $i['precio'] * $i['cantidad'];
                $ins = db()->prepare("INSERT INTO pedidos (comprador_id, vendedor_id, total, metodo_pago, direccion_entrega, lat_entrega, lng_entrega) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $ins->execute([
                    $user['id'],
                    $vendedor_id,
                    round($total, 2),
                    $data['metodo_pago'],
                    $data['direccion_entrega'],
                    $data['lat'] ?? null,
                    $data['lng'] ?? null
                ]);
                $pid = (int)db()->lastInsertId();
                $pedidoIds[] = $pid;
                $insItem = db()->prepare("INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
                foreach ($arr as $i) {
                    $insItem->execute([$pid, $i['producto_id'], $i['cantidad'], $i['precio']]);
                }
            }
            db()->prepare("DELETE FROM carrito WHERE usuario_id = ?")->execute([$user['id']]);
            db()->commit();
            jout(['ok' => true, 'pedidos' => $pedidoIds]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    case 'mis_pedidos':
        $st = db()->prepare("SELECT p.*, v.nombre as vendedor_nombre, r.nombre as repartidor_nombre FROM pedidos p JOIN usuarios v ON v.id = p.vendedor_id LEFT JOIN usuarios r ON r.id = p.repartidor_id WHERE p.comprador_id = ? ORDER BY p.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'pedidos' => $st->fetchAll()]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
