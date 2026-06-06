-- ============================================================
-- Run this entire script in Supabase SQL Editor
-- Combines migrations 027→032 that were never applied
-- ============================================================

-- 027: Fiscal fields + return notes --------------------------
ALTER TABLE store_profiles
  ADD COLUMN IF NOT EXISTS nif TEXT,
  ADD COLUMN IF NOT EXISTS nis TEXT,
  ADD COLUMN IF NOT EXISTS rc TEXT,
  ADD COLUMN IF NOT EXISTS article TEXT,
  ADD COLUMN IF NOT EXISTS invoice_series TEXT DEFAULT 'A';

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_series TEXT DEFAULT 'A';

CREATE TABLE IF NOT EXISTS return_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  original_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  receipt_number TEXT NOT NULL,
  total_amount DECIMAL NOT NULL DEFAULT 0,
  reason TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE return_notes ENABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS idx_return_notes_store;
CREATE INDEX IF NOT EXISTS idx_return_notes_store ON return_notes(store_id);

-- 028: Tables UI columns -------------------------------------
ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS occupied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS merged_with UUID REFERENCES tables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS x_pos INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS y_pos INT DEFAULT 0;

-- 029: Trials, product_variants, RLS -------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT, color TEXT, barcode TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(12,2), selling_price DECIMAL(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_product_variants_store ON product_variants(store_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON product_variants(barcode);

CREATE TABLE IF NOT EXISTS trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '3 days'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  products_limit INTEGER NOT NULL DEFAULT 50,
  sales_limit INTEGER NOT NULL DEFAULT 50,
  suppliers_limit INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE trials ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_trials_store ON trials(store_id);

DROP FUNCTION IF EXISTS create_trial(UUID) CASCADE;
CREATE OR REPLACE FUNCTION create_trial(p_store_id UUID)
RETURNS SETOF trials LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY INSERT INTO trials (store_id, expires_at)
  VALUES (p_store_id, now() + INTERVAL '3 days')
  ON CONFLICT (store_id) DO UPDATE SET
    status = 'active', expires_at = now() + INTERVAL '3 days', updated_at = now()
  RETURNING *;
END;
$$;

DROP FUNCTION IF EXISTS get_trial_info(UUID) CASCADE;
CREATE OR REPLACE FUNCTION get_trial_info(p_store_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE t trials%ROWTYPE; p_count INTEGER; s_count INTEGER; sup_count INTEGER;
BEGIN
  SELECT * INTO t FROM trials WHERE store_id = p_store_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('hasTrial', false); END IF;
  SELECT count(*) INTO p_count FROM products WHERE store_id = p_store_id;
  SELECT count(*) INTO s_count FROM sales WHERE store_id = p_store_id;
  SELECT count(*) INTO sup_count FROM suppliers WHERE store_id = p_store_id;
  RETURN jsonb_build_object('hasTrial',true,'startedAt',t.started_at,'expiresAt',t.expires_at,
    'remainingDays',GREATEST(0,floor(extract(epoch from(t.expires_at-now()))/86400))::int,
    'isExpired',now()>t.expires_at,
    'usage',jsonb_build_object('products',p_count,'sales',s_count,'suppliers',sup_count),
    'limits',jsonb_build_object('products',t.products_limit,'sales',t.sales_limit,'suppliers',t.suppliers_limit));
END;
$$;

-- 030: product_units, decimal quantities, barcodes, sale functions
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'قطعة';
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_name TEXT DEFAULT 'قطعة';
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10,4) DEFAULT 1;

CREATE TABLE IF NOT EXISTS product_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES store_profiles(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, conversion_rate DECIMAL(10,4) NOT NULL DEFAULT 1,
  purchase_price DECIMAL(10,2) NOT NULL, selling_price DECIMAL(10,2) NOT NULL,
  barcode TEXT, is_default_purchase BOOLEAN DEFAULT false, is_default_sale BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_id, name)
);
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;

ALTER TABLE sale_items DROP COLUMN IF EXISTS subtotal;
ALTER TABLE sale_items DROP COLUMN IF EXISTS profit;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS subtotal;
ALTER TABLE products ALTER COLUMN quantity TYPE DECIMAL(10,4);
ALTER TABLE sale_items ALTER COLUMN quantity TYPE DECIMAL(10,4);
ALTER TABLE purchase_items ALTER COLUMN quantity TYPE DECIMAL(10,4);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2) GENERATED ALWAYS AS ((quantity * unit_price) - (quantity * COALESCE(purchase_price, 0))) STORED;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * purchase_price) STORED;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplementary_barcodes text[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_products_supplementary_barcodes ON products USING GIN (supplementary_barcodes);

DROP FUNCTION IF EXISTS create_sale(UUID, UUID, TEXT, TEXT, UUID, TEXT, NUMERIC, JSONB);
DROP FUNCTION IF EXISTS create_sale(UUID, UUID, TEXT, TEXT, UUID, TEXT, DECIMAL, JSONB);
CREATE OR REPLACE FUNCTION create_sale(
  p_store_id UUID, p_session_id UUID, p_payment_method TEXT,
  p_customer_name TEXT, p_customer_id UUID, p_note TEXT,
  p_discount_amount DECIMAL, p_items JSONB
) RETURNS JSON AS $$
DECLARE v_sale_id UUID; v_receipt_number TEXT;
  v_total_amount DECIMAL := 0; v_item JSONB; v_cost_amount DECIMAL := 0;
BEGIN
  v_receipt_number := 'REC-' || to_char(NOW(), 'YYYYMMDD-HH24MISS');
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total_amount := v_total_amount + ((v_item->>'quantity')::DECIMAL * (v_item->>'unit_price')::DECIMAL);
    v_cost_amount := v_cost_amount + ((v_item->>'quantity')::DECIMAL * (v_item->>'purchase_price')::DECIMAL);
  END LOOP;
  v_total_amount := v_total_amount - COALESCE(p_discount_amount, 0);
  INSERT INTO sales (store_id, session_id, receipt_number, total_amount, payment_method, customer_name, customer_id, note, status)
  VALUES (p_store_id, p_session_id, v_receipt_number, v_total_amount, p_payment_method, p_customer_name, p_customer_id, p_note, 'completed')
  RETURNING id INTO v_sale_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, purchase_price, note, unit_name, conversion_rate)
    VALUES (v_sale_id, (v_item->>'product_id')::UUID, v_item->>'product_name', (v_item->>'quantity')::DECIMAL,
      (v_item->>'unit_price')::DECIMAL, (v_item->>'purchase_price')::DECIMAL, v_item->>'note',
      COALESCE(v_item->>'unit_name', 'قطعة'), COALESCE((v_item->>'conversion_rate')::DECIMAL, 1));
    IF (v_item->>'product_id') IS NOT NULL THEN
      UPDATE products SET quantity = quantity - ((v_item->>'quantity')::DECIMAL * COALESCE((v_item->>'conversion_rate')::DECIMAL, 1))
      WHERE id = (v_item->>'product_id')::UUID;
    END IF;
  END LOOP;
  RETURN json_build_object('sale_id', v_sale_id, 'receipt_number', v_receipt_number, 'total_amount', v_total_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS void_sale(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION void_sale(p_store_id UUID, p_sale_id UUID, p_reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE v_item RECORD;
BEGIN
  UPDATE sales SET status = 'voided', note = COALESCE(note, '') || ' [ملغى: ' || p_reason || ']'
  WHERE id = p_sale_id AND store_id = p_store_id AND status = 'completed';
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found or already voided'; END IF;
  FOR v_item IN SELECT product_id, quantity, conversion_rate FROM sale_items WHERE sale_id = p_sale_id AND product_id IS NOT NULL LOOP
    UPDATE products SET quantity = quantity + (v_item.quantity * COALESCE(v_item.conversion_rate, 1)) WHERE id = v_item.product_id;
  END LOOP;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 031: Subscriptions table ------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'professional' CHECK (plan_type IN ('basic','professional','premium','enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','pending')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ,
  amount_paid DECIMAL(10,2) DEFAULT 0, payment_method TEXT, payment_ref TEXT,
  is_lifetime BOOLEAN DEFAULT false, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_subscriptions_store ON subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 032: Contact messages ---------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  message TEXT NOT NULL, is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can insert contact messages" ON contact_messages FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service role can read contact messages" ON contact_messages FOR SELECT TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service role can update contact messages" ON contact_messages FOR UPDATE TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
