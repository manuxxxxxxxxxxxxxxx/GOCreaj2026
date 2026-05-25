-- =====================================================================
-- [SV]Go — Migración V3: Municipios, Direcciones, Performance
-- Ejecutar en phpMyAdmin → svgo_db (ya importada)
-- =====================================================================

USE svgo_db;

-- ─── 1. Catálogo de Municipios de El Salvador ─────────────────────────
CREATE TABLE IF NOT EXISTS municipios_sv (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(120) NOT NULL,
    departamento VARCHAR(80)  NOT NULL,
    lat          DECIMAL(10,7) NOT NULL DEFAULT 13.6929,
    lng          DECIMAL(10,7) NOT NULL DEFAULT -89.2182,
    INDEX idx_nombre       (nombre),
    INDEX idx_departamento (departamento)
) ENGINE=InnoDB;

INSERT IGNORE INTO municipios_sv (nombre, departamento, lat, lng) VALUES
('San Salvador',       'San Salvador', 13.6929, -89.2182),
('Mejicanos',          'San Salvador', 13.7245, -89.2312),
('Soyapango',          'San Salvador', 13.7145, -89.1762),
('Apopa',              'San Salvador', 13.8066, -89.1795),
('Delgado',            'San Salvador', 13.7215, -89.1604),
('Ciudad Delgado',     'San Salvador', 13.7215, -89.1604),
('Ilopango',           'San Salvador', 13.7002, -89.1064),
('Tonacatepeque',      'San Salvador', 13.7902, -89.1119),
('Aguilares',          'San Salvador', 13.9567, -89.1827),
('Guazapa',            'San Salvador', 13.9129, -89.1208),
('El Paisnal',         'San Salvador', 13.9745, -89.1556),
('Panchimalco',        'San Salvador', 13.6155, -89.1784),
('Rosario de Mora',    'San Salvador', 13.6066, -89.1550),
('San Marcos',         'San Salvador', 13.6598, -89.1942),
('Santo Tomás',        'San Salvador', 13.6410, -89.1680),
('Antiguo Cuscatlán',  'La Libertad',  13.6747, -89.2497),
('Nueva San Salvador', 'La Libertad',  13.6723, -89.2899),
('Santa Tecla',        'La Libertad',  13.6723, -89.2899),
('Quezaltepeque',      'La Libertad',  13.8315, -89.2772),
('San Juan Opico',     'La Libertad',  13.8814, -89.3572),
('Ciudad Arce',        'La Libertad',  13.8697, -89.4011),
('La Libertad',        'La Libertad',  13.4887, -89.3265),
('Zaragoza',           'La Libertad',  13.5976, -89.2967),
('Colón',              'La Libertad',  13.7269, -89.3626),
('Santa Ana',          'Santa Ana',    13.9943, -89.5597),
('Metapán',            'Santa Ana',    14.3335, -89.4481),
('San Miguel',         'San Miguel',   13.4833, -88.1833),
('Usulután',           'Usulután',     13.3480, -88.4482),
('Zacatecoluca',       'La Paz',       13.5136, -88.8693),
('Ahuachapán',         'Ahuachapán',   13.9213, -89.8448),
('Cojutepeque',        'Cuscatlán',    13.7168, -88.9338),
('Suchitoto',          'Cuscatlán',    13.9332, -89.0318),
('San Vicente',        'San Vicente',  13.6428, -88.7853),
('La Unión',           'La Unión',     13.3367, -87.8435),
('Chalatenango',       'Chalatenango', 14.0329, -88.9339),
('Sensuntepeque',      'Cabañas',      13.8726, -88.6291),
('Berlín',             'Usulután',     13.4985, -88.5325),
('Santiago de María',  'Usulután',     13.4843, -88.4706),
('San Francisco Gotera','Morazán',     13.6982, -88.1035);

-- ─── 2. Direcciones Guardadas por Usuario ────────────────────────────
CREATE TABLE IF NOT EXISTS direcciones_usuario (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id   INT NOT NULL,
    alias        VARCHAR(80)  NOT NULL DEFAULT 'Casa',
    municipio    VARCHAR(120) NOT NULL,
    departamento VARCHAR(80)  NOT NULL DEFAULT 'San Salvador',
    direccion    VARCHAR(255) NOT NULL,
    referencia   VARCHAR(255),
    lat          DECIMAL(10,7),
    lng          DECIMAL(10,7),
    es_principal TINYINT(1)   NOT NULL DEFAULT 0,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario   (usuario_id),
    INDEX idx_municipio (municipio)
) ENGINE=InnoDB;

-- ─── 3. Pedidos: columnas de municipio de entrega ────────────────────
ALTER TABLE pedidos
    ADD COLUMN municipio_entrega    VARCHAR(120) NULL AFTER direccion_entrega,
    ADD COLUMN departamento_entrega VARCHAR(80)  NULL AFTER municipio_entrega;

-- ─── 4. Índices de performance ────────────────────────────────────────
-- Productos: búsqueda full-text + precio
ALTER TABLE productos ADD FULLTEXT INDEX IF NOT EXISTS ft_nombre_desc (nombre, descripcion);
ALTER TABLE productos ADD INDEX IF NOT EXISTS idx_precio_activo (precio, activo);
-- Tiendas: búsqueda geo
ALTER TABLE tiendas ADD INDEX IF NOT EXISTS idx_lat_lng (lat, lng);
-- Chats: conversaciones y mensajes no leídos
ALTER TABLE chats ADD INDEX IF NOT EXISTS idx_conv (emisor_id, receptor_id, created_at);
ALTER TABLE chats ADD INDEX IF NOT EXISTS idx_unread (receptor_id, leido);
-- Llamadas: entrantes recientes
ALTER TABLE llamadas ADD INDEX IF NOT EXISTS idx_receptor_estado (receptor_id, estado, created_at);
