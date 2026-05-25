-- =====================================================================
-- [SV]Go — Migración v2.2
-- Ejecutar en phpMyAdmin sobre la base svgo_db
-- =====================================================================
USE svgo_db;

-- ─────────────────────────────────────────────
-- 1. Columnas faltantes en usuarios
-- ─────────────────────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefono_verificado TINYINT(1) NOT NULL DEFAULT 0 AFTER telefono,
  ADD COLUMN IF NOT EXISTS sms_code            VARCHAR(10)         NULL      AFTER telefono_verificado;

-- ─────────────────────────────────────────────
-- 2. video_likes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_likes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    producto_id INT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vlike (usuario_id, producto_id),
    INDEX idx_producto (producto_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- 3. video_guardados
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_guardados (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    producto_id INT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vguard (usuario_id, producto_id),
    INDEX idx_producto (producto_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- 4. video_comentarios
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_comentarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    producto_id INT NOT NULL,
    comentario  TEXT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    INDEX idx_producto (producto_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- 5. chats
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    emisor_id      INT NOT NULL,
    receptor_id    INT NOT NULL,
    pedido_id      INT NULL,
    mensaje        TEXT NOT NULL,
    tipo           ENUM('texto','imagen','ubicacion') NOT NULL DEFAULT 'texto',
    adjunto        VARCHAR(255) NULL,
    lat            DECIMAL(10,7) NULL,
    lng            DECIMAL(10,7) NULL,
    leido          TINYINT(1) NOT NULL DEFAULT 0,
    reply_to_id    INT NULL,
    reply_snapshot TEXT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emisor_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (receptor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (pedido_id)   REFERENCES pedidos(id)  ON DELETE SET NULL,
    INDEX idx_emisor   (emisor_id),
    INDEX idx_receptor (receptor_id),
    INDEX idx_leido    (leido)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- 6. chat_meta
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_meta (
    usuario_id INT NOT NULL,
    otro_id    INT NOT NULL,
    archivado  TINYINT(1) NOT NULL DEFAULT 0,
    favorito   TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (usuario_id, otro_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (otro_id)    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
-- 7. llamadas
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llamadas (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    emisor_id    INT NOT NULL,
    receptor_id  INT NOT NULL,
    tipo         ENUM('voz','video') NOT NULL DEFAULT 'voz',
    estado       ENUM('iniciando','activa','finalizada','rechazada','perdida') NOT NULL DEFAULT 'iniciando',
    webrtc_room  VARCHAR(120) NULL,
    duracion     INT NULL COMMENT 'segundos',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emisor_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (receptor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_emisor   (emisor_id),
    INDEX idx_receptor (receptor_id)
) ENGINE=InnoDB;
