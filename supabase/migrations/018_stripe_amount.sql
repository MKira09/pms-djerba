-- Migration 018 : montant envoyé au client via le lien Stripe
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS stripe_amount NUMERIC;
