<?php
require_once __DIR__ . '/conexion.php';

$action = $_GET['action'] ?? 'listar';

switch ($action) {

    case 'listar':
        $municipio = $_GET['municipio'] ?? null;
        $cat       = $_GET['categoria']  ?? null;
        $page      = max(1, (int)($_GET['page'] ?? 1));
        $limit     = min(60, max(1, (int)($_GET['limit'] ?? 20))); // ⚡ paginación de 20 en 20
        $offset    = ($page - 1) * $limit;

        $q = "SELECT p.*, t.nombre as tienda_nombre, t.municipio, t.lat as tienda_lat, t.lng as tienda_lng, t.vendedor_id,
                     t.calificacion_promedio as tienda_calificacion
              FROM productos p JOIN tiendas t ON t.id = p.tienda_id
              WHERE p.activo = 1 AND t.activo = 1
                AND (p.estado_stock IS NULL OR p.estado_stock <> 'agotado')
                AND p.stock > 0";
        $params = [];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        if ($cat)       { $q .= " AND p.categoria = ?"; $params[] = $cat; }
        $q .= " ORDER BY p.created_at DESC LIMIT $limit OFFSET $offset";
        $st = db()->prepare($q);
        $st->execute($params);
        $rows = $st->fetchAll();

        // Conteo total para saber si hay más páginas
        $qc = "SELECT COUNT(*) FROM productos p JOIN tiendas t ON t.id = p.tienda_id
               WHERE p.activo = 1 AND t.activo = 1
                 AND (p.estado_stock IS NULL OR p.estado_stock <> 'agotado')
                 AND p.stock > 0";
        $cparams = [];
        if ($municipio) { $qc .= " AND t.municipio = ?"; $cparams[] = $municipio; }
        if ($cat)       { $qc .= " AND p.categoria = ?"; $cparams[] = $cat; }
        $stc = db()->prepare($qc);
        $stc->execute($cparams);
        $total = (int)$stc->fetchColumn();

        jout([
            'ok' => true,
            'productos' => $rows,
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'has_more' => ($offset + count($rows)) < $total,
        ]);
        break;

    // ─── Nuevas tiendas (últimas registradas) ────────────────────────────
    case 'nuevas_tiendas':
        $municipio = $_GET['municipio'] ?? null;
        $limit = min(30, max(1, (int)($_GET['limit'] ?? 12)));
        $q = "SELECT t.id, t.nombre, t.categoria, t.logo, t.portada, t.foto_negocio,
                     t.municipio, t.calificacion_promedio, t.total_resenas,
                     u.nombre as vendedor_nombre
              FROM tiendas t JOIN usuarios u ON u.id = t.vendedor_id
              WHERE t.activo = 1";
        $params = [];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        $q .= " ORDER BY t.id DESC LIMIT $limit";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'tiendas' => $st->fetchAll()]);
        break;

    // ─── Tiendas destacadas (ordenadas por estrellas DESC) ───────────────
    case 'tiendas_destacadas':
        $municipio = $_GET['municipio'] ?? null;
        $limit = min(30, max(1, (int)($_GET['limit'] ?? 12)));
        $q = "SELECT t.id, t.nombre, t.categoria, t.logo, t.portada, t.foto_negocio,
                     t.municipio, t.calificacion_promedio, t.total_resenas, t.ventas_completadas,
                     u.nombre as vendedor_nombre
              FROM tiendas t JOIN usuarios u ON u.id = t.vendedor_id
              WHERE t.activo = 1 AND t.calificacion_promedio > 0";
        $params = [];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        // Orden matemático: estrellas DESC, luego # de reseñas DESC, luego ventas
        $q .= " ORDER BY t.calificacion_promedio DESC, t.total_resenas DESC, t.ventas_completadas DESC LIMIT $limit";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'tiendas' => $st->fetchAll()]);
        break;

    // ─── Negocios cerca de tu zona (fórmula Haversine en SQL) ────────────
    case 'cercanos':
        $lat = isset($_GET['lat']) ? (float)$_GET['lat'] : null;
        $lng = isset($_GET['lng']) ? (float)$_GET['lng'] : null;
        $cat = $_GET['categoria'] ?? null;
        $limit = min(40, max(1, (int)($_GET['limit'] ?? 20)));
        if ($lat === null || $lng === null) jout(['ok' => false, 'error' => 'Coordenadas requeridas'], 400);

        $q = "SELECT t.id, t.nombre, t.categoria, t.logo, t.portada, t.lat, t.lng,
                     t.calificacion_promedio, t.total_resenas, t.municipio,
                     ( 6371 * acos(
                         cos(radians(?)) * cos(radians(t.lat)) *
                         cos(radians(t.lng) - radians(?)) +
                         sin(radians(?)) * sin(radians(t.lat))
                     )) AS distancia_km
              FROM tiendas t
              WHERE t.activo = 1 AND t.lat IS NOT NULL AND t.lng IS NOT NULL";
        $params = [$lat, $lng, $lat];
        if ($cat) { $q .= " AND t.categoria = ?"; $params[] = $cat; }
        // Pines ordenados por calificación DESC dentro del radio cercano
        $q .= " HAVING distancia_km < 50 ORDER BY t.calificacion_promedio DESC, distancia_km ASC LIMIT $limit";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'tiendas' => $st->fetchAll()]);
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
