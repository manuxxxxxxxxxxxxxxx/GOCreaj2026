<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Todos los valores sensibles se leen de variables de entorno, con el valor de
// desarrollo local (XAMPP) como fallback -- así en local no hay que configurar nada,
// y en producción (Railway, etc.) se inyectan las variables reales sin tocar código.
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'svgo_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('UPLOAD_BASE', __DIR__ . '/uploads/');
// Path público bajo el cual cuelga este backend (usado para armar/reescribir URLs de
// /uploads/, ver current_origin()/rewrite_upload_urls()/upload_url() más abajo). En XAMPP
// es "/GOCreaj2026/apps/mobile/backend" porque el proyecto vive en una subcarpeta de
// htdocs; en un contenedor (Docker/Railway) el backend corre en la raíz del dominio, así
// que ahí UPLOAD_URL_PATH debe ser "" (vacío) vía variable de entorno.
define('UPLOAD_URL_PATH', getenv('UPLOAD_URL_PATH') !== false ? getenv('UPLOAD_URL_PATH') : '/GOCreaj2026/apps/mobile/backend');
// Clave de firma de tokens de sesión.
define('AUTH_SECRET', getenv('AUTH_SECRET') ?: 'svgo_2026_9f3a7c1e4b8d5601a2f9c4e7b3d8016fa5c2e9b7d4f1a806');
define('AUTH_TTL_SECONDS', 60 * 60 * 24 * 30); // 30 días
// Client ID(s) de OAuth de Google Cloud Console que esta API acepta como "aud" válido
// en el ID token (ver GOOGLE_AUTH_SETUP.md). Puede llevar varios separados por coma
// (ej. el mismo Web Client ID que usan mobile y web, más los de builds iOS/Android
// de producción si se generan). Vacío = login con Google desactivado en el backend.
define('GOOGLE_CLIENT_IDS', getenv('GOOGLE_CLIENT_IDS') ?: '195559019978-sqfadh1srban3akat11eiko3hpciq6pv.apps.googleusercontent.com');

// ─── Correo saliente (verificación de registro) vía SMTP de Gmail ───
// Rellena estos dos valores con tu cuenta: SMTP_USER es el correo de Gmail que
// envía, SMTP_PASS es una "contraseña de aplicación" de 16 caracteres (NO tu
// contraseña normal de Gmail) -- se genera en https://myaccount.google.com/apppasswords
// (requiere verificación en 2 pasos activada en la cuenta).
// Mientras estos dos campos queden vacíos, el sistema cae automáticamente a modo
// simulado: el código de verificación se devuelve en la respuesta (codigo_dev) en
// vez de enviarse de verdad, para poder seguir probando sin credenciales reales.
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_PORT', (int)(getenv('SMTP_PORT') ?: 587));
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'SV[Go]');

// ─── WhatsApp saliente (verificación de teléfono) vía Meta WhatsApp Cloud API ───
// Se configura en developers.facebook.com (app de tipo "Business" → producto WhatsApp):
// WHATSAPP_PHONE_NUMBER_ID sale de WhatsApp > API Setup ("Phone number ID", NO es el
// número en sí). WHATSAPP_ACCESS_TOKEN es el token temporal de esa misma pantalla para
// pruebas, o un token permanente de un System User (Business Settings > Users > System
// Users) para producción. WHATSAPP_TEMPLATE_NAME es el nombre de una plantilla categoría
// "Authentication" ya aprobada por Meta (se crea en WhatsApp Manager > Message Templates;
// la aprobación suele tardar minutos, son gratis de crear).
// Igual que el correo: si quedan vacíos, cae a modo simulado (código en la respuesta).
define('WHATSAPP_PHONE_NUMBER_ID', getenv('WHATSAPP_PHONE_NUMBER_ID') ?: '');
define('WHATSAPP_ACCESS_TOKEN', getenv('WHATSAPP_ACCESS_TOKEN') ?: '');
define('WHATSAPP_TEMPLATE_NAME', getenv('WHATSAPP_TEMPLATE_NAME') ?: 'verificacion_codigo');

/**
 * Espejo de CATEGORIAS en apps/mobile/frontend/src/lib/categoryIcons.tsx — mantener sincronizado
 * si se agregan categorías ahí. Antes esta validación vivía duplicada en vendedor_dashboard.php
 * con solo 7 categorías viejas, así que crear/editar un producto en cualquiera de las otras 122
 * fallaba con "Categoría inválida" (400) sin razón visible para el vendedor.
 */
