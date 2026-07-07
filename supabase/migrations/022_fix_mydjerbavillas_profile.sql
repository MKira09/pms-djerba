-- ============================================================
-- Diagnostic & fix pour mydjerbavillas@gmail.com
-- Tenant ID : 1a87239f-3dbb-47bd-bcea-cd1c0ec8498a
-- ============================================================
-- Étape 1 : Vérifier si le profil existe (par tenant_id)
SELECT p.id, p.full_name, p.role, p.tenant_id, u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.tenant_id = '1a87239f-3dbb-47bd-bcea-cd1c0ec8498a';

-- Étape 2 : Récupérer l'auth user ID de cet email
SELECT id, email, created_at
FROM auth.users
WHERE email = 'mydjerbavillas@gmail.com';

-- Étape 3 : Si aucun profil trouvé à l'étape 1, créer le profil manquant.
-- Remplacez <AUTH_USER_ID> par l'UUID obtenu à l'étape 2.
--
-- INSERT INTO profiles (id, tenant_id, full_name, role, created_at)
-- VALUES (
--   '<AUTH_USER_ID>',
--   '1a87239f-3dbb-47bd-bcea-cd1c0ec8498a',
--   'MyDjerba Villas',
--   'admin',
--   now()
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Étape 4 : Vérifier le tenant
SELECT id, name, plan, founding_member, trial_ends
FROM tenants
WHERE id = '1a87239f-3dbb-47bd-bcea-cd1c0ec8498a';
