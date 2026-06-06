-- 1. Drop generated columns that depend on quantity
ALTER TABLE sale_items DROP COLUMN IF EXISTS subtotal;
ALTER TABLE sale_items DROP COLUMN IF EXISTS profit;
ALTER TABLE purchase_items DROP COLUMN IF EXISTS subtotal;

-- 2. Change quantity columns to DECIMAL to support fractional quantities like 0.5
ALTER TABLE products ALTER COLUMN quantity TYPE DECIMAL(10,4);
ALTER TABLE sale_items ALTER COLUMN quantity TYPE DECIMAL(10,4);
ALTER TABLE purchase_items ALTER COLUMN quantity TYPE DECIMAL(10,4);

-- 3. Re-add the generated columns
ALTER TABLE sale_items ADD COLUMN subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED;
ALTER TABLE sale_items ADD COLUMN profit DECIMAL(10,2) GENERATED ALWAYS AS ((quantity * unit_price) - (quantity * COALESCE(purchase_price, 0))) STORED;
ALTER TABLE purchase_items ADD COLUMN subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantity * purchase_price) STORED;

-- 4. Update create_sale function to parse quantity as DECIMAL instead of INT
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

    -- Update inventory
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
