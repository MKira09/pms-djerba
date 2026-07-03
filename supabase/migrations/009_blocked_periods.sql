-- =========================================================
-- Blocked periods (maintenance, personal use, etc.)
-- =========================================================

CREATE TABLE IF NOT EXISTS blocked_periods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  villa_id    UUID REFERENCES villas(id) ON DELETE CASCADE, -- NULL = toutes les villas
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT NOT NULL DEFAULT 'autre', -- 'entretien' | 'usage_personnel' | 'autre'
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT blocked_periods_dates_check CHECK (end_date >= start_date)
);

-- RLS
ALTER TABLE blocked_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_blocked_periods" ON blocked_periods
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
