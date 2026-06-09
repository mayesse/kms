-- 002_sales_and_transactions.sql

-- ========== SESSIONS (daily cash sessions) ==========
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  device_id TEXT,
  opening_cash NUMERIC(12,2) DEFAULT 0,
  closing_cash_expected NUMERIC(12,2),
  closing_cash_counted NUMERIC(12,2),
  cash_discrepancy NUMERIC(12,2),
  discrepancy_note TEXT,
  status TEXT DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON sessions
  FOR ALL USING (auth.uid() = store_id);

-- ========== SALES ==========
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  receipt_number TEXT,
  invoice_number TEXT,
  invoice_series TEXT,
  customer_name TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_phone TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  subtotal_ht NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  order_type TEXT DEFAULT 'counter',
  table_id UUID,
  delivery_fee NUMERIC(12,2) DEFAULT 0,
  service_charge NUMERIC(12,2) DEFAULT 0,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  tax_rate_id UUID,
  note TEXT,
  status TEXT DEFAULT 'completed',
  was_credit BOOLEAN DEFAULT false,
  credit_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sales" ON sales FOR SELECT USING (auth.uid() = store_id);
CREATE POLICY "Users can insert own sales" ON sales FOR INSERT WITH CHECK (auth.uid() = store_id);
CREATE POLICY "Users can update own sales" ON sales FOR UPDATE USING (auth.uid() = store_id);

-- ========== SALE ITEMS ==========
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID,
  service_id UUID,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_price NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  unit_name TEXT DEFAULT 'قطعة',
  conversion_rate NUMERIC(12,4) DEFAULT 1,
  batch_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sale items" ON sale_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.store_id = auth.uid())
  );

-- ========== PURCHASES ==========
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  note TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own purchases" ON purchases
  FOR ALL USING (auth.uid() = store_id);

-- ========== PURCHASE ITEMS ==========
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own purchase items" ON purchase_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM purchases WHERE purchases.id = purchase_items.purchase_id AND purchases.store_id = auth.uid())
  );

-- ========== RETURN NOTES ==========
CREATE TABLE IF NOT EXISTS return_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  original_sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  receipt_number TEXT,
  total_amount NUMERIC(12,2) DEFAULT 0,
  reason TEXT,
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE return_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own return notes" ON return_notes
  FOR ALL USING (auth.uid() = store_id);

-- ========== ACTIVITY LOG ==========
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  details TEXT,
  amount NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own activity log" ON activity_log
  FOR ALL USING (auth.uid() = store_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_store_created ON activity_log(store_id, created_at DESC);

-- ========== HOLDS ==========
CREATE TABLE IF NOT EXISTS holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  customer_name TEXT,
  note TEXT,
  total_amount NUMERIC(12,2) DEFAULT 0,
  items_snapshot JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own holds" ON holds
  FOR ALL USING (auth.uid() = store_id);

-- ========== OFFLINE SALE QUEUE ==========
CREATE TABLE IF NOT EXISTS offline_sale_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ
);

ALTER TABLE offline_sale_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own offline queue" ON offline_sale_queue
  FOR ALL USING (auth.uid() = store_id);
