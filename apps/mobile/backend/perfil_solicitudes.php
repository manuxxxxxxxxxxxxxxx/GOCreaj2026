<?php
require_once __DIR__ . '/conexion.php';

$action = $_GET['action'] ?? 'crear';
$data = jread();
$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

switch ($action) {

    case 'crear':
        require_fields($data, ['rol_solicitado','nombre_completo','dui_numero','dui_frente','dui_reverso']);
        if (!in_array($data['rol_solicitado'], ['vendedor','repartidor'])) {
            jout(['ok' => false, 'error' => 'Rol invalido'], 400);
        }
        $frente = save_base64_image($data['dui_frente'], 'dui', 'frente_' . $user['id']);
        $reverso = save_base64_image($data['dui_reverso'], 'dui', 'reverso_' . $user['id']);
        if (!$frente || !$reverso) jout(['ok' => false, 'error' => 'Fotos DUI invalidas'], 400);

        $check = db()->prepare("SELECT id FROM solicitudes_rol WHERE usuario_id = ? AND estado = 'pendiente'");
        $check->execute([$user['id']]);
        if ($check->fetch()) jout(['ok' => false, 'error' => 'Ya tienes una solicitud pendiente'], 409);

        $st = db()->prepare("INSERT INTO solicitudes_rol (usuario_id, rol_solicitado, nombre_completo, dui_numero, dui_frente, dui_reverso, credenciales) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $st->execute([
            $user['id'],
            $data['rol_solicitado'],
            $data['nombre_completo'],
            $data['dui_numero'],
            $frente,
            $reverso,
            $data['credenciales'] ?? ''
        ]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'mis_solicitudes':
        $st = db()->prepare("SELECT * FROM solicitudes_rol WHERE usuario_id = ? ORDER BY created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'solicitudes' => $st->fetchAll()]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
