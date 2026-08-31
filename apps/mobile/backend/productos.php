<?php
require_once __DIR__ . '/conexion.php';

$action = $_GET['action'] ?? 'listar';

/** Anula la oferta si ya venció, para que el frontend nunca muestre un precio de oferta caduco. */
function aplicar_oferta(array &$rows): void {
    foreach ($rows as &$r) {
        if (!empty($r['precio_oferta']) && !empty($r['oferta_hasta']) && strtotime($r['oferta_hasta']) < time()) {
            $r['precio_oferta'] = null;
            $r['oferta_hasta'] = null;
        }
    }
}

switch ($action) {

    case 'listar':
        $municipio = $_GET['municipio'] ?? null;
        $departamento = $_GET['departamento'] ?? null;
        $cat       = $_GET['categoria']  ?? null;
        $tiendaId  = isset($_GET['tienda_id']) ? (int)$_GET['tienda_id'] : null;
        $con_coords = !empty($_GET['con_coordenadas']);
        $stockMin  = isset($_GET['stock_min']) ? max(0, (int)$_GET['stock_min']) : null;
        $page      = max(1, (int)($_GET['page'] ?? 1));
        $limit     = min(60, max(1, (int)($_GET['limit'] ?? 20)));
        $offset    = ($page - 1) * $limit;

        // Los productos agotados NO se ocultan — se listan igual para que el frontend
        // los muestre sombreados/deshabilitados ("AGOTADO"), solo se ordenan al final.
        // Excepción: si se pide stock_min (ej. sección "Otros productos" del inicio),
        // se ocultan por completo los productos por debajo del umbral (Regla de Norberto).
        $joinDepto = $departamento ? " JOIN municipios_sv ms ON ms.nombre = t.municipio" : "";
        $q = "SELECT p.*, t.nombre as tienda_nombre, t.municipio, t.lat as tienda_lat, t.lng as tienda_lng, t.vendedor_id,
                     t.calificacion_promedio as tienda_calificacion, t.logo as tienda_logo, t.total_resenas as tienda_total_resenas
              FROM productos p JOIN tiendas t ON t.id = p.tienda_id$joinDepto
              WHERE p.activo = 1 AND t.activo = 1 AND (p.es_reel = 0 OR p.es_reel IS NULL)";
        $params = [];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        if ($departamento) { $q .= " AND ms.departamento = ?"; $params[] = $departamento; }
        if ($cat)       { $q .= " AND p.categoria = ?"; $params[] = $cat; }
        if ($tiendaId)  { $q .= " AND p.tienda_id = ?"; $params[] = $tiendaId; }
        if ($con_coords) { $q .= " AND t.lat IS NOT NULL AND t.lng IS NOT NULL"; }
        if ($stockMin !== null) { $q .= " AND p.stock >= ?"; $params[] = $stockMin; }
        $q .= " ORDER BY (p.stock > 0 AND (p.estado_stock IS NULL OR p.estado_stock <> 'agotado')) DESC, p.created_at DESC LIMIT $limit OFFSET $offset";
        $st = db()->prepare($q);
        $st->execute($params);
        $rows = $st->fetchAll();
        aplicar_oferta($rows);

        $qc = "SELECT COUNT(*) FROM productos p JOIN tiendas t ON t.id = p.tienda_id$joinDepto
               WHERE p.activo = 1 AND t.activo = 1 AND (p.es_reel = 0 OR p.es_reel IS NULL)";
        $cparams = [];
        if ($municipio) { $qc .= " AND t.municipio = ?"; $cparams[] = $municipio; }
        if ($departamento) { $qc .= " AND ms.departamento = ?"; $cparams[] = $departamento; }
        if ($cat)       { $qc .= " AND p.categoria = ?"; $cparams[] = $cat; }
        if ($tiendaId)  { $qc .= " AND p.tienda_id = ?"; $cparams[] = $tiendaId; }
        if ($con_coords) { $qc .= " AND t.lat IS NOT NULL AND t.lng IS NOT NULL"; }
        if ($stockMin !== null) { $qc .= " AND p.stock >= ?"; $cparams[] = $stockMin; }
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
        $departamento = $_GET['departamento'] ?? null;
        $limit = min(30, max(1, (int)($_GET['limit'] ?? 12)));
        $joinDepto = $departamento ? " JOIN municipios_sv ms ON ms.nombre = t.municipio" : "";
        $q = "SELECT t.id, t.nombre, t.categoria, t.logo, t.portada,
                     t.municipio, t.lat, t.lng, t.calificacion_promedio, t.total_resenas,
                     u.nombre as vendedor_nombre
              FROM tiendas t JOIN usuarios u ON u.id = t.vendedor_id$joinDepto
              WHERE t.activo = 1";
        $params = [];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        if ($departamento) { $q .= " AND ms.departamento = ?"; $params[] = $departamento; }
        $q .= " ORDER BY t.id DESC LIMIT $limit";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'tiendas' => $st->fetchAll()]);
        break;

    // ─── Tiendas destacadas (ordenadas por estrellas DESC) ───────────────
    case 'tiendas_destacadas':
        $municipio = $_GET['municipio'] ?? null;
        $departamento = $_GET['departamento'] ?? null;
        $limit = min(30, max(1, (int)($_GET['limit'] ?? 12)));
        $joinDepto = $departamento ? " JOIN municipios_sv ms ON ms.nombre = t.municipio" : "";
        $q = "SELECT t.id, t.nombre, t.categoria, t.logo, t.portada,
                     t.municipio, t.lat, t.lng, t.calificacion_promedio, t.total_resenas, t.ventas_completadas,
                     u.nombre as vendedor_nombre
              FROM tiendas t JOIN usuarios u ON u.id = t.vendedor_id$joinDepto
              WHERE t.activo = 1 AND (t.calificacion_promedio > 0 OR t.rating > 0)";
        $params = [];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        if ($departamento) { $q .= " AND ms.departamento = ?"; $params[] = $departamento; }
        // Real customer ratings outrank the editorial seed rating, which in turn
        // outranks stores with neither -- so "featured" isn't empty before a
        // marketplace has accumulated its first reviews.
        $q .= " ORDER BY (t.calificacion_promedio > 0) DESC, t.calificacion_promedio DESC, t.rating DESC, t.total_resenas DESC, t.ventas_completadas DESC LIMIT $limit";
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
        $q .= " HAVING distancia_km < 50 ORDER BY t.calificacion_promedio DESC, distancia_km ASC LIMIT $limit";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'tiendas' => $st->fetchAll()]);
        break;

    case 'buscar':
        $q_str  = trim($_GET['q']        ?? '');
        $municipio = $_GET['municipio']  ?? null;
        $departamento = $_GET['departamento'] ?? null;
        $cat    = $_GET['categoria']     ?? null;
        $tiendaId = isset($_GET['tienda_id']) ? (int)$_GET['tienda_id'] : null;
        $page   = max(1, (int)($_GET['page']  ?? 1));
        $limit  = min(60, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $con_coords = !empty($_GET['con_coordenadas']);
        $joinDepto = $departamento ? " JOIN municipios_sv ms ON ms.nombre = t.municipio" : "";

        $params = [];
        if ($q_str !== '') {
            try {
                $base = "SELECT p.*, t.nombre as tienda_nombre, t.municipio,
                                 t.lat as tienda_lat, t.lng as tienda_lng,
                                 t.vendedor_id, t.calificacion_promedio as tienda_calificacion,
                                 t.logo as tienda_logo, t.total_resenas as tienda_total_resenas,
                                 MATCH(p.nombre,p.descripcion) AGAINST(? IN BOOLEAN MODE) AS relevancia
                          FROM productos p JOIN tiendas t ON t.id = p.tienda_id$joinDepto
                          WHERE p.activo = 1 AND t.activo = 1
                            AND (MATCH(p.nombre,p.descripcion) AGAINST(? IN BOOLEAN MODE) OR t.nombre LIKE ?)";
                $params = [$q_str . '*', $q_str . '*', '%' . $q_str . '%'];
                if ($municipio) { $base .= " AND t.municipio = ?"; $params[] = $municipio; }
                if ($departamento) { $base .= " AND ms.departamento = ?"; $params[] = $departamento; }
                if ($cat)       { $base .= " AND p.categoria = ?"; $params[] = $cat; }
                if ($tiendaId)  { $base .= " AND p.tienda_id = ?"; $params[] = $tiendaId; }
                if ($con_coords) $base .= " AND t.lat IS NOT NULL AND t.lng IS NOT NULL";
                $base .= " ORDER BY relevancia DESC LIMIT $limit OFFSET $offset";
                $st = db()->prepare($base);
                $st->execute($params);
                $rows = $st->fetchAll();
            } catch (PDOException $e) {
                $like = '%' . $q_str . '%';
                $base = "SELECT p.*, t.nombre as tienda_nombre, t.municipio,
                                 t.lat as tienda_lat, t.lng as tienda_lng, t.vendedor_id,
                                 t.calificacion_promedio as tienda_calificacion,
                                 t.logo as tienda_logo, t.total_resenas as tienda_total_resenas
                          FROM productos p JOIN tiendas t ON t.id = p.tienda_id$joinDepto
                          WHERE p.activo = 1 AND t.activo = 1
                            AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR t.nombre LIKE ?)";
                $params = [$like, $like, $like];
                if ($municipio) { $base .= " AND t.municipio = ?"; $params[] = $municipio; }
                if ($departamento) { $base .= " AND ms.departamento = ?"; $params[] = $departamento; }
                if ($cat)       { $base .= " AND p.categoria = ?"; $params[] = $cat; }
                if ($tiendaId)  { $base .= " AND p.tienda_id = ?"; $params[] = $tiendaId; }
                if ($con_coords) $base .= " AND t.lat IS NOT NULL AND t.lng IS NOT NULL";
                $base .= " ORDER BY p.created_at DESC LIMIT $limit OFFSET $offset";
                $st = db()->prepare($base);
                $st->execute($params);
                $rows = $st->fetchAll();
            }
        } else {
            $base = "SELECT p.*, t.nombre as tienda_nombre, t.municipio,
                             t.lat as tienda_lat, t.lng as tienda_lng, t.vendedor_id,
                             t.calificacion_promedio as tienda_calificacion,
                             t.logo as tienda_logo, t.total_resenas as tienda_total_resenas
                      FROM productos p JOIN tiendas t ON t.id = p.tienda_id$joinDepto
                      WHERE p.activo = 1 AND t.activo = 1";
            $params = [];
            if ($municipio) { $base .= " AND t.municipio = ?"; $params[] = $municipio; }
            if ($departamento) { $base .= " AND ms.departamento = ?"; $params[] = $departamento; }
            if ($cat)       { $base .= " AND p.categoria = ?"; $params[] = $cat; }
            if ($tiendaId)  { $base .= " AND p.tienda_id = ?"; $params[] = $tiendaId; }
            if ($con_coords) $base .= " AND t.lat IS NOT NULL AND t.lng IS NOT NULL";
            $base .= " ORDER BY p.created_at DESC LIMIT $limit OFFSET $offset";
            $st = db()->prepare($base);
            $st->execute($params);
            $rows = $st->fetchAll();
        }
        aplicar_oferta($rows);
        jout(['ok' => true, 'productos' => $rows, 'q' => $q_str, 'page' => $page, 'limit' => $limit, 'total' => count($rows)]);
        break;

    case 'reels':
        $municipio = $_GET['municipio'] ?? null;
        $tiendaIdFiltro = isset($_GET['tienda_id']) ? (int)$_GET['tienda_id'] : null;
        $me = current_user(); // Los reels son públicos; si hay sesión, agregamos el estado personal
        $meId = $me ? (int)$me['id'] : 0;
        $q = "SELECT p.*, t.nombre as tienda_nombre, t.municipio, t.vendedor_id,
              (SELECT COUNT(*) FROM video_likes WHERE producto_id = p.id) as likes_count,
              (SELECT COUNT(*) FROM video_comentarios WHERE producto_id = p.id) as comentarios_count,
              (SELECT COUNT(*) FROM video_compartidos WHERE producto_id = p.id) as compartidos_count,
              (SELECT COUNT(*) FROM seguidores_tienda WHERE tienda_id = t.id) as seguidores_count,
              (SELECT COUNT(*) FROM video_likes WHERE producto_id = p.id AND usuario_id = ?) as yo_like,
              (SELECT COUNT(*) FROM video_guardados WHERE producto_id = p.id AND usuario_id = ?) as yo_guardado,
              (SELECT COUNT(*) FROM seguidores_tienda WHERE tienda_id = t.id AND usuario_id = ?) as yo_sigo
              FROM productos p JOIN tiendas t ON t.id = p.tienda_id
              WHERE p.es_reel = 1 AND p.activo = 1";
        $params = [$meId, $meId, $meId];
        if ($municipio) { $q .= " AND t.municipio = ?"; $params[] = $municipio; }
        if ($tiendaIdFiltro) { $q .= " AND p.tienda_id = ?"; $params[] = $tiendaIdFiltro; }
        $q .= " ORDER BY p.created_at DESC LIMIT 100";
        $st = db()->prepare($q);
        $st->execute($params);
        jout(['ok' => true, 'reels' => $st->fetchAll()]);
        break;

    case 'detalle':
        $id = (int)($_GET['id'] ?? 0);
        $meDet = current_user();
        $meDetId = $meDet ? (int)$meDet['id'] : 0;
        $st = db()->prepare("SELECT p.*, t.nombre as tienda_nombre, t.municipio, t.vendedor_id,
              (SELECT COUNT(*) FROM seguidores_tienda WHERE tienda_id = t.id) as seguidores_count,
              (SELECT COUNT(*) FROM seguidores_tienda WHERE tienda_id = t.id AND usuario_id = ?) as yo_sigo
              FROM productos p JOIN tiendas t ON t.id = p.tienda_id WHERE p.id = ?");
        $st->execute([$meDetId, $id]);
        $p = $st->fetch();
        if (!$p) jout(['ok' => false, 'error' => 'No existe'], 404);
        $rowsTmp = [$p];
        aplicar_oferta($rowsTmp);
        jout(['ok' => true, 'producto' => $rowsTmp[0]]);
        break;

    // ─── Ficha pública de una tienda: datos + estado de seguimiento del usuario actual ───
    case 'tienda_detalle':
        $tiendaId = (int)($_GET['tienda_id'] ?? 0);
        if (!$tiendaId) jout(['ok' => false, 'error' => 'tienda_id requerido'], 400);
        $meTd = current_user();
        $meTdId = $meTd ? (int)$meTd['id'] : 0;
        $st = db()->prepare(
            "SELECT t.*,
                    (SELECT COUNT(*) FROM seguidores_tienda WHERE tienda_id = t.id) as seguidores_count,
                    (SELECT COUNT(*) FROM seguidores_tienda WHERE tienda_id = t.id AND usuario_id = ?) as yo_sigo
             FROM tiendas t WHERE t.id = ? AND t.activo = 1"
        );
        $st->execute([$meTdId, $tiendaId]);
        $t = $st->fetch();
        if (!$t) jout(['ok' => false, 'error' => 'Tienda no encontrada'], 404);
        jout(['ok' => true, 'tienda' => $t]);
        break;

    // ─── Reseñas públicas de una tienda (con respuesta del vendedor si existe) ───
    case 'tienda_resenas':
        $tiendaId = (int)($_GET['tienda_id'] ?? 0);
        if (!$tiendaId) jout(['ok' => false, 'error' => 'tienda_id requerido'], 400);
        $st = db()->prepare(
            "SELECT c.id, c.estrellas, c.comentario, c.respuesta_vendedor, c.respuesta_at, c.created_at,
                    u.nombre AS comprador_nombre
             FROM calificaciones c JOIN usuarios u ON u.id = c.comprador_id
             WHERE c.tienda_id = ? ORDER BY c.created_at DESC LIMIT 50"
        );
        $st->execute([$tiendaId]);
        jout(['ok' => true, 'resenas' => $st->fetchAll()]);
        break;

    case 'municipios':
        $st = db()->query("SELECT DISTINCT municipio FROM tiendas WHERE activo = 1");
        jout(['ok' => true, 'municipios' => array_column($st->fetchAll(), 'municipio')]);
        break;

    case 'municipios_catalogo':
        $st = db()->query("SELECT id, nombre, departamento, lat, lng, cobertura_activa FROM municipios_sv ORDER BY departamento, nombre");
        jout(['ok' => true, 'municipios' => $st->fetchAll()]);
        break;

    // ─── Conteo de tiendas activas por departamento, para el mapa del inicio ───
    case 'tiendas_por_departamento':
        $st = db()->query(
            "SELECT ms.departamento, COUNT(*) as tiendas
             FROM tiendas t JOIN municipios_sv ms ON ms.nombre = t.municipio
             WHERE t.activo = 1
             GROUP BY ms.departamento"
        );
        $rows = $st->fetchAll();
        $conteo = [];
        foreach ($rows as $r) { $conteo[$r['departamento']] = (int)$r['tiendas']; }
        jout(['ok' => true, 'conteo' => $conteo]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
