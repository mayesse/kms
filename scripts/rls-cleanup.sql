-- 1. Drop ALL existing policies on these tables (clean slate)
DROP POLICY IF EXISTS "products_all" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_update" ON products;

DROP POLICY IF EXISTS "Users can view product_units for their store" ON product_units;
DROP POLICY IF EXISTS "Users can insert product_units for their store" ON product_units;
DROP POLICY IF EXISTS "Users can update product_units for their store" ON product_units;
DROP POLICY IF EXISTS "Users can delete product_units for their store" ON product_units;
DROP POLICY IF EXISTS "product_units_all" ON product_units;
DROP POLICY IF EXISTS "product_units_delete" ON product_units;
DROP POLICY IF EXISTS "product_units_insert" ON product_units;
DROP POLICY IF EXISTS "product_units_select" ON product_units;
DROP POLICY IF EXISTS "product_units_update" ON product_units;

DROP POLICY IF EXISTS "product_variants_delete" ON product_variants;
DROP POLICY IF EXISTS "product_variants_insert" ON product_variants;
DROP POLICY IF EXISTS "product_variants_select" ON product_variants;
DROP POLICY IF EXISTS "product_variants_update" ON product_variants;

-- 2. Recreate exactly ONE policy per operation per table
-- PRODUCTS
CREATE POLICY "products_select" ON products
  FOR SELECT USING (store_id = auth.uid());

CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (store_id = auth.uid());

CREATE POLICY "products_update" ON products
  FOR UPDATE USING (store_id = auth.uid());

CREATE POLICY "products_delete" ON products
  FOR DELETE USING (store_id = auth.uid());

-- PRODUCT UNITS
CREATE POLICY "product_units_select" ON product_units
  FOR SELECT USING (store_id = auth.uid());

CREATE POLICY "product_units_insert" ON product_units
  FOR INSERT WITH CHECK (store_id = auth.uid());

CREATE POLICY "product_units_update" ON product_units
  FOR UPDATE USING (store_id = auth.uid());

CREATE POLICY "product_units_delete" ON product_units
  FOR DELETE USING (store_id = auth.uid());

-- PRODUCT VARIANTS
CREATE POLICY "product_variants_select" ON product_variants
  FOR SELECT USING (store_id = auth.uid());

CREATE POLICY "product_variants_insert" ON product_variants
  FOR INSERT WITH CHECK (store_id = auth.uid());

CREATE POLICY "product_variants_update" ON product_variants
  FOR UPDATE USING (store_id = auth.uid());

CREATE POLICY "product_variants_delete" ON product_variants
  FOR DELETE USING (store_id = auth.uid());
