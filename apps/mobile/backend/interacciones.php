<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? '';
$data = jread();

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
        db()->prepare("INSERT INTO video_comentarios (usuario_id, producto_id, comentario) VALUES (?, ?, ?)")
           ->execute([$user['id'], $pid, $data['comentario']]);
        jout(['ok' => true, 'contadores' => contadores($pid)]);
        break;

    case 'listar_comentarios':
        $pid = (int)($_GET['producto_id'] ?? 0);
        $st = db()->prepare("SELECT c.*, u.nombre, u.foto_perfil FROM video_comentarios c JOIN usuarios u ON u.id = c.usuario_id WHERE c.producto_id = ? ORDER BY c.created_at DESC LIMIT 100");
        $st->execute([$pid]);
        jout(['ok' => true, 'comentarios' => $st->fetchAll()]);
        break;

    case 'mis_likes':
        $st = db()->prepare("SELECT p.*, t.nombre as tienda_nombre FROM video_likes l JOIN productos p ON p.id = l.producto_id JOIN tiendas t ON t.id = p.tienda_id WHERE l.usuario_id = ? ORDER BY l.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'productos' => $st->fetchAll()]);
        break;

    case 'mis_guardados':
        $st = db()->prepare("SELECT p.*, t.nombre as tienda_nombre FROM video_guardados g JOIN productos p ON p.id = g.producto_id JOIN tiendas t ON t.id = p.tienda_id WHERE g.usuario_id = ? ORDER BY g.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'productos' => $st->fetchAll()]);
        break;

    case 'mis_compartidos':
        $st = db()->prepare("SELECT p.*, t.nombre as tienda_nombre, c.canal, c.created_at as compartido_at FROM video_compartidos c JOIN productos p ON p.id = c.producto_id JOIN tiendas t ON t.id = p.tienda_id WHERE c.usuario_id = ? ORDER BY c.created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'productos' => $st->fetchAll()]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
