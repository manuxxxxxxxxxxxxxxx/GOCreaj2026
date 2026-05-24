<?php
require_once __DIR__ . '/conexion.php';

$action = $_GET['action'] ?? 'listar';

switch ($action) {

    case 'listar':
        $municipio = $_GET['municipio'] ?? null;
        $cat = $_GET['categoria'] ?? null;
        $q = "SELECT p.*, t.nombre as tienda_nombre, t.municipio, t.lat as tienda_lat, t.lng as tienda_lng, t.vendedor_id FROM productos p JOIN tiendas t ON t.id = p.tienda_id WHERE p.activo = 1 AND t.activo = 1";
        $params = [];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        if ($cat) { $q .= " AND p.categoria = ?"; $params[] = $cat; }
        $q .= " ORDER BY p.created_at DESC LIMIT 200";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'productos' => $st->fetchAll()]);
        break;

    case 'reels':
        $municipio = $_GET['municipio'] ?? null;
        $q = "SELECT p.*, t.nombre as tienda_nombre, t.municipio, t.vendedor_id,
              (SELECT COUNT(*) FROM video_likes WHERE producto_id = p.id) as likes_count,
              (SELECT COUNT(*) FROM video_comentarios WHERE producto_id = p.id) as comentarios_count,
              (SELECT COUNT(*) FROM video_compartidos WHERE producto_id = p.id) as compartidos_count
              FROM productos p JOIN tiendas t ON t.id = p.tienda_id
              WHERE p.es_reel = 1 AND p.activo = 1";
        $params = [];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        $q .= " ORDER BY p.created_at DESC LIMIT 100";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'reels' => $st->fetchAll()]);
        break;

    case 'detalle':
        $id = (int)($_GET['id'] ?? 0);
        $st = db()->prepare("SELECT p.*, t.nombre as tienda_nombre, t.municipio, t.vendedor_id FROM productos p JOIN tiendas t ON t.id = p.tienda_id WHERE p.id = ?");
        $st->execute([$id]);
        $p = $st->fetch();
        if (!$p) jout(['ok' => false, 'error' => 'No existe'], 404);
        jout(['ok' => true, 'producto' => $p]);
        break;

    case 'municipios':
        $st = db()->query("SELECT DISTINCT municipio FROM tiendas WHERE activo = 1");
        jout(['ok' => true, 'municipios' => array_column($st->fetchAll(), 'municipio')]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
