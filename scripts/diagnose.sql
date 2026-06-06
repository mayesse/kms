-- Run this to find what's missing
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_type='BASE TABLE'
ORDER BY table_name;

-- Check products RLS
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename='products';

-- Check policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('products','product_units','product_variants')
ORDER BY tablename, policyname;
