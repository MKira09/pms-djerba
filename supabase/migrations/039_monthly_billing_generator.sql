-- Génération automatique de la facture mensuelle de commission (billing_records).
--
-- Calcule le CA enregistré (réservations non annulées, check-in dans le mois)
-- et la commission (3%) pour chaque agence, puis crée/actualise la ligne de
-- facture correspondante — pour que "Facture mensuelle auto" (page tarifs)
-- soit vrai même pour les réservations payées hors Stripe (virement, RIB...).
--
-- Les réservations déjà payées via le lien Stripe (payment_status = 'paid'
-- AND paid_method = 'stripe') sont exclues du calcul : leur commission a déjà
-- été prélevée automatiquement au moment du paiement (application_fee_amount
-- dans create-payment-link), donc les inclure ici facturerait la commission
-- deux fois.
--
-- Rien n'est facturé pour un mois sans CA (HAVING SUM(...) > 0) — cohérent
-- avec "Aucun forfait fixe. Aucun engagement.".
--
-- Si une facture existe déjà pour la période et est encore 'pending', elle
-- est mise à jour (utile si des réservations sont ajoutées/modifiées après
-- coup) ; une facture déjà 'paid'/'cancelled'/'waived' n'est jamais touchée.

CREATE OR REPLACE FUNCTION generate_monthly_billing(
  p_period text DEFAULT to_char((now() - interval '1 month'), 'YYYY-MM')
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_start date := (p_period || '-01')::date;
  v_end   date := v_start + interval '1 month';
BEGIN
  INSERT INTO billing_records (
    tenant_id, period, ca_amount, booking_count,
    commission_rate, commission_amount, currency, status, invoice_number
  )
  SELECT
    t.id,
    p_period,
    SUM(res.total_amount),
    COUNT(*)::integer,
    0.03,
    ROUND(SUM(res.total_amount) * 0.03, 2),
    COALESCE(t.currency, 'EUR'),
    'pending',
    'VH-' || p_period || '-' || substr(t.id::text, 1, 8)
  FROM tenants t
  JOIN reservations res ON res.tenant_id = t.id
  WHERE res.status <> 'cancelled'
    AND res.check_in >= v_start
    AND res.check_in <  v_end
    AND NOT (res.payment_status = 'paid' AND res.paid_method = 'stripe')
  GROUP BY t.id, t.currency
  HAVING SUM(res.total_amount) > 0
  ON CONFLICT (tenant_id, period) DO UPDATE
    SET ca_amount         = EXCLUDED.ca_amount,
        booking_count     = EXCLUDED.booking_count,
        commission_amount = EXCLUDED.commission_amount
    WHERE billing_records.status = 'pending';
END;
$$;

-- Planification : le 1er de chaque mois à 3h du matin (UTC), facture le mois précédent.
-- (à exécuter une seule fois — copie tout ce fichier dans le SQL Editor de Supabase)
SELECT cron.schedule(
  'generate-monthly-billing',
  '0 3 1 * *',
  $$ SELECT generate_monthly_billing(); $$
);
