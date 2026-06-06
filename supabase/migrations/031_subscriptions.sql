-- ============================================================
-- Migration 031: Subscriptions table
-- Tracks paid subscription plans per store (lifetime & recurring)
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE UNIQUE,
  plan_type       TEXT NOT NULL DEFAULT 'professional' CHECK (plan_type IN ('basic', 'professional', 'premium', 'enterprise')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  amount_paid     DECIMAL(10,2) DEFAULT 0,
  payment_method  TEXT,
  payment_ref     TEXT,
  is_lifetime     BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "subscriptions_select_admin" ON subscriptions
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "subscriptions_insert_admin" ON subscriptions
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "subscriptions_update_admin" ON subscriptions
    FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_store ON subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
