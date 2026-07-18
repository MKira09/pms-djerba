-- =========================================================
-- Compteur public des membres fondateurs (offre payante)
-- Indépendant du flag founding_member qui peut être posé
-- manuellement sur des comptes internes/offerts.
-- =========================================================

-- Table settings générique (clé/valeur jsonb)
CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'null'
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les clés exposées côté front
CREATE POLICY "settings_public_read" ON settings
  FOR SELECT TO anon, authenticated
  USING (key = 'public_founding_count');

-- Initialise le compteur à 0
-- (ON CONFLICT UPDATE remet à 0 si la ligne existait déjà)
INSERT INTO settings (key, value)
VALUES ('public_founding_count', '0'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = '0'::jsonb;


-- ─────────────────────────────────────────────────────────
-- RPC publique : lit le compteur dédié
-- Remplace get_founding_member_count() pour l'affichage /plans
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_public_founding_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE((value)::text::integer, 0)
  FROM settings
  WHERE key = 'public_founding_count';
$$;

GRANT EXECUTE ON FUNCTION get_public_founding_count() TO anon, authenticated;


-- ─────────────────────────────────────────────────────────
-- Mise à jour de apply_founding_member_if_eligible :
-- utilise le compteur dédié au lieu de COUNT(founding_member)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_founding_member_if_eligible(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('founding_member_lock'));

  SELECT COALESCE((value)::text::integer, 0) INTO v_count
  FROM settings
  WHERE key = 'public_founding_count';

  IF v_count >= 3 THEN
    RETURN false;
  END IF;

  UPDATE tenants
  SET founding_member = true
  WHERE id = p_tenant_id
    AND (founding_member IS NULL OR founding_member = false);

  -- Incrémenter le compteur public dédié
  UPDATE settings
  SET value = ((v_count + 1)::text)::jsonb
  WHERE key = 'public_founding_count';

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_founding_member_if_eligible(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION apply_founding_member_if_eligible(uuid) FROM anon;
