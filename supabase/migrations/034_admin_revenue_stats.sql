-- Vue revenus/commissions pour le tableau de bord super-admin.
-- Calcule le CA et la commission (3%) estimée par agence pour une période
-- donnée ('YYYY-MM'), en distinguant les agences avec Stripe connecté
-- (commission prélevée automatiquement) de celles facturées manuellement
-- (jointure avec billing_records pour connaître le statut de paiement).
CREATE OR REPLACE FUNCTION get_admin_revenue_stats(p_period text DEFAULT to_char(now(), 'YYYY-MM'))
RETURNS TABLE (
  tenant_id         uuid,
  tenant_name       text,
  has_stripe        boolean,
  ca_amount         numeric,
  booking_count     integer,
  commission_amount numeric,
  currency          text,
  billing_status    text
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
    t.id                                        AS tenant_id,
    t.name                                       AS tenant_name,
    (t.stripe_account_id IS NOT NULL)            AS has_stripe,
    COALESCE(r.ca, 0)                            AS ca_amount,
    COALESCE(r.cnt, 0)::integer                  AS booking_count,
    ROUND(COALESCE(r.ca, 0) * 0.03, 2)           AS commission_amount,
    COALESCE(t.currency, 'EUR')                  AS currency,
    br.status                                    AS billing_status
  FROM tenants t
  LEFT JOIN (
    SELECT
      res.tenant_id,
      SUM(res.total_amount) AS ca,
      COUNT(*)              AS cnt
    FROM reservations res
    WHERE res.status <> 'cancelled'
      AND res.check_in >= (p_period || '-01')::date
      AND res.check_in <  ((p_period || '-01')::date + interval '1 month')
    GROUP BY res.tenant_id
  ) r ON r.tenant_id = t.id
  LEFT JOIN billing_records br ON br.tenant_id = t.id AND br.period = p_period
  ORDER BY ca_amount DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_revenue_stats(text) TO authenticated;
