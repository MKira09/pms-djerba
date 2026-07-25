ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS paypal_me   text,
  ADD COLUMN IF NOT EXISTS bank_holder text,
  ADD COLUMN IF NOT EXISTS bank_name   text,
  ADD COLUMN IF NOT EXISTS bank_iban   text,
  ADD COLUMN IF NOT EXISTS bank_bic    text;
