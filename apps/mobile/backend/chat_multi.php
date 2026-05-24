<?php
require_once __DIR__ . '/conexion.php';

$user = current_user();
if (!$user) jout(['ok' => false, 'error' => 'No autenticado'], 401);

$action = $_GET['action'] ?? 'conversaciones';
$data = jread();

switch ($action) {

    case 'conversaciones':
        $st = db()->prepare("
            SELECT
                CASE WHEN emisor_id = :uid THEN receptor_id ELSE emisor_id END as otro_id,
                MAX(created_at) as ultimo
            FROM chats
            WHERE emisor_id = :uid OR receptor_id = :uid
            GROUP BY otro_id
            ORDER BY ultimo DESC
        ");
        $st->execute(['uid' => $user['id']]);
        $rows = $st->fetchAll();
        $conversaciones = [];
        foreach ($rows as $r) {
            $u = db()->prepare("SELECT id, nombre, foto_perfil, rol FROM usuarios WHERE id = ?");
            $u->execute([$r['otro_id']]);
            $usr = $u->fetch();
            if (!$usr) continue;
            $ult = db()->prepare("SELECT mensaje, created_at FROM chats WHERE (emisor_id = :a AND receptor_id = :b) OR (emisor_id = :b AND receptor_id = :a) ORDER BY created_at DESC LIMIT 1");
            $ult->execute(['a' => $user['id'], 'b' => $r['otro_id']]);
            $usr['ultimo_mensaje'] = $ult->fetch();
            $conversaciones[] = $usr;
        }
        jout(['ok' => true, 'conversaciones' => $conversaciones]);
        break;

    case 'mensajes':
        $otro = (int)($_GET['otro_id'] ?? 0);
        $st = db()->prepare("SELECT * FROM chats WHERE (emisor_id = :a AND receptor_id = :b) OR (emisor_id = :b AND receptor_id = :a) ORDER BY created_at ASC LIMIT 200");
        $st->execute(['a' => $user['id'], 'b' => $otro]);
        db()->prepare("UPDATE chats SET leido = 1 WHERE receptor_id = ? AND emisor_id = ? AND leido = 0")->execute([$user['id'], $otro]);
        jout(['ok' => true, 'mensajes' => $st->fetchAll()]);
        break;

    case 'enviar':
        require_fields($data, ['receptor_id','mensaje']);
        $st = db()->prepare("INSERT INTO chats (pedido_id, emisor_id, receptor_id, mensaje) VALUES (?, ?, ?, ?)");
        $st->execute([
            $data['pedido_id'] ?? null,
            $user['id'],
            $data['receptor_id'],
            $data['mensaje']
        ]);
        jout(['ok' => true, 'id' => (int)db()->lastInsertId()]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion invalida'], 400);
}
