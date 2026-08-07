-- Suivi des relances de facturation (encaissement manuel du 3% pour les
-- agences sans Stripe). Ajoute le nécessaire pour que /api/billing-reminders
-- (cron quotidien) sache où en est chaque facture impayée et évite de
-- renvoyer deux fois le même palier de relance.
--
-- Paliers (calculés sur days_overdue = jours écoulés depuis l'échéance,
-- elle-même 30 jours après l'envoi de la facture) :
--   J+3   -> relance 1 (rappel amical)
--   J+10  -> relance 2 (rappel plus ferme)
--   J+20  -> relance 3 (dernier rappel avant restriction d'accès)
--   J+30+ -> alerte interne à l'admin (répétée tous les 15 jours), pas
--            d'email supplémentaire à l'agence tant qu'aucune action manuelle
--            n'a été prise.

ALTER TABLE billing_records
  ADD COLUMN IF NOT EXISTS reminder_count   integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

-- Étend le tableau de bord "Factures impayées" avec l'état de relance,
-- pour que l'admin voie où en est chaque agence sans avoir à checker les
-- logs du cron.
CREATE OR REPLACE FUNCTION get_admin_unpaid_invoices()
RETURNS TABLE (
  id                uuid,
  tenant_id         uuid,
  tenant_name       text,
  period            text,
  commission_amount numeric,
  currency          text,
  invoice_number    text,
  sent_at           timestamptz,
  days_overdue      integer,
  reminder_count    integer,
  last_reminder_at  timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF lower(coalesce(auth.jwt() ->> 'email', '')) <> 'prokmbconsulting@gmail.com' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    br.id,
    br.tenant_id,
    t.name AS tenant_name,
    br.period,
    br.commission_amount,
    br.currency,
    br.invoice_number,
    br.sent_at,
    GREATEST(
      0,
      EXTRACT(DAY FROM (now() - (COALESCE(br.sent_at, br.created_at) + interval '30 days')))::integer
    ) AS days_overdue,
    br.reminder_count,
    br.last_reminder_at
  FROM billing_records br
  JOIN tenants t ON t.id = br.tenant_id
  WHERE br.status = 'pending'
  ORDER BY COALESCE(br.sent_at, br.created_at) ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_unpaid_invoices() TO authenticated;
