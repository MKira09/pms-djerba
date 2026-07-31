-- Migration 017 : create_booking_request met à jour le nom/téléphone du client
-- existant au lieu de les ignorer silencieusement.
--
-- Bug : quand un client existait déjà pour cet email (ex: un client qui rebooke,
-- ou en test avec la même adresse email), la fonction réutilisait sa fiche telle
-- quelle sans jamais mettre à jour full_name/phone avec les nouvelles valeurs
-- soumises dans le formulaire — donnant l'impression que le nom saisi était
-- ignoré (il l'était).

CREATE OR REPLACE FUNCTION create_booking_request(
  p_villa_id  UUID,
  p_full_name TEXT,
  p_email     TEXT,
  p_phone     TEXT,
  p_check_in  DATE,
  p_check_out DATE,
  p_guests    INT,
  p_message   TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id      UUID;
  v_client_id      UUID;
  v_reservation_id UUID;
  v_total_amount   NUMERIC;
BEGIN
  -- Récupère tenant_id et calcule le montant (base_price × nuits)
  SELECT tenant_id,
         base_price * (p_check_out - p_check_in)
  INTO v_tenant_id, v_total_amount
  FROM villas
  WHERE id = p_villa_id AND status = 'active';

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Villa introuvable ou inactive';
  END IF;

  -- Recherche client existant par email
  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id INTO v_client_id
    FROM clients
    WHERE tenant_id = v_tenant_id AND email = p_email
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    -- Nouveau client
    INSERT INTO clients (tenant_id, full_name, email, phone, preferred_lang)
    VALUES (v_tenant_id, p_full_name, NULLIF(p_email, ''), NULLIF(p_phone, ''), 'fr')
    RETURNING id INTO v_client_id;
  ELSE
    -- Client existant (même email) : on synchronise nom/téléphone avec les
    -- valeurs fraîchement saisies, plutôt que de garder silencieusement les
    -- anciennes.
    UPDATE clients
    SET full_name = p_full_name,
        phone      = COALESCE(NULLIF(p_phone, ''), phone)
    WHERE id = v_client_id;
  END IF;

  -- Crée la réservation en attente avec le montant calculé
  INSERT INTO reservations (
    tenant_id, villa_id, client_id,
    check_in, check_out, guests,
    total_amount, currency, source, status,
    internal_note
  )
  VALUES (
    v_tenant_id, p_villa_id, v_client_id,
    p_check_in, p_check_out, p_guests,
    COALESCE(v_total_amount, 0), 'TND', 'direct', 'pending',
    NULLIF(p_message, '')
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_booking_request TO anon, authenticated;
