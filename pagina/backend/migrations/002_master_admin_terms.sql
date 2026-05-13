-- ═══════════════════════════════════════════════════════
--  LocalMarket · Migración 002
--  - Agrega rol master_admin
--  - Agrega columnas de aceptación de términos
--  PostgreSQL 14+
-- ═══════════════════════════════════════════════════════

-- 1. Ampliar la restricción de rol para incluir master_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('buyer','seller','driver','admin','master_admin'));

-- 2. Columnas de términos y condiciones
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_accepted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version      VARCHAR(10)  DEFAULT '1.0';

-- 3. Índice para auditoría de términos
CREATE INDEX IF NOT EXISTS idx_users_terms_version ON users(terms_version);

-- 4. Promover al admin por defecto a master_admin
UPDATE users
  SET role = 'master_admin'
WHERE email = 'admin@localmarket.com';

-- 5. Ajustar la restricción de rol en el perfil de repartidor
--    (no aplica porque driver_profiles usa user_id referenciando users)

-- 6. Script de rollback (comentado)
-- ALTER TABLE users DROP CONSTRAINT users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check
--   CHECK (role IN ('buyer','seller','driver','admin'));
-- ALTER TABLE users DROP COLUMN IF EXISTS terms_accepted_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS terms_version;
-- UPDATE users SET role = 'admin' WHERE email = 'admin@localmarket.com';
