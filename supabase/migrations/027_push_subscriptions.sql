-- Push notification subscriptions per user/device
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  endpoint   text NOT NULL,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL TO authenticated
  USING  (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
