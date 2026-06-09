-- 001_core_tables.sql
-- Core business tables for Green Crown POS

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== STORE PROFILES ==========
CREATE TABLE IF NOT EXISTS store_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT,
  owner_name TEXT,
  phone TEXT,
  business_type TEXT,
  reports_password TEXT DEFAULT '0000',
  app_source TEXT DEFAULT 'web',
  is_active BOOLEAN DEFAULT true,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE store_profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.store_profiles (id, store_name, owner_name, phone, app_source)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'store_name',
    NEW.raw_user_meta_data->>'owner_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'app_source'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON store_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON store_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ========== USER MACHINES (device binding) ==========
CREATE TABLE IF NOT EXISTS user_machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  user_phone TEXT,
  bound_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, machine_id)
);

ALTER TABLE user_machines ENABLE ROW LEVEL SECURITY;

-- RPC: check machine binding
CREATE OR REPLACE FUNCTION manage_check_machine(p_user_id UUID, p_machine_id TEXT)
RETURNS JSONB AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM user_machines WHERE user_id = p_user_id AND machine_id = p_machine_id) THEN
    RETURN jsonb_build_object('exists', true);
  END IF;
  RETURN jsonb_build_object('exists', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: bind machine
CREATE OR REPLACE FUNCTION manage_bind_machine(
  p_user_id UUID,
  p_machine_id TEXT,
  p_user_email TEXT DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_user_phone TEXT DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  INSERT INTO user_machines (user_id, machine_id, user_email, user_name, user_phone)
  VALUES (p_user_id, p_machine_id, p_user_email, p_user_name, p_user_phone)
  ON CONFLICT (user_id, machine_id) DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get storage config (admin override)
CREATE OR REPLACE FUNCTION manage_get_storage_config(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  config JSONB;
BEGIN
  SELECT raw_app_meta_data->>'storage_config'::JSONB INTO config
  FROM auth.users WHERE id = p_user_id;
  RETURN config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== CATEGORIES ==========
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL USING (auth.uid() = store_id);

-- ========== CUSTOMERS ==========
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  credit_limit NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own customers" ON customers
  FOR ALL USING (auth.uid() = store_id);

-- ========== SUPPLIERS ==========
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own suppliers" ON suppliers
  FOR ALL USING (auth.uid() = store_id);

-- ========== PRODUCTS ==========
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  barcode TEXT,
  supplementary_barcodes TEXT[] DEFAULT '{}',
  quantity NUMERIC(12,2) DEFAULT 0,
  purchase_price NUMERIC(12,2) DEFAULT 0,
  selling_price NUMERIC(12,2) DEFAULT 0,
  min_threshold NUMERIC(12,2) DEFAULT 0,
  unit TEXT DEFAULT 'قطعة',
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own products" ON products
  FOR ALL USING (auth.uid() = store_id);

-- ========== PRODUCT UNITS (multi-unit support) ==========
CREATE TABLE IF NOT EXISTS product_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  barcode TEXT,
  unit_name TEXT NOT NULL DEFAULT 'قطعة',
  conversion_rate NUMERIC(12,4) DEFAULT 1,
  purchase_price NUMERIC(12,2),
  selling_price NUMERIC(12,2),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own product units" ON product_units
  FOR ALL USING (auth.uid() = store_id);

-- ========== BRANCHES ==========
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own branches" ON branches
  FOR ALL USING (auth.uid() = store_id);

-- ========== STAFF ==========
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin TEXT,
  role TEXT DEFAULT 'cashier',
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own staff" ON staff
  FOR ALL USING (auth.uid() = store_id);
