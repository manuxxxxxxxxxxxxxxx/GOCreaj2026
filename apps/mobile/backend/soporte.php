<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'mis_tickets';
$data = jread();

switch ($action) {

    case 'crear':
        require_fields($data, ['asunto','descripcion']);
        $adjunto = !empty($data['adjunto']) ? save_base64_image($data['adjunto'], 'soporte', 'ticket_' . $user['id']) : null;
        $st = db()->prepare("INSERT INTO soporte_reportes (usuario_id, asunto, descripcion, adjunto) VALUES (?, ?, ?, ?)");
        $st->execute([$user['id'], $data['asunto'], $data['descripcion'], $adjunto]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'mis_tickets':
        $st = db()->prepare("SELECT * FROM soporte_reportes WHERE usuario_id = ? ORDER BY created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'reportes' => $st->fetchAll()]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
