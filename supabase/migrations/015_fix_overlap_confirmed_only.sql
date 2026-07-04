-- Migration 015 : La contrainte no_overlap ne doit porter que sur les
-- réservations confirmées. Les demandes "pending" peuvent coexister sur
-- les mêmes dates — c'est le propriétaire qui choisit laquelle confirmer.

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS no_overlap;

ALTER TABLE reservations ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    villa_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  ) WHERE (status = 'confirmed');
