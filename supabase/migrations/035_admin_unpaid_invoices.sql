-- Suivi des factures de commission impayées (billing_records en statut 'pending')
-- pour le tableau de bord super-admin, + action pour les marquer payées
-- une fois le virement reçu.

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
  days_overdue      integer
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
    ) AS days_overdue
  FROM billing_records br
  JOIN tenants t ON t.id = br.tenant_id
  WHERE br.status = 'pending'
  ORDER BY COALESCE(br.sent_at, br.created_at) ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_unpaid_invoices() TO authenticated;

-- Marque une facture de commission comme payée (virement reçu).
CREATE OR REPLACE FUNCTION admin_mark_billing_paid(p_billing_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF lower(coalesce(auth.jwt() ->> 'email', '')) <> 'prokmbconsulting@gmail.com' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE billing_records
  SET status = 'paid', paid_at = now()
  WHERE id = p_billing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_mark_billing_paid(uuid) TO authenticated;
