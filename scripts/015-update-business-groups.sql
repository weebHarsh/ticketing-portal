-- Migration: Update Business Unit Groups
-- This script replaces existing business groups with the new structure

-- Step 1: Create a mapping table for migrating existing tickets
CREATE TEMP TABLE IF NOT EXISTS bu_migration_map (
  old_name VARCHAR(255),
  new_name VARCHAR(255)
);

-- Map old groups to new groups (adjust as needed)
INSERT INTO bu_migration_map (old_name, new_name) VALUES
  ('Sales', 'TD Support'),
  ('CS Apps', 'TD Support'),
  ('CS Web', 'TD GUI'),
  ('CS Brand', 'TD Central'),
  ('CS BM', 'TD Central'),
  ('TD North', 'TD DevOps'),
  ('TD South', 'TD Integration'),
  ('TD Others', 'TD Central'),
  ('TD Other', 'TD Central');

-- Step 2: Store the new business groups
CREATE TEMP TABLE new_business_groups (
  name VARCHAR(255) NOT NULL,
  description TEXT
);

INSERT INTO new_business_groups (name, description) VALUES
  ('TD Support', 'Tech Delivery Support Team - Handles support tickets and issues'),
  ('TD DevOps', 'Tech Delivery DevOps Team - Manages infrastructure and deployments'),
  ('TD Integration', 'Tech Delivery Integration Team - Handles integrations and APIs'),
  ('TD GUI', 'Tech Delivery GUI Team - Frontend and user interface development'),
  ('TD Central', 'Tech Delivery Central Team - Core services and coordination'),
  ('Product', 'Product Team - Product management and requirements');

-- Step 3: Insert new business groups (they may already exist)
INSERT INTO business_unit_groups (name, description)
SELECT name, description FROM new_business_groups
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Step 4: Update tickets to use new business groups
UPDATE tickets t
SET business_unit_group_id = (
  SELECT nbg.id
  FROM business_unit_groups nbg
  JOIN bu_migration_map bm ON nbg.name = bm.new_name
  JOIN business_unit_groups obg ON obg.name = bm.old_name
  WHERE obg.id = t.business_unit_group_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM business_unit_groups obg
  JOIN bu_migration_map bm ON obg.name = bm.old_name
  WHERE obg.id = t.business_unit_group_id
);

-- Step 5: Update users to use new business groups
UPDATE users u
SET business_unit_group_id = (
  SELECT nbg.id
  FROM business_unit_groups nbg
  JOIN bu_migration_map bm ON nbg.name = bm.new_name
  JOIN business_unit_groups obg ON obg.name = bm.old_name
  WHERE obg.id = u.business_unit_group_id
  LIMIT 1
)
WHERE business_unit_group_id IS NOT NULL
AND EXISTS (
  SELECT 1
  FROM business_unit_groups obg
  JOIN bu_migration_map bm ON obg.name = bm.old_name
  WHERE obg.id = u.business_unit_group_id
);

-- Step 6: Update ticket_classification_mapping to use new business groups
UPDATE ticket_classification_mapping tcm
SET business_unit_group_id = (
  SELECT nbg.id
  FROM business_unit_groups nbg
  JOIN bu_migration_map bm ON nbg.name = bm.new_name
  JOIN business_unit_groups obg ON obg.name = bm.old_name
  WHERE obg.id = tcm.business_unit_group_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM business_unit_groups obg
  JOIN bu_migration_map bm ON obg.name = bm.old_name
  WHERE obg.id = tcm.business_unit_group_id
);

-- Step 7: Delete old business groups that are no longer needed
-- (Only delete if no references exist)
DELETE FROM business_unit_groups
WHERE name IN ('Sales', 'CS Apps', 'CS Web', 'CS Brand', 'CS BM', 'TD North', 'TD South', 'TD Others', 'TD Other')
AND NOT EXISTS (
  SELECT 1 FROM tickets WHERE business_unit_group_id = business_unit_groups.id
)
AND NOT EXISTS (
  SELECT 1 FROM users WHERE business_unit_group_id = business_unit_groups.id
)
AND NOT EXISTS (
  SELECT 1 FROM ticket_classification_mapping WHERE business_unit_group_id = business_unit_groups.id
);

-- Cleanup
DROP TABLE IF EXISTS bu_migration_map;
DROP TABLE IF EXISTS new_business_groups;

-- Verify the changes
SELECT id, name, description FROM business_unit_groups ORDER BY name;
