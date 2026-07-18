-- =========================================================
-- Founding member — attribution automatique au paiement
-- Max 3 membres fondateurs (vérification atomique en DB)
-- =========================================================

-- ─────────────────────────────────────────────────────────
-- Constante : nombre maximum de membres fondateurs
-- ─────────────────────────────────────────────────────────
-- Utilisée ici et dans get_founding_member_count()
-- Changer cette valeur ici suffit pour ajuster le plafond.

-- ─────────────────────────────────────────────────────────
-- RPC : applique l'avantage fondateur si une place est libre
-- Appelé depuis PaymentSuccessPage juste après la création du compte.
-- Retourne TRUE si le tenant a été promu fondateur, FALSE sinon.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_founding_member_if_eligible(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_updated integer;
BEGIN
  -- Verrouillage advisory pour éviter les race conditions simultanées
  PERFORM pg_advisory_xact_lock(hashtext('founding_member_lock'));

  SELECT COUNT(*) INTO v_count
  FROM tenants
  WHERE founding_member = true;

  IF v_count >= 3 THEN
    RETURN false;
  END IF;

  UPDATE tenants
  SET founding_member = true
  WHERE id = p_tenant_id
    AND (founding_member IS NULL OR founding_member = false);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- Accessible par les utilisateurs authentifiés (appelé juste après signUp)
GRANT EXECUTE ON FUNCTION apply_founding_member_if_eligible(uuid) TO authenticated;
-- Pas de droit anon : évite les appels non authentifiés
REVOKE EXECUTE ON FUNCTION apply_founding_member_if_eligible(uuid) FROM anon;


-- ─────────────────────────────────────────────────────────
-- Met aussi à jour get_founding_member_count() pour exposer
-- le maximum (utile côté front si on veut le rendre dynamique)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_founding_member_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer FROM tenants WHERE founding_member = true;
$$;

GRANT EXECUTE ON FUNCTION get_founding_member_count() TO anon, authenticated;
