-- 999_fix_store_profiles_backfill.sql
-- Run this in Supabase SQL editor AFTER 001_core_tables.sql
-- Backfill store_profiles for users who signed up before the trigger was created
-- Also fixes manage_bind_machine to handle conflicts gracefully

-- ========== BACKFILL: create missing store_profiles rows ==========
INSERT INTO store_profiles (id, store_name, owner_name, phone, app_source)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'store_name', raw_user_meta_data->>'full_name', 'My Store'),
  COALESCE(raw_user_meta_data->>'owner_name', raw_user_meta_data->>'full_name', ''),
  COALESCE(raw_user_meta_data->>'phone', ''),
  COALESCE(raw_user_meta_data->>'app_source', 'web')
FROM auth.users
WHERE id NOT IN (SELECT id FROM store_profiles)
ON CONFLICT (id) DO NOTHING;

-- ========== RECREATE manage_bind_machine with proper conflict handling ==========
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
  ON CONFLICT (user_id, machine_id) DO UPDATE SET
    user_email = EXCLUDED.user_email,
    user_name = EXCLUDED.user_name,
    user_phone = EXCLUDED.user_phone,
    bound_at = now();
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== RECREATE manage_check_machine ==========
CREATE OR REPLACE FUNCTION manage_check_machine(p_user_id UUID, p_machine_id TEXT)
RETURNS JSONB AS $$
DECLARE
  machine RECORD;
BEGIN
  SELECT * INTO machine FROM user_machines
  WHERE user_id = p_user_id AND machine_id = p_machine_id;
  IF FOUND THEN
    RETURN jsonb_build_object('exists', true, 'bound_at', machine.bound_at);
  END IF;
  RETURN jsonb_build_object('exists', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== RECREATE manage_get_storage_config ==========
CREATE OR REPLACE FUNCTION manage_get_storage_config(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  config JSONB;
BEGIN
  SELECT raw_app_meta_data->'storage_config' INTO config
  FROM auth.users WHERE id = p_user_id;
  RETURN config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
