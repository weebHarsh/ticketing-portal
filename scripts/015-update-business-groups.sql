-- Migration: Add New Business Unit Groups
-- This script ADDS new business groups without removing or modifying existing ones

-- Add new TD business groups (will not affect existing groups or data)
INSERT INTO business_unit_groups (name, description)
VALUES
  ('TD Support', ''),
  ('TD DevOps', ''),
  ('TD Integration', ''),
  ('TD GUI', ''),
  ('TD Central', ''),
  ('Product', '')
ON CONFLICT (name) DO NOTHING;

-- Verify all groups (existing + new)
SELECT id, name, description FROM business_unit_groups ORDER BY name;
