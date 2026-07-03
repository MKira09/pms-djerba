-- Numéros de documents de paiement sur les réservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Bucket Supabase Storage pour les PDFs générés
INSERT INTO storage.buckets (id, name, public)
VALUES ('factures', 'factures', false)
ON CONFLICT (id) DO NOTHING;

-- RLS : chaque tenant n'accède qu'à son dossier (/{tenant_id}/...)
DROP POLICY IF EXISTS "tenant_factures_own" ON storage.objects;
CREATE POLICY "tenant_factures_own"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'factures'
    AND (storage.foldername(name))[1] = (
      SELECT p.tenant_id::text FROM profiles p WHERE p.id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    bucket_id = 'factures'
    AND (storage.foldername(name))[1] = (
      SELECT p.tenant_id::text FROM profiles p WHERE p.id = auth.uid() LIMIT 1
    )
  );
