<?php
require_once __DIR__ . '/conexion.php';

$action = $_GET['action'] ?? 'crear';
$data = jread();
$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

switch ($action) {

    case 'crear':
        require_fields($data, ['rol_solicitado', 'nombre_completo', 'dui_numero', 'dui_frente', 'dui_reverso']);
        if (!in_array($data['rol_solicitado'], ['vendedor', 'repartidor'])) {
            jout(['ok' => false, 'error' => 'Rol invalido'], 400);
        }

        $frente  = save_base64_image($data['dui_frente'],  'dui', 'frente_'  . $user['id']);
        $reverso = save_base64_image($data['dui_reverso'], 'dui', 'reverso_' . $user['id']);
        if (!$frente || !$reverso) jout(['ok' => false, 'error' => 'Fotos DUI invalidas'], 400);

        $check = db()->prepare("SELECT id FROM solicitudes_rol WHERE usuario_id = ? AND estado = 'pendiente'");
        $check->execute([$user['id']]);
        if ($check->fetch()) jout(['ok' => false, 'error' => 'Ya tienes una solicitud pendiente'], 409);

        // Campos extra según rol
        $foto_negocio    = null;
        $licencia_frente = null;
        $licencia_reverso = null;

        if ($data['rol_solicitado'] === 'vendedor' && !empty($data['foto_negocio'])) {
            $foto_negocio = save_base64_image($data['foto_negocio'], 'solicitudes', 'negocio_' . $user['id']);
        }
        if ($data['rol_solicitado'] === 'repartidor') {
            if (!empty($data['licencia_frente']))
                $licencia_frente  = save_base64_image($data['licencia_frente'],  'licencias', 'lic_f_' . $user['id']);
            if (!empty($data['licencia_reverso']))
                $licencia_reverso = save_base64_image($data['licencia_reverso'], 'licencias', 'lic_r_' . $user['id']);
        }

        $st = db()->prepare("INSERT INTO solicitudes_rol
            (usuario_id, rol_solicitado, nombre_completo, municipio, dui_numero, dui_frente, dui_reverso,
             nombre_negocio, foto_negocio, licencia_frente, licencia_reverso, tipo_vehiculo, credenciales)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $st->execute([
            $user['id'],
            $data['rol_solicitado'],
            $data['nombre_completo'],
            $data['municipio']       ?? null,
            $data['dui_numero'],
            $frente,
            $reverso,
            $data['nombre_negocio']  ?? null,
            $foto_negocio,
            $licencia_frente,
            $licencia_reverso,
            $data['tipo_vehiculo']   ?? null,
            $data['credenciales']    ?? '',
        ]);
        jout(['ok' => true, 'solicitud_id' => (int)db()->lastInsertId()]);
        break;

    case 'mis_solicitudes':
        $st = db()->prepare("SELECT * FROM solicitudes_rol WHERE usuario_id = ? ORDER BY created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'solicitudes' => $st->fetchAll()]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
