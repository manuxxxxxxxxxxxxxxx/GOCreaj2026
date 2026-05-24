<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user || $user['rol'] !== 'repartidor') jout(['ok' => false, 'error' => 'Acceso denegado'], 403);

$action = $_GET['action'] ?? 'disponibles';
$data = jread();

switch ($action) {

    case 'disponibles':
        $st = db()->prepare("SELECT p.*, v.nombre as vendedor_nombre, c.nombre as comprador_nombre, t.lat as tienda_lat, t.lng as tienda_lng, t.direccion as tienda_direccion FROM pedidos p JOIN usuarios v ON v.id = p.vendedor_id JOIN usuarios c ON c.id = p.comprador_id LEFT JOIN tiendas t ON t.vendedor_id = v.id WHERE p.repartidor_id IS NULL AND p.estado = 'preparacion' ORDER BY p.created_at ASC");
        $st->execute();
        jout(['ok' => true, 'pedidos' => $st->fetchAll()]);
        break;

    case 'aceptar':
        require_fields($data, ['pedido_id']);
        $check = db()->prepare("SELECT id FROM pedidos WHERE id = ? AND repartidor_id IS NULL");
        $check->execute([$data['pedido_id']]);
        if (!$check->fetch()) jout(['ok' => false, 'error' => 'Pedido ya tomado'], 409);
        $st = db()->prepare("UPDATE pedidos SET repartidor_id = ?, estado = 'en_camino' WHERE id = ?");
        $st->execute([$user['id'], $data['pedido_id']]);
        jout(['ok' => true]);
        break;

    case 'rechazar':
        require_fields($data, ['pedido_id']);
        $st = db()->prepare("UPDATE pedidos SET estado = 'rechazado_repartidor' WHERE id = ?");
        $st->execute([$data['pedido_id']]);
        jout(['ok' => true]);
        break;

    case 'mis_entregas':
        $st = db()->prepare("SELECT p.*, v.nombre as vendedor_nombre, c.nombre as comprador_nombre FROM pedidos p JOIN usuarios v ON v.id = p.vendedor_id JOIN usuarios c ON c.id = p.comprador_id WHERE p.repartidor_id = ? ORDER BY p.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'pedidos' => $st->fetchAll()]);
        break;

    case 'completar':
        require_fields($data, ['pedido_id']);
        $st = db()->prepare("UPDATE pedidos SET estado = 'entregado' WHERE id = ? AND repartidor_id = ?");
        $st->execute([$data['pedido_id'], $user['id']]);
        jout(['ok' => true]);
        break;

    case 'toggle_en_linea':
        $st = db()->prepare("UPDATE usuarios SET en_linea = ? WHERE id = ? AND rol = 'repartidor'");
        $st->execute([$data['en_linea'] ? 1 : 0, $user['id']]);
        jout(['ok' => true, 'en_linea' => (bool)$data['en_linea']]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
