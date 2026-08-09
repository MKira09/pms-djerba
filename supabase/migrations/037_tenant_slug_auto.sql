-- Génère automatiquement un slug pour chaque nouveau tenant (agence) qui
-- n'en fournit pas explicitement à la création.
--
-- Contexte : le lien du catalogue public (/catalogue/:slug) et le bloc
-- "Votre catalogue public" sur la page Mes biens dépendent de tenants.slug.
-- La fonction create_tenant_and_profile (appelée à l'inscription) ne vit
-- pas dans ce dépôt — elle a été créée directement en base à un moment
-- donné et n'a visiblement jamais été mise à jour pour générer de slug,
-- ce qui fait que les comptes créés après la migration 023 se retrouvent
-- sans catalogue accessible. Un trigger BEFORE INSERT est plus sûr qu'une
-- modification de cette fonction inconnue : il garantit un slug quel que
-- soit le chemin de création du tenant.

CREATE OR REPLACE FUNCTION generate_tenant_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix    int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  base_slug := lower(trim(both '-' from
    regexp_replace(
      regexp_replace(coalesce(NEW.name, 'agence'), '[^a-zA-Z0-9 ]', '', 'g'),
      ' +', '-', 'g'
    )
  ));
  IF base_slug = '' THEN
    base_slug := 'agence';
  END IF;

  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_tenant_slug ON tenants;
CREATE TRIGGER trg_generate_tenant_slug
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION generate_tenant_slug();

-- Rattrape les tenants déjà créés sans slug (ex: le compte de test utilisé
-- pour vérifier l'onboarding).
UPDATE tenants
SET slug = sub.candidate
FROM (
  SELECT
    id,
    lower(trim(both '-' from
      regexp_replace(regexp_replace(coalesce(name, 'agence'), '[^a-zA-Z0-9 ]', '', 'g'), ' +', '-', 'g')
    )) || '-' || substr(id::text, 1, 6) AS candidate
  FROM tenants
  WHERE slug IS NULL OR slug = ''
) sub
WHERE tenants.id = sub.id;
