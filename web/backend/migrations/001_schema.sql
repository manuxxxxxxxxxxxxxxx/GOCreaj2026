-- ═══════════════════════════════════════════════════════
--  LocalMarket · Esquema inicial de Base de Datos
--  PostgreSQL 14+
--  Ejecutar: psql $DATABASE_URL -f migrations/001_schema.sql
-- ═══════════════════════════════════════════════════════

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- búsqueda de texto difusa

-- ─────────────────────────────────────────
--  USUARIOS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),                          -- NULL si sólo OAuth
  google_id       VARCHAR(255) UNIQUE,                   -- NULL si sólo email/pass
  role            VARCHAR(20)  NOT NULL DEFAULT 'buyer'
                  CHECK (role IN ('buyer','seller','driver','admin')),
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','verified','suspended','banned')),
  email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

-- ─────────────────────────────────────────
--  PERFILES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name   VARCHAR(100) NOT NULL DEFAULT '',
  avatar_url  TEXT,
  phone       VARCHAR(25),
  bio         TEXT,
  address     TEXT,
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS seller_profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  store_name        VARCHAR(100) NOT NULL DEFAULT '',
  store_description TEXT,
  category          VARCHAR(50),
  rating            NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_reviews     INT          NOT NULL DEFAULT 0,
  verified_seller   BOOLEAN      NOT NULL DEFAULT FALSE,
  documents_url     TEXT[]       DEFAULT '{}',
  commission_rate   NUMERIC(5,2) NOT NULL DEFAULT 10.00
);

CREATE TABLE IF NOT EXISTS driver_profiles (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  vehicle_type     VARCHAR(20) CHECK (vehicle_type IN ('moto','bici','carro','scooter')),
  vehicle_plate    VARCHAR(20),
  license_number   VARCHAR(50),
  is_available     BOOLEAN     NOT NULL DEFAULT FALSE,
  rating           NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_deliveries INT          NOT NULL DEFAULT 0,
  verified_driver  BOOLEAN      NOT NULL DEFAULT FALSE,
  documents_url    TEXT[]       DEFAULT '{}'
);

-- ─────────────────────────────────────────
--  AUTENTICACIÓN — TOKENS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) NOT NULL UNIQUE,
  type        VARCHAR(30)  NOT NULL
              CHECK (type IN ('email_verify','password_reset','refresh')),
  expires_at  TIMESTAMPTZ  NOT NULL,
  used        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_token   ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_type ON auth_tokens(user_id, type);

-- ─────────────────────────────────────────
--  PRODUCTOS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
  stock       INT           NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category    VARCHAR(50),
  emoji       VARCHAR(10)   DEFAULT '🛒',
  images      TEXT[]        DEFAULT '{}',
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_seller   ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- ─────────────────────────────────────────
--  ÓRDENES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    UUID        NOT NULL REFERENCES users(id),
  seller_id   UUID        NOT NULL REFERENCES users(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','confirmed','preparing','in_transit','delivered','cancelled')),
  subtotal    NUMERIC(10,2) NOT NULL,
  shipping    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  total       NUMERIC(10,2) NOT NULL,
  address     JSONB        NOT NULL DEFAULT '{}',
  notes       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID          REFERENCES products(id) ON DELETE SET NULL,
  name        VARCHAR(200)  NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL,
  quantity    INT           NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer  ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ─────────────────────────────────────────
--  ENTREGAS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID        NOT NULL REFERENCES orders(id) UNIQUE,
  driver_id       UUID        REFERENCES users(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'searching'
                  CHECK (status IN ('searching','assigned','picked_up','in_transit','delivered','cancelled')),
  pickup_address  TEXT,
  delivery_address TEXT,
  driver_earnings NUMERIC(10,2),
  tracking_code   VARCHAR(20) UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  picked_up_at    TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- ─────────────────────────────────────────
--  RESEÑAS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id  UUID        NOT NULL REFERENCES users(id),
  reviewed_id  UUID        NOT NULL REFERENCES users(id),
  order_id     UUID        REFERENCES orders(id) ON DELETE SET NULL,
  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reviewer_id, order_id)
);

-- ─────────────────────────────────────────
--  NOTIFICACIONES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  body       TEXT,
  data       JSONB        DEFAULT '{}',
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ─────────────────────────────────────────
--  TRIGGER: updated_at automático
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','products','orders','deliveries'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON %s;
       CREATE TRIGGER trg_%s_updated
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────
--  ADMIN POR DEFECTO (cambiar contraseña en producción)
-- ─────────────────────────────────────────
INSERT INTO users (email, password_hash, role, status, email_verified)
VALUES (
  'admin@localmarket.com',
  -- contraseña: Admin1234! (bcrypt $2b$12$)
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR7HBjTGsHFDa',
  'admin', 'verified', TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, full_name)
SELECT id, 'Administrador LocalMarket'
FROM users WHERE email = 'admin@localmarket.com'
ON CONFLICT (user_id) DO NOTHING;
