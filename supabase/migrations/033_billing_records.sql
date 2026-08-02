-- Historique des factures VillaHub → agences (commission mensuelle)
CREATE TABLE IF NOT EXISTS billing_records (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period            text        NOT NULL,  -- 'YYYY-MM'
  ca_amount         numeric     NOT NULL DEFAULT 0,
  booking_count     integer     NOT NULL DEFAULT 0,
  commission_rate   numeric     NOT NULL DEFAULT 0.03,
  commission_amount numeric     NOT NULL DEFAULT 0,
  currency          text        NOT NULL DEFAULT 'EUR',
  status            text        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'cancelled', 'waived')),
  invoice_number    text        UNIQUE,
  sent_at           timestamptz,
  paid_at           timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period)
);

ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- Chaque agence voit ses propres factures
CREATE POLICY "billing_records_tenant_select" ON billing_records
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
