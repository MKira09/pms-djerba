-- Cron job quotidien à 8h00 UTC pour envoyer les rappels d'arrivée (J-3 et J-1)
--
-- Prérequis : extensions pg_cron et pg_net activées dans Supabase
-- (Supabase les active par défaut sur tous les projets hébergés)
--
-- ⚠ Remplace YOUR_PROJECT_REF par ton identifiant de projet (visible dans Settings > General)
-- ⚠ Remplace YOUR_ANON_KEY par ta clé publique (visible dans Settings > API)
-- La clé anon est publique, il n'y a pas de risque à la noter ici.
--
-- Pour l'exécuter : copie ce bloc dans le SQL Editor de Supabase après avoir rempli les valeurs.

SELECT cron.schedule(
  'send-daily-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
