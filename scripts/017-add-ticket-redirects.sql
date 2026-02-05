-- Migration: Add Ticket Redirect Tracking
-- This table tracks the history of ticket redirects between business groups

CREATE TABLE IF NOT EXISTS ticket_redirects (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_business_group_id INTEGER REFERENCES business_unit_groups(id) ON DELETE SET NULL,
  to_business_group_id INTEGER REFERENCES business_unit_groups(id) ON DELETE SET NULL,
  from_spoc_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  to_spoc_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  from_business_group_name VARCHAR(255),  -- Store name for display even if BU is deleted
  to_business_group_name VARCHAR(255),
  from_spoc_name VARCHAR(255),  -- Store name for display even if user is deleted
  to_spoc_name VARCHAR(255),
  remarks TEXT NOT NULL,
  redirected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  redirected_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ticket_redirects_ticket_id ON ticket_redirects(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_redirects_created_at ON ticket_redirects(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_redirects_from_bg ON ticket_redirects(from_business_group_id);
CREATE INDEX IF NOT EXISTS idx_ticket_redirects_to_bg ON ticket_redirects(to_business_group_id);

-- Add redirect_count column to tickets for quick reference
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS redirect_count INTEGER DEFAULT 0;

-- Verify the table was created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ticket_redirects'
ORDER BY ordinal_position;
