-- Phase 6: Polished Tables UI
-- Adds occupied_at timestamp + merged_with support

ALTER TABLE tables
ADD COLUMN IF NOT EXISTS occupied_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS merged_with UUID REFERENCES tables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS x_pos INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS y_pos INT DEFAULT 0;

-- (fallback data migration skipped — status column may not exist yet)
