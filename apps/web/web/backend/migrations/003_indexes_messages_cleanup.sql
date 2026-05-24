-- ═══════════════════════════════════════════════════════
--  LocalMarket · Migración 003
--  - Índices faltantes para consultas frecuentes
--  - Tabla messages para chat persistente
--  - Función de limpieza automática de tokens expirados
--  - Tabla categories para catálogo estructurado
--  PostgreSQL 14+
-- ═══════════════════════════════════════════════════════

-- ─────────────────────────────────────────
--  1. ÍNDICES FALTANTES
-- ─────────────────────────────────────────

-- Filtros frecuentes en orders
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id  ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created   ON orders(created_at DESC);
-- Consulta combinada habitual: pedidos activos de un comprador
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON orders(buyer_id, status);

-- Filtros en users
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Notificaciones no leídas por usuario (caso de uso más frecuente)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- Búsqueda de deliveries por conductor
CREATE INDEX IF NOT EXISTS idx_deliveries_driver  ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order   ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status  ON deliveries(status);

-- auth_tokens: limpieza eficiente de expirados
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at)
  WHERE used = FALSE;

-- ─────────────────────────────────────────
--  2. TABLA MESSAGES (chat persistente)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body         TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  image_url    TEXT,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
-- Conversación entre dos usuarios (orden cronológico)
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(LEAST(sender_id::text, recipient_id::text),
              GREATEST(sender_id::text, recipient_id::text),
              created_at);
-- Mensajes no leídos por destinatario
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(recipient_id, is_read)
  WHERE is_read = FALSE;

-- ─────────────────────────────────────────
--  3. TABLA CATEGORIES (catálogo estructurado)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL      PRIMARY KEY,
  slug        VARCHAR(50) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  emoji       VARCHAR(10)  NOT NULL DEFAULT '📦',
  sort_order  INT          NOT NULL DEFAULT 0
);

INSERT INTO categories (slug, name, emoji, sort_order) VALUES
  ('panaderia',  'Panadería',    '🥖', 1),
  ('alimentos',  'Alimentos',    '🥬', 2),
  ('bebidas',    'Bebidas',      '☕', 3),
  ('artesanias', 'Artesanías',   '🎨', 4),
  ('otros',      'Otros',        '📦', 99)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────
--  4. LIMPIEZA AUTOMÁTICA DE TOKENS EXPIRADOS
-- ─────────────────────────────────────────

-- Función que borra tokens vencidos (llamar con pg_cron o manualmente)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS INTEGER AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM auth_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour'
     OR (used = TRUE AND created_at < NOW() - INTERVAL '7 days');
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql;

-- Si tienes pg_cron instalado, descomenta esta línea:
-- SELECT cron.schedule('cleanup-tokens', '0 3 * * *', 'SELECT cleanup_expired_tokens()');

-- ─────────────────────────────────────────
--  5. COLUMNA shipping_address EN orders
--     (normalizar dirección de entrega)
-- ─────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Migrar address existente si la hay
UPDATE orders
  SET shipping_address = address
WHERE shipping_address IS NULL AND address IS NOT NULL;

-- ─────────────────────────────────────────
--  6. RESTRICCIÓN: evitar auto-mensajes
-- ─────────────────────────────────────────
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_no_self_chat;
ALTER TABLE messages
  ADD CONSTRAINT messages_no_self_chat
  CHECK (sender_id <> recipient_id);

-- ─────────────────────────────────────────
--  ROLLBACK (comentado)
-- ─────────────────────────────────────────
-- DROP TABLE IF EXISTS messages;
-- DROP TABLE IF EXISTS categories;
-- DROP FUNCTION IF EXISTS cleanup_expired_tokens();
-- DROP INDEX IF EXISTS idx_orders_buyer_id;
-- DROP INDEX IF EXISTS idx_orders_seller_id;
-- DROP INDEX IF EXISTS idx_orders_status;
-- DROP INDEX IF EXISTS idx_orders_created;
-- DROP INDEX IF EXISTS idx_orders_buyer_status;
-- DROP INDEX IF EXISTS idx_users_role;
-- DROP INDEX IF EXISTS idx_users_status;
-- DROP INDEX IF EXISTS idx_notifications_user_unread;
-- DROP INDEX IF EXISTS idx_deliveries_driver;
-- DROP INDEX IF EXISTS idx_deliveries_order;
-- DROP INDEX IF EXISTS idx_deliveries_status;
-- DROP INDEX IF EXISTS idx_auth_tokens_expires;
