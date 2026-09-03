<?php
require_once __DIR__ . '/conexion.php';

// Ver reels/comentarios es público; solo las acciones que escriben (dar like,
// comentar, seguir, etc.) exigen sesión -- cada case que la necesita la valida.
$user = current_user();

$action = $_GET['action'] ?? '';
$data = jread();

// Acciones de solo lectura, alcanzables sin sesión.
$PUBLICAS = ['listar_comentarios'];
if (!$user && !in_array($action, $PUBLICAS, true)) {
    jout(['ok' => false, 'error' => 'No autenticado'], 401);
}

function contadores(int $pid): array {
    $pdo = db();
    return [
        'likes' => (int)$pdo->query("SELECT COUNT(*) FROM video_likes WHERE producto_id = $pid")->fetchColumn(),
        'guardados' => (int)$pdo->query("SELECT COUNT(*) FROM video_guardados WHERE producto_id = $pid")->fetchColumn(),
        'compartidos' => (int)$pdo->query("SELECT COUNT(*) FROM video_compartidos WHERE producto_id = $pid")->fetchColumn(),
        'comentarios' => (int)$pdo->query("SELECT COUNT(*) FROM video_comentarios WHERE producto_id = $pid")->fetchColumn(),
    ];
}

switch ($action) {

    case 'toggle_like':
        require_fields($data, ['producto_id']);
        $pid = (int)$data['producto_id'];
        $st = db()->prepare("SELECT id FROM video_likes WHERE usuario_id = ? AND producto_id = ?");
        $st->execute([$user['id'], $pid]);
        if ($st->fetch()) {
            db()->prepare("DELETE FROM video_likes WHERE usuario_id = ? AND producto_id = ?")->execute([$user['id'], $pid]);
            $accion = 'unlike';
        } else {
            db()->prepare("INSERT INTO video_likes (usuario_id, producto_id) VALUES (?, ?)")->execute([$user['id'], $pid]);
            $accion = 'like';
        }
        jout(['ok' => true, 'accion' => $accion, 'contadores' => contadores($pid)]);
        break;

    case 'toggle_guardar':
        require_fields($data, ['producto_id']);
        $pid = (int)$data['producto_id'];
        $st = db()->prepare("SELECT id FROM video_guardados WHERE usuario_id = ? AND producto_id = ?");
        $st->execute([$user['id'], $pid]);
        if ($st->fetch()) {
            db()->prepare("DELETE FROM video_guardados WHERE usuario_id = ? AND producto_id = ?")->execute([$user['id'], $pid]);
            $accion = 'unguardar';
        } else {
            db()->prepare("INSERT INTO video_guardados (usuario_id, producto_id) VALUES (?, ?)")->execute([$user['id'], $pid]);
            $accion = 'guardar';
        }
        jout(['ok' => true, 'accion' => $accion, 'contadores' => contadores($pid)]);
        break;

    // Contador de vistas de Reels: el frontend lo llama una vez por reel al quedar visible.
    case 'registrar_vista':
        require_fields($data, ['producto_id']);
        db()->prepare("UPDATE productos SET vistas_count = vistas_count + 1 WHERE id = ?")->execute([(int)$data['producto_id']]);
        jout(['ok' => true]);
        break;

    case 'compartir':
        require_fields($data, ['producto_id']);
        $pid = (int)$data['producto_id'];
        db()->prepare("INSERT INTO video_compartidos (usuario_id, producto_id, canal) VALUES (?, ?, ?)")
           ->execute([$user['id'], $pid, $data['canal'] ?? 'app']);
        jout(['ok' => true, 'contadores' => contadores($pid)]);
        break;

    case 'comentar':
        require_fields($data, ['producto_id','comentario']);
        $pid = (int)$data['producto_id'];
        $parent = isset($data['parent_id']) ? (int)$data['parent_id'] : null;
        try {
            db()->prepare("INSERT INTO video_comentarios (usuario_id, producto_id, comentario, parent_id) VALUES (?, ?, ?, ?)")
               ->execute([$user['id'], $pid, $data['comentario'], $parent]);
        } catch (PDOException $e) {
            // Fallback si la tabla legacy no tiene parent_id
            db()->prepare("INSERT INTO video_comentarios (usuario_id, producto_id, comentario) VALUES (?, ?, ?)")
               ->execute([$user['id'], $pid, $data['comentario']]);
        }

        // Notifica a quien le comentaron: al dueño del reel (si no se está comentando a
        // sí mismo), y si es una respuesta, también a quien escribió el comentario padre
        // (sin duplicar si es la misma persona que el dueño del reel).
        $extracto = mb_substr(trim((string)$data['comentario']), 0, 80);
        $yaNotificado = [(int)$user['id']];
        $st = db()->prepare("SELECT t.vendedor_id FROM productos p JOIN tiendas t ON t.id = p.tienda_id WHERE p.id = ?");
        $st->execute([$pid]);
        if ($duenoId = $st->fetchColumn()) {
            $duenoId = (int)$duenoId;
            if (!in_array($duenoId, $yaNotificado, true)) {
                crear_notificacion($duenoId, 'interaccion', 'Nuevo comentario en tu reel', "{$user['nombre']}: \"{$extracto}\"", $pid);
                $yaNotificado[] = $duenoId;
            }
        }
        if ($parent) {
            $stp = db()->prepare("SELECT usuario_id FROM video_comentarios WHERE id = ?");
            $stp->execute([$parent]);
            $autorPadre = (int)$stp->fetchColumn();
            if ($autorPadre && !in_array($autorPadre, $yaNotificado, true)) {
                crear_notificacion($autorPadre, 'interaccion', 'Te respondieron un comentario', "{$user['nombre']}: \"{$extracto}\"", $pid);
            }
        }

        jout(['ok' => true, 'contadores' => contadores($pid)]);
        break;

    case 'listar_comentarios':
        $pid = (int)($_GET['producto_id'] ?? 0);
        $meId = $user ? (int)$user['id'] : 0;
        // Devuelve TODOS los comentarios; el frontend arma el árbol con parent_id
        $st = db()->prepare(
            "SELECT c.id, c.producto_id, c.comentario, c.created_at, c.parent_id, c.likes_count,
                    u.id AS usuario_id, u.nombre, u.foto_perfil,
                    (SELECT COUNT(*) FROM comentarios_likes WHERE comentario_id = c.id AND usuario_id = ?) AS yo_like
             FROM video_comentarios c
             JOIN usuarios u ON u.id = c.usuario_id
             WHERE c.producto_id = ?
             ORDER BY c.created_at ASC LIMIT 200"
        );
        $st->execute([$meId, $pid]);
        jout(['ok' => true, 'comentarios' => $st->fetchAll()]);
        break;

    case 'like_comentario':
        require_fields($data, ['comentario_id']);
        $cid = (int)$data['comentario_id'];
        try {
            db()->beginTransaction();
            $sel = db()->prepare("SELECT id FROM comentarios_likes WHERE comentario_id = ? AND usuario_id = ?");
            $sel->execute([$cid, $user['id']]);
            $accion = $sel->fetch() ? 'unlike' : 'like';
            if ($accion === 'like') {
                db()->prepare("INSERT INTO comentarios_likes (comentario_id, usuario_id) VALUES (?, ?)")
                    ->execute([$cid, $user['id']]);
                db()->prepare("UPDATE video_comentarios SET likes_count = likes_count + 1 WHERE id = ?")->execute([$cid]);
                // Notifica al autor del comentario (no a uno mismo si se da like a su propio comentario).
                $stc = db()->prepare("SELECT usuario_id, producto_id FROM video_comentarios WHERE id = ?");
                $stc->execute([$cid]);
                if ($com = $stc->fetch()) {
                    if ((int)$com['usuario_id'] !== (int)$user['id']) {
                        crear_notificacion((int)$com['usuario_id'], 'interaccion', 'Le gustó tu comentario', "A {$user['nombre']} le gustó tu comentario", (int)$com['producto_id']);
                    }
                }
            } else {
                db()->prepare("DELETE FROM comentarios_likes WHERE comentario_id = ? AND usuario_id = ?")
                    ->execute([$cid, $user['id']]);
                db()->prepare("UPDATE video_comentarios SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?")->execute([$cid]);
            }
            db()->commit();
            jout(['ok' => true, 'accion' => $accion]);
        } catch (Throwable $e) {
            db()->rollBack();
            jout(['ok' => false, 'error' => $e->getMessage()], 500);
        }
        break;

    // ─── Seguir / dejar de seguir tienda ───
    case 'seguir_tienda':
        require_fields($data, ['tienda_id']);
        $tid = (int)$data['tienda_id'];
        $sel = db()->prepare("SELECT id FROM seguidores_tienda WHERE usuario_id = ? AND tienda_id = ?");
        $sel->execute([$user['id'], $tid]);
        if ($sel->fetch()) {
            db()->prepare("DELETE FROM seguidores_tienda WHERE usuario_id = ? AND tienda_id = ?")
                ->execute([$user['id'], $tid]);
            $accion = 'unfollow';
        } else {
            db()->prepare("INSERT IGNORE INTO seguidores_tienda (usuario_id, tienda_id) VALUES (?, ?)")
                ->execute([$user['id'], $tid]);
            $accion = 'follow';
        }
        $total = (int)db()->query("SELECT COUNT(*) FROM seguidores_tienda WHERE tienda_id = $tid")->fetchColumn();
        jout(['ok' => true, 'accion' => $accion, 'total_seguidores' => $total]);
        break;

    case 'mis_likes':
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(60, max(1, (int)($_GET['limit'] ?? 30)));
        $offset = ($page - 1) * $limit;
        $stTotal = db()->prepare("SELECT COUNT(*) FROM video_likes WHERE usuario_id = ?");
        $stTotal->execute([$user['id']]);
        $total = (int)$stTotal->fetchColumn();
        $st = db()->prepare(
            "SELECT p.*, t.nombre as tienda_nombre FROM video_likes l JOIN productos p ON p.id = l.producto_id JOIN tiendas t ON t.id = p.tienda_id
             WHERE l.usuario_id = ? ORDER BY l.created_at DESC LIMIT $limit OFFSET $offset"
        );
        $st->execute([$user['id']]);
        jout(['ok' => true, 'productos' => $st->fetchAll(), 'total' => $total]);
        break;

    case 'mis_guardados':
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(60, max(1, (int)($_GET['limit'] ?? 30)));
        $offset = ($page - 1) * $limit;
        $stTotal = db()->prepare("SELECT COUNT(*) FROM video_guardados WHERE usuario_id = ?");
        $stTotal->execute([$user['id']]);
        $total = (int)$stTotal->fetchColumn();
        $st = db()->prepare(
            "SELECT p.*, t.nombre as tienda_nombre FROM video_guardados g JOIN productos p ON p.id = g.producto_id JOIN tiendas t ON t.id = p.tienda_id
             WHERE g.usuario_id = ? ORDER BY g.created_at DESC LIMIT $limit OFFSET $offset"
        );
        $st->execute([$user['id']]);
        jout(['ok' => true, 'productos' => $st->fetchAll(), 'total' => $total]);
        break;

    case 'mis_compartidos':
        $st = db()->prepare("SELECT p.*, t.nombre as tienda_nombre, c.canal, c.created_at as compartido_at FROM video_compartidos c JOIN productos p ON p.id = c.producto_id JOIN tiendas t ON t.id = p.tienda_id WHERE c.usuario_id = ? ORDER BY c.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'productos' => $st->fetchAll()]);
        break;

    // ─── Reportes de moderación (punto 6): reels y productos normales reutilizan
    // productos_reportes (ya leída por admin_dashboard.php en reportes_reel); tiendas y
    // comentarios usan la tabla genérica "reportes" nueva. ───
    case 'reportar_producto':
        require_fields($data, ['producto_id', 'motivo']);
        db()->prepare("INSERT INTO productos_reportes (producto_id, usuario_id, motivo) VALUES (?, ?, ?)")
            ->execute([(int)$data['producto_id'], $user['id'], mb_substr(trim($data['motivo']), 0, 160)]);
        jout(['ok' => true]);
        break;

    case 'reportar_tienda':
        require_fields($data, ['tienda_id', 'motivo']);
        db()->prepare("INSERT INTO reportes (tipo, entidad_id, usuario_id, motivo, detalle) VALUES ('tienda', ?, ?, ?, ?)")
            ->execute([(int)$data['tienda_id'], $user['id'], mb_substr(trim($data['motivo']), 0, 160), $data['detalle'] ?? null]);
        jout(['ok' => true]);
        break;

    case 'reportar_comentario':
        require_fields($data, ['comentario_id', 'motivo']);
        db()->prepare("INSERT INTO reportes (tipo, entidad_id, usuario_id, motivo, detalle) VALUES ('comentario', ?, ?, ?, ?)")
            ->execute([(int)$data['comentario_id'], $user['id'], mb_substr(trim($data['motivo']), 0, 160), $data['detalle'] ?? null]);
        jout(['ok' => true]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
