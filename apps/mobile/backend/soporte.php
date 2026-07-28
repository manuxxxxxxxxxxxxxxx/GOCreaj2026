<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'mis_tickets';
$data = jread();

switch ($action) {

    case 'crear':
        require_fields($data, ['asunto','descripcion']);
        $st = db()->prepare("INSERT INTO reportes_soporte (usuario_id, asunto, descripcion) VALUES (?, ?, ?)");
        $st->execute([$user['id'], $data['asunto'], $data['descripcion']]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'mis_tickets':
        $st = db()->prepare("SELECT * FROM reportes_soporte WHERE usuario_id = ? ORDER BY created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'reportes' => $st->fetchAll()]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
