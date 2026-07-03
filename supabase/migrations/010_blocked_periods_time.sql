-- =========================================================
-- Add optional start/end time to blocked_periods
-- =========================================================
ALTER TABLE blocked_periods
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;
