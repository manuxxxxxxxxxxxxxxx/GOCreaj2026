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
define('UPLOAD_URL', 'http://localhost/GOCreaj2026/apps/mobile/backend/uploads/');

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
    ];
    foreach ($stmts as $sql) {
        try { db()->exec($sql); } catch (PDOException $e) {}
    }
}
db_migrate();

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
    return UPLOAD_URL . $subdir . '/' . $name;
}

function gen_token(int $uid): string {
    return base64_encode($uid . '|' . time() . '|' . bin2hex(random_bytes(16)));
}

function uid_from_token(?string $token): ?int {
    if (!$token) return null;
    $dec = base64_decode($token, true);
    if (!$dec) return null;
    $parts = explode('|', $dec);
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
    return $st->fetch() ?: null;
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
