-- =====================================================================
-- [SV]Go — Esquema relacional completo MySQL
-- Versión 2.0 — Multi-tenant (comprador/vendedor/repartidor/admin)
-- Importar desde phpMyAdmin: http://localhost/phpmyadmin
-- =====================================================================

DROP DATABASE IF EXISTS svgo_db;
CREATE DATABASE svgo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE svgo_db;

-- =====================================================================
-- USUARIOS
-- =====================================================================
CREATE TABLE usuarios (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    nombre        VARCHAR(150)  NOT NULL,
    username      VARCHAR(80)   UNIQUE,
    email         VARCHAR(180)  UNIQUE,
    telefono      VARCHAR(25)   UNIQUE,
    password_hash VARCHAR(255),
    auth_provider ENUM('local','google','apple','telefono') NOT NULL DEFAULT 'local',
    provider_uid  VARCHAR(255),
    rol           ENUM('admin','comprador','vendedor','repartidor') NOT NULL DEFAULT 'comprador',
    foto_perfil   VARCHAR(255),
    municipio     VARCHAR(120),
    lat           DECIMAL(10,7),
    lng           DECIMAL(10,7),
    rol_intent    ENUM('comprador','vendedor','repartidor') DEFAULT 'comprador',
    activo        TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rol (rol),
    INDEX idx_municipio (municipio)
) ENGINE=InnoDB;

INSERT INTO usuarios (nombre, username, email, password_hash, auth_provider, rol)
VALUES ('Administrador', 'admin', 'admin@svgo.sv',
        '$2y$10$Z6sLgRQ4Q4n3oI0V/4TQy.Q3yJtRhcKZQs2T9oqGn9HxLn1nVPNYK',
        'local', 'admin');

-- =====================================================================
-- SOLICITUDES DE ROL
-- =====================================================================
CREATE TABLE solicitudes_rol (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT NOT NULL,
    rol_solicitado  ENUM('vendedor','repartidor') NOT NULL,
    nombre_completo VARCHAR(180) NOT NULL,
    dui_numero      VARCHAR(20)  NOT NULL,
    dui_frente      VARCHAR(255) NOT NULL,
    dui_reverso     VARCHAR(255) NOT NULL,
    credenciales    TEXT,
    notas_admin     TEXT,
    estado          ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisado_at     DATETIME,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estado (estado),
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB;

-- =====================================================================
-- TIENDAS
-- =====================================================================
CREATE TABLE tiendas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    vendedor_id INT NOT NULL,
    nombre      VARCHAR(180) NOT NULL,
    descripcion TEXT,
    municipio   VARCHAR(120) NOT NULL,
    direccion   VARCHAR(255),
    lat         DECIMAL(10,7) NOT NULL DEFAULT 13.6929,
    lng         DECIMAL(10,7) NOT NULL DEFAULT -89.2182,
    logo        VARCHAR(255),
    rating      DECIMAL(3,2) DEFAULT 0.00,
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_municipio (municipio),
    INDEX idx_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- PRODUCTOS
-- =====================================================================
CREATE TABLE productos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    tienda_id   INT NOT NULL,
    nombre      VARCHAR(180) NOT NULL,
    descripcion TEXT,
    precio      DECIMAL(10,2) NOT NULL,
    stock       INT NOT NULL DEFAULT 0,
    imagen      VARCHAR(255),
    video       VARCHAR(255),
    categoria   VARCHAR(80),
    es_reel     TINYINT(1) DEFAULT 0,
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tienda_id) REFERENCES tiendas(id) ON DELETE CASCADE,
    INDEX idx_categoria (categoria),
    INDEX idx_es_reel (es_reel),
    INDEX idx_activo (activo)
) ENGINE=InnoDB;

