-- ============================================================
-- Migration 030: Combined standalone SQL files that were never
-- added to the migrations folder.
--  1) product_units table + RLS (multi_unit_migration.sql)
--  2) quantity columns → DECIMAL (decimal_quantity_migration.sql)
--  3) supplementary_barcodes on products
--  4) create_sale / void_sale functions (latest version)
-- ============================================================

-- 1. PRODUCT UNITS TABLE --------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'قطعة';
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_name TEXT DEFAULT 'قطعة';
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10,4) DEFAULT 1;

CREATE TABLE IF NOT EXISTS product_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES store_profiles(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conversion_rate DECIMAL(10,4) NOT NULL DEFAULT 1,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  barcode TEXT,
  is_default_purchase BOOLEAN DEFAULT false,
  is_default_sale BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_id, name)
);

ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "product_units_select" ON product_units
    FOR SELECT USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "product_units_insert" ON product_units
    FOR INSERT WITH CHECK (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "product_units_update" ON product_units
    FOR UPDATE USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "product_units_delete" ON product_units
    FOR DELETE USING (store_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. DECIMAL QUANTITY -----------------------------------------
ALTER TABLE sale_items DROP COLUMN IF EXISTS subtotal;
ALTER TABLE sale_items DROP COLUMN IF EXISTS profit;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS subtotal;

ALTER TABLE products ALTER COLUMN quantity TYPE DECIMAL(10,4);
ALTER TABLE sale_items ALTER COLUMN quantity TYPE DECIMAL(10,4);
ALTER TABLE purchase_items ALTER COLUMN quantity TYPE DECIMAL(10,4);

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2)
  GENERATED ALWAYS AS (quantity * unit_price) STORED;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2)
  GENERATED ALWAYS AS ((quantity * unit_price) - (quantity * COALESCE(purchase_price, 0))) STORED;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2)
  GENERATED ALWAYS AS (quantity * purchase_price) STORED;

-- 3. SUPPLEMENTARY BARCODES ------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplementary_barcodes text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_products_supplementary_barcodes
  ON products USING GIN (supplementary_barcodes);

-- 4. CREATE SALE + VOID SALE FUNCTIONS ------------------------
DROP FUNCTION IF EXISTS create_sale(UUID, UUID, TEXT, TEXT, UUID, TEXT, NUMERIC, JSONB);
DROP FUNCTION IF EXISTS create_sale(UUID, UUID, TEXT, TEXT, UUID, TEXT, DECIMAL, JSONB);

CREATE OR REPLACE FUNCTION create_sale(
  p_store_id UUID,
  p_session_id UUID,
  p_payment_method TEXT,
  p_customer_name TEXT,
  p_customer_id UUID,
  p_note TEXT,
  p_discount_amount DECIMAL,
  p_items JSONB
) RETURNS JSON AS $$
DECLARE
  v_sale_id UUID;
  v_receipt_number TEXT;
  v_total_amount DECIMAL := 0;
  v_item JSONB;
  v_cost_amount DECIMAL := 0;
BEGIN
  v_receipt_number := 'REC-' || to_char(NOW(), 'YYYYMMDD-HH24MISS');
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total_amount := v_total_amount + ((v_item->>'quantity')::DECIMAL * (v_item->>'unit_price')::DECIMAL);
    v_cost_amount := v_cost_amount + ((v_item->>'quantity')::DECIMAL * (v_item->>'purchase_price')::DECIMAL);
  END LOOP;
  v_total_amount := v_total_amount - COALESCE(p_discount_amount, 0);
  INSERT INTO sales (
    store_id, session_id, receipt_number, total_amount,
    payment_method, customer_name, customer_id, note, status
  ) VALUES (
    p_store_id, p_session_id, v_receipt_number, v_total_amount,
    p_payment_method, p_customer_name, p_customer_id, p_note, 'completed'
  ) RETURNING id INTO v_sale_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (
      sale_id, product_id, product_name, quantity,
      unit_price, purchase_price, note, unit_name, conversion_rate
    ) VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::DECIMAL,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'purchase_price')::DECIMAL,
      v_item->>'note',
      COALESCE(v_item->>'unit_name', 'قطعة'),
      COALESCE((v_item->>'conversion_rate')::DECIMAL, 1)
    );
    IF (v_item->>'product_id') IS NOT NULL THEN
      UPDATE products
      SET quantity = quantity - ((v_item->>'quantity')::DECIMAL * COALESCE((v_item->>'conversion_rate')::DECIMAL, 1))
      WHERE id = (v_item->>'product_id')::UUID;
    END IF;
  END LOOP;
  RETURN json_build_object(
    'sale_id', v_sale_id,
    'receipt_number', v_receipt_number,
    'total_amount', v_total_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS void_sale(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION void_sale(
  p_store_id UUID,
  p_sale_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
BEGIN
  UPDATE sales
  SET status = 'voided', note = COALESCE(note, '') || ' [ملغى: ' || p_reason || ']'
  WHERE id = p_sale_id AND store_id = p_store_id AND status = 'completed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found or already voided';
  END IF;
  FOR v_item IN
    SELECT product_id, quantity, conversion_rate
    FROM sale_items
    WHERE sale_id = p_sale_id AND product_id IS NOT NULL
  LOOP
    UPDATE products
    SET quantity = quantity + (v_item.quantity * COALESCE(v_item.conversion_rate, 1))
    WHERE id = v_item.product_id;
  END LOOP;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
