-- Migration 021 : génère automatiquement les slugs pour les villas sans slug
-- Utilise unaccent (dispo sur Supabase) pour gérer les accents (é→e, à→a…)
-- En cas de doublon, ajoute -2, -3… pour garantir l'unicité globale

CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
DECLARE
  v         RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix    INT;
BEGIN
  FOR v IN SELECT id, name FROM villas WHERE slug IS NULL OR slug = '' ORDER BY created_at LOOP
    -- Normalise : minuscules, sans accents, garde a-z 0-9 espace tiret, espaces→tirets
    base_slug := lower(
      regexp_replace(
        regexp_replace(unaccent(v.name), '[^a-zA-Z0-9 -]', '', 'g'),
        '\s+', '-', 'g'
      )
    );
    -- Nettoie les tirets en début/fin
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN
      base_slug := 'villa';
    END IF;

    candidate := base_slug;
    suffix    := 2;

    -- Résout les doublons : villa-jasmine → villa-jasmine-2 → …
    WHILE EXISTS (SELECT 1 FROM villas WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || suffix;
      suffix    := suffix + 1;
    END LOOP;

    UPDATE villas SET slug = candidate WHERE id = v.id;
  END LOOP;
END;
$$;