-- =====================================================================
-- CARRITO
-- =====================================================================
CREATE TABLE carrito (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad    INT NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (usuario_id, producto_id),
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB;

-- =====================================================================
-- PEDIDOS
-- =====================================================================
CREATE TABLE pedidos (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    comprador_id     INT NOT NULL,
    vendedor_id      INT NOT NULL,
    repartidor_id    INT,
    total            DECIMAL(10,2) NOT NULL,
    metodo_pago      ENUM('efectivo','tarjeta','paypal') NOT NULL DEFAULT 'efectivo',
    estado           ENUM('preparacion','en_camino','entregado','rechazado_repartidor','cancelado') NOT NULL DEFAULT 'preparacion',
    direccion_entrega VARCHAR(255) NOT NULL,
    lat_entrega      DECIMAL(10,7),
    lng_entrega      DECIMAL(10,7),
    lat_repartidor   DECIMAL(10,7),
    lng_repartidor   DECIMAL(10,7),
    tiempo_estimado  INT COMMENT 'minutos',
    trafico          VARCHAR(50),
    notas            TEXT,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (comprador_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (vendedor_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_comprador  (comprador_id),
    INDEX idx_vendedor   (vendedor_id),
    INDEX idx_repartidor (repartidor_id),
    INDEX idx_estado     (estado)
) ENGINE=InnoDB;

-- =====================================================================
-- ITEMS DE PEDIDO
-- =====================================================================
CREATE TABLE pedido_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id       INT NOT NULL,
    producto_id     INT NOT NULL,
    cantidad        INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    INDEX idx_pedido (pedido_id)
) ENGINE=InnoDB;

-- =====================================================================
-- TRANSACCIONES DE PAGO (Sandbox)
-- =====================================================================
CREATE TABLE transacciones_pago (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id      INT NOT NULL,
    usuario_id     INT NOT NULL,
    metodo         ENUM('efectivo','tarjeta','paypal') NOT NULL,
    monto          DECIMAL(10,2) NOT NULL,
    estado         ENUM('pendiente','autorizado','capturado','fallido','reembolsado') NOT NULL DEFAULT 'pendiente',
    referencia     VARCHAR(80) UNIQUE,
    gateway_resp   TEXT COMMENT 'JSON de respuesta simulada',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)   ON DELETE CASCADE,
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
    INDEX idx_pedido  (pedido_id),
    INDEX idx_estado  (estado)
) ENGINE=InnoDB;

-- =====================================================================
-- INTERACCIONES (likes, guardados, compartidos)
-- =====================================================================
CREATE TABLE interacciones (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    producto_id INT NOT NULL,
    tipo        ENUM('like','guardar','compartir') NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_inter (usuario_id, producto_id, tipo),
    INDEX idx_producto (producto_id),
    INDEX idx_tipo     (tipo)
) ENGINE=InnoDB;

-- =====================================================================
-- COMENTARIOS
-- =====================================================================
CREATE TABLE comentarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    producto_id INT NOT NULL,
    comentario  TEXT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    INDEX idx_producto (producto_id)
) ENGINE=InnoDB;

-- =====================================================================
-- MENSAJES (chat)
-- =====================================================================
CREATE TABLE mensajes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    emisor_id   INT NOT NULL,
    receptor_id INT NOT NULL,
    pedido_id   INT,
    mensaje     TEXT NOT NULL,
    leido       TINYINT(1) NOT NULL DEFAULT 0,
    archivado   TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emisor_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (receptor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)  ON DELETE SET NULL,
    INDEX idx_emisor   (emisor_id),
    INDEX idx_receptor (receptor_id),
    INDEX idx_leido    (leido)
) ENGINE=InnoDB;

-- =====================================================================
-- SOPORTE
-- =====================================================================
CREATE TABLE soporte_reportes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT NOT NULL,
    asunto          VARCHAR(255) NOT NULL,
    descripcion     TEXT NOT NULL,
    estado          ENUM('abierto','en_proceso','cerrado') NOT NULL DEFAULT 'abierto',
    respuesta_admin TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estado    (estado),
    INDEX idx_usuario   (usuario_id)
) ENGINE=InnoDB;

-- =====================================================================
-- NOTIFICACIONES
-- =====================================================================
CREATE TABLE notificaciones (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    titulo      VARCHAR(180) NOT NULL,
    cuerpo      TEXT,
    tipo        ENUM('pedido','chat','sistema','promocion') NOT NULL DEFAULT 'sistema',
    leida       TINYINT(1) NOT NULL DEFAULT 0,
    referencia_id INT COMMENT 'ID del pedido/mensaje relacionado',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id),
    INDEX idx_leida   (leida)
) ENGINE=InnoDB;

-- =====================================================================
-- RESEÑAS DE TIENDAS
-- =====================================================================
CREATE TABLE resenas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    tienda_id   INT NOT NULL,
    pedido_id   INT,
    calificacion TINYINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario  TEXT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (tienda_id)  REFERENCES tiendas(id)  ON DELETE CASCADE,
    FOREIGN KEY (pedido_id)  REFERENCES pedidos(id)  ON DELETE SET NULL,
    UNIQUE KEY unique_resena (usuario_id, tienda_id, pedido_id),
    INDEX idx_tienda (tienda_id)
) ENGINE=InnoDB;

