-- Add logo_url column to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Storage bucket for agency logos (public, max 2 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for logos bucket
CREATE POLICY IF NOT EXISTS "logos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

CREATE POLICY IF NOT EXISTS "logos_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY IF NOT EXISTS "logos_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY IF NOT EXISTS "logos_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos');
