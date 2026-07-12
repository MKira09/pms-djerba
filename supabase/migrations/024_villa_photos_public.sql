-- Make villa-photos bucket public so catalogue page can display images without auth

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'villa-photos',
  'villa-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop before recreate (idempotent)
DROP POLICY IF EXISTS "villa_photos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "villa_photos_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "villa_photos_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "villa_photos_auth_delete"  ON storage.objects;

-- Anyone can view villa photos (needed for public catalogue page)
CREATE POLICY "villa_photos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'villa-photos');

-- Only authenticated users can upload/modify/delete
CREATE POLICY "villa_photos_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'villa-photos');

CREATE POLICY "villa_photos_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'villa-photos');

CREATE POLICY "villa_photos_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'villa-photos');
