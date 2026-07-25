-- Stripe Connect Express account ID per tenant (one per agency, never shared)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_account_id text;
