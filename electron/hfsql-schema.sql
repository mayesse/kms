-- ============================================================
-- HFSQL Schema for Green Crown POS
-- Run this on your HFSQL server to create all required tables
-- Compatible with HFSQL Client/Server via ODBC
-- ============================================================

-- CORE TABLES ------------------------------------------------

CREATE TABLE store_profiles (
  id              VARCHAR(36) PRIMARY KEY,
  store_name      VARCHAR(255),
  owner_name      VARCHAR(255),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  business_type   VARCHAR(100),
  fiscal_type     VARCHAR(50),
  nif             VARCHAR(50),
  nis             VARCHAR(50),
  rc              VARCHAR(50),
  article         VARCHAR(50),
  address         TEXT,
  currency        VARCHAR(10) DEFAULT 'DZD',
  locale          VARCHAR(10) DEFAULT 'ar-DZ',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  color           VARCHAR(50),
  description     TEXT,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id                    VARCHAR(36) PRIMARY KEY,
  store_id              VARCHAR(36) NOT NULL,
  name                  VARCHAR(500) NOT NULL,
  barcode               VARCHAR(255),
  category_id           VARCHAR(36),
  quantity              DECIMAL(10,4) DEFAULT 0,
  purchase_price        DECIMAL(12,2) DEFAULT 0,
  selling_price         DECIMAL(12,2) DEFAULT 0,
  min_stock_threshold   DECIMAL(10,4) DEFAULT 0,
  unit                  VARCHAR(50) DEFAULT 'قطعة',
  base_unit             VARCHAR(50) DEFAULT 'قطعة',
  is_active             SMALLINT DEFAULT 1,
  is_service            SMALLINT DEFAULT 0,
  track_batch           SMALLINT DEFAULT 0,
  track_expiry          SMALLINT DEFAULT 0,
  has_variants          SMALLINT DEFAULT 0,
  car_oem               VARCHAR(255),
  car_make              VARCHAR(255),
  car_model             VARCHAR(255),
  car_year              VARCHAR(50),
  supplementary_barcodes TEXT,
  description           TEXT,
  image_url             TEXT,
  tax_id                VARCHAR(36),
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_units (
  id                VARCHAR(36) PRIMARY KEY,
  store_id          VARCHAR(36) NOT NULL,
  product_id        VARCHAR(36) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  conversion_rate   DECIMAL(10,4) DEFAULT 1,
  purchase_price    DECIMAL(12,2) DEFAULT 0,
  selling_price     DECIMAL(12,2) DEFAULT 0,
  barcode           VARCHAR(255),
  is_default_purchase SMALLINT DEFAULT 0,
  is_default_sale   SMALLINT DEFAULT 0,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_variants (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  product_id      VARCHAR(36) NOT NULL,
  size            VARCHAR(100),
  color           VARCHAR(100),
  barcode         VARCHAR(255),
  quantity        DECIMAL(10,2) DEFAULT 0,
  purchase_price  DECIMAL(12,2),
  selling_price   DECIMAL(12,2),
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  opened_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at       TIMESTAMP,
  opening_cash    DECIMAL(12,2) DEFAULT 0,
  closing_cash    DECIMAL(12,2),
  status          VARCHAR(20) DEFAULT 'open',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  session_id      VARCHAR(36),
  receipt_number  VARCHAR(100),
  invoice_number  VARCHAR(100),
  invoice_series  VARCHAR(20),
  total_amount    DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount      DECIMAL(12,2) DEFAULT 0,
  payment_method  VARCHAR(50),
  customer_name   VARCHAR(255),
  customer_id     VARCHAR(36),
  status          VARCHAR(20) DEFAULT 'completed',
  note            TEXT,
  printed         SMALLINT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
  id              VARCHAR(36) PRIMARY KEY,
  sale_id         VARCHAR(36) NOT NULL,
  product_id      VARCHAR(36),
  product_name    VARCHAR(500),
  quantity        DECIMAL(10,4) DEFAULT 0,
  unit_price      DECIMAL(12,2) DEFAULT 0,
  purchase_price  DECIMAL(12,2) DEFAULT 0,
  unit_name       VARCHAR(50) DEFAULT 'قطعة',
  conversion_rate DECIMAL(10,4) DEFAULT 1,
  note            TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  email           VARCHAR(255),
  address         TEXT,
  credit_limit    DECIMAL(12,2) DEFAULT 0,
  notes           TEXT,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  email           VARCHAR(255),
  address         TEXT,
  contact_person  VARCHAR(255),
  notes           TEXT,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchases (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  supplier_id     VARCHAR(36),
  reference       VARCHAR(100),
  total_amount    DECIMAL(12,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'received',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_items (
  id              VARCHAR(36) PRIMARY KEY,
  purchase_id     VARCHAR(36) NOT NULL,
  product_id      VARCHAR(36),
  product_name    VARCHAR(500),
  quantity        DECIMAL(10,4) DEFAULT 0,
  purchase_price  DECIMAL(12,2) DEFAULT 0,
  selling_price   DECIMAL(12,2) DEFAULT 0,
  expiry_date     DATE,
  batch_number    VARCHAR(100),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INVENTORY & TRACKING ---------------------------------------

CREATE TABLE holds (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  customer_name   VARCHAR(255),
  customer_phone  VARCHAR(50),
  items           TEXT,
  total           DECIMAL(12,2) DEFAULT 0,
  note            TEXT,
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE batches (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  product_id      VARCHAR(36) NOT NULL,
  batch_number    VARCHAR(100) NOT NULL,
  quantity        DECIMAL(10,4) DEFAULT 0,
  purchase_price  DECIMAL(12,2),
  expiry_date     DATE,
  manufacturing_date DATE,
  supplier_id     VARCHAR(36),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tax_rates (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  rate            DECIMAL(5,2) NOT NULL,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promotions (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(50),
  value           DECIMAL(12,2) DEFAULT 0,
  start_date      TIMESTAMP,
  end_date        TIMESTAMP,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_tiers (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  markup_percent  DECIMAL(5,2) DEFAULT 0,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BRANCHES & TRANSFERS ---------------------------------------

CREATE TABLE branches (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  address         TEXT,
  phone           VARCHAR(50),
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branch_inventory (
  id              VARCHAR(36) PRIMARY KEY,
  branch_id       VARCHAR(36) NOT NULL,
  product_id      VARCHAR(36) NOT NULL,
  quantity        DECIMAL(10,4) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfers (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  from_branch_id  VARCHAR(36),
  to_branch_id    VARCHAR(36),
  reference       VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfer_items (
  id              VARCHAR(36) PRIMARY KEY,
  transfer_id     VARCHAR(36) NOT NULL,
  product_id      VARCHAR(36) NOT NULL,
  quantity        DECIMAL(10,4) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MODIFIERS (restaurant/pizza) --------------------------------

CREATE TABLE modifier_groups (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(50) DEFAULT 'single',
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modifier_items (
  id              VARCHAR(36) PRIMARY KEY,
  group_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  price           DECIMAL(12,2) DEFAULT 0,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_modifiers (
  id              VARCHAR(36) PRIMARY KEY,
  product_id      VARCHAR(36) NOT NULL,
  group_id        VARCHAR(36) NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SERVICES & STAFF -------------------------------------------

CREATE TABLE services (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  price           DECIMAL(12,2) DEFAULT 0,
  duration_min    INTEGER DEFAULT 30,
  category        VARCHAR(100),
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  email           VARCHAR(255),
  role            VARCHAR(50),
  commission_rate DECIMAL(5,2) DEFAULT 0,
  color           VARCHAR(50),
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commission_rules (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(50),
  value           DECIMAL(12,2) DEFAULT 0,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commissions (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  staff_id        VARCHAR(36),
  sale_id         VARCHAR(36),
  amount          DECIMAL(12,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_schedule (
  id              VARCHAR(36) PRIMARY KEY,
  staff_id        VARCHAR(36) NOT NULL,
  day_of_week     INTEGER,
  start_time      TIME,
  end_time        TIME,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- APPOINTMENTS & BOOKINGS ------------------------------------

CREATE TABLE appointments (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  customer_name   VARCHAR(255),
  customer_phone  VARCHAR(50),
  service_id      VARCHAR(36),
  staff_id        VARCHAR(36),
  start_time      TIMESTAMP,
  end_time        TIMESTAMP,
  status          VARCHAR(20) DEFAULT 'scheduled',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLES (floor management) ----------------------------------

CREATE TABLE tables (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  name            VARCHAR(100) NOT NULL,
  capacity        INTEGER DEFAULT 2,
  section         VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'free',
  x_pos           DECIMAL(10,2) DEFAULT 0,
  y_pos           DECIMAL(10,2) DEFAULT 0,
  shape           VARCHAR(20) DEFAULT 'circle',
  occupied_at     TIMESTAMP,
  merged_with     TEXT,
  is_active       SMALLINT DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DELIVERY ---------------------------------------------------

CREATE TABLE delivery_addresses (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  customer_id     VARCHAR(36),
  label           VARCHAR(255),
  address         TEXT,
  latitude        DECIMAL(10,6),
  longitude       DECIMAL(10,6),
  is_default      SMALLINT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEVICES ----------------------------------------------------

CREATE TABLE device_configs (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  device_id       VARCHAR(255),
  config          TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device_module_settings (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  module_key      VARCHAR(100),
  settings        TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FINANCE & INVOICING ----------------------------------------

CREATE TABLE invoice_sequences (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  year            INTEGER NOT NULL,
  last_number     INTEGER DEFAULT 0,
  series          VARCHAR(20) DEFAULT 'FAC',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE return_notes (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  sale_id         VARCHAR(36),
  reason          TEXT,
  total_amount    DECIMAL(12,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'completed',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRIALS -----------------------------------------------------

CREATE TABLE trials (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at      TIMESTAMP,
  status          VARCHAR(20) DEFAULT 'active',
  products_limit  INTEGER DEFAULT 50,
  sales_limit     INTEGER DEFAULT 50,
  suppliers_limit INTEGER DEFAULT 2,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ACTIVITY LOG -----------------------------------------------

CREATE TABLE activity_log (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  user_id         VARCHAR(36),
  action          VARCHAR(100),
  entity_type     VARCHAR(100),
  entity_id       VARCHAR(36),
  details         TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE offline_sale_queue (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  sale_data       TEXT,
  synced          SMALLINT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VERTICAL-SPECIFIC ------------------------------------------

CREATE TABLE repair_jobs (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  customer_name   VARCHAR(255),
  customer_phone  VARCHAR(50),
  device_type     VARCHAR(255),
  serial_number   VARCHAR(255),
  issue           TEXT,
  status          VARCHAR(20) DEFAULT 'pending',
  technician      VARCHAR(255),
  cost_estimate   DECIMAL(12,2),
  total_cost      DECIMAL(12,2),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repair_job_items (
  id              VARCHAR(36) PRIMARY KEY,
  job_id          VARCHAR(36) NOT NULL,
  product_id      VARCHAR(36),
  product_name    VARCHAR(500),
  quantity        DECIMAL(10,4) DEFAULT 0,
  unit_price      DECIMAL(12,2) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE business_type_change_requests (
  id              VARCHAR(36) PRIMARY KEY,
  store_id        VARCHAR(36) NOT NULL,
  current_type    VARCHAR(100),
  requested_type  VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES ----------------------------------------------------
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_product_units_store ON product_units(store_id);
CREATE INDEX idx_product_units_product ON product_units(product_id);
CREATE INDEX idx_product_variants_store ON product_variants(store_id);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode);
CREATE INDEX idx_sessions_store ON sessions(store_id);
CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_session ON sales(session_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_suppliers_store ON suppliers(store_id);
CREATE INDEX idx_purchases_store ON purchases(store_id);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_holds_store ON holds(store_id);
CREATE INDEX idx_batches_store ON batches(store_id);
CREATE INDEX idx_batches_product ON batches(product_id);
CREATE INDEX idx_trials_store ON trials(store_id);
CREATE INDEX idx_invoice_sequences_store ON invoice_sequences(store_id);
CREATE INDEX idx_activity_log_store ON activity_log(store_id);
CREATE INDEX idx_tax_rates_store ON tax_rates(store_id);
CREATE INDEX idx_promotions_store ON promotions(store_id);
CREATE INDEX idx_staff_store ON staff(store_id);
CREATE INDEX idx_services_store ON services(store_id);
CREATE INDEX idx_tables_store ON tables(store_id);
CREATE INDEX idx_appointments_store ON appointments(store_id);
CREATE INDEX idx_branches_store ON branches(store_id);
CREATE INDEX idx_stock_transfers_store ON stock_transfers(store_id);
