-- Migration: Add supplementary_barcodes column to products table
-- Run this in the Supabase SQL Editor

ALTER TABLE products
ADD COLUMN IF NOT EXISTS supplementary_barcodes text[] DEFAULT '{}';

-- Create a GIN index for fast array containment lookups
CREATE INDEX IF NOT EXISTS idx_products_supplementary_barcodes
ON products USING GIN (supplementary_barcodes);

-- Update RLS: the existing row-level policies already cover this column
-- since they operate on the row level, not column level.
