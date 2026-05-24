<?php
require_once __DIR__ . '/conexion.php';

$action = $_GET['action'] ?? 'login';
$data = jread();

switch ($action) {

    case 'login':
        require_fields($data, ['identificador', 'password']);
        $id = trim($data['identificador']);
        $pass = $data['password'];
        
        // La consulta está bien, busca por email, telefono o username
        $st = db()->prepare("SELECT * FROM usuarios WHERE (username = ? OR email = ? OR telefono = ?) AND activo = 1 LIMIT 1");
        $st->execute([$id, $id, $id]);
        $u = $st->fetch();
        
        if (!$u || !password_verify($pass, $u['password_hash'])) {
            jout(['ok' => false, 'error' => 'Credenciales invalidas'], 401);
        }
        unset($u['password_hash']);
        jout(['ok' => true, 'usuario' => $u, 'token' => gen_token((int)$u['id'])]);
        break;

    case 'register':
        require_fields($data, ['nombre', 'password']);
        $email = $data['email'] ?? null;
        $tel   = $data['telefono'] ?? null;
        if (!$email && !$tel) jout(['ok' => false, 'error' => 'Email o telefono requerido'], 400);
        
        $check = db()->prepare("SELECT id FROM usuarios WHERE email = ? OR telefono = ?");
        $check->execute([$email, $tel]);
        if ($check->fetch()) jout(['ok' => false, 'error' => 'Usuario ya existe'], 409);
        
        $hash = password_hash($data['password'], PASSWORD_BCRYPT);
        $username = !empty($data['username']) ? strtolower(preg_replace('/[^a-z0-9_]/i', '', $data['username'])) : null;
        try {
            $st = db()->prepare("INSERT INTO usuarios (nombre, username, email, telefono, password_hash, auth_provider, rol, municipio, activo) VALUES (?, ?, ?, ?, ?, 'local', 'comprador', ?, 1)");
            $st->execute([$data['nombre'], $username, $email, $tel, $hash, $data['municipio'] ?? null]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000')
                jout(['ok' => false, 'error' => 'El usuario o email ya existe'], 409);
            throw $e;
        }
        $uid = (int)db()->lastInsertId();
        $u = db()->query("SELECT id,nombre,username,username_changed_at,email,telefono,telefono_verificado,rol,foto_perfil,municipio FROM usuarios WHERE id = $uid")->fetch();
        jout(['ok' => true, 'usuario' => $u, 'token' => gen_token($uid)]);
        break;

    case 'social':
        require_fields($data, ['provider', 'provider_uid', 'nombre']);
        $prov = $data['provider'];
        if (!in_array($prov, ['google','apple'])) jout(['ok' => false, 'error' => 'Provider invalido'], 400);
        $email = $data['email'] ?? null;
        $st = db()->prepare("SELECT * FROM usuarios WHERE (auth_provider = ? AND provider_uid = ?) OR email = ? LIMIT 1");
        $st->execute([$prov, $data['provider_uid'], $email]);
        $u = $st->fetch();
        if (!$u) {
            $ins = db()->prepare("INSERT INTO usuarios (nombre, email, auth_provider, provider_uid, rol) VALUES (?, ?, ?, ?, 'comprador')");
            $ins->execute([$data['nombre'], $email, $prov, $data['provider_uid']]);
            $uid = (int)db()->lastInsertId();
            $u = db()->query("SELECT * FROM usuarios WHERE id = $uid")->fetch();
        }
        unset($u['password_hash']);
        jout(['ok' => true, 'usuario' => $u, 'token' => gen_token((int)$u['id'])]);
        break;

    case 'telefono_sms':
        require_fields($data, ['telefono']);
        $codigo = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        jout(['ok' => true, 'codigo' => $codigo, 'mensaje' => 'SMS simulado enviado']);
        break;

    case 'telefono_verificar':
        require_fields($data, ['telefono', 'codigo', 'nombre']);
        $tel = $data['telefono'];
        $st = db()->prepare("SELECT * FROM usuarios WHERE telefono = ? LIMIT 1");
        $st->execute([$tel]);
        $u = $st->fetch();
        if (!$u) {
            $ins = db()->prepare("INSERT INTO usuarios (nombre, telefono, auth_provider, rol) VALUES (?, ?, 'telefono', 'comprador')");
            $ins->execute([$data['nombre'], $tel]);
            $uid = (int)db()->lastInsertId();
            $u = db()->query("SELECT * FROM usuarios WHERE id = $uid")->fetch();
        }
        unset($u['password_hash']);
        jout(['ok' => true, 'usuario' => $u, 'token' => gen_token((int)$u['id'])]);
        break;

    case 'me':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        unset($u['password_hash']);
        jout(['ok' => true, 'usuario' => $u]);
        break;

    case 'actualizar_ubicacion':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['municipio']);
        $st = db()->prepare("UPDATE usuarios SET municipio = ?, lat = ?, lng = ? WHERE id = ?");
        $st->execute([$data['municipio'], $data['lat'] ?? null, $data['lng'] ?? null, $u['id']]);
        jout(['ok' => true]);
        break;

    case 'check_username':
        require_fields($data, ['username']);
        $raw = strtolower(preg_replace('/[^a-z0-9_]/i', '', $data['username']));
        $raw = substr($raw, 0, 30);
        if (strlen($raw) < 3) jout(['ok' => true, 'disponible' => false]);
        $excludeId = isset($data['exclude_id']) ? (int)$data['exclude_id'] : null;
        if ($excludeId) {
            $st = db()->prepare("SELECT id FROM usuarios WHERE username = ? AND id != ? LIMIT 1");
            $st->execute([$raw, $excludeId]);
        } else {
            $st = db()->prepare("SELECT id FROM usuarios WHERE username = ? LIMIT 1");
            $st->execute([$raw]);
        }
        jout(['ok' => true, 'disponible' => !$st->fetch()]);
        break;

    case 'actualizar_perfil':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);

        // Password check
        if (!empty($data['password_nueva'])) {
            if (empty($data['password_actual'])) jout(['ok' => false, 'error' => 'Se requiere la contraseña actual'], 400);
            $row = db()->query("SELECT password_hash FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
            if (!password_verify($data['password_actual'], $row['password_hash']))
                jout(['ok' => false, 'error' => 'Contraseña actual incorrecta'], 401);
        }

        // Username cooldown (10 días), permitido si username_changed_at IS NULL (primer cambio)
        $cambiarUsername = false;
        $newUsername     = null;
        if (!empty($data['username'])) {
            $usernameClean = strtolower(preg_replace('/[^a-z0-9_]/i', '', $data['username']));
            $rowU = db()->query("SELECT username, username_changed_at FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
            if ($usernameClean !== ($rowU['username'] ?? '')) {
                if ($rowU['username_changed_at'] !== null) {
                    $stDias = db()->prepare("SELECT TIMESTAMPDIFF(DAY, ?, NOW())");
                    $stDias->execute([$rowU['username_changed_at']]);
                    $diasPasados = (int)$stDias->fetchColumn();
                    if ($diasPasados < 10)
                        jout(['ok' => false, 'error' => 'cooldown_username', 'dias_restantes' => 10 - $diasPasados], 429);
                }
                $cambiarUsername = true;
                $newUsername     = $usernameClean;
            }
        }

        // Photo
        $foto = null;
        if (!empty($data['foto_perfil']) && str_starts_with($data['foto_perfil'], 'data:image'))
            $foto = save_base64_image($data['foto_perfil'], 'perfiles', 'u_' . $u['id']);

        $newHash = !empty($data['password_nueva']) ? password_hash($data['password_nueva'], PASSWORD_BCRYPT) : null;

        // Build dynamic UPDATE
        $sets   = "nombre = COALESCE(?, nombre), email = COALESCE(?, email), telefono = COALESCE(?, telefono), foto_perfil = COALESCE(?, foto_perfil), password_hash = COALESCE(?, password_hash)";
        $params = [$data['nombre'] ?? null, $data['email'] ?? null, $data['telefono'] ?? null, $foto, $newHash];
        if ($cambiarUsername) {
            $sets    .= ", username = ?, username_changed_at = NOW()";
            $params[] = $newUsername;
        }
        $params[] = $u['id'];

        try {
            $st = db()->prepare("UPDATE usuarios SET $sets WHERE id = ?");
            $st->execute($params);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000')
                jout(['ok' => false, 'error' => 'username_taken'], 409);
            throw $e;
        }
        $updated = db()->query("SELECT id,nombre,username,username_changed_at,email,telefono,rol,foto_perfil,municipio,lat,lng,auth_provider FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
        jout(['ok' => true, 'usuario' => $updated]);
        break;

    case 'enviar_sms':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        $tel = $u['telefono'] ?? $data['telefono'] ?? null;
        if (!$tel) jout(['ok' => false, 'error' => 'Sin numero de telefono'], 400);
        $codigo = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        db()->prepare("UPDATE usuarios SET sms_code = ? WHERE id = ?")->execute([$codigo, $u['id']]);
        jout(['ok' => true, 'codigo' => $codigo, 'telefono' => $tel]);
        break;

    case 'verificar_sms':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        db()->prepare("UPDATE usuarios SET telefono_verificado = 1, sms_code = NULL WHERE id = ?")->execute([$u['id']]);
        $updated = db()->query("SELECT id,nombre,username,username_changed_at,email,telefono,telefono_verificado,rol,foto_perfil,municipio,lat,lng,auth_provider FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
        jout(['ok' => true, 'usuario' => $updated]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion no valida'], 400);
}