<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user || $user['rol'] !== 'vendedor') jout(['ok' => false, 'error' => 'Acceso denegado'], 403);

$action = $_GET['action'] ?? 'mis_tiendas';
$data = jread();

switch ($action) {

    case 'mis_tiendas':
        $st = db()->prepare("SELECT * FROM tiendas WHERE vendedor_id = ?");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'tiendas' => $st->fetchAll()]);
        break;

    case 'crear_tienda':
        require_fields($data, ['nombre','municipio','lat','lng']);
        $st = db()->prepare("INSERT INTO tiendas (vendedor_id, nombre, descripcion, municipio, direccion, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $st->execute([
            $user['id'],
            $data['nombre'],
            $data['descripcion'] ?? '',
            $data['municipio'],
            $data['direccion'] ?? '',
            $data['lat'],
            $data['lng']
        ]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'actualizar_tienda':
        require_fields($data, ['tienda_id']);
        $portada = null;
        $logo    = null;
        if (!empty($data['portada']) && str_starts_with($data['portada'], 'data:image'))
            $portada = save_base64_image($data['portada'], 'tiendas', 'portada_' . $user['id']);
        if (!empty($data['logo']) && str_starts_with($data['logo'], 'data:image'))
            $logo = save_base64_image($data['logo'], 'tiendas', 'logo_' . $user['id']);

        $sets   = [];
        $params = [];
        $map = [
            'nombre'       => $data['nombre']        ?? null,
            'descripcion'  => $data['descripcion']   ?? null,
            'municipio'    => $data['municipio']      ?? null,
            'direccion'    => $data['direccion']      ?? null,
            'hora_apertura'=> $data['hora_apertura']  ?? null,
            'hora_cierre'  => $data['hora_cierre']    ?? null,
            'categoria'    => $data['categoria']      ?? null,
        ];
        foreach ($map as $col => $val) {
            if ($val !== null) { $sets[] = "$col = ?"; $params[] = $val; }
        }
        if (!empty($data['lat'])) { $sets[] = "lat = ?"; $params[] = $data['lat']; }
        if (!empty($data['lng'])) { $sets[] = "lng = ?"; $params[] = $data['lng']; }
        if ($portada)            { $sets[] = "portada = ?"; $params[] = $portada; }
        if ($logo)               { $sets[] = "logo = ?";    $params[] = $logo; }
        if (empty($sets)) jout(['ok' => false, 'error' => 'Nada que actualizar'], 400);
        $params[] = $data['tienda_id'];
        $params[] = $user['id'];
        $st = db()->prepare("UPDATE tiendas SET " . implode(', ', $sets) . " WHERE id = ? AND vendedor_id = ?");
        $st->execute($params);
        jout(['ok' => true]);
        break;

    case 'mis_productos':
        $st = db()->prepare("SELECT p.* FROM productos p JOIN tiendas t ON t.id = p.tienda_id WHERE t.vendedor_id = ? ORDER BY p.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'productos' => $st->fetchAll()]);
        break;

    case 'crear_producto':
        require_fields($data, ['tienda_id','nombre','precio']);
        $imagen = !empty($data['imagen']) ? save_base64_image($data['imagen'], 'productos', 'p_' . $user['id']) : null;
        $video = $data['video'] ?? null;
        $st = db()->prepare("INSERT INTO productos (tienda_id, nombre, descripcion, precio, stock, imagen, video, categoria, es_reel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $st->execute([
            $data['tienda_id'],
            $data['nombre'],
            $data['descripcion'] ?? '',
            $data['precio'],
            $data['stock'] ?? 0,
            $imagen,
            $video,
            $data['categoria'] ?? 'general',
            !empty($data['es_reel']) ? 1 : 0
        ]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'actualizar_producto':
        require_fields($data, ['producto_id']);
        $st = db()->prepare("UPDATE productos SET nombre = COALESCE(?,nombre), descripcion = COALESCE(?,descripcion), precio = COALESCE(?,precio), stock = COALESCE(?,stock), categoria = COALESCE(?,categoria), activo = COALESCE(?,activo) WHERE id = ?");
        $st->execute([
            $data['nombre'] ?? null,
            $data['descripcion'] ?? null,
            $data['precio'] ?? null,
            $data['stock'] ?? null,
            $data['categoria'] ?? null,
            $data['activo'] ?? null,
            $data['producto_id']
        ]);
        jout(['ok' => true]);
        break;

    case 'mis_ventas':
        $st = db()->prepare("SELECT p.*, u.nombre as comprador_nombre FROM pedidos p JOIN usuarios u ON u.id = p.comprador_id WHERE p.vendedor_id = ? ORDER BY p.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'pedidos' => $st->fetchAll()]);
        break;

    case 'preparar_pedido':
        require_fields($data, ['pedido_id','estado']);
        $st = db()->prepare("UPDATE pedidos SET estado = ? WHERE id = ? AND vendedor_id = ?");
        $st->execute([$data['estado'], $data['pedido_id'], $user['id']]);
        jout(['ok' => true]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