define('CATEGORIAS_VALIDAS', [
    'comida', 'mercado', 'farmacia', 'bebidas', 'panaderia', 'postres', 'frutas', 'verduras',
    'ropa', 'calzado', 'electronica', 'hogar', 'envios', 'general',
    'comida_rapida', 'restaurantes', 'comida_saludable', 'vegana', 'comida_tipica', 'pizza', 'sushi',
    'mexicana', 'italiana', 'pollo', 'mariscos', 'parrilla', 'desayunos', 'almuerzos', 'catering', 'dieta_especial',
    'cafe', 'jugos', 'cerveceria', 'vinos', 'energeticas', 'te', 'agua_refrescos',
    'reposteria', 'heladeria', 'chocolateria', 'dulces_tipicos', 'snacks',
    'carniceria', 'pescaderia', 'organicos', 'granel', 'lacteos', 'huevos', 'especias',
    'optica', 'dental', 'suplementos', 'equipo_medico', 'adulto_mayor', 'primeros_auxilios',
    'cosmeticos', 'cuidado_piel', 'peluqueria', 'perfumeria', 'higiene', 'barberia', 'unas',
    'ropa_mujer', 'ropa_hombre', 'ropa_infantil', 'ropa_deportiva', 'lenceria', 'uniformes',
    'accesorios', 'joyeria', 'lentes_sol',
    'muebles', 'decoracion', 'electrodomesticos', 'electro_pequeno', 'blancos', 'cocina',
    'ferreteria', 'pintura', 'jardineria', 'limpieza',
    'celulares', 'computadoras', 'videojuegos', 'audio', 'camaras', 'domotica',
    'bebes', 'juguetes', 'escolar_ninos', 'sillas_auto',
    'mascotas', 'veterinaria', 'peluqueria_canina',
    'papeleria', 'libreria', 'oficina', 'impresiones',
    'deportes', 'suple_deportivo', 'bicicletas', 'gimnasio',
    'repuestos', 'accesorios_auto', 'lubricantes', 'llantas', 'lavado_autos', 'motos',
    'flores', 'regalos', 'pinateria', 'globos', 'tarjetas', 'peluches',
    'construccion', 'herramientas', 'electricidad_plomeria', 'instrumentos', 'manualidades', 'fotografia',
    'entretenimiento', 'lavanderia', 'mudanzas', 'reparaciones', 'cerrajeria',
    'segunda_mano', 'importados', 'religiosos', 'souvenirs',
]);

// Techo de precio realista para un marketplace local (comida, ropa, electrodomésticos,
// etc.) -- antes no existía ningún límite y un vendedor podía teclear "67000" o "10000000"
// por error (o el input numérico simplemente no lo impedía) y el producto se guardaba tal cual.
define('MAX_PRECIO_PRODUCTO', 9999.99);
define('MAX_IMAGENES_PRODUCTO', 10);

