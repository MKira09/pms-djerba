-- =========================================================
-- Founding member utilities
-- =========================================================

-- ─────────────────────────────────────────
-- RPC: count founding members (public, called from the homepage)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_founding_member_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer FROM tenants WHERE founding_member = true;
$$;

GRANT EXECUTE ON FUNCTION get_founding_member_count() TO anon, authenticated;

-- ─────────────────────────────────────────
-- ADMIN HELPER: upgrade a user to founding member
--
-- Usage (run in Supabase SQL editor):
--   SELECT setup_founding_member('myDjerbaVillas@gmail.com');
--
-- Steps:
--   1. Create the auth account via Supabase Dashboard → Authentication → Users → Add user
--      (or use the "Invite user" button — the user will receive a magic link)
--   2. Wait for the handle_new_user trigger to create the tenant + profile
--   3. Run this function with their email
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION setup_founding_member(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id  uuid;
  v_tenant_id uuid;
  v_tenant_name text;
BEGIN
  -- Find auth user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(trim(p_email));

  IF v_user_id IS NULL THEN
    RETURN 'ERREUR : Aucun utilisateur trouvé avec cet email. '
           'Créez d''abord le compte dans Dashboard → Authentication → Users.';
  END IF;

  -- Find their tenant
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = v_user_id;

  IF v_tenant_id IS NULL THEN
    RETURN 'ERREUR : Profil introuvable pour cet utilisateur. '
           'Le trigger handle_new_user a peut-être échoué.';
  END IF;

  -- Upgrade: Pro plan, founding member, no trial expiry, no billing
  UPDATE tenants
  SET
    plan            = 'pro',
    founding_member = true,
    trial_ends      = NULL
  WHERE id = v_tenant_id
  RETURNING name INTO v_tenant_name;

  RETURN FORMAT(
    'SUCCÈS : "%s" (%s) est maintenant membre fondateur Pro — accès gratuit permanent.',
    v_tenant_name, p_email
  );
END;
$$;

-- Security: only super-admin (postgres / service role) can call this
REVOKE ALL ON FUNCTION setup_founding_member(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION setup_founding_member(text) TO postgres, service_role;
