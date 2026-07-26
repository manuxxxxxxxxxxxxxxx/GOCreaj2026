<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'listar';
$data = jread();

switch ($action) {

    case 'listar':
        $st = db()->prepare("SELECT * FROM direcciones_usuario WHERE usuario_id = ? ORDER BY es_principal DESC, created_at DESC");
        $st->execute([$user['id']]);
        jout(['ok' => true, 'direcciones' => $st->fetchAll()]);
        break;

    case 'crear':
        require_fields($data, ['municipio', 'direccion']);
        $esPrincipal = !empty($data['es_principal']) ? 1 : 0;
        if ($esPrincipal) {
            db()->prepare("UPDATE direcciones_usuario SET es_principal = 0 WHERE usuario_id = ?")->execute([$user['id']]);
        }
        $st = db()->prepare(
            "INSERT INTO direcciones_usuario (usuario_id, alias, municipio, departamento, direccion, referencia, lat, lng, es_principal)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $st->execute([
            $user['id'],
            $data['alias'] ?? 'Casa',
            $data['municipio'],
            $data['departamento'] ?? 'San Salvador',
            $data['direccion'],
            $data['referencia'] ?? null,
            $data['lat'] ?? null,
            $data['lng'] ?? null,
            $esPrincipal,
        ]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    case 'actualizar':
        require_fields($data, ['id']);
        $id = (int)$data['id'];
        $st = db()->prepare("SELECT id FROM direcciones_usuario WHERE id = ? AND usuario_id = ?");
        $st->execute([$id, $user['id']]);
        if (!$st->fetch()) jout(['ok' => false, 'error' => 'No autorizado'], 403);

        if (!empty($data['es_principal'])) {
            db()->prepare("UPDATE direcciones_usuario SET es_principal = 0 WHERE usuario_id = ?")->execute([$user['id']]);
        }
        $up = db()->prepare(
            "UPDATE direcciones_usuario SET
                alias = COALESCE(?, alias),
                municipio = COALESCE(?, municipio),
                departamento = COALESCE(?, departamento),
                direccion = COALESCE(?, direccion),
                referencia = COALESCE(?, referencia),
                lat = COALESCE(?, lat),
                lng = COALESCE(?, lng),
                es_principal = COALESCE(?, es_principal)
             WHERE id = ?"
        );
        $up->execute([
            $data['alias'] ?? null,
            $data['municipio'] ?? null,
            $data['departamento'] ?? null,
            $data['direccion'] ?? null,
            $data['referencia'] ?? null,
            $data['lat'] ?? null,
            $data['lng'] ?? null,
            isset($data['es_principal']) ? (int)!!$data['es_principal'] : null,
            $id,
        ]);
        jout(['ok' => true]);
        break;

    case 'eliminar':
        require_fields($data, ['id']);
        db()->prepare("DELETE FROM direcciones_usuario WHERE id = ? AND usuario_id = ?")
            ->execute([(int)$data['id'], $user['id']]);
        jout(['ok' => true]);
        break;

    case 'marcar_principal':
        require_fields($data, ['id']);
        $id = (int)$data['id'];
        $st = db()->prepare("SELECT id FROM direcciones_usuario WHERE id = ? AND usuario_id = ?");
        $st->execute([$id, $user['id']]);
        if (!$st->fetch()) jout(['ok' => false, 'error' => 'No autorizado'], 403);
        db()->prepare("UPDATE direcciones_usuario SET es_principal = 0 WHERE usuario_id = ?")->execute([$user['id']]);
        db()->prepare("UPDATE direcciones_usuario SET es_principal = 1 WHERE id = ?")->execute([$id]);
        jout(['ok' => true]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
