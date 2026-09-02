<?php
require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/whatsapp.php';

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

        // NOTA: la verificación de correo obligatoria antes de entrar está deshabilitada por
        // el momento (ver 'register') -- el correo sin confirmar ya no bloquea el login, solo
        // queda pendiente de forma opcional (ver 'registro_verificar_email').
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

        // NOTA: la verificación de correo obligatoria está deshabilitada por el momento -- la
        // cuenta entra activa de inmediato (auto-login) sin esperar a que se confirme el
        // código. Si hay correo igual se genera y se manda el código, y email_verificado queda
        // en 0, para poder retomar el flujo de confirmación opcional más adelante (ver
        // 'registro_verificar_email').
        $codigo = $email ? str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT) : null;

        try {
            $st = db()->prepare(
                "INSERT INTO usuarios (nombre, username, email, telefono, password_hash, auth_provider, rol, municipio, activo, email_verificado, email_verificacion_code, email_verificacion_exp)
                 VALUES (?, ?, ?, ?, ?, 'local', 'comprador', ?, 1, ?, ?, ?)"
            );
            $st->execute([
                $data['nombre'], $username, $email, $tel, $hash, $data['municipio'] ?? null,
                $email ? 0 : 1,
                $codigo,
                $codigo ? date('Y-m-d H:i:s', time() + 1800) : null,
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000')
                jout(['ok' => false, 'error' => 'El usuario o email ya existe'], 409);
            throw $e;
        }
        $uid = (int)db()->lastInsertId();

        if ($email) enviar_email_verificacion_registro($email, $data['nombre'], $codigo);

        $u = db()->query("SELECT id,nombre,username,username_changed_at,email,telefono,telefono_verificado,rol,foto_perfil,municipio FROM usuarios WHERE id = $uid")->fetch();
        $usernameSugerido = $username ? null : generar_username_sugerido($data['nombre']);
        jout(['ok' => true, 'usuario' => $u, 'token' => gen_token($uid), 'es_nuevo' => true, 'username_sugerido' => $usernameSugerido]);
        break;

    // Confirma el código enviado al registrarse por formulario y activa la cuenta (auto-login).
    case 'registro_verificar_email':
        require_fields($data, ['email', 'codigo']);
        $st = db()->prepare(
            "SELECT id, nombre, username, email_verificacion_code,
                    (email_verificacion_exp IS NOT NULL AND email_verificacion_exp > NOW()) AS vigente
             FROM usuarios WHERE email = ? AND auth_provider = 'local' AND email_verificado = 0 LIMIT 1"
        );
        $st->execute([$data['email']]);
        $u = $st->fetch();
        if (!$u) jout(['ok' => false, 'error' => 'Nada pendiente de verificar para ese correo'], 400);
        if (!$u['email_verificacion_code'] || $u['email_verificacion_code'] !== $data['codigo']) {
            jout(['ok' => false, 'error' => 'Código inválido'], 400);
        }
        if (!$u['vigente']) jout(['ok' => false, 'error' => 'Código expirado'], 400);

        db()->prepare("UPDATE usuarios SET activo = 1, email_verificado = 1, email_verificacion_code = NULL, email_verificacion_exp = NULL WHERE id = ?")
            ->execute([$u['id']]);
        $usuario = db()->query("SELECT id,nombre,username,username_changed_at,email,telefono,telefono_verificado,rol,foto_perfil,municipio FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
        $usernameSugerido = $u['username'] ? null : generar_username_sugerido($u['nombre']);
        jout(['ok' => true, 'usuario' => $usuario, 'token' => gen_token((int)$u['id']), 'es_nuevo' => true, 'username_sugerido' => $usernameSugerido]);
        break;

    case 'registro_reenviar_email':
        require_fields($data, ['email']);
        $st = db()->prepare("SELECT id, nombre FROM usuarios WHERE email = ? AND auth_provider = 'local' AND email_verificado = 0 LIMIT 1");
        $st->execute([$data['email']]);
        $u = $st->fetch();
        if (!$u) jout(['ok' => false, 'error' => 'Nada pendiente de verificar para ese correo'], 400);
        $codigo = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        db()->prepare("UPDATE usuarios SET email_verificacion_code = ?, email_verificacion_exp = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?")
            ->execute([$codigo, $u['id']]);
        $enviado = enviar_email_verificacion_registro($data['email'], $u['nombre'], $codigo);
        jout(['ok' => true, 'email_enviado' => $enviado, 'codigo_dev' => $enviado ? null : $codigo]);
        break;

    case 'social':
        require_fields($data, ['provider']);
        $prov = $data['provider'];
        if (!in_array($prov, ['google','apple'])) jout(['ok' => false, 'error' => 'Provider invalido'], 400);

        if ($prov === 'google') {
            // El cliente nunca manda su identidad "de palabra": manda el ID token firmado
            // por Google y el backend lo verifica antes de confiar en sub/email/name.
            require_fields($data, ['id_token']);
            $verificado = verificar_google_id_token($data['id_token']);
            if (!$verificado) jout(['ok' => false, 'error' => 'Token de Google inválido o expirado'], 401);
            $providerUid = $verificado['sub'];
            $email = $verificado['email'];
            $nombre = $verificado['name'] ?? 'Usuario de Google';
        } else {
            require_fields($data, ['provider_uid', 'nombre']);
            $providerUid = $data['provider_uid'];
            $email = $data['email'] ?? null;
            $nombre = $data['nombre'];
        }

        $st = db()->prepare("SELECT * FROM usuarios WHERE (auth_provider = ? AND provider_uid = ?) OR email = ? LIMIT 1");
        $st->execute([$prov, $providerUid, $email]);
        $u = $st->fetch();
        $esNuevo = false;
        if (!$u) {
            $ins = db()->prepare("INSERT INTO usuarios (nombre, email, auth_provider, provider_uid, rol) VALUES (?, ?, ?, ?, 'comprador')");
            $ins->execute([$nombre, $email, $prov, $providerUid]);
            $uid = (int)db()->lastInsertId();
            $u = db()->query("SELECT * FROM usuarios WHERE id = $uid")->fetch();
            $esNuevo = true;
        }
        unset($u['password_hash']);
        $usernameSugerido = (!$u['username'] && $esNuevo) ? generar_username_sugerido($nombre) : null;
        jout(['ok' => true, 'usuario' => $u, 'token' => gen_token((int)$u['id']), 'es_nuevo' => $esNuevo, 'username_sugerido' => $usernameSugerido]);
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
        if (!array_key_exists('municipio', $data)) jout(['ok' => false, 'error' => 'Campo requerido: municipio'], 400);
        $municipio = $data['municipio'] === '' ? null : $data['municipio'];
        $st = db()->prepare("UPDATE usuarios SET municipio = ?, lat = ?, lng = ? WHERE id = ?");
        $st->execute([$municipio, $data['lat'] ?? null, $data['lng'] ?? null, $u['id']]);
        $updated = db()->query("SELECT id,nombre,username,email,telefono,rol,foto_perfil,municipio,lat,lng,auth_provider FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
        jout(['ok' => true, 'usuario' => $updated]);
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

        // Cooldown compartido para nombre/correo (14 días) -- "información personal" no se
        // edita a la ligera. El username tiene su propio cooldown independiente (abajo).
        $rowDatos = db()->query("SELECT nombre, email, datos_changed_at FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
        $diasRestantesDatos = null;
        if ($rowDatos['datos_changed_at'] !== null) {
            $stDiasD = db()->prepare("SELECT TIMESTAMPDIFF(DAY, ?, NOW())");
            $stDiasD->execute([$rowDatos['datos_changed_at']]);
            $diasPasadosD = (int)$stDiasD->fetchColumn();
            if ($diasPasadosD < 14) $diasRestantesDatos = 14 - $diasPasadosD;
        }

        $cambiarNombre = !empty($data['nombre']) && $data['nombre'] !== $rowDatos['nombre'];
        if ($cambiarNombre && $diasRestantesDatos !== null) {
            jout(['ok' => false, 'error' => 'cooldown_datos', 'dias_restantes' => $diasRestantesDatos], 429);
        }

        // El correo nunca se aplica directo: se manda un código de verificación al nuevo
        // correo (columna `email_pendiente`) y solo se confirma vía la acción `email_verificar`.
        $emailVerificacionEnviada = false;
        $codigoEmailDev = null;
        if (!empty($data['email']) && $data['email'] !== $rowDatos['email']) {
            if ($diasRestantesDatos !== null) {
                jout(['ok' => false, 'error' => 'cooldown_datos', 'dias_restantes' => $diasRestantesDatos], 429);
            }
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                jout(['ok' => false, 'error' => 'Correo inválido'], 400);
            }
            $chkEmail = db()->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?");
            $chkEmail->execute([$data['email'], $u['id']]);
            if ($chkEmail->fetch()) jout(['ok' => false, 'error' => 'email_en_uso', 'mensaje' => 'Ese correo ya está en uso por otra cuenta.'], 409);

            $codigoEmailDev = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            db()->prepare("UPDATE usuarios SET email_pendiente = ?, email_verificacion_code = ?, email_verificacion_exp = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?")
                ->execute([$data['email'], $codigoEmailDev, $u['id']]);
            $emailVerificacionEnviada = true;
            // NOTA: no hay proveedor de correo real configurado en este entorno; el código
            // se devuelve en la respuesta (mismo patrón que el SMS simulado) para poder probarlo.
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

        // Build dynamic UPDATE -- nombre y correo NO van aquí como COALESCE directo:
        // nombre solo si de verdad cambió (para no pisar datos_changed_at sin necesidad),
        // correo nunca (queda pendiente de confirmación arriba).
        $sets   = "telefono = COALESCE(?, telefono), foto_perfil = COALESCE(?, foto_perfil), password_hash = COALESCE(?, password_hash)";
        $params = [$data['telefono'] ?? null, $foto, $newHash];
        if ($cambiarNombre) {
            $sets    .= ", nombre = ?, datos_changed_at = NOW()";
            $params[] = $data['nombre'];
        }
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
        $updated = db()->query("SELECT id,nombre,username,username_changed_at,datos_changed_at,email,email_pendiente,telefono,telefono_verificado,rol,foto_perfil,municipio,lat,lng,auth_provider FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
        jout(['ok' => true, 'usuario' => $updated, 'email_verificacion_enviado' => $emailVerificacionEnviada, 'codigo_dev' => $codigoEmailDev]);
        break;

    // Confirma el correo pendiente (email_pendiente) con el código de 6 dígitos enviado
    // al iniciar el cambio en `actualizar_perfil`. Solo aquí se aplica de verdad `email`.
    case 'email_verificar':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['codigo']);
        // La vigencia se evalúa DENTRO de MySQL (no con strtotime()+time() en PHP) porque el
        // reloj/zona horaria del proceso PHP puede no coincidir con el de MySQL -- comparar
        // ambos relojes por separado puede marcar un código recién emitido como "expirado".
        $rowE = db()->query(
            "SELECT email_pendiente, email_verificacion_code,
                    (email_verificacion_exp IS NOT NULL AND email_verificacion_exp > NOW()) AS vigente
             FROM usuarios WHERE id = " . (int)$u['id']
        )->fetch();
        if (!$rowE['email_pendiente'] || !$rowE['email_verificacion_code']) {
            jout(['ok' => false, 'error' => 'Sin cambio de correo pendiente'], 400);
        }
        if ($rowE['email_verificacion_code'] !== $data['codigo']) {
            jout(['ok' => false, 'error' => 'Código inválido'], 400);
        }
        if (!$rowE['vigente']) {
            jout(['ok' => false, 'error' => 'Código expirado'], 400);
        }
        $chkE = db()->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?");
        $chkE->execute([$rowE['email_pendiente'], $u['id']]);
        if ($chkE->fetch()) jout(['ok' => false, 'error' => 'email_en_uso', 'mensaje' => 'Ese correo ya está en uso por otra cuenta.'], 409);

        db()->prepare("UPDATE usuarios SET email = ?, email_pendiente = NULL, email_verificacion_code = NULL, email_verificacion_exp = NULL, datos_changed_at = NOW() WHERE id = ?")
            ->execute([$rowE['email_pendiente'], $u['id']]);
        $updated = db()->query("SELECT id,nombre,username,username_changed_at,datos_changed_at,email,telefono,telefono_verificado,rol,foto_perfil,municipio,lat,lng,auth_provider FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
        jout(['ok' => true, 'usuario' => $updated]);
        break;

    case 'email_reenviar_codigo':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        $rowP = db()->query("SELECT email_pendiente FROM usuarios WHERE id = " . (int)$u['id'])->fetch();
        if (!$rowP['email_pendiente']) jout(['ok' => false, 'error' => 'Sin cambio de correo pendiente'], 400);
        $codigo = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        db()->prepare("UPDATE usuarios SET email_verificacion_code = ?, email_verificacion_exp = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?")
            ->execute([$codigo, $u['id']]);
        jout(['ok' => true, 'codigo_dev' => $codigo, 'email' => $rowP['email_pendiente']]);
        break;

    case 'email_cancelar':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        db()->prepare("UPDATE usuarios SET email_pendiente = NULL, email_verificacion_code = NULL, email_verificacion_exp = NULL WHERE id = ?")
            ->execute([$u['id']]);
        jout(['ok' => true]);
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
        // Un vendedor o repartidor ya activo no tiene por qué cambiar de rol: solo
        // un comprador puede activar uno de sus roles aprobados (vendedor/repartidor).
        if ($u['rol'] !== 'comprador') {
            jout(['ok' => false, 'error' => 'no_permitido', 'mensaje' => 'Tu cuenta ya tiene un rol activo y no puede cambiarlo.'], 403);
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

    // Manda el código de verificación de teléfono por WhatsApp (vía Twilio, ver whatsapp.php).
    // Si viene `telefono` en el body (ej. onboarding, número nuevo aún no guardado) se
    // guarda de una vez y el teléfono queda sin verificar hasta confirmar el código.
    case 'enviar_sms':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        $telNuevo = !empty($data['telefono']) ? preg_replace('/\D/', '', (string)$data['telefono']) : null;
        $tel = $telNuevo ?: $u['telefono'];
        if (!$tel) jout(['ok' => false, 'error' => 'Sin numero de telefono'], 400);

        $codigo = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        if ($telNuevo && $telNuevo !== $u['telefono']) {
            $chkTel = db()->prepare("SELECT id FROM usuarios WHERE telefono = ? AND id != ?");
            $chkTel->execute([$telNuevo, $u['id']]);
            if ($chkTel->fetch()) jout(['ok' => false, 'error' => 'Ese teléfono ya está en uso por otra cuenta.'], 409);
            db()->prepare("UPDATE usuarios SET telefono = ?, telefono_verificado = 0, sms_code = ?, sms_code_exp = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?")
                ->execute([$telNuevo, $codigo, $u['id']]);
        } else {
            db()->prepare("UPDATE usuarios SET sms_code = ?, sms_code_exp = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?")
                ->execute([$codigo, $u['id']]);
        }

        $enviado = enviar_whatsapp_codigo($tel, $codigo);
        // NOTA: si Twilio no está configurado (o el envío falla), el código se devuelve en la
        // respuesta para poder seguir probando el flujo sin credenciales reales.
        jout(['ok' => true, 'enviado' => $enviado, 'codigo' => $enviado ? null : $codigo, 'telefono' => $tel]);
        break;

    case 'verificar_sms':
        $u = current_user();
        if (!$u) jout(['ok' => false, 'error' => 'No autenticado'], 401);
        require_fields($data, ['codigo']);
        $st = db()->prepare(
            "SELECT sms_code, (sms_code_exp IS NOT NULL AND sms_code_exp > NOW()) AS vigente
             FROM usuarios WHERE id = ?"
        );
        $st->execute([$u['id']]);
        $row = $st->fetch();
        if (!$row['sms_code']) jout(['ok' => false, 'error' => 'No hay un código pendiente. Pide uno nuevo.'], 400);
        if ($row['sms_code'] !== $data['codigo']) jout(['ok' => false, 'error' => 'Código inválido'], 400);
        if (!$row['vigente']) jout(['ok' => false, 'error' => 'Código expirado'], 400);

        db()->prepare("UPDATE usuarios SET telefono_verificado = 1, sms_code = NULL, sms_code_exp = NULL WHERE id = ?")->execute([$u['id']]);
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
        // Vigencia evaluada en MySQL -- ver nota en 'email_verificar' sobre por qué
        // strtotime()+time() en PHP no es confiable aquí (reloj/zona horaria distintos).
        $st = db()->prepare(
            "SELECT id, reset_password_code, (reset_password_exp IS NOT NULL AND reset_password_exp > NOW()) AS vigente
             FROM usuarios WHERE (username = ? OR email = ? OR telefono = ?) LIMIT 1"
        );
        $st->execute([$id, $id, $id]);
        $u = $st->fetch();
        if (!$u || !$u['reset_password_code'] || $u['reset_password_code'] !== $data['codigo']) {
            jout(['ok' => false, 'error' => 'Código inválido'], 400);
        }
        if (!$u['vigente']) {
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