-- =====================================================================
-- DATOS DE DEMO (usuarios + tiendas + productos)
-- =====================================================================

-- Vendedor 1
INSERT INTO usuarios (nombre, username, email, telefono, password_hash, auth_provider, rol, municipio)
VALUES ('Rosa Martínez', 'donarosa', 'rosa@svgo.sv', '7111-2222',
        '$2y$10$Z6sLgRQ4Q4n3oI0V/4TQy.Q3yJtRhcKZQs2T9oqGn9HxLn1nVPNYK',
        'local', 'vendedor', 'San Salvador');

-- Vendedor 2
INSERT INTO usuarios (nombre, username, email, telefono, password_hash, auth_provider, rol, municipio)
VALUES ('Carlos Finca', 'cafetal', 'carlos@svgo.sv', '7222-3333',
        '$2y$10$Z6sLgRQ4Q4n3oI0V/4TQy.Q3yJtRhcKZQs2T9oqGn9HxLn1nVPNYK',
        'local', 'vendedor', 'Ahuachapán');

-- Repartidor
INSERT INTO usuarios (nombre, username, email, telefono, password_hash, auth_provider, rol, municipio)
VALUES ('Marcos Repartidor', 'marcos', 'marcos@svgo.sv', '7333-4444',
        '$2y$10$Z6sLgRQ4Q4n3oI0V/4TQy.Q3yJtRhcKZQs2T9oqGn9HxLn1nVPNYK',
        'local', 'repartidor', 'San Salvador');

-- Comprador demo
INSERT INTO usuarios (nombre, username, email, telefono, password_hash, auth_provider, rol, municipio)
VALUES ('Ana Compradora', 'anac', 'ana@svgo.sv', '7444-5555',
        '$2y$10$Z6sLgRQ4Q4n3oI0V/4TQy.Q3yJtRhcKZQs2T9oqGn9HxLn1nVPNYK',
        'local', 'comprador', 'San Salvador');

-- Tiendas
INSERT INTO tiendas (vendedor_id, nombre, descripcion, municipio, direccion, lat, lng, rating)
VALUES
  (2, 'Comedor Doña Rosa',    'Comida típica salvadoreña',       'San Salvador', 'Col. Escalón, Calle La Mascota', 13.7082, -89.2228, 4.85),
  (3, 'Finca El Cafetal',     'Café de altura 100% salvadoreño', 'Ahuachapán',   'Carretera Apaneca km 97',        13.9215, -89.8458, 4.92),
  (2, 'Panadería La Hermosa', 'Pan artesanal horneado a diario', 'Santa Ana',    'Av. Fray Bernardino 25',         13.9980, -89.5597, 4.72),
  (2, 'Antojitos El Salvador','Quesillo, loroco y más',          'Santa Ana',    'Mercado Central Local 14',       13.9994, -89.5600, 4.65),
  (2, 'Bebidas El Chele',     'Horchatas, frescos y jugos',      'San Salvador', 'Calle Arce 301',                 13.7012, -89.2180, 4.50);

-- Productos
INSERT INTO productos (tienda_id, nombre, descripcion, precio, stock, categoria, activo)
VALUES
  (1, 'Pupusas de Queso',       'Pupusas artesanales con queso y loroco',     0.75, 100, 'comida',    1),
  (1, 'Tamales de Elote',       'Tamales dulces de elote envueltos en tusa',  1.00,  50, 'comida',    1),
  (1, 'Riguas de Maíz',         'Masa de maíz dulce asada en comal',          0.50,  80, 'comida',    1),
  (2, 'Café Molido Premium',    'Café de altura tueste medio, 500g',          3.50, 200, 'bebidas',   1),
  (2, 'Café en Grano',          'Café specialty 100% arábica, 250g',          5.00, 150, 'bebidas',   1),
  (3, 'Pan de Yema',            'Pan dulce tradicional con yema de huevo',    0.50, 120, 'panaderia', 1),
  (3, 'Semita de Piña',         'Semita artesanal rellena de piña',           0.75,  80, 'panaderia', 1),
  (3, 'Quesadilla Salvadoreña', 'Pastel de queso, arroz y crema',             1.25,  60, 'panaderia', 1),
  (4, 'Quesillo con Curtido',   'Quesillo fresco con loroco y curtido',       2.00,  40, 'comida',    1),
  (4, 'Nuegados de Yuca',       'Yuca frita con miel de panela',              1.50,  60, 'comida',    1),
  (5, 'Horchata Fría',          'Horchata natural de arroz con morro',        1.25, 100, 'bebidas',   1),
  (5, 'Fresco de Tamarindo',    'Bebida natural de tamarindo sin azúcar',     1.00,  80, 'bebidas',   1),
  (1, 'Arroz con Leche',        'Postre tradicional con canela y raisins',    1.50,  60, 'general',   1),
  (2, 'Chicha de Maíz',         'Bebida fermentada tradicional salvadoreña',  0.75, 150, 'bebidas',   1);

