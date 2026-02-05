-- Migration: Add Category-Business Group Assignments
-- This table controls which categories are visible to which business groups during ticket creation

-- Create the category_business_group_assignments table
CREATE TABLE IF NOT EXISTS category_business_group_assignments (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  business_unit_group_id INTEGER NOT NULL REFERENCES business_unit_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, business_unit_group_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cbga_category ON category_business_group_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_cbga_business_unit ON category_business_group_assignments(business_unit_group_id);

-- Seed initial data: assign all categories to all business groups by default
-- This maintains backward compatibility - all categories visible to all groups initially
INSERT INTO category_business_group_assignments (category_id, business_unit_group_id)
SELECT c.id, b.id
FROM categories c
CROSS JOIN business_unit_groups b
ON CONFLICT (category_id, business_unit_group_id) DO NOTHING;

-- Verify the table
SELECT
  cbga.id,
  c.name as category_name,
  bug.name as business_group_name
FROM category_business_group_assignments cbga
JOIN categories c ON cbga.category_id = c.id
JOIN business_unit_groups bug ON cbga.business_unit_group_id = bug.id
ORDER BY bug.name, c.name
LIMIT 20;
