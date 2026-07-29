<?php
require_once __DIR__ . '/conexion.php';

$action = $_GET['action'] ?? 'login';
$data = jread();

switch ($action) {

    case 'login':
        require_fields($data, ['identificador', 'password']);
        $id = trim($data['identificador']);
        $pass = $data['password'];

        // Primero buscamos sin filtrar activo para distinguir "credenciales incorrectas" de "suspendido"
        $st = db()->prepare("SELECT * FROM usuarios WHERE (username = ? OR email = ? OR telefono = ?) LIMIT 1");
        $st->execute([$id, $id, $id]);
        $u = $st->fetch();

        if (!$u || !password_verify($pass, $u['password_hash'])) {
            jout(['ok' => false, 'error' => 'Credenciales invalidas'], 401);
        }

        if (!(int)$u['activo']) {
            jout(['ok' => false, 'error' => 'cuenta_suspendida', 'mensaje' => 'Tu cuenta ha sido suspendida. Contacta al soporte si crees que es un error.'], 403);
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

        // Username cooldown (14 días), permitido si username_changed_at IS NULL (primer cambio)
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
                    if ($diasPasados < 14)
                        jout(['ok' => false, 'error' => 'cooldown_username', 'dias_restantes' => 14 - $diasPasados], 429);
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

    // ─── Roles habilitados en la cuenta: 'comprador' siempre + cualquier solicitud aprobada ───
    case 'mis_roles':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        $st = db()->prepare("SELECT DISTINCT rol_solicitado FROM solicitudes_rol WHERE usuario_id = ? AND estado = 'aprobado'");
        $st->execute([$u['id']]);
        $roles = array_column($st->fetchAll(), 'rol_solicitado');
        $roles[] = 'comprador';
        $roles[] = $u['rol'];
        $roles = array_values(array_unique($roles));
        jout(['ok' => true, 'roles' => $roles, 'rol_activo' => $u['rol']]);
        break;

    // ─── Cambiar el rol activo entre los que la cuenta ya tiene habilitados ───
    case 'cambiar_rol':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['rol']);
        $rolNuevo = $data['rol'];
        if (!in_array($rolNuevo, ['comprador', 'vendedor', 'repartidor'], true)) {
            jout(['ok' => false, 'error' => 'Rol inválido'], 400);
        }
        if ($rolNuevo !== 'comprador') {
            $chk = db()->prepare("SELECT 1 FROM solicitudes_rol WHERE usuario_id = ? AND rol_solicitado = ? AND estado = 'aprobado' LIMIT 1");
            $chk->execute([$u['id'], $rolNuevo]);
            if (!$chk->fetch()) {
                jout(['ok' => false, 'error' => 'no_habilitado', 'mensaje' => 'Tu cuenta aún no tiene ese rol aprobado. Solicítalo en "Convertirse en socio".'], 403);
            }
        }
        db()->prepare("UPDATE usuarios SET rol = ? WHERE id = ?")->execute([$rolNuevo, $u['id']]);
        $updated = db()->query("SELECT id,nombre,username,email,telefono,rol,foto_perfil,municipio,lat,lng,auth_provider FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
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

    // Recuperar contraseña: no requiere sesión. Genera un código de 6 dígitos válido 15 min.
    // NOTA: no hay proveedor real de email/SMS configurado en este entorno, así que el código
    // se devuelve en la misma respuesta en vez de enviarse de verdad.
    case 'recuperar_solicitar':
        require_fields($data, ['identificador']);
        $id = trim($data['identificador']);
        $st = db()->prepare("SELECT id FROM usuarios WHERE (username = ? OR email = ? OR telefono = ?) AND auth_provider = 'local' LIMIT 1");
        $st->execute([$id, $id, $id]);
        $u = $st->fetch();
        if (!$u) jout(['ok' => true, 'enviado' => true]);
        $codigo = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        db()->prepare("UPDATE usuarios SET reset_password_code = ?, reset_password_exp = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?")
            ->execute([$codigo, $u['id']]);
        jout(['ok' => true, 'enviado' => true, 'codigo_dev' => $codigo]);
        break;

    case 'recuperar_confirmar':
        require_fields($data, ['identificador', 'codigo', 'password_nueva']);
        $id = trim($data['identificador']);
        $st = db()->prepare("SELECT id, reset_password_code, reset_password_exp FROM usuarios WHERE (username = ? OR email = ? OR telefono = ?) LIMIT 1");
        $st->execute([$id, $id, $id]);
        $u = $st->fetch();
        if (!$u || !$u['reset_password_code'] || $u['reset_password_code'] !== $data['codigo']) {
            jout(['ok' => false, 'error' => 'Código inválido'], 400);
        }
        if (!$u['reset_password_exp'] || strtotime($u['reset_password_exp']) < time()) {
            jout(['ok' => false, 'error' => 'Código expirado'], 400);
        }
        if (strlen($data['password_nueva']) < 6) jout(['ok' => false, 'error' => 'La contraseña debe tener al menos 6 caracteres'], 400);
        $hash = password_hash($data['password_nueva'], PASSWORD_BCRYPT);
        db()->prepare("UPDATE usuarios SET password_hash = ?, reset_password_code = NULL, reset_password_exp = NULL WHERE id = ?")
            ->execute([$hash, $u['id']]);
        jout(['ok' => true]);
        break;

    // Sincroniza el idioma elegido entre app y web a través de la cuenta del usuario.
    case 'actualizar_idioma':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['idioma']);
        if (!in_array($data['idioma'], ['es', 'en', 'fr'], true)) jout(['ok' => false, 'error' => 'Idioma inválido'], 400);
        db()->prepare("UPDATE usuarios SET idioma = ? WHERE id = ?")->execute([$data['idioma'], $u['id']]);
        jout(['ok' => true]);
        break;

    case 'guardar_push_token':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['expo_push_token']);
        db()->prepare("UPDATE usuarios SET expo_push_token = ? WHERE id = ?")->execute([$data['expo_push_token'], $u['id']]);
        jout(['ok' => true]);
        break;

    // ═══ Privacidad y seguridad ═══════════════════════════════════════════

    case 'sesiones_listar':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        $miNonce = current_session_nonce();
        $st = db()->prepare(
            "SELECT id, nonce, user_agent, ip, created_at, last_seen_at
             FROM sesiones WHERE usuario_id = ? AND revocado = 0
             AND (expira_at IS NULL OR expira_at > NOW())
             ORDER BY last_seen_at DESC"
        );
        $st->execute([$u['id']]);
        $sesiones = array_map(function ($s) use ($miNonce) {
            $s['es_actual'] = ($s['nonce'] === $miNonce);
            unset($s['nonce']); // no exponer el identificador crudo de sesión
            return $s;
        }, $st->fetchAll());
        jout(['ok' => true, 'sesiones' => $sesiones]);
        break;

    case 'sesiones_cerrar':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['id']);
        db()->prepare("UPDATE sesiones SET revocado = 1 WHERE id = ? AND usuario_id = ?")
            ->execute([(int)$data['id'], $u['id']]);
        jout(['ok' => true]);
        break;

    case 'sesiones_cerrar_otras':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        $miNonce = current_session_nonce();
        $st = db()->prepare("UPDATE sesiones SET revocado = 1 WHERE usuario_id = ? AND nonce != ?");
        $st->execute([$u['id'], $miNonce ?? '']);
        jout(['ok' => true]);
        break;

    case 'usuarios_bloqueados':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        $st = db()->prepare(
            "SELECT b.id, b.bloqueado_id, b.created_at, u.nombre, u.username, u.foto_perfil
             FROM usuarios_bloqueados b JOIN usuarios u ON u.id = b.bloqueado_id
             WHERE b.usuario_id = ? ORDER BY b.created_at DESC"
        );
        $st->execute([$u['id']]);
        jout(['ok' => true, 'bloqueados' => $st->fetchAll()]);
        break;

    case 'bloquear_usuario':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['usuario_id']);
        $otroId = (int)$data['usuario_id'];
        if ($otroId === (int)$u['id']) jout(['ok' => false, 'error' => 'No puedes bloquearte a ti mismo'], 400);
        db()->prepare("INSERT IGNORE INTO usuarios_bloqueados (usuario_id, bloqueado_id) VALUES (?, ?)")
            ->execute([$u['id'], $otroId]);
        jout(['ok' => true]);
        break;

    case 'desbloquear_usuario':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['usuario_id']);
        db()->prepare("DELETE FROM usuarios_bloqueados WHERE usuario_id = ? AND bloqueado_id = ?")
            ->execute([$u['id'], (int)$data['usuario_id']]);
        jout(['ok' => true]);
        break;

    case 'actualizar_visibilidad':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['perfil_publico']);
        db()->prepare("UPDATE usuarios SET perfil_publico = ? WHERE id = ?")
            ->execute([(int)(bool)$data['perfil_publico'], $u['id']]);
        jout(['ok' => true]);
        break;

    // Eliminación de cuenta: soft-delete (activo = 0) + revoca todas las sesiones.
    // Sigue el mismo patrón de "activo" usado por moderación de admin, así se puede reactivar sin perder datos.
    case 'eliminar_cuenta':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        if ($u['auth_provider'] === 'local') {
            require_fields($data, ['password']);
            if (!password_verify($data['password'], $u['password_hash'])) {
                jout(['ok' => false, 'error' => 'Contraseña incorrecta'], 401);
            }
        }
        db()->prepare("UPDATE usuarios SET activo = 0 WHERE id = ?")->execute([$u['id']]);
        db()->prepare("UPDATE sesiones SET revocado = 1 WHERE usuario_id = ?")->execute([$u['id']]);
        jout(['ok' => true]);
        break;

    default:
        jout(['ok' => false, 'error' => 'Accion no valida'], 400);
}