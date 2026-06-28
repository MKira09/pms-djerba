-- Add payment/deposit tracking fields to reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deposit_amount  NUMERIC        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_date    DATE,
  ADD COLUMN IF NOT EXISTS deposit_method  TEXT;

COMMENT ON COLUMN reservations.deposit_amount IS 'Acompte versé par le client (TND)';
COMMENT ON COLUMN reservations.deposit_date   IS 'Date du versement de l''acompte';
COMMENT ON COLUMN reservations.deposit_method IS 'Mode de paiement : espèces, virement, chèque, carte';
