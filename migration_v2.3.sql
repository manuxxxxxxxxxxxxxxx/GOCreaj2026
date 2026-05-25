-- =====================================================================
-- [SV]Go — Migración v2.3 — Sistema de Reels
-- Ejecutar en phpMyAdmin sobre la base svgo_db
-- =====================================================================
USE svgo_db;

CREATE TABLE IF NOT EXISTS reels (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id   INT NOT NULL,
    titulo       VARCHAR(255) NULL,
    descripcion  TEXT NULL,
    archivo      VARCHAR(500) NOT NULL,
    tipo         ENUM('video','imagen') NOT NULL DEFAULT 'video',
    producto_id  INT NULL,
    vistas       INT NOT NULL DEFAULT 0,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
    INDEX idx_usuario (usuario_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reels_likes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    reel_id     INT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reel_like (usuario_id, reel_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (reel_id)    REFERENCES reels(id)    ON DELETE CASCADE,
    INDEX idx_reel (reel_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reels_guardados (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    reel_id     INT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reel_guardado (usuario_id, reel_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (reel_id)    REFERENCES reels(id)    ON DELETE CASCADE,
    INDEX idx_reel (reel_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reels_comentarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    reel_id     INT NOT NULL,
    parent_id   INT NULL,
    comentario  TEXT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)          ON DELETE CASCADE,
    FOREIGN KEY (reel_id)    REFERENCES reels(id)             ON DELETE CASCADE,
    FOREIGN KEY (parent_id)  REFERENCES reels_comentarios(id) ON DELETE CASCADE,
    INDEX idx_reel   (reel_id),
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reels_comentarios_likes (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id    INT NOT NULL,
    comentario_id INT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_com_like (usuario_id, comentario_id),
    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id)          ON DELETE CASCADE,
    FOREIGN KEY (comentario_id) REFERENCES reels_comentarios(id) ON DELETE CASCADE,
    INDEX idx_comentario (comentario_id)
) ENGINE=InnoDB;
