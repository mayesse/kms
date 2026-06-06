-- Phase 5: Professional Invoicing
-- Part 1: Algerian fiscal fields + invoice sequences + return notes

-- ──────────────────────────────────────────────
-- 1. Fiscal fields on store_profiles
-- ──────────────────────────────────────────────
ALTER TABLE store_profiles
ADD COLUMN IF NOT EXISTS nif TEXT,
ADD COLUMN IF NOT EXISTS nis TEXT,
ADD COLUMN IF NOT EXISTS rc TEXT,
ADD COLUMN IF NOT EXISTS article TEXT,
ADD COLUMN IF NOT EXISTS invoice_series TEXT DEFAULT 'A';

-- ──────────────────────────────────────────────
-- 2. Invoice number columns on sales
-- ──────────────────────────────────────────────
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS invoice_series TEXT DEFAULT 'A';

-- ──────────────────────────────────────────────
-- 3. Invoice sequence tracking (per store / series / year)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  series TEXT NOT NULL DEFAULT 'A',
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  last_number INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, series, year)
);

ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own invoice sequences"
  ON invoice_sequences FOR ALL
  USING (store_id = auth.uid());

-- ──────────────────────────────────────────────
-- 4. Return notes table (credit notes / returns)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS return_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  original_sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  total_amount DECIMAL NOT NULL DEFAULT 0,
  reason TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE return_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own return notes"
  ON return_notes FOR ALL
  USING (store_id = auth.uid());

-- ──────────────────────────────────────────────
-- 5. RPC: Get next invoice number atomically
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_store_id UUID, p_series TEXT DEFAULT 'A')
RETURNS TEXT AS $$
DECLARE
  current_year INT;
  next_num INT;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW());

  INSERT INTO invoice_sequences (store_id, series, year, last_number)
  VALUES (p_store_id, p_series, current_year, 0)
  ON CONFLICT (store_id, series, year) DO NOTHING;

  UPDATE invoice_sequences
  SET last_number = last_number + 1, updated_at = NOW()
  WHERE store_id = p_store_id AND series = p_series AND year = current_year
  RETURNING last_number INTO next_num;

  RETURN 'FAC-' || current_year::TEXT || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────
-- 6. RPC: Create return note + restore inventory
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_return_note(
  p_store_id UUID,
  p_original_sale_id UUID,
  p_items JSONB,
  p_reason TEXT DEFAULT NULL,
  p_restore_inventory BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  v_return_note_id UUID;
  v_receipt_number TEXT;
  v_total_amount DECIMAL := 0;
  v_item JSONB;
  v_qty DECIMAL;
  v_product_id UUID;
BEGIN
  v_receipt_number := 'NC-' || to_char(NOW(), 'YYYYMMDD-HH24MISS');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'quantity')::DECIMAL;

    v_total_amount := v_total_amount + ((v_item->>'unit_price')::DECIMAL * v_qty);

    IF p_restore_inventory AND v_product_id IS NOT NULL THEN
      UPDATE products
      SET quantity = quantity + v_qty
      WHERE id = v_product_id AND store_id = p_store_id;
    END IF;
  END LOOP;

  INSERT INTO return_notes (store_id, original_sale_id, receipt_number, total_amount, reason, items)
  VALUES (p_store_id, p_original_sale_id, v_receipt_number, v_total_amount, p_reason, p_items)
  RETURNING id INTO v_return_note_id;

  RETURN jsonb_build_object(
    'id', v_return_note_id,
    'receipt_number', v_receipt_number,
    'total_amount', v_total_amount
  );
END;
$$ LANGUAGE plpgsql;
