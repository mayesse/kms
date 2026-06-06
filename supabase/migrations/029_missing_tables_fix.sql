-- ============================================================
-- Migration 029: Missing tables & fixes
--  1) product_variants table (referenced everywhere, missing from prod)
--  2) trials table + RPC functions
--  3) RLS policies for products and product_variants
-- ============================================================

-- 1. PRODUCT VARIANTS -----------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        TEXT,
  color       TEXT,
  barcode     TEXT,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(12,2),
  selling_price  DECIMAL(12,2),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "product_variants_select" ON product_variants
    FOR SELECT USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "product_variants_insert" ON product_variants
    FOR INSERT WITH CHECK (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "product_variants_update" ON product_variants
    FOR UPDATE USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "product_variants_delete" ON product_variants
    FOR DELETE USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_variants_store ON product_variants(store_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON product_variants(barcode);

-- 2. RLS ON PRODUCTS (in case not already set) ----------------
DO $$ BEGIN
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "products_select" ON products
    FOR SELECT USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "products_insert" ON products
    FOR INSERT WITH CHECK (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "products_update" ON products
    FOR UPDATE USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "products_delete" ON products
    FOR DELETE USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. TRIALS TABLE ---------------------------------------------
CREATE TABLE IF NOT EXISTS trials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE UNIQUE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '3 days'),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  products_limit  INTEGER NOT NULL DEFAULT 50,
  sales_limit     INTEGER NOT NULL DEFAULT 50,
  suppliers_limit INTEGER NOT NULL DEFAULT 2,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trials ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "trials_select" ON trials
    FOR SELECT USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "trials_insert" ON trials
    FOR INSERT WITH CHECK (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "trials_update" ON trials
    FOR UPDATE USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_trials_store ON trials(store_id);

-- 4. RPC: create_trial ----------------------------------------
DROP FUNCTION IF EXISTS create_trial(UUID) CASCADE;
CREATE OR REPLACE FUNCTION create_trial(p_store_id UUID)
RETURNS SETOF trials
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO trials (store_id, expires_at)
  VALUES (p_store_id, now() + INTERVAL '3 days')
  ON CONFLICT (store_id) DO UPDATE SET
    status       = 'active',
    expires_at   = now() + INTERVAL '3 days',
    updated_at   = now()
  RETURNING *;
END;
$$;

-- 5. RPC: get_trial_info --------------------------------------
DROP FUNCTION IF EXISTS get_trial_info(UUID) CASCADE;
CREATE OR REPLACE FUNCTION get_trial_info(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  t trials%ROWTYPE;
  p_count INTEGER;
  s_count INTEGER;
  sup_count INTEGER;
BEGIN
  SELECT * INTO t FROM trials WHERE store_id = p_store_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('hasTrial', false);
  END IF;
  SELECT count(*) INTO p_count FROM products WHERE store_id = p_store_id;
  SELECT count(*) INTO s_count FROM sales WHERE store_id = p_store_id;
  SELECT count(*) INTO sup_count FROM suppliers WHERE store_id = p_store_id;
  RETURN jsonb_build_object(
    'hasTrial',      true,
    'startedAt',     t.started_at,
    'expiresAt',     t.expires_at,
    'remainingDays', GREATEST(0, floor(extract(epoch from (t.expires_at - now())) / 86400))::int,
    'isExpired',     now() > t.expires_at,
    'usage', jsonb_build_object('products', p_count, 'sales', s_count, 'suppliers', sup_count),
    'limits', jsonb_build_object('products', t.products_limit, 'sales', t.sales_limit, 'suppliers', t.suppliers_limit)
  );
END;
$$;
