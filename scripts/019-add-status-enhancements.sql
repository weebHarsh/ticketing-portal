-- Migration: Add Status Enhancements
-- This adds support for new statuses (resolved, returned, deleted) and mandatory remarks

-- Update tickets table with new status-related columns
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_by INTEGER REFERENCES users(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS returned_by INTEGER REFERENCES users(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status_remarks TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_tickets_status_deleted ON tickets(status) WHERE status = 'deleted';
CREATE INDEX IF NOT EXISTS idx_tickets_resolved_by ON tickets(resolved_by);

-- Add resolved_at column if it doesn't exist (it should, but just in case)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

-- Update the ticket_audit_log to support the new action types
-- The notes field already exists and will be used for mandatory remarks

-- Add a check constraint for valid statuses (optional, can be enforced at application level)
-- Note: Postgres doesn't easily support modifying CHECK constraints, so we'll handle this in the application

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
AND column_name IN ('resolved_by', 'returned_at', 'returned_by', 'status_remarks')
ORDER BY ordinal_position;

-- Create a view for easy status tracking
CREATE OR REPLACE VIEW ticket_status_summary AS
SELECT
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN is_deleted = TRUE THEN 1 END) as deleted_count
FROM tickets
GROUP BY status
ORDER BY status;

-- Show current status distribution
SELECT * FROM ticket_status_summary;
