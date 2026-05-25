<?php
require_once __DIR__ . '/conexion.php';

$action = $_GET['action'] ?? 'listar';

switch ($action) {

    case 'listar':
        $municipio = $_GET['municipio'] ?? null;
        $cat       = $_GET['categoria']  ?? null;
        $page      = max(1, (int)($_GET['page'] ?? 1));
        $limit     = min(60, max(1, (int)($_GET['limit'] ?? 40)));
        $offset    = ($page - 1) * $limit;
        $q = "SELECT p.*, t.nombre as tienda_nombre, t.municipio, t.lat as tienda_lat, t.lng as tienda_lng, t.vendedor_id
              FROM productos p JOIN tiendas t ON t.id = p.tienda_id
              WHERE p.activo = 1 AND t.activo = 1";
        $params = [];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        if ($cat)       { $q .= " AND p.categoria = ?"; $params[] = $cat; }
        $q .= " ORDER BY p.created_at DESC LIMIT $limit OFFSET $offset";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'productos' => $st->fetchAll(), 'page' => $page, 'limit' => $limit]);
        break;

    case 'buscar':
        $q_str  = trim($_GET['q']        ?? '');
        $municipio = $_GET['municipio']  ?? null;
        $cat    = $_GET['categoria']     ?? null;
        $page   = max(1, (int)($_GET['page']  ?? 1));
        $limit  = min(60, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $con_coords = !empty($_GET['con_coordenadas']);

        $params = [];
        if ($q_str !== '') {
            // Try FULLTEXT first, fall back to LIKE
            try {
                $base = "SELECT p.*, t.nombre as tienda_nombre, t.municipio,
                                 t.lat as tienda_lat, t.lng as tienda_lng,
                                 t.vendedor_id,
                                 MATCH(p.nombre,p.descripcion) AGAINST(? IN BOOLEAN MODE) AS relevancia
                          FROM productos p JOIN tiendas t ON t.id = p.tienda_id
                          WHERE p.activo = 1 AND t.activo = 1
                            AND MATCH(p.nombre,p.descripcion) AGAINST(? IN BOOLEAN MODE)";
                $params = [$q_str . '*', $q_str . '*'];
                if ($municipio) { $base .= " AND t.municipio = ?"; $params[] = $municipio; }
                if ($cat)       { $base .= " AND p.categoria = ?"; $params[] = $cat; }
                if ($con_coords) $base .= " AND t.lat IS NOT NULL AND t.lng IS NOT NULL";
                $base .= " ORDER BY relevancia DESC LIMIT $limit OFFSET $offset";
                $st = db()->prepare($base);
                $st->execute($params);
                $rows = $st->fetchAll();
            } catch (PDOException $e) {
                // FULLTEXT not available — LIKE fallback
                $like = '%' . $q_str . '%';
                $base = "SELECT p.*, t.nombre as tienda_nombre, t.municipio,
                                 t.lat as tienda_lat, t.lng as tienda_lng, t.vendedor_id
                          FROM productos p JOIN tiendas t ON t.id = p.tienda_id
                          WHERE p.activo = 1 AND t.activo = 1
                            AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
                $params = [$like, $like];
                if ($municipio) { $base .= " AND t.municipio = ?"; $params[] = $municipio; }
                if ($cat)       { $base .= " AND p.categoria = ?"; $params[] = $cat; }
                if ($con_coords) $base .= " AND t.lat IS NOT NULL AND t.lng IS NOT NULL";
                $base .= " ORDER BY p.created_at DESC LIMIT $limit OFFSET $offset";
                $st = db()->prepare($base);
                $st->execute($params);
                $rows = $st->fetchAll();
            }
        } else {
            $base = "SELECT p.*, t.nombre as tienda_nombre, t.municipio,
                             t.lat as tienda_lat, t.lng as tienda_lng, t.vendedor_id
                      FROM productos p JOIN tiendas t ON t.id = p.tienda_id
                      WHERE p.activo = 1 AND t.activo = 1";
            $params = [];
            if ($municipio) { $base .= " AND t.municipio = ?"; $params[] = $municipio; }
            if ($cat)       { $base .= " AND p.categoria = ?"; $params[] = $cat; }
            if ($con_coords) $base .= " AND t.lat IS NOT NULL AND t.lng IS NOT NULL";
            $base .= " ORDER BY p.created_at DESC LIMIT $limit OFFSET $offset";
            $st = db()->prepare($base);
            $st->execute($params);
            $rows = $st->fetchAll();
        }
        jout(['ok' => true, 'productos' => $rows, 'q' => $q_str, 'page' => $page, 'limit' => $limit, 'total' => count($rows)]);
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

    case 'municipios_catalogo':
        $st = db()->query("SELECT id, nombre, departamento, lat, lng FROM municipios_sv ORDER BY departamento, nombre");
        jout(['ok' => true, 'municipios' => $st->fetchAll()]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
