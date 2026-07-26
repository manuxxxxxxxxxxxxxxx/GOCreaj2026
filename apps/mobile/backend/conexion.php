<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('DB_HOST', 'localhost');
define('DB_NAME', 'svgo_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('UPLOAD_BASE', __DIR__ . '/uploads/');
// Clave de firma de tokens de sesión. En producción esto debe venir de una variable de entorno,
// no vivir en el código fuente.
define('AUTH_SECRET', 'svgo_2026_9f3a7c1e4b8d5601a2f9c4e7b3d8016fa5c2e9b7d4f1a806');
define('AUTH_TTL_SECONDS', 60 * 60 * 24 * 30); // 30 días

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER, DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'DB: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}

function db_migrate(): void {
    $stmts = [
        // mensajes → chats: nombre histórico de la tabla, el código ya usa "chats"
        "RENAME TABLE mensajes TO chats",
        // usuarios
        "ALTER TABLE usuarios ADD COLUMN username_changed_at DATETIME NULL AFTER username",
        "ALTER TABLE usuarios ADD COLUMN telefono_verificado TINYINT(1) NOT NULL DEFAULT 0 AFTER telefono",
        "ALTER TABLE usuarios ADD COLUMN sms_code VARCHAR(6) NULL AFTER telefono_verificado",
        "ALTER TABLE usuarios ADD COLUMN en_linea TINYINT(1) NOT NULL DEFAULT 0 AFTER activo",
        // tiendas
        "ALTER TABLE tiendas ADD COLUMN portada VARCHAR(255) NULL",
        "ALTER TABLE tiendas ADD COLUMN hora_apertura TIME NULL",
        "ALTER TABLE tiendas ADD COLUMN hora_cierre TIME NULL",
        "ALTER TABLE tiendas ADD COLUMN categoria VARCHAR(80) NULL",
        "ALTER TABLE tiendas ADD COLUMN logo VARCHAR(255) NULL",
        "ALTER TABLE tiendas ADD COLUMN calificacion_promedio DECIMAL(3,2) NOT NULL DEFAULT 0",
        "ALTER TABLE tiendas ADD COLUMN total_resenas INT NOT NULL DEFAULT 0",
        "ALTER TABLE tiendas ADD COLUMN ventas_completadas INT NOT NULL DEFAULT 0",
        // solicitudes_rol — nuevos campos para vendedor y repartidor
        "ALTER TABLE solicitudes_rol ADD COLUMN nombre_negocio VARCHAR(120) NULL",
        "ALTER TABLE solicitudes_rol ADD COLUMN foto_negocio VARCHAR(255) NULL",
        "ALTER TABLE solicitudes_rol ADD COLUMN licencia_frente VARCHAR(255) NULL",
        "ALTER TABLE solicitudes_rol ADD COLUMN licencia_reverso VARCHAR(255) NULL",
        "ALTER TABLE solicitudes_rol ADD COLUMN tipo_vehiculo VARCHAR(40) NULL",
        // chats — multimedia & location
        "ALTER TABLE chats ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'texto' AFTER mensaje",
        "ALTER TABLE chats ADD COLUMN adjunto VARCHAR(500) NULL AFTER tipo",
        "ALTER TABLE chats ADD COLUMN lat DECIMAL(10,7) NULL AFTER adjunto",
        "ALTER TABLE chats ADD COLUMN lng DECIMAL(10,7) NULL AFTER lat",
        // chat_meta — per-user archive/favorite state
        "CREATE TABLE IF NOT EXISTS chat_meta (id INT PRIMARY KEY AUTO_INCREMENT, usuario_id INT NOT NULL, otro_id INT NOT NULL, archivado TINYINT(1) NOT NULL DEFAULT 0, favorito TINYINT(1) NOT NULL DEFAULT 0, UNIQUE KEY uk_chat_meta (usuario_id, otro_id))",
        // llamadas — call history
        "CREATE TABLE IF NOT EXISTS llamadas (id INT PRIMARY KEY AUTO_INCREMENT, emisor_id INT NOT NULL, receptor_id INT NOT NULL, tipo VARCHAR(10) NOT NULL DEFAULT 'voz', estado VARCHAR(20) NOT NULL DEFAULT 'iniciando', duracion INT NULL, webrtc_room VARCHAR(100) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)",
        // chats — reply & product context
        "ALTER TABLE chats ADD COLUMN reply_to_id INT NULL AFTER lng",
        "ALTER TABLE chats ADD COLUMN reply_snapshot TEXT NULL AFTER reply_to_id",
        // pedidos — municipio entrega
        "ALTER TABLE pedidos ADD COLUMN municipio_entrega VARCHAR(120) NULL",
        "ALTER TABLE pedidos ADD COLUMN departamento_entrega VARCHAR(80) NULL",
        // municipios_sv — catálogo de 39 municipios de El Salvador
        "CREATE TABLE IF NOT EXISTS municipios_sv (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(120) NOT NULL,
            departamento VARCHAR(80) NOT NULL,
            lat DECIMAL(10,7) NOT NULL DEFAULT 13.6929,
            lng DECIMAL(10,7) NOT NULL DEFAULT -89.2182,
            INDEX idx_nombre (nombre),
            INDEX idx_departamento (departamento)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        // direcciones_usuario — direcciones guardadas por usuario
        "CREATE TABLE IF NOT EXISTS direcciones_usuario (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            alias VARCHAR(80) NOT NULL DEFAULT 'Casa',
            municipio VARCHAR(120) NOT NULL,
            departamento VARCHAR(80) NOT NULL DEFAULT 'San Salvador',
            direccion VARCHAR(255) NOT NULL,
            referencia VARCHAR(255) NULL,
            lat DECIMAL(10,7) NULL,
            lng DECIMAL(10,7) NULL,
            es_principal TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        // tiendas — lat/lng si no existen
        "ALTER TABLE tiendas ADD COLUMN lat DECIMAL(10,7) NULL",
        "ALTER TABLE tiendas ADD COLUMN lng DECIMAL(10,7) NULL",
        // productos — índice FULLTEXT para búsqueda
        "ALTER TABLE productos ADD FULLTEXT INDEX idx_ft_nombre_desc (nombre, descripcion)",
        // índices de rendimiento en chats
        "CREATE INDEX IF NOT EXISTS idx_chats_conv ON chats (emisor_id, receptor_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_chats_unread ON chats (receptor_id, leido)",
        // productos — video URL para Reels
        "ALTER TABLE productos ADD COLUMN video_url VARCHAR(500) NULL",
        // productos — estado AGOTADO automático
        "ALTER TABLE productos ADD COLUMN estado_stock VARCHAR(20) NOT NULL DEFAULT 'disponible'",
        // productos — contador de vistas de Reels
        "ALTER TABLE productos ADD COLUMN vistas_count INT NOT NULL DEFAULT 0",
        // productos_reportes — moderación de reels
        "CREATE TABLE IF NOT EXISTS productos_reportes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            producto_id INT NOT NULL,
            usuario_id INT NOT NULL,
            motivo VARCHAR(160) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_producto (producto_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        // seguidores_tienda — sistema follow desde Reels
        "CREATE TABLE IF NOT EXISTS seguidores_tienda (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            tienda_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_follow (usuario_id, tienda_id),
            INDEX idx_tienda (tienda_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        // comentarios — hilos anidados (parent_id)
        "ALTER TABLE comentarios ADD COLUMN parent_id INT NULL",
        "ALTER TABLE comentarios ADD COLUMN likes_count INT NOT NULL DEFAULT 0",
        // comentarios_likes — like de comentario
        "CREATE TABLE IF NOT EXISTS comentarios_likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            comentario_id INT NOT NULL,
            usuario_id INT NOT NULL,
            UNIQUE KEY uk_clike (comentario_id, usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        // wallets — billeteras virtuales del negocio y repartidor
        "CREATE TABLE IF NOT EXISTS wallets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            saldo DECIMAL(10,2) NOT NULL DEFAULT 0,
            UNIQUE KEY uk_wallet (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        // wallet_movimientos — auditoría
        "CREATE TABLE IF NOT EXISTS wallet_movimientos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            tipo VARCHAR(20) NOT NULL,
            monto DECIMAL(10,2) NOT NULL,
            referencia VARCHAR(120) NULL,
            pedido_id INT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_usuario (usuario_id),
            INDEX idx_pedido (pedido_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        // pedidos — campos de pago/comisión
        "ALTER TABLE pedidos ADD COLUMN pago_estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'",
        "ALTER TABLE pedidos ADD COLUMN pago_referencia VARCHAR(80) NULL",
        "ALTER TABLE pedidos ADD COLUMN comision_plataforma DECIMAL(10,2) NOT NULL DEFAULT 0",
        "ALTER TABLE pedidos ADD COLUMN total_repartidor DECIMAL(10,2) NOT NULL DEFAULT 0",
        "ALTER TABLE pedidos ADD COLUMN total_vendedor DECIMAL(10,2) NOT NULL DEFAULT 0",
        "ALTER TABLE pedidos ADD COLUMN repartidor_lat DECIMAL(10,7) NULL",
        "ALTER TABLE pedidos ADD COLUMN repartidor_lng DECIMAL(10,7) NULL",
        // calificaciones — feedback loop de reputación
        "CREATE TABLE IF NOT EXISTS calificaciones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            comprador_id INT NOT NULL,
            tienda_id INT NOT NULL,
            estrellas TINYINT NOT NULL,
            comentario TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_cal (pedido_id, comprador_id),
            INDEX idx_tienda (tienda_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        // usuarios — última actividad (para "Activo hace Xm" en el chat)
        "ALTER TABLE usuarios ADD COLUMN ultimo_visto DATETIME NULL",
        // chats — adjuntos de documento (PDF) y nota de voz (audio)
        "ALTER TABLE chats ADD COLUMN adjunto_nombre VARCHAR(255) NULL AFTER adjunto",
        "ALTER TABLE chats ADD COLUMN adjunto_tamano INT NULL AFTER adjunto_nombre",
        "ALTER TABLE chats ADD COLUMN adjunto_duracion INT NULL AFTER adjunto_tamano",
        // chat_reacciones — una reacción (emoji) por usuario por mensaje
        "CREATE TABLE IF NOT EXISTS chat_reacciones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            chat_id INT NOT NULL,
            usuario_id INT NOT NULL,
            emoji VARCHAR(10) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_reaccion (chat_id, usuario_id),
            INDEX idx_chat (chat_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        // ─── Módulo Repartidor: sub-estados de entrega en tiempo real ───
        "ALTER TABLE pedidos ADD COLUMN progreso_repartidor VARCHAR(20) NULL AFTER estado",

        // pedido_repartidor_descartes — un repartidor puede "rechazar" un pedido disponible
        // sin bloquearlo para el resto de la flota
        "CREATE TABLE IF NOT EXISTS pedido_repartidor_descartes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            repartidor_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_descarte (pedido_id, repartidor_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        // calificaciones_repartidor — reputación del repartidor, separada de la de la tienda
        "CREATE TABLE IF NOT EXISTS calificaciones_repartidor (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pedido_id INT NOT NULL,
            comprador_id INT NOT NULL,
            repartidor_id INT NOT NULL,
            estrellas TINYINT NOT NULL,
            comentario TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_cal_rep (pedido_id, comprador_id),
            INDEX idx_repartidor (repartidor_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        // usuarios — promedio de calificación acumulado del repartidor
        "ALTER TABLE usuarios ADD COLUMN repartidor_calificacion_promedio DECIMAL(3,2) NOT NULL DEFAULT 0",
        "ALTER TABLE usuarios ADD COLUMN repartidor_total_resenas INT NOT NULL DEFAULT 0",
        // usuarios — descripción personal del repartidor (bio de perfil)
        "ALTER TABLE usuarios ADD COLUMN descripcion VARCHAR(500) NULL",

        // pedidos — pago en efectivo: con cuánto billete paga el cliente
        "ALTER TABLE pedidos ADD COLUMN efectivo_paga_con DECIMAL(10,2) NULL",

        // tiendas — campos del wizard de creación
        "ALTER TABLE tiendas ADD COLUMN telefono VARCHAR(20) NULL",
        "ALTER TABLE tiendas ADD COLUMN metodos_pago VARCHAR(120) NULL",

        // retiros — solicitudes de retiro de saldo de wallet hacia una cuenta real
        "CREATE TABLE IF NOT EXISTS retiros (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            monto DECIMAL(10,2) NOT NULL,
            metodo VARCHAR(30) NOT NULL,
            datos_cuenta VARCHAR(255) NOT NULL,
            estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
            notas_admin VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            resuelto_at DATETIME NULL,
            INDEX idx_usuario (usuario_id),
            INDEX idx_estado (estado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        // productos — promociones reales
        "ALTER TABLE productos ADD COLUMN precio_oferta DECIMAL(10,2) NULL",
        "ALTER TABLE productos ADD COLUMN oferta_hasta DATETIME NULL",

        // productos_reportes — moderación: estado de resolución del reporte
        "ALTER TABLE productos_reportes ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'",
        "ALTER TABLE productos_reportes ADD COLUMN resuelto_por INT NULL",
        "ALTER TABLE productos_reportes ADD COLUMN resuelto_at DATETIME NULL",

        // calificaciones — permitir respuesta pública del vendedor
        "ALTER TABLE calificaciones ADD COLUMN respuesta_vendedor TEXT NULL",
        "ALTER TABLE calificaciones ADD COLUMN respuesta_at DATETIME NULL",

        // notificaciones — centro de notificaciones in-app
        "CREATE TABLE IF NOT EXISTS notificaciones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            titulo VARCHAR(180) NOT NULL,
            cuerpo TEXT NULL,
            tipo ENUM('pedido','chat','sistema','promocion') NOT NULL DEFAULT 'sistema',
            leida TINYINT(1) NOT NULL DEFAULT 0,
            referencia_id INT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_usuario_leida (usuario_id, leida)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        // municipios_sv — bandera de cobertura activa
        "ALTER TABLE municipios_sv ADD COLUMN cobertura_activa TINYINT(1) NOT NULL DEFAULT 1",

        // ─── Interacciones de Reels ───
        "CREATE TABLE IF NOT EXISTS video_likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            producto_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_video_like (usuario_id, producto_id),
            INDEX idx_producto (producto_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS video_guardados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            producto_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_video_guardado (usuario_id, producto_id),
            INDEX idx_producto (producto_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS video_compartidos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            producto_id INT NOT NULL,
            canal VARCHAR(20) NOT NULL DEFAULT 'app',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_producto (producto_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS video_comentarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            producto_id INT NOT NULL,
            comentario TEXT NOT NULL,
            parent_id INT NULL,
            likes_count INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_producto (producto_id),
            INDEX idx_parent (parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        // usuarios — recuperación de contraseña y push token
        "ALTER TABLE usuarios ADD COLUMN reset_password_code VARCHAR(6) NULL",
        "ALTER TABLE usuarios ADD COLUMN reset_password_exp DATETIME NULL",
        "ALTER TABLE usuarios ADD COLUMN expo_push_token VARCHAR(120) NULL",

        // cupones — códigos de descuento globales de la plataforma
        "CREATE TABLE IF NOT EXISTS cupones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            codigo VARCHAR(40) NOT NULL,
            tipo ENUM('porcentaje','monto') NOT NULL DEFAULT 'porcentaje',
            valor DECIMAL(10,2) NOT NULL,
            min_compra DECIMAL(10,2) NOT NULL DEFAULT 0,
            usos_max INT NULL,
            usos_actuales INT NOT NULL DEFAULT 0,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            expira_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_codigo (codigo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS cupones_usos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cupon_id INT NOT NULL,
            usuario_id INT NOT NULL,
            pedido_id INT NULL,
            monto_descontado DECIMAL(10,2) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cupon (cupon_id),
            INDEX idx_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "ALTER TABLE pedidos ADD COLUMN cupon_codigo VARCHAR(40) NULL",
        "ALTER TABLE pedidos ADD COLUMN descuento_cupon DECIMAL(10,2) NOT NULL DEFAULT 0",
    ];
    foreach ($stmts as $sql) {
        try { db()->exec($sql); } catch (PDOException $e) {}
    }
}
db_migrate();
seed_municipios();

function seed_municipios(): void {
    $count = db()->query("SELECT COUNT(*) FROM municipios_sv")->fetchColumn();
    if ((int)$count > 0) return;
    $municipios = [
        ['San Salvador','San Salvador',13.6929,-89.2182],
        ['Soyapango','San Salvador',13.7153,-89.1692],
        ['Mejicanos','San Salvador',13.7283,-89.2283],
        ['Apopa','San Salvador',13.8028,-89.1792],
        ['Delgado','San Salvador',13.7267,-89.1908],
        ['Ilopango','San Salvador',13.7000,-89.1167],
        ['San Marcos','San Salvador',13.6667,-89.2000],
        ['Cuscatancingo','San Salvador',13.7333,-89.2167],
        ['Villa Delgado','San Salvador',13.7267,-89.1908],
        ['Santa Tecla','La Libertad',13.6742,-89.2803],
        ['Antiguo Cuscatlán','La Libertad',13.6769,-89.2519],
        ['San Juan Opico','La Libertad',13.8833,-89.3667],
        ['Quezaltepeque','La Libertad',13.8333,-89.2667],
        ['Zaragoza','La Libertad',13.5908,-89.2997],
        ['Colón','La Libertad',13.7167,-89.3667],
        ['Chalatenango','Chalatenango',14.0333,-88.9333],
        ['Santa Ana','Santa Ana',13.9942,-89.5597],
        ['San Ana','Santa Ana',13.9942,-89.5597],
        ['Ahuachapán','Ahuachapán',13.9208,-89.8453],
        ['Sonsonate','Sonsonate',13.7189,-89.7239],
        ['La Libertad','La Libertad',13.4833,-89.3167],
        ['San Miguel','San Miguel',13.4822,-88.1775],
        ['Usulután','Usulután',13.3500,-88.4500],
        ['San Vicente','San Vicente',13.6419,-88.7847],
        ['Cojutepeque','Cuscatlán',13.7167,-88.9333],
        ['Zacatecoluca','La Paz',13.5000,-88.8667],
        ['Sensuntepeque','Cabañas',13.8667,-88.6333],
        ['La Unión','La Unión',13.3372,-87.8433],
        ['Santa Rosa de Lima','La Unión',13.6269,-87.9956],
        ['Metapán','Santa Ana',14.3333,-89.4500],
        ['Acajutla','Sonsonate',13.5925,-89.8278],
        ['Chalchuapa','Santa Ana',13.9833,-89.6833],
        ['Ciudad Arce','La Libertad',13.8333,-89.4000],
        ['San Pablo Tacachico','La Libertad',13.9667,-89.3500],
        ['Tonacatepeque','San Salvador',13.7833,-89.1167],
        ['Panchimalco','San Salvador',13.6167,-89.1833],
        ['Rosario de Mora','San Salvador',13.5667,-89.1833],
        ['Aguilares','San Salvador',13.9500,-89.1833],
        ['Guazapa','San Salvador',13.9167,-89.1167],
    ];
    $ins = db()->prepare("INSERT IGNORE INTO municipios_sv (nombre,departamento,lat,lng) VALUES (?,?,?,?)");
    foreach ($municipios as [$n,$d,$lat,$lng]) {
        try { $ins->execute([$n,$d,$lat,$lng]); } catch (PDOException $e) {}
    }
}

function jread(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return $_POST;
    $j = json_decode($raw, true);
    return is_array($j) ? $j : $_POST;
}

function jout($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function require_fields(array $data, array $fields): void {
    foreach ($fields as $f) {
        if (!isset($data[$f]) || $data[$f] === '') {
            jout(['ok' => false, 'error' => "Campo requerido: $f"], 400);
        }
    }
}

/**
 * URL pública de /uploads/, derivada del Host real de CADA petición en vez de un
 * valor fijo. Así funciona igual desde localhost (web) que desde la IP de LAN
 * (teléfono en Expo Go) o un dominio real en producción.
 */
function upload_url(): string {
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return "{$scheme}://{$host}/GOCreaj2026/apps/mobile/backend/uploads/";
}

function save_base64_image(string $b64, string $subdir, string $prefix): ?string {
    if (!preg_match('/^data:image\/(\w+);base64,/', $b64, $m)) return null;
    $ext = strtolower($m[1]);
    if (!in_array($ext, ['jpg','jpeg','png','webp'])) $ext = 'jpg';
    $data = base64_decode(preg_replace('/^data:image\/\w+;base64,/', '', $b64));
    if ($data === false) return null;
    $dir = UPLOAD_BASE . $subdir;
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $name = $prefix . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    file_put_contents($dir . '/' . $name, $data);
    return upload_url() . $subdir . '/' . $name;
}

/**
 * Guarda un video base64 (data:video/mp4;base64,...) en uploads/<subdir>.
 * Devuelve la URL pública o null si el formato es inválido.
 */
function save_base64_video(string $b64, string $subdir, string $prefix): ?string {
    if (!preg_match('/^data:video\/(\w+);base64,/', $b64, $m)) return null;
    $ext = strtolower($m[1]);
    if (!in_array($ext, ['mp4','webm','mov','m4v','quicktime'])) $ext = 'mp4';
    if ($ext === 'quicktime') $ext = 'mov';
    $data = base64_decode(preg_replace('/^data:video\/\w+;base64,/', '', $b64));
    if ($data === false) return null;
    $dir = UPLOAD_BASE . $subdir;
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $name = $prefix . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    file_put_contents($dir . '/' . $name, $data);
    return upload_url() . $subdir . '/' . $name;
}

/**
 * Guarda un PDF base64 (data:application/pdf;base64,...) en uploads/<subdir>.
 * Devuelve la URL pública o null si el formato es inválido.
 */
function save_base64_pdf(string $b64, string $subdir, string $prefix): ?string {
    if (!preg_match('/^data:application\/pdf;base64,/', $b64)) return null;
    $data = base64_decode(preg_replace('/^data:application\/pdf;base64,/', '', $b64));
    if ($data === false) return null;
    $dir = UPLOAD_BASE . $subdir;
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $name = $prefix . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.pdf';
    file_put_contents($dir . '/' . $name, $data);
    return upload_url() . $subdir . '/' . $name;
}

/**
 * Guarda una nota de voz base64 (data:audio/xxx;base64,...) en uploads/<subdir>.
 * Devuelve la URL pública o null si el formato es inválido.
 */
function save_base64_audio(string $b64, string $subdir, string $prefix): ?string {
    if (!preg_match('/^data:audio\/([\w-]+);base64,/', $b64, $m)) return null;
    $ext = strtolower($m[1]);
    if (!in_array($ext, ['m4a', 'mp4', 'aac', 'wav', 'webm', '3gp', 'mpeg', 'x-m4a'])) $ext = 'm4a';
    if ($ext === 'x-m4a') $ext = 'm4a';
    $data = base64_decode(preg_replace('/^data:audio\/[\w-]+;base64,/', '', $b64));
    if ($data === false) return null;
    $dir = UPLOAD_BASE . $subdir;
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $name = $prefix . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    file_put_contents($dir . '/' . $name, $data);
    return upload_url() . $subdir . '/' . $name;
}

/**
 * Token firmado: base64(uid|emitido|expira|nonce) + "." + HMAC-SHA256 del payload.
 * Impide falsificar un token sin conocer AUTH_SECRET, y expira a los AUTH_TTL_SECONDS.
 */
function gen_token(int $uid): string {
    $payload = $uid . '|' . time() . '|' . (time() + AUTH_TTL_SECONDS) . '|' . bin2hex(random_bytes(16));
    $b64 = base64_encode($payload);
    $sig = hash_hmac('sha256', $b64, AUTH_SECRET);
    return $b64 . '.' . $sig;
}

function uid_from_token(?string $token): ?int {
    if (!$token || strpos($token, '.') === false) return null;
    [$b64, $sig] = explode('.', $token, 2);
    $expected = hash_hmac('sha256', $b64, AUTH_SECRET);
    if (!hash_equals($expected, $sig)) return null;
    $dec = base64_decode($b64, true);
    if (!$dec) return null;
    $parts = explode('|', $dec);
    if (count($parts) < 3) return null;
    $expira = (int)$parts[2];
    if ($expira > 0 && time() > $expira) return null;
    return isset($parts[0]) ? (int)$parts[0] : null;
}

function current_user(): ?array {
    // Apache puede no pasar HTTP_AUTHORIZATION — intentamos las 3 formas posibles
    $hdr = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';
    if (!$hdr && function_exists('getallheaders')) {
        $all = getallheaders();
        $hdr = $all['Authorization'] ?? $all['authorization'] ?? '';
    }
    $token = trim(str_replace('Bearer', '', $hdr));
    $uid = uid_from_token($token);
    if (!$uid) return null;
    $st = db()->prepare("SELECT * FROM usuarios WHERE id = ? AND activo = 1");
    $st->execute([$uid]);
    $u = $st->fetch();
    if ($u) {
        db()->prepare("UPDATE usuarios SET ultimo_visto = NOW() WHERE id = ?")->execute([$uid]);
    }
    return $u ?: null;
}

/**
 * Crea una notificación in-app y, si el usuario tiene un expo_push_token, dispara
 * también un push real vía la API de Expo. No lanza si algo falla.
 */
function crear_notificacion(int $usuarioId, string $tipo, string $titulo, ?string $cuerpo = null, ?int $referenciaId = null): void {
    if (!in_array($tipo, ['pedido', 'chat', 'sistema', 'promocion'], true)) $tipo = 'sistema';
    try {
        db()->prepare(
            "INSERT INTO notificaciones (usuario_id, titulo, cuerpo, tipo, referencia_id) VALUES (?, ?, ?, ?, ?)"
        )->execute([$usuarioId, $titulo, $cuerpo, $tipo, $referenciaId]);
    } catch (Throwable $e) { /* no crítico */ }
    enviar_push_expo($usuarioId, $titulo, $cuerpo);
}

function enviar_push_expo(int $usuarioId, string $titulo, ?string $cuerpo): void {
    try {
        $st = db()->prepare("SELECT expo_push_token FROM usuarios WHERE id = ?");
        $st->execute([$usuarioId]);
        $token = $st->fetchColumn();
        if (!$token || !str_starts_with($token, 'ExponentPushToken')) return;
        $payload = json_encode([
            'to' => $token,
            'title' => $titulo,
            'body' => $cuerpo ?? '',
            'sound' => 'default',
        ]);
        $ch = curl_init('https://exp.host/--/api/v2/push/send');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 3,
        ]);
        curl_exec($ch);
        curl_close($ch);
    } catch (Throwable $e) { /* no crítico */ }
}

function distancia_km(float $lat1, float $lng1, float $lat2, float $lng2): float {
    $r = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat/2) * sin($dLat/2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLng/2) * sin($dLng/2);
    return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
}
