-- Migration 038: lock down public (anon) table access on tenants / villas /
-- reservations, replace it with scoped SECURITY DEFINER functions.
--
-- Why: "public_view_active_villas" (status = 'active') and
-- "public_view_tenant_by_slug" (slug IS NOT NULL) let anyone list EVERY
-- agency's active villas / every agency with a slug in one unfiltered
-- request — not just the one agency whose link they were given. Same
-- issue for "public_reservation_availability", which also returned full
-- reservation rows (client_id, total_amount) instead of just blocked
-- dates. Each function below requires the caller to already know the
-- specific slug / villa id, so a request that doesn't name one can't
-- enumerate the others.

drop policy if exists "public_view_active_villas" on public.villas;
drop policy if exists "public_reservation_availability" on public.reservations;
drop policy if exists "public_view_tenant_by_slug" on public.tenants;

-- Drop first: earlier ad-hoc versions of these had different return
-- shapes, and CREATE OR REPLACE can't change a function's OUT columns.
drop function if exists public.get_tenant_by_slug(text);
drop function if exists public.get_public_villas(text);
drop function if exists public.get_villa_availability(uuid);

-- One tenant's public info, by slug — CataloguePage header
create or replace function public.get_tenant_by_slug(p_slug text)
returns table (id uuid, name text, logo_url text, slogan text, currency text,
  slug text, brand_color_primary text, brand_color_secondary text, brand_font text)
language sql security definer set search_path = public stable
as $$
  select t.id, t.name, t.logo_url, t.slogan, t.currency, t.slug,
         t.brand_color_primary, t.brand_color_secondary, t.brand_font
  from public.tenants t
  where t.slug = p_slug
  limit 1;
$$;
grant execute on function public.get_tenant_by_slug(text) to anon;

-- All active villas of one tenant, by slug — CataloguePage grid
create or replace function public.get_public_villas(p_slug text)
returns table (id uuid, name text, description text, city text,
  capacity int, bedrooms int, bathrooms int, base_price numeric,
  amenities jsonb, photos jsonb, status text)
language sql security definer set search_path = public stable
as $$
  select v.id, v.name, v.description, v.city, v.capacity, v.bedrooms,
         v.bathrooms, v.base_price, v.amenities, v.photos, v.status
  from public.villas v
  join public.tenants t on t.id = v.tenant_id
  where t.slug = p_slug and v.status = 'active'
  order by v.name;
$$;
grant execute on function public.get_public_villas(text) to anon;

-- Villas of one tenant blocked over a date range — CataloguePage date filter
-- (confirmed + pending, matching the page's original query)
create or replace function public.get_tenant_availability(
  p_slug text, p_check_in date, p_check_out date
)
returns table (villa_id uuid)
language sql security definer set search_path = public stable
as $$
  select distinct r.villa_id
  from public.reservations r
  join public.villas v on v.id = r.villa_id
  join public.tenants t on t.id = v.tenant_id
  where t.slug = p_slug
    and r.status in ('confirmed', 'pending')
    and r.check_in < p_check_out
    and r.check_out > p_check_in;
$$;
grant execute on function public.get_tenant_availability(text, date, date) to anon;

-- One villa's public booking-page info, by id or its own slug — VillaBookingPage.
-- This is the per-villa share link (WhatsApp etc.), independent of the tenant
-- having a catalogue slug, so it does NOT require tenants.slug to be set.
create or replace function public.get_public_villa(p_id_or_slug text)
returns table (id uuid, name text, description text, city text,
  capacity int, bedrooms int, bathrooms int, base_price numeric,
  photos jsonb, tenant_id uuid, tenant_currency text,
  tenant_brand_color_primary text, tenant_brand_color_secondary text,
  tenant_brand_font text)
language sql security definer set search_path = public stable
as $$
  select v.id, v.name, v.description, v.city, v.capacity, v.bedrooms,
         v.bathrooms, v.base_price, v.photos, v.tenant_id,
         t.currency, t.brand_color_primary, t.brand_color_secondary, t.brand_font
  from public.villas v
  join public.tenants t on t.id = v.tenant_id
  where v.status = 'active'
    and (v.id::text = p_id_or_slug or v.slug = p_id_or_slug)
  limit 1;
$$;
grant execute on function public.get_public_villa(text) to anon;

-- One villa's blocked dates — VillaBookingPage calendar (confirmed only,
-- matching the page's original query and migration 015's no_overlap rule)
create or replace function public.get_villa_availability(p_villa_id uuid)
returns table (check_in date, check_out date)
language sql security definer set search_path = public stable
as $$
  select r.check_in, r.check_out
  from public.reservations r
  where r.villa_id = p_villa_id
    and r.status = 'confirmed';
$$;
grant execute on function public.get_villa_availability(uuid) to anon;

-- Drop the old 8-arg overload so we don't end up with two versions
DROP FUNCTION IF EXISTS create_booking_request(UUID, TEXT, TEXT, TEXT, DATE, DATE, INT, TEXT);

-- Extend create_booking_request to accept the client's display currency
-- directly, so the anon follow-up UPDATE on reservations (blocked now that
-- reservations has no public write/update policy) is no longer needed.
CREATE OR REPLACE FUNCTION create_booking_request(
  p_villa_id  UUID,
  p_full_name TEXT,
  p_email     TEXT,
  p_phone     TEXT,
  p_check_in  DATE,
  p_check_out DATE,
  p_guests    INT,
  p_message   TEXT,
  p_client_currency      TEXT DEFAULT NULL,
  p_client_currency_rate NUMERIC DEFAULT NULL
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
  SELECT tenant_id INTO v_tenant_id
  FROM villas
  WHERE id = p_villa_id AND status = 'active';

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Villa introuvable ou inactive';
  END IF;

  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id INTO v_client_id
    FROM clients
    WHERE tenant_id = v_tenant_id AND email = p_email
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (tenant_id, full_name, email, phone, preferred_lang)
    VALUES (v_tenant_id, p_full_name, NULLIF(p_email, ''), NULLIF(p_phone, ''), 'fr')
    RETURNING id INTO v_client_id;
  END IF;

  INSERT INTO reservations (
    tenant_id, villa_id, client_id,
    check_in, check_out, guests,
    total_amount, currency, source, status,
    internal_note, client_currency, client_currency_rate
  )
  VALUES (
    v_tenant_id, p_villa_id, v_client_id,
    p_check_in, p_check_out, p_guests,
    0, 'TND', 'direct', 'pending',
    NULLIF(p_message, ''), p_client_currency, p_client_currency_rate
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_booking_request(
  UUID, TEXT, TEXT, TEXT, DATE, DATE, INT, TEXT, TEXT, NUMERIC
) TO anon, authenticated;