-- =====================================================================
-- VISTAS ÚTILES
-- =====================================================================

CREATE OR REPLACE VIEW vista_productos AS
SELECT
    p.id,
    p.tienda_id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.stock,
    p.imagen,
    p.video,
    p.categoria,
    p.es_reel,
    p.activo,
    p.created_at,
    t.nombre     AS tienda_nombre,
    t.municipio,
    t.vendedor_id,
    COUNT(DISTINCT CASE WHEN i.tipo = 'like'     THEN i.id END) AS likes_count,
    COUNT(DISTINCT CASE WHEN i.tipo = 'guardar'  THEN i.id END) AS guardados_count,
    COUNT(DISTINCT CASE WHEN i.tipo = 'compartir'THEN i.id END) AS compartidos_count,
    COUNT(DISTINCT c.id) AS comentarios_count
FROM productos p
JOIN tiendas t ON p.tienda_id = t.id
LEFT JOIN interacciones i ON i.producto_id = p.id
LEFT JOIN comentarios   c ON c.producto_id = p.id
WHERE p.activo = 1
GROUP BY p.id;

CREATE OR REPLACE VIEW vista_pedidos AS
SELECT
    pe.id,
    pe.comprador_id,
    pe.vendedor_id,
    pe.repartidor_id,
    pe.total,
    pe.metodo_pago,
    pe.estado,
    pe.direccion_entrega,
    pe.lat_entrega,
    pe.lng_entrega,
    pe.lat_repartidor,
    pe.lng_repartidor,
    pe.tiempo_estimado,
    pe.trafico,
    pe.created_at,
    uc.nombre AS comprador_nombre,
    uv.nombre AS vendedor_nombre,
    ur.nombre AS repartidor_nombre,
    t.lat     AS tienda_lat,
    t.lng     AS tienda_lng,
    t.nombre  AS tienda_nombre,
    t.direccion AS tienda_direccion
FROM pedidos pe
JOIN usuarios uc ON pe.comprador_id  = uc.id
JOIN usuarios uv ON pe.vendedor_id   = uv.id
LEFT JOIN usuarios ur ON pe.repartidor_id = ur.id
LEFT JOIN tiendas  t  ON t.vendedor_id    = pe.vendedor_id;

CREATE OR REPLACE VIEW vista_conversaciones AS
SELECT
    LEAST(m.emisor_id, m.receptor_id)    AS usuario_a,
    GREATEST(m.emisor_id, m.receptor_id) AS usuario_b,
    MAX(m.id)   AS ultimo_mensaje_id,
    MAX(m.created_at) AS ultima_actividad,
    SUM(CASE WHEN m.leido = 0 THEN 1 ELSE 0 END) AS no_leidos
FROM mensajes m
GROUP BY usuario_a, usuario_b;

-- =============================================
-- MIGRATIONS v2.1
-- =============================================
ALTER TABLE tiendas
  ADD COLUMN IF NOT EXISTS portada       VARCHAR(255) NULL AFTER logo,
  ADD COLUMN IF NOT EXISTS hora_apertura TIME         NULL AFTER portada,
  ADD COLUMN IF NOT EXISTS hora_cierre   TIME         NULL AFTER hora_apertura,
  ADD COLUMN IF NOT EXISTS categoria     VARCHAR(80)  NULL AFTER hora_cierre;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS en_linea           TINYINT(1) NOT NULL DEFAULT 0    AFTER activo,
  ADD COLUMN IF NOT EXISTS username_changed_at DATETIME   NULL                  AFTER username;
