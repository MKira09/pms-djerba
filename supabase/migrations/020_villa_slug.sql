-- Migration 020 : slug personnalisé pour les liens de réservation publics
ALTER TABLE villas ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Index pour les lookups par slug (page publique /book/:slug)
CREATE INDEX IF NOT EXISTS idx_villas_slug ON villas (slug) WHERE slug IS NOT NULL;
