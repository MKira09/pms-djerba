-- Brand customization per tenant
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS brand_color_primary   text,
  ADD COLUMN IF NOT EXISTS brand_color_secondary text,
  ADD COLUMN IF NOT EXISTS brand_font            text;
