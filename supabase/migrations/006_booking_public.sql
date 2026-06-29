-- ─── Public read access for booking page ────────────────────────────────────

-- Anon can view active villas (name, photos, etc.)
DROP POLICY IF EXISTS "public_view_active_villas" ON villas;
CREATE POLICY "public_view_active_villas"
  ON villas FOR SELECT TO anon
  USING (status = 'active');

-- Anon can read date ranges of confirmed/pending reservations (availability check)
DROP POLICY IF EXISTS "public_reservation_availability" ON reservations;
CREATE POLICY "public_reservation_availability"
  ON reservations FOR SELECT TO anon
  USING (
    status IN ('confirmed', 'pending')
    AND EXISTS (SELECT 1 FROM villas WHERE id = villa_id AND status = 'active')
  );

-- ─── RPC: create booking request (SECURITY DEFINER — bypasses RLS) ───────────
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
  v_tenant_id     UUID;
  v_client_id     UUID;
  v_reservation_id UUID;
BEGIN
  -- Validate villa
  SELECT tenant_id INTO v_tenant_id
  FROM villas
  WHERE id = p_villa_id AND status = 'active';

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Villa introuvable ou inactive';
  END IF;

  -- Find existing client by email (if provided)
  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id INTO v_client_id
    FROM clients
    WHERE tenant_id = v_tenant_id AND email = p_email
    LIMIT 1;
  END IF;

  -- Create client if not found
  IF v_client_id IS NULL THEN
    INSERT INTO clients (tenant_id, full_name, email, phone, preferred_lang)
    VALUES (v_tenant_id, p_full_name, NULLIF(p_email, ''), NULLIF(p_phone, ''), 'fr')
    RETURNING id INTO v_client_id;
  END IF;

  -- Create pending reservation
  INSERT INTO reservations (
    tenant_id, villa_id, client_id,
    check_in, check_out, guests,
    total_amount, currency, source, status,
    internal_note
  )
  VALUES (
    v_tenant_id, p_villa_id, v_client_id,
    p_check_in, p_check_out, p_guests,
    0, 'TND', 'direct', 'pending',
    NULLIF(p_message, '')
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_booking_request TO anon, authenticated;