// Límites de caracteres realistas para el formulario de tienda (antes no existía ninguno,
// así que un vendedor podía pegar párrafos enteros en "nombre"). Ver vendedor_dashboard.php
// (crear_tienda/actualizar_tienda) y los formularios web/móvil, que muestran un contador.
define('MAX_NOMBRE_TIENDA', 50);
define('MAX_DESCRIPCION_TIENDA', 400);

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
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
        "ALTER TABLE solicitudes_rol ADD COLUMN vehiculo_modelo VARCHAR(80) NULL",
        "ALTER TABLE solicitudes_rol ADD COLUMN vehiculo_placa VARCHAR(20) NULL",
        "ALTER TABLE solicitudes_rol ADD COLUMN licencia_numero VARCHAR(30) NULL",
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

        // ─── Privacidad y seguridad ───
        "CREATE TABLE IF NOT EXISTS sesiones (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            nonce VARCHAR(32) NOT NULL,
            user_agent VARCHAR(255) NULL,
            ip VARCHAR(45) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expira_at DATETIME NULL,
            revocado TINYINT(1) NOT NULL DEFAULT 0,
            UNIQUE KEY uk_nonce (nonce),
            INDEX idx_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS usuarios_bloqueados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            bloqueado_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_bloqueo (usuario_id, bloqueado_id),
            INDEX idx_bloqueado (bloqueado_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "ALTER TABLE usuarios ADD COLUMN perfil_publico TINYINT(1) NOT NULL DEFAULT 1",

        // pedidos — marca de tiempo de asignación del repartidor (para medir tiempo invertido por viaje)
        "ALTER TABLE pedidos ADD COLUMN repartidor_asignado_at DATETIME NULL",

        // usuarios — preferencia de idioma, para que se mantenga sincronizada entre app y web
        "ALTER TABLE usuarios ADD COLUMN idioma VARCHAR(5) NOT NULL DEFAULT 'es'",

        // ─── Métodos de pago guardados (tokenizados) ───
        "CREATE TABLE IF NOT EXISTS metodos_pago (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            marca VARCHAR(20) NOT NULL,
            ultimos4 CHAR(4) NOT NULL,
            exp_mes TINYINT NOT NULL,
            exp_anio SMALLINT NOT NULL,
            predeterminado TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        // ─── Confirmación de recogida/entrega por código QR (ver DESIGN.md "Flujo logístico") ───
        // Recogida: reutiliza confirmado_vendedor_recogida/confirmado_repartidor_recogida ya
        // existentes — el token es lo que el repartidor debe escanear para poder confirmar.
        "ALTER TABLE pedidos ADD COLUMN qr_recogida_token VARCHAR(40) NULL AFTER confirmado_repartidor_recogida",
        // Entrega: nuevo par token/timestamp — el repartidor lo genera al llegar, el comprador
        // lo escanea para disparar la liquidación (finalizar_entrega_pedido).
        "ALTER TABLE pedidos ADD COLUMN qr_entrega_token VARCHAR(40) NULL AFTER qr_recogida_token",
        "ALTER TABLE pedidos ADD COLUMN qr_entrega_generado_at DATETIME NULL AFTER qr_entrega_token",

        // PIN de 6 dígitos como respaldo del QR (mismo momento en que se genera el QR, ver
        // confirmar_recogida/generar_qr_entrega) -- 3 intentos fallidos bloquean ESE código
        // puntual (recogida o entrega, no el pedido entero) y alertan a soporte. El QR nunca
        // se bloquea: es imposible de adivinar, así que sigue siendo la salida de emergencia.
        "ALTER TABLE pedidos ADD COLUMN pin_recogida VARCHAR(6) NULL AFTER qr_entrega_generado_at",
        "ALTER TABLE pedidos ADD COLUMN pin_recogida_intentos TINYINT NOT NULL DEFAULT 0 AFTER pin_recogida",
        "ALTER TABLE pedidos ADD COLUMN pin_recogida_bloqueado_hasta DATETIME NULL AFTER pin_recogida_intentos",
        "ALTER TABLE pedidos ADD COLUMN pin_entrega VARCHAR(6) NULL AFTER pin_recogida_bloqueado_hasta",
        "ALTER TABLE pedidos ADD COLUMN pin_entrega_intentos TINYINT NOT NULL DEFAULT 0 AFTER pin_entrega",
        "ALTER TABLE pedidos ADD COLUMN pin_entrega_bloqueado_hasta DATETIME NULL AFTER pin_entrega_intentos",

        // Despacho automático (ver ofrecer_siguiente_repartidor()/avanzar_despacho_global() más
        // abajo): oferta individual y exclusiva a UN repartidor con un timer corto. Si expira o
        // rechaza, se descarta (pedido_repartidor_descartes, tabla que ya existía para el
        // mercado de "disponibles") y se ofrece al siguiente más cercano. Si nadie contesta a
        // tiempo, el pedido queda libre para ese mercado normal -- no hace falta tocar esa
        // consulta, ya filtra por repartidor_id IS NULL.
        "ALTER TABLE pedidos ADD COLUMN oferta_repartidor_id INT NULL AFTER repartidor_asignado_at",
        "ALTER TABLE pedidos ADD COLUMN oferta_expira_at DATETIME NULL AFTER oferta_repartidor_id",

        // productos — hashtags del Reel, separados por espacio, sin el "#" (se agrega al mostrarlos)
        "ALTER TABLE productos ADD COLUMN hashtags VARCHAR(255) NULL",

        // pedidos — número de pedido visible al comprador: aleatorio y único, en vez del id
        // autoincremental (que es secuencial y deja adivinar cuántos pedidos van en el sistema).
        "ALTER TABLE pedidos ADD COLUMN numero_pedido VARCHAR(12) NULL AFTER id",
        "ALTER TABLE pedidos ADD UNIQUE INDEX uk_pedidos_numero (numero_pedido)",

        // usuarios — verificación de correo obligatoria al registrarse por formulario (no aplica
        // a Google, que ya llega verificado). DEFAULT 1 para no bloquear cuentas ya existentes.
        "ALTER TABLE usuarios ADD COLUMN email_verificado TINYINT(1) NOT NULL DEFAULT 1",
        // usuarios — vigencia del código de WhatsApp (sms_code), igual que ya existe para
        // email_verificacion_exp y reset_password_exp.
        "ALTER TABLE usuarios ADD COLUMN sms_code_exp DATETIME NULL",

        // soporte_reportes — tickets de "reportar un problema" (cualquier rol menos admin).
        // La tabla ya existía (creada fuera del sistema de migraciones) pero soporte.php
        // apuntaba al nombre equivocado ("reportes_soporte", que nunca existió) así que
        // crear/listar tickets fallaba en silencio para el usuario -- ahora corregido para
        // usar el mismo nombre que ya usa el lado admin. El CREATE cubre una instalación
        // nueva desde cero; los ALTER de abajo ponen al día una base ya existente como esta.
        "CREATE TABLE IF NOT EXISTS soporte_reportes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            asunto VARCHAR(180) NOT NULL,
            descripcion TEXT NOT NULL,
            adjunto VARCHAR(255) NULL,
            estado ENUM('abierto','en_proceso','resuelto','cerrado') NOT NULL DEFAULT 'abierto',
            respuesta_admin TEXT NULL,
            resuelto_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_usuario (usuario_id),
            INDEX idx_estado (estado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        // adjunto/resuelto_at no existían en la tabla original; y el ENUM de estado no
        // incluía 'resuelto' aunque toda la UI (botón "Resolver") ya lo escribe -- sin
        // este ALTER, MODO ESTRICTO de MySQL rechaza ese UPDATE con "Data truncated".
        "ALTER TABLE soporte_reportes ADD COLUMN adjunto VARCHAR(255) NULL AFTER descripcion",
        "ALTER TABLE soporte_reportes ADD COLUMN resuelto_at DATETIME NULL",
        "ALTER TABLE soporte_reportes MODIFY COLUMN estado ENUM('abierto','en_proceso','resuelto','cerrado') NOT NULL DEFAULT 'abierto'",

        // pedidos — "recoger en tienda": el comprador retira en persona, sin repartidor.
        // Reutiliza el mismo mecanismo QR/PIN de recogida que ya existía para el tramo
        // tienda→repartidor (ver confirmar_recogida en vendedor_dashboard.php y
        // confirmar_entrega en pedidos_tracking.php) -- ahora el comprador es quien lo
        // escanea/teclea directamente en el mostrador.
        "ALTER TABLE pedidos ADD COLUMN tipo_entrega ENUM('domicilio','recogida') NOT NULL DEFAULT 'domicilio' AFTER metodo_pago",
        // pedidos — notas del comprador para el vendedor/repartidor (ej. "sin cebolla",
        // "tocar el timbre"). La columna `notas` ya existía sin usarse en ningún flujo.

        // productos — galería de hasta 10 fotos (antes una sola). `imagen` se mantiene
        // sincronizada con la primera de `imagenes` para no romper ningún lugar que ya
        // la lee (ProductCard, pedido_items, reels, etc.) -- `imagenes` es JSON array de URLs.
        "ALTER TABLE productos ADD COLUMN imagenes TEXT NULL AFTER imagen",
        // productos — "stock ilimitado": antes solo existía un número real, así que un
        // vendedor sin control de inventario (ej. servicios, comida hecha al momento)
        // tenía que inventar una cantidad falsa para no aparecer agotado.
        "ALTER TABLE productos ADD COLUMN stock_ilimitado TINYINT(1) NOT NULL DEFAULT 0 AFTER stock",

        // tiendas — categoría múltiple: antes solo admitía una sola (VARCHAR(80)); ahora el
        // vendedor puede elegir varias del catálogo completo de CATEGORIAS_VALIDAS y se guardan
        // separadas por coma en la misma columna (StoreHero.tsx ya la leía como CSV). Se ensancha
        // para que quepan varias categorías largas sin truncarse.
        "ALTER TABLE tiendas MODIFY COLUMN categoria VARCHAR(600) NULL",

        // tiendas — límites de caracteres realistas para nombre/descripción (ver
        // MAX_NOMBRE_TIENDA / MAX_DESCRIPCION_TIENDA más abajo, validados en vendedor_dashboard.php).
        // nombre ya era VARCHAR(180); no hace falta ALTER, el límite se aplica a nivel app.

        // productos — oferta por porcentaje: además del precio_oferta final (monto fijo, ya
        // existente y usado en todo el resto del código), se guarda el tipo/valor originales
        // con los que el vendedor armó la oferta, para poder re-mostrarlos al editar (ej. "20%"
        // en vez de forzarlo a recalcular el monto cada vez que abre el formulario).
        "ALTER TABLE productos ADD COLUMN oferta_tipo ENUM('monto','porcentaje') NULL AFTER precio_oferta",
        "ALTER TABLE productos ADD COLUMN oferta_valor DECIMAL(10,2) NULL AFTER oferta_tipo",

        // notificaciones — nuevo tipo "interaccion" para avisar cuando a alguien le dan
        // like a su comentario de un reel, o le comentan/responden (ver crear_notificacion
        // en este archivo e interacciones.php). MODIFY COLUMN es idempotente: re-ejecutarlo
        // con el mismo ENUM no falla.
        "ALTER TABLE notificaciones MODIFY COLUMN tipo ENUM('pedido','chat','sistema','promocion','interaccion') NOT NULL DEFAULT 'sistema'",

        // reportes — tabla genérica de moderación para todo lo que NO sea un reel/producto
        // (esos ya usaban productos_reportes desde antes, y se sigue reutilizando esa misma
        // tabla para no duplicar el flujo que admin_dashboard.php ya tiene armado). Cubre:
        // tienda, comentario de reel y chat (conversación). `entidad_id` apunta a tienda_id /
        // comentario_id / al id del OTRO usuario de la conversación, según `tipo`.
        "CREATE TABLE IF NOT EXISTS reportes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tipo ENUM('tienda','comentario','chat') NOT NULL,
            entidad_id INT NOT NULL,
            usuario_id INT NOT NULL,
            motivo VARCHAR(160) NOT NULL,
            detalle TEXT NULL,
            estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
            resuelto_por INT NULL,
            resuelto_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_tipo_entidad (tipo, entidad_id),
            INDEX idx_estado (estado)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
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

/**
 * PDO (con EMULATE_PREPARES=false) devuelve las columnas DECIMAL como string
 * en vez de number -- ej. calificacion_promedio, lat/lng, precios. Eso rompe
 * cualquier .toFixed()/aritmética en el frontend. Aquí convertimos solo los
 * strings con forma decimal explícita ("4.50", "-89.2182000") a float antes
 * de armar el JSON; los strings sin punto decimal (OTP, teléfonos, tokens,
 * IDs) nunca calzan el patrón y quedan intactos.
 */
function numerizar_decimales($data) {
    if (is_array($data)) {
        foreach ($data as $k => $v) {
            $data[$k] = numerizar_decimales($v);
        }
        return $data;
    }
    if (is_string($data) && preg_match('/^-?\d+\.\d+$/', $data)) {
        return (float)$data;
    }
    return $data;
}

/**
 * Origen (scheme+host) de la petición ACTUAL. Reutilizado tanto para armar
 * URLs nuevas como para reescribir URLs viejas guardadas en la BD (ver
 * rewrite_upload_urls) -- así una URL de upload sigue funcionando aunque se
 * haya guardado desde otra IP/host en el pasado.
 */
function current_origin(): string {
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return "{$scheme}://{$host}";
}

/**
 * Reescribe cualquier URL de /uploads/ (sin importar qué host tenía guardado)
 * para que apunte al host de la petición actual. Necesario porque el host se
 * fija al momento de subir el archivo (ver upload_url()) y puede volverse
 * obsoleto si el celular/PC cambia de red -- esto lo corrige en cada
 * respuesta sin tener que migrar la base de datos ni tocar cada endpoint que
 * lee imagen/video/logo/portada/foto_perfil.
 */
function rewrite_upload_urls($data) {
    if (is_array($data)) {
        foreach ($data as $k => $v) {
            $data[$k] = rewrite_upload_urls($v);
        }
        return $data;
    }
    if (is_string($data) && preg_match('#^https?://[^/]+(' . preg_quote(UPLOAD_URL_PATH, '#') . '/uploads/.*)$#', $data, $m)) {
        return current_origin() . $m[1];
    }
    return $data;
}

/**
 * `productos.imagenes` se guarda como TEXT con un JSON array de URLs adentro (ver
 * crear_producto/actualizar_producto en vendedor_dashboard.php). PDO la devuelve tal cual
 * -- un string sin decodificar -- así que sin este paso: (a) el frontend recibiría un
 * string en vez de un array, y (b) rewrite_upload_urls no reescribiría las URLs de adentro
 * (el regex espera que el valor completo empiece con "http", no un JSON que empieza con "[").
 * Corre ANTES de rewrite_upload_urls para que las URLs ya decodificadas sí se reescriban.
 */
function decodificar_imagenes($data) {
    if (is_array($data)) {
        foreach ($data as $k => $v) {
            if ($k === 'imagenes' && is_string($v)) {
                $decoded = json_decode($v, true);
                $data[$k] = is_array($decoded) ? $decoded : [];
            } else {
                $data[$k] = decodificar_imagenes($v);
            }
        }
        return $data;
    }
    return $data;
}

function jout($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode(rewrite_upload_urls(numerizar_decimales(decodificar_imagenes($data))), JSON_UNESCAPED_UNICODE);
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
 * Número de pedido aleatorio y único (ej. "SV-8F42KD"), distinto del id autoincremental
 * de `pedidos` -- ese es secuencial y no debe mostrarse al comprador. Alfabeto sin 0/O/1/I
 * para que no se confundan al leerlo en voz alta o escribirlo. Reintenta en el
 * (extremadamente improbable) caso de colisión contra la columna UNIQUE.
 */
function generar_numero_pedido(): string {
    $alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for ($intento = 0; $intento < 5; $intento++) {
        $codigo = '';
        for ($i = 0; $i < 6; $i++) $codigo .= $alfabeto[random_int(0, strlen($alfabeto) - 1)];
        $codigo = 'SV-' . $codigo;
        $st = db()->prepare("SELECT 1 FROM pedidos WHERE numero_pedido = ?");
        $st->execute([$codigo]);
        if (!$st->fetch()) return $codigo;
    }
    return 'SV-' . strtoupper(bin2hex(random_bytes(4)));
}

/**
 * Sugerencia de @username a partir del nombre completo (ej. "Rodrigo Escobar" ->
 * "rodrigoescobar54"): minúsculas, sin acentos/espacios, + 2 dígitos al azar para
 * reducir choques. Reintenta con otro sufijo si ya existe; si tras varios intentos
 * sigue ocupado, cae a un sufijo más largo garantizado único.
 */
function generar_username_sugerido(string $nombre): string {
    $base = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $nombre) ?: $nombre;
    $base = strtolower(preg_replace('/[^a-z0-9]/i', '', $base));
    $base = substr($base, 0, 20) ?: 'usuario';
    for ($intento = 0; $intento < 6; $intento++) {
        $candidato = $base . str_pad((string)random_int(0, 99), 2, '0', STR_PAD_LEFT);
        $st = db()->prepare("SELECT 1 FROM usuarios WHERE username = ?");
        $st->execute([$candidato]);
        if (!$st->fetch()) return $candidato;
    }
    return $base . random_int(1000, 9999);
}

/**
 * URL pública de /uploads/, derivada del Host real de CADA petición en vez de un
 * valor fijo. Así funciona igual desde localhost (web) que desde la IP de LAN
 * (teléfono en Expo Go) o un dominio real en producción.
 */
function upload_url(): string {
    return current_origin() . UPLOAD_URL_PATH . "/uploads/";
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
 * Guarda un video subido como multipart/form-data ($_FILES[...]) con move_uploaded_file en vez
 * de decodificar base64 -- mucho más liviano para archivos grandes (sin el ~33% de overhead de
 * base64 ni tener que traer el archivo completo a memoria como string). Devuelve la URL pública,
 * o null si el archivo no llegó bien o no es un formato de video soportado.
 */
function save_uploaded_video(array $file, string $subdir, string $prefix): ?string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return null;
    }
    $ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
    if (!in_array($ext, ['mp4', 'webm', 'mov', 'm4v'])) $ext = 'mp4';
    $dir = UPLOAD_BASE . $subdir;
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $name = $prefix . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) return null;
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
    // El MediaRecorder del navegador suele reportar un mimeType con parámetros extra
    // (p. ej. "audio/webm;codecs=opus"), y ese mismo string termina como el tipo del data URI
    // ("data:audio/webm;codecs=opus;base64,..."). El regex original solo aceptaba
    // "data:audio/xxx;base64,", así que cualquier nota de voz grabada en Chrome/Edge (que sí
    // soportan MediaRecorder) fallaba silenciosamente al guardarse. Aceptamos cualquier
    // cantidad de parámetros ";algo=valor" entre el tipo y "base64,".
    if (!preg_match('/^data:audio\/([\w-]+)(?:;[^;,]+)*;base64,/', $b64, $m)) return null;
    $ext = strtolower($m[1]);
    if (!in_array($ext, ['m4a', 'mp4', 'aac', 'wav', 'webm', '3gp', 'mpeg', 'x-m4a'])) $ext = 'm4a';
    if ($ext === 'x-m4a') $ext = 'm4a';
    $comma = strpos($b64, ',');
    if ($comma === false) return null;
    $data = base64_decode(substr($b64, $comma + 1));
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
    $nonce = bin2hex(random_bytes(16));
    $expira = time() + AUTH_TTL_SECONDS;
    $payload = $uid . '|' . time() . '|' . $expira . '|' . $nonce;
    $b64 = base64_encode($payload);
    $sig = hash_hmac('sha256', $b64, AUTH_SECRET);
    try {
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        db()->prepare("INSERT INTO sesiones (usuario_id, nonce, user_agent, ip, expira_at) VALUES (?, ?, ?, ?, FROM_UNIXTIME(?))")
            ->execute([$uid, $nonce, $ua, $ip, $expira]);
    } catch (Throwable $e) { /* tabla de sesiones es best-effort; el token sigue siendo válido sin ella */ }
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
    $nonce = $parts[3] ?? null;
    if ($nonce) {
        try {
            $st = db()->prepare("SELECT revocado FROM sesiones WHERE nonce = ? LIMIT 1");
            $st->execute([$nonce]);
            $row = $st->fetch();
            if ($row) {
                if ((int)$row['revocado'] === 1) return null;
                db()->prepare("UPDATE sesiones SET last_seen_at = NOW() WHERE nonce = ?")->execute([$nonce]);
            }
        } catch (Throwable $e) { /* si la tabla no existe aún, el token sigue funcionando igual */ }
    }
    return isset($parts[0]) ? (int)$parts[0] : null;
}

