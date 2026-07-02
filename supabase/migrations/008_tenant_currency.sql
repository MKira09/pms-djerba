-- =========================================================
-- Tenant currency preference
-- =========================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';
