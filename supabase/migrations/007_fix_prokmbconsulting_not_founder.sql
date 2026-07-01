-- =========================================================
-- Fix: prokmbconsulting@gmail.com is the software creator,
--      not a founding member client — remove the flag.
-- =========================================================

UPDATE tenants
SET founding_member = false
WHERE id = (
  SELECT p.tenant_id
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(trim(u.email)) = 'prokmbconsulting@gmail.com'
  LIMIT 1
);
