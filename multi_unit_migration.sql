-- 1. Add base_unit to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'قطعة';

-- 2. Add unit tracking to sale_items
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_name TEXT DEFAULT 'قطعة';
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10,4) DEFAULT 1;

-- 3. Create product_units table
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

-- 4. Replace create_sale function to handle conversion_rate for inventory deduction
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
  p_items JSONB -- [{product_id, product_name, quantity, unit_price, purchase_price, note, unit_name, conversion_rate}]
) RETURNS JSON AS $$
DECLARE
  v_sale_id UUID;
  v_receipt_number TEXT;
  v_total_amount DECIMAL := 0;
  v_item JSONB;
  v_cost_amount DECIMAL := 0;
BEGIN
  -- Generate receipt number
  v_receipt_number := 'REC-' || to_char(NOW(), 'YYYYMMDD-HH24MISS');

  -- Calculate totals
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total_amount := v_total_amount + ((v_item->>'quantity')::DECIMAL * (v_item->>'unit_price')::DECIMAL);
    v_cost_amount := v_cost_amount + ((v_item->>'quantity')::DECIMAL * (v_item->>'purchase_price')::DECIMAL);
  END LOOP;

  -- Apply discount
  v_total_amount := v_total_amount - COALESCE(p_discount_amount, 0);

  -- Insert sale
  INSERT INTO sales (
    store_id, session_id, receipt_number, total_amount, 
    payment_method, customer_name, customer_id, note, status
  ) VALUES (
    p_store_id, p_session_id, v_receipt_number, v_total_amount, 
    p_payment_method, p_customer_name, p_customer_id, p_note, 'completed'
  ) RETURNING id INTO v_sale_id;

  -- Insert items and update inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert sale item
    INSERT INTO sale_items (
      sale_id, product_id, product_name, quantity, 
      unit_price, purchase_price, note, unit_name, conversion_rate, profit
    ) VALUES (
      v_sale_id, 
      (v_item->>'product_id')::UUID, 
      v_item->>'product_name', 
      (v_item->>'quantity')::INT, 
      (v_item->>'unit_price')::DECIMAL, 
      (v_item->>'purchase_price')::DECIMAL, 
      v_item->>'note',
      COALESCE(v_item->>'unit_name', 'قطعة'),
      COALESCE((v_item->>'conversion_rate')::DECIMAL, 1),
      ((v_item->>'quantity')::DECIMAL * (v_item->>'unit_price')::DECIMAL) - ((v_item->>'quantity')::DECIMAL * (v_item->>'purchase_price')::DECIMAL)
    );

    -- Update inventory using BASE QUANTITY (quantity * conversion_rate)
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

-- 5. Replace void_sale to restore using conversion_rate
DROP FUNCTION IF EXISTS void_sale(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION void_sale(
  p_store_id UUID,
  p_sale_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Mark sale as voided
  UPDATE sales 
  SET status = 'voided', note = COALESCE(note, '') || ' [ملغى: ' || p_reason || ']'
  WHERE id = p_sale_id AND store_id = p_store_id AND status = 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found or already voided';
  END IF;

  -- Restore inventory
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
