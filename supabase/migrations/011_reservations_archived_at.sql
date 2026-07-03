-- =========================================================
-- Soft-delete reservations via archived_at
-- =========================================================
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
