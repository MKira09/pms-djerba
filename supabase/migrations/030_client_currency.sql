-- Store the client's chosen display currency + the exchange rate at booking time
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS client_currency      text,
  ADD COLUMN IF NOT EXISTS client_currency_rate numeric;
