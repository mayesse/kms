-- Enable RLS for product_units
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;

-- 1. Select Policy: Users can view units for their store
CREATE POLICY "Users can view product_units for their store" ON product_units
  FOR SELECT USING (store_id = auth.uid());

-- 2. Insert Policy: Users can add units for their store
CREATE POLICY "Users can insert product_units for their store" ON product_units
  FOR INSERT WITH CHECK (store_id = auth.uid());

-- 3. Update Policy: Users can update units for their store
CREATE POLICY "Users can update product_units for their store" ON product_units
  FOR UPDATE USING (store_id = auth.uid());

-- 4. Delete Policy: Users can delete units for their store
CREATE POLICY "Users can delete product_units for their store" ON product_units
  FOR DELETE USING (store_id = auth.uid());
