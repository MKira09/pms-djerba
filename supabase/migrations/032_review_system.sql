-- Lien pour recevoir des avis (Google, TripAdvisor, Instagram…)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS review_link text;

-- Evite d'envoyer deux fois l'email avis J+1
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS review_sent boolean DEFAULT false;
