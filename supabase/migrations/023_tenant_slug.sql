-- Add slug to tenants for public catalogue URL
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug text;

-- Backfill from name (lowercase, spaces → hyphens, strip non-alphanumeric)
UPDATE tenants
SET slug = LOWER(
  TRIM(BOTH '-' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', '', 'g'),
      ' +', '-', 'g'
    )
  )
)
WHERE slug IS NULL OR slug = '';

-- Unique index (partial — only for rows where slug is set)
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_key ON tenants(slug)
WHERE slug IS NOT NULL;

-- Public anon read: any tenant with a slug can be found via catalogue
DROP POLICY IF EXISTS "public_view_tenant_by_slug" ON tenants;
CREATE POLICY "public_view_tenant_by_slug"
  ON tenants FOR SELECT TO anon
  USING (slug IS NOT NULL);