/**
 * Verifica un ID token de Google contra el endpoint tokeninfo oficial y confirma que
 * el "aud" corresponda a uno de los Client ID en GOOGLE_CLIENT_IDS. Nunca hay que
 * confiar en un provider_uid/email que mande el cliente sin este paso: cualquiera
 * podría llamar a auth.php?action=social con datos inventados y suplantar a otro
 * usuario. Devuelve ['sub','email','name'] verificados por Google, o null si el
 * token es inválido, expiró, o fue emitido para otra app.
 */
function verificar_google_id_token(string $idToken): ?array {
    $allowed = array_filter(array_map('trim', explode(',', GOOGLE_CLIENT_IDS)));
    if (!$allowed) return null;
    $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 5]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200 || !$res) return null;
    $payload = json_decode($res, true);
    if (!is_array($payload) || empty($payload['sub'])) return null;
    if (!in_array($payload['aud'] ?? '', $allowed, true)) return null;
    if (!in_array($payload['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)) return null;
    return [
        'sub' => $payload['sub'],
        'email' => $payload['email'] ?? null,
        'name' => $payload['name'] ?? null,
    ];
}

/** Header Authorization crudo de la petición actual (sin "Bearer "), o cadena vacía. */
function current_bearer_token(): string {
    $hdr = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';
    if (!$hdr && function_exists('getallheaders')) {
        $all = getallheaders();
        $hdr = $all['Authorization'] ?? $all['authorization'] ?? '';
    }
    return trim(str_replace('Bearer', '', $hdr));
}

/** Nonce (id de sesión) del token de la petición actual, o null. */
function current_session_nonce(): ?string {
    $token = current_bearer_token();
    if (!$token || strpos($token, '.') === false) return null;
    [$b64] = explode('.', $token, 2);
    $dec = base64_decode($b64, true);
    if (!$dec) return null;
    $parts = explode('|', $dec);
    return $parts[3] ?? null;
}

function current_user(): ?array {
    $token = current_bearer_token();
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
    if (!in_array($tipo, ['pedido', 'chat', 'sistema', 'promocion', 'interaccion'], true)) $tipo = 'sistema';
    try {
        db()->prepare(
            "INSERT INTO notificaciones (usuario_id, titulo, cuerpo, tipo, referencia_id) VALUES (?, ?, ?, ?, ?)"
        )->execute([$usuarioId, $titulo, $cuerpo, $tipo, $referenciaId]);
    } catch (Throwable $e) { /* no crítico */ }
    enviar_push_expo($usuarioId, $titulo, $cuerpo);
}

// Notifica a todos los seguidores de una tienda (nuevo producto, oferta o reel). Se usa
// desde vendedor_dashboard.php al publicar/editar productos -- centralizado acá en vez de
// repetir el loop en cada action para no duplicar la consulta a seguidores_tienda.
function notificar_seguidores_tienda(int $tiendaId, string $titulo, string $cuerpo, int $referenciaId): void {
    try {
        $st = db()->prepare("SELECT usuario_id FROM seguidores_tienda WHERE tienda_id = ?");
        $st->execute([$tiendaId]);
        $seguidores = $st->fetchAll(PDO::FETCH_COLUMN);
    } catch (Throwable $e) { return; }
    foreach ($seguidores as $usuarioId) {
        crear_notificacion((int)$usuarioId, 'promocion', $titulo, $cuerpo, $referenciaId);
    }
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

const COMISION_PLATAFORMA_PCT = 0.10;   // 10% para la plataforma
const COMISION_REPARTIDOR_PCT = 0.20;   // 20% del subtotal para el repartidor (envío base)

/**
 * Liquida un pedido: marca estado='entregado', calcula comisiones y acredita
 * las wallets de vendedor y repartidor. Antes vivía solo dentro del action
 * 'completar' de repartidor_dashboard.php (el repartidor se auto-confirmaba);
 * ahora también la dispara pedidos_tracking.php cuando el COMPRADOR escanea
 * el QR de entrega — ver DESIGN.md "Flujo logístico". Misma lógica, un solo
 * lugar, para que ambos caminos liquiden exactamente igual.
 *
 * @throws RuntimeException si el pedido no existe o ya fue entregado.
 */
function finalizar_entrega_pedido(int $pid, int $repartidorId): array {
    db()->beginTransaction();
    try {
        $sel = db()->prepare("SELECT * FROM pedidos WHERE id = ? AND repartidor_id = ? FOR UPDATE");
        $sel->execute([$pid, $repartidorId]);
        $ped = $sel->fetch();
        if (!$ped) { db()->rollBack(); throw new RuntimeException('Pedido no encontrado'); }
        if ($ped['estado'] === 'entregado') { db()->rollBack(); throw new RuntimeException('Pedido ya entregado'); }

        $total = (float)$ped['total'];
        $comision    = round($total * COMISION_PLATAFORMA_PCT, 2);
        $ganancia_rp = round($total * COMISION_REPARTIDOR_PCT, 2);
        $ganancia_vd = round($total - $comision - $ganancia_rp, 2);

        db()->prepare(
            "UPDATE pedidos
             SET estado = 'entregado',
                 progreso_repartidor = 'entregado',
                 comision_plataforma = ?,
                 total_repartidor = ?,
                 total_vendedor = ?
             WHERE id = ?"
        )->execute([$comision, $ganancia_rp, $ganancia_vd, $pid]);

        db()->prepare(
            "INSERT INTO wallets (usuario_id, saldo) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)"
        )->execute([(int)$ped['vendedor_id'], $ganancia_vd]);
        db()->prepare(
            "INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia, pedido_id)
             VALUES (?, 'venta', ?, 'Venta neta', ?)"
        )->execute([(int)$ped['vendedor_id'], $ganancia_vd, $pid]);

        db()->prepare(
            "INSERT INTO wallets (usuario_id, saldo) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)"
        )->execute([$repartidorId, $ganancia_rp]);
        db()->prepare(
            "INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia, pedido_id)
             VALUES (?, 'entrega', ?, 'Entrega completada', ?)"
        )->execute([$repartidorId, $ganancia_rp, $pid]);

        db()->prepare("INSERT INTO chats (emisor_id, receptor_id, mensaje, tipo) VALUES (?, ?, ?, 'texto')")
            ->execute([$repartidorId, (int)$ped['comprador_id'], '✅ Pedido entregado. ¡Gracias por preferirnos!']);
        crear_notificacion((int)$ped['comprador_id'], 'pedido', 'Pedido entregado', '¡Gracias por preferirnos! Califica tu experiencia.', $pid);
        crear_notificacion((int)$ped['vendedor_id'], 'pedido', 'Venta completada', "Ganaste \$" . number_format($ganancia_vd, 2) . " por el pedido #{$pid}.", $pid);
        crear_notificacion($repartidorId, 'pedido', 'Entrega completada', "Ganaste \$" . number_format($ganancia_rp, 2) . ".", $pid);

        db()->commit();
        return ['comision' => $comision, 'ganancia_repartidor' => $ganancia_rp, 'ganancia_vendedor' => $ganancia_vd];
    } catch (Throwable $e) {
        if (db()->inTransaction()) db()->rollBack();
        throw $e;
    }
}

/**
 * Liquidación de un pedido "recoger en tienda" (tipo_entrega = 'recogida'): mismo cierre
 * que finalizar_entrega_pedido() pero sin repartidor -- el vendedor se queda con el total
 * menos la comisión de plataforma (no hay tramo de reparto que pagar). Llamada desde
 * pedidos_tracking.php cuando el comprador confirma su propia recogida con el código que
 * generó el vendedor (ver vendedor_dashboard.php action=confirmar_recogida).
 */
function finalizar_recogida_pedido(int $pid): array {
    db()->beginTransaction();
    try {
        $sel = db()->prepare("SELECT * FROM pedidos WHERE id = ? AND tipo_entrega = 'recogida' FOR UPDATE");
        $sel->execute([$pid]);
        $ped = $sel->fetch();
        if (!$ped) { db()->rollBack(); throw new RuntimeException('Pedido no encontrado'); }
        if ($ped['estado'] === 'entregado') { db()->rollBack(); throw new RuntimeException('Pedido ya entregado'); }

        $total = (float)$ped['total'];
        $comision = round($total * COMISION_PLATAFORMA_PCT, 2);
        $ganancia_vd = round($total - $comision, 2);

        db()->prepare(
            "UPDATE pedidos SET estado = 'entregado', comision_plataforma = ?, total_repartidor = 0, total_vendedor = ? WHERE id = ?"
        )->execute([$comision, $ganancia_vd, $pid]);

        db()->prepare("INSERT INTO wallets (usuario_id, saldo) VALUES (?, ?) ON DUPLICATE KEY UPDATE saldo = saldo + VALUES(saldo)")
            ->execute([(int)$ped['vendedor_id'], $ganancia_vd]);
        db()->prepare("INSERT INTO wallet_movimientos (usuario_id, tipo, monto, referencia, pedido_id) VALUES (?, 'venta', ?, 'Venta neta (recogida en tienda)', ?)")
            ->execute([(int)$ped['vendedor_id'], $ganancia_vd, $pid]);

        crear_notificacion((int)$ped['comprador_id'], 'pedido', 'Pedido retirado', '¡Gracias por preferirnos! Califica tu experiencia.', $pid);
        crear_notificacion((int)$ped['vendedor_id'], 'pedido', 'Venta completada', "Ganaste \$" . number_format($ganancia_vd, 2) . " por el pedido #{$pid}.", $pid);

        db()->commit();
        return ['comision' => $comision, 'ganancia_repartidor' => 0, 'ganancia_vendedor' => $ganancia_vd];
    } catch (Throwable $e) {
        if (db()->inTransaction()) db()->rollBack();
        throw $e;
    }
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

// ─── Despacho automático de repartidor (ver DESIGN.md "Flujo logístico") ───
// El vendedor ya NO elige repartidor a mano: en cuanto marca el pedido como
// 'preparacion' (ver vendedor_dashboard.php action=preparar_pedido), el sistema
// ofrece el pedido a UN solo repartidor a la vez -- el más cercano a la tienda
// que esté en línea, sin una entrega activa y sin una oferta pendiente de OTRO
// pedido -- con una ventana muy corta para aceptar. Si no contesta a tiempo o
// rechaza, se apunta en pedido_repartidor_descartes (la misma tabla que ya
// excluía repartidores del mercado "disponibles") y se ofrece al siguiente. Si
// se agotan los candidatos cercanos, el pedido simplemente queda con
// repartidor_id NULL y sin oferta activa -- cae solo al mercado normal de
// "disponibles" en repartidor_dashboard.php, que ya filtra por eso.
const DESPACHO_OFERTA_SEGUNDOS = 60;

function ofrecer_siguiente_repartidor(int $pid): void {
    $st = db()->prepare(
        "SELECT p.repartidor_id, p.estado,
                (SELECT t.lat FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id JOIN tiendas t ON t.id = pr.tienda_id WHERE i.pedido_id = p.id LIMIT 1) AS tienda_lat,
                (SELECT t.lng FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id JOIN tiendas t ON t.id = pr.tienda_id WHERE i.pedido_id = p.id LIMIT 1) AS tienda_lng,
                (SELECT t.municipio FROM pedido_items i JOIN productos pr ON pr.id = i.producto_id JOIN tiendas t ON t.id = pr.tienda_id WHERE i.pedido_id = p.id LIMIT 1) AS tienda_municipio,
                p.numero_pedido
         FROM pedidos p WHERE p.id = ?"
    );
    $st->execute([$pid]);
    $ped = $st->fetch();
    if (!$ped || $ped['repartidor_id'] || $ped['estado'] !== 'preparacion') return;

    // Misma zona que la tienda -- ver RepartidorDisponiblesScreen.tsx: el despacho
    // automático no debe ofrecerle a un repartidor un pedido fuera de su municipio.
    $cand = db()->prepare(
        "SELECT u.id, u.lat, u.lng FROM usuarios u
         WHERE u.rol = 'repartidor' AND u.en_linea = 1 AND u.activo = 1
           AND u.lat IS NOT NULL AND u.lng IS NOT NULL
           AND LOWER(TRIM(u.municipio)) = LOWER(TRIM(?))
           AND NOT EXISTS (SELECT 1 FROM pedido_repartidor_descartes d WHERE d.pedido_id = ? AND d.repartidor_id = u.id)
           AND (SELECT COUNT(*) FROM pedidos WHERE repartidor_id = u.id AND estado IN ('preparacion','en_camino')) = 0
           AND NOT EXISTS (SELECT 1 FROM pedidos o WHERE o.oferta_repartidor_id = u.id AND o.oferta_expira_at > NOW())"
    );
    $cand->execute([$ped['tienda_municipio'], $pid]);
    $candidatos = $cand->fetchAll();
    if (!$candidatos) return;

    if ($ped['tienda_lat'] !== null) {
        foreach ($candidatos as &$c) {
            $c['dist'] = distancia_km((float)$ped['tienda_lat'], (float)$ped['tienda_lng'], (float)$c['lat'], (float)$c['lng']);
        }
        unset($c);
        usort($candidatos, fn($a, $b) => $a['dist'] <=> $b['dist']);
    }
    $elegido = $candidatos[0];

    db()->prepare("UPDATE pedidos SET oferta_repartidor_id = ?, oferta_expira_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id = ?")
        ->execute([$elegido['id'], DESPACHO_OFERTA_SEGUNDOS, $pid]);
    crear_notificacion((int)$elegido['id'], 'pedido', '¡Nuevo pedido disponible!', "Tienes " . DESPACHO_OFERTA_SEGUNDOS . " segundos para aceptar el pedido #{$ped['numero_pedido']}.", $pid);
}

/** Barre ofertas de despacho vencidas y las hace avanzar al siguiente candidato.
 * Se llama al inicio de vendedor_dashboard.php y repartidor_dashboard.php (los
 * dos que ambas apps consultan seguido) -- sin WebSockets ni cron, cualquier
 * poll normal de cualquiera de las dos apps termina auto-sanando el despacho. */
function avanzar_despacho_global(): void {
    $vencidas = db()->query("SELECT id, oferta_repartidor_id FROM pedidos WHERE oferta_repartidor_id IS NOT NULL AND oferta_expira_at < NOW()")->fetchAll();
    foreach ($vencidas as $v) {
        $pid = (int)$v['id'];
        db()->prepare("INSERT IGNORE INTO pedido_repartidor_descartes (pedido_id, repartidor_id) VALUES (?, ?)")
            ->execute([$pid, (int)$v['oferta_repartidor_id']]);
        db()->prepare("UPDATE pedidos SET oferta_repartidor_id = NULL, oferta_expira_at = NULL WHERE id = ?")->execute([$pid]);
        ofrecer_siguiente_repartidor($pid);
    }
}

/** PIN de 6 dígitos, nuevo por cada código (recogida o entrega). */
function generar_pin(): string {
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

/** 3 intentos fallidos de PIN bloquean ESE código puntual (no el pedido) por 15
 * minutos y abren un ticket de soporte -- ver PARTE 2.A del flujo logístico. */
function registrar_intento_pin_fallido(int $pid, string $campo, int $usuarioId, string $etapa): array {
    $intentosCol = "pin_{$campo}_intentos";
    $bloqueoCol = "pin_{$campo}_bloqueado_hasta";
    $st = db()->prepare("SELECT {$intentosCol} AS intentos FROM pedidos WHERE id = ?");
    $st->execute([$pid]);
    $intentos = (int)($st->fetch()['intentos'] ?? 0) + 1;

    if ($intentos >= 3) {
        db()->prepare("UPDATE pedidos SET {$intentosCol} = ?, {$bloqueoCol} = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?")
            ->execute([$intentos, $pid]);
        db()->prepare("INSERT INTO soporte_reportes (usuario_id, asunto, descripcion, estado) VALUES (?, ?, ?, 'abierto')")->execute([
            $usuarioId,
            'Posible fraude: PIN bloqueado',
            "Se alcanzaron 3 intentos fallidos del PIN de {$etapa} en el pedido #{$pid}. El código queda bloqueado 15 minutos.",
        ]);
        return ['bloqueado' => true, 'intentos' => $intentos];
    }
    db()->prepare("UPDATE pedidos SET {$intentosCol} = ? WHERE id = ?")->execute([$intentos, $pid]);
    return ['bloqueado' => false, 'intentos' => $intentos];
}
