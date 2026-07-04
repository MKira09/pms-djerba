-- Migration 019 : couleur de chaque villa pour le calendrier
ALTER TABLE villas ADD COLUMN IF NOT EXISTS color TEXT;
