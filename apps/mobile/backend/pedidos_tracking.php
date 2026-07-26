<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'estado';
$data = jread();

function calcular_trafico(float $km): array {
    $hora = (int)date('H');
    $factor = 1.0;
    $estado = 'fluido';
    if (($hora >= 7 && $hora <= 9) || ($hora >= 17 && $hora <= 19)) {
        $factor = 1.8;
        $estado = 'pesado';
    } else if (($hora >= 12 && $hora <= 14)) {
        $factor = 1.4;
        $estado = 'moderado';
    }
    $minutos = (int)ceil(($km / 30) * 60 * $factor);
    return ['tiempo_estimado' => $minutos, 'trafico' => $estado];
}

switch ($action) {

    case 'actualizar_ubicacion':
        if ($user['rol'] !== 'repartidor') jout(['ok' => false, 'error' => 'Solo repartidor'], 403);
        require_fields($data, ['pedido_id','lat','lng']);

        $st = db()->prepare("SELECT lat_entrega, lng_entrega FROM pedidos WHERE id = ? AND repartidor_id = ?");
        $st->execute([$data['pedido_id'], $user['id']]);
        $p = $st->fetch();
        if (!$p) jout(['ok' => false, 'error' => 'No autorizado'], 403);

        $info = ['tiempo_estimado' => null, 'trafico' => null];
        if ($p['lat_entrega'] && $p['lng_entrega']) {
            $km = distancia_km((float)$data['lat'], (float)$data['lng'], (float)$p['lat_entrega'], (float)$p['lng_entrega']);
            $info = calcular_trafico($km);
        }

        // Compatibilidad: si existen columnas legacy las usa; siempre escribe repartidor_lat/lng nuevas
        $up = db()->prepare("UPDATE pedidos SET repartidor_lat = ?, repartidor_lng = ?, tiempo_estimado = ?, trafico = ? WHERE id = ?");
        try { $up->execute([$data['lat'], $data['lng'], $info['tiempo_estimado'], $info['trafico'], $data['pedido_id']]); }
        catch (PDOException $e) {
            // Fallback en esquemas viejos
            db()->prepare("UPDATE pedidos SET repartidor_lat = ?, repartidor_lng = ? WHERE id = ?")
                ->execute([$data['lat'], $data['lng'], $data['pedido_id']]);
        }
        jout(['ok' => true, 'tracking' => $info]);
        break;

    case 'estado':
        $pid = (int)($_GET['pedido_id'] ?? 0);
        $st = db()->prepare(
            "SELECT p.*,
                    v.nombre as vendedor_nombre,
                    r.nombre as repartidor_nombre, r.foto_perfil as repartidor_foto, r.telefono as repartidor_telefono,
                    r.repartidor_calificacion_promedio, r.repartidor_total_resenas,
                    (SELECT COUNT(*) FROM pedidos WHERE repartidor_id = r.id AND estado = 'entregado') AS repartidor_entregas_completadas,
                    c.nombre as comprador_nombre, c.telefono as comprador_telefono,
                    t.nombre as tienda_nombre, t.lat as tienda_lat, t.lng as tienda_lng, t.direccion as tienda_direccion
             FROM pedidos p
             JOIN usuarios v ON v.id = p.vendedor_id
             LEFT JOIN usuarios r ON r.id = p.repartidor_id
             JOIN usuarios c ON c.id = p.comprador_id
             LEFT JOIN tiendas t ON t.vendedor_id = v.id
             WHERE p.id = ?"
        );
        $st->execute([$pid]);
        $pedido = $st->fetch();
        if (!$pedido) jout(['ok' => false, 'error' => 'No existe'], 404);
        if (!in_array($user['id'], [$pedido['comprador_id'], $pedido['vendedor_id'], $pedido['repartidor_id']]) && $user['rol'] !== 'admin') {
            jout(['ok' => false, 'error' => 'No autorizado'], 403);
        }
        $items = db()->prepare("SELECT i.*, p.nombre, p.imagen FROM pedido_items i JOIN productos p ON p.id = i.producto_id WHERE i.pedido_id = ?");
        $items->execute([$pid]);
        $pedido['items'] = $items->fetchAll();
        jout(['ok' => true, 'pedido' => $pedido]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
