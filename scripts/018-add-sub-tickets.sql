-- Migration: Add Sub-Ticket (Parent-Child Relationship) Support
-- This enables creating sub-tickets under a parent ticket

-- Add parent-child relationship columns to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS parent_ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS child_count INTEGER DEFAULT 0;

-- Create index for faster parent-child queries
CREATE INDEX IF NOT EXISTS idx_tickets_parent_ticket_id ON tickets(parent_ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_is_parent ON tickets(is_parent) WHERE is_parent = TRUE;

-- Create a trigger function to maintain child_count
CREATE OR REPLACE FUNCTION update_parent_child_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_ticket_id IS NOT NULL THEN
    -- Increment child count and set is_parent flag
    UPDATE tickets
    SET child_count = child_count + 1, is_parent = TRUE
    WHERE id = NEW.parent_ticket_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_ticket_id IS NOT NULL THEN
    -- Decrement child count
    UPDATE tickets
    SET child_count = GREATEST(child_count - 1, 0),
        is_parent = CASE WHEN child_count - 1 <= 0 THEN FALSE ELSE TRUE END
    WHERE id = OLD.parent_ticket_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.parent_ticket_id IS DISTINCT FROM NEW.parent_ticket_id THEN
    -- Handle moving a child to a different parent
    IF OLD.parent_ticket_id IS NOT NULL THEN
      UPDATE tickets
      SET child_count = GREATEST(child_count - 1, 0),
          is_parent = CASE WHEN child_count - 1 <= 0 THEN FALSE ELSE TRUE END
      WHERE id = OLD.parent_ticket_id;
    END IF;
    IF NEW.parent_ticket_id IS NOT NULL THEN
      UPDATE tickets
      SET child_count = child_count + 1, is_parent = TRUE
      WHERE id = NEW.parent_ticket_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_parent_child_count ON tickets;

-- Create trigger
CREATE TRIGGER trigger_update_parent_child_count
AFTER INSERT OR UPDATE OF parent_ticket_id OR DELETE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_parent_child_count();

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
AND column_name IN ('parent_ticket_id', 'is_parent', 'child_count')
ORDER BY ordinal_position;
