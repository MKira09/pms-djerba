-- Migration 017 : colonnes de suivi du paiement final
-- (distinct du dépôt qui reste dans deposit_amount/deposit_date/deposit_method)

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'link_sent', 'paid')),
  ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT,
  ADD COLUMN IF NOT EXISTS paid_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_method TEXT;
