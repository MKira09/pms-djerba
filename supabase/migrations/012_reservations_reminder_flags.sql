-- Colonnes pour tracker les rappels déjà envoyés
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reminder_j3_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_j1_sent BOOLEAN NOT NULL DEFAULT false;
