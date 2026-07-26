<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'listar';
$data = jread();

switch ($action) {

    case 'listar':
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(60, max(1, (int)($_GET['limit'] ?? 30)));
        $offset = ($page - 1) * $limit;
        $st = db()->prepare(
            "SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY leida ASC, created_at DESC LIMIT $limit OFFSET $offset"
        );
        $st->execute([$user['id']]);
        jout(['ok' => true, 'notificaciones' => $st->fetchAll()]);
        break;

    case 'contador':
        $st = db()->prepare("SELECT COUNT(*) FROM notificaciones WHERE usuario_id = ? AND leida = 0");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'no_leidas' => (int)$st->fetchColumn()]);
        break;

    case 'marcar_leida':
        require_fields($data, ['id']);
        db()->prepare("UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?")
            ->execute([(int)$data['id'], $user['id']]);
        jout(['ok' => true]);
        break;

    case 'marcar_todas_leidas':
        db()->prepare("UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0")->execute([$user['id']]);
        jout(['ok' => true]);
        break;

    case 'eliminar':
        require_fields($data, ['id']);
        db()->prepare("DELETE FROM notificaciones WHERE id = ? AND usuario_id = ?")
            ->execute([(int)$data['id'], $user['id']]);
        jout(['ok' => true]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
