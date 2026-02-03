-- Transport Tracker Enhancements - Database Migration Script
-- This script adds new columns to support enhanced delivery/pickup tracking,
-- mileage tracking, comments, and audit logging

-- ============================================================================
-- PHASE 1: Extend sessions table with new columns
-- ============================================================================

-- Add positive/negative delivery and pickup tracking columns
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS positive_deliveries INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS negative_deliveries INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS positive_pickups INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS negative_pickups INTEGER DEFAULT 0;

-- Add comment fields for failed deliveries/pickups
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS delivery_comments TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pickup_comments TEXT;

-- Add mileage tracking columns
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS start_km DECIMAL(10,2);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS end_km DECIMAL(10,2);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_km DECIMAL(10,2);

-- ============================================================================
-- PHASE 2: Create audit log table for admin edits
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_edit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  edited_by UUID REFERENCES users(id),
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on audit table
ALTER TABLE session_edit_history ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all edit history
CREATE POLICY "Admins can view all edit history" ON session_edit_history
  FOR SELECT USING (true);

-- Policy for admins to insert edit history
CREATE POLICY "Admins can insert edit history" ON session_edit_history
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PHASE 3: Create indexes for performance optimization
-- ============================================================================

-- Index on session_id for audit history lookups
CREATE INDEX IF NOT EXISTS idx_session_edit_history_session_id 
ON session_edit_history(session_id);

-- Index on edited_by for admin activity tracking
CREATE INDEX IF NOT EXISTS idx_session_edit_history_edited_by 
ON session_edit_history(edited_by);

-- Index on edited_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_session_edit_history_edited_at 
ON session_edit_history(edited_at DESC);

-- Composite index for session + field lookups
CREATE INDEX IF NOT EXISTS idx_session_edit_history_session_field 
ON session_edit_history(session_id, field_name);

-- ============================================================================
-- PHASE 4: Data migration for existing records
-- ============================================================================

-- Migrate existing deliveries to positive_deliveries (assuming all were successful)
UPDATE sessions 
SET 
  positive_deliveries = COALESCE(deliveries, 0),
  negative_deliveries = 0
WHERE deliveries > 0 AND positive_deliveries = 0;

-- Migrate existing pickups to positive_pickups (assuming all were successful)
UPDATE sessions 
SET 
  positive_pickups = COALESCE(pickups, 0),
  negative_pickups = 0
WHERE pickups > 0 AND positive_pickups = 0;

-- ============================================================================
-- PHASE 5: Create helper functions for calculations
-- ============================================================================

-- Function to calculate total deliveries (for backward compatibility)
CREATE OR REPLACE FUNCTION calculate_total_deliveries(pos_deliveries INTEGER, neg_deliveries INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(pos_deliveries, 0) + COALESCE(neg_deliveries, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total pickups (for backward compatibility)
CREATE OR REPLACE FUNCTION calculate_total_pickups(pos_pickups INTEGER, neg_pickups INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(pos_pickups, 0) + COALESCE(neg_pickups, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total kilometers
CREATE OR REPLACE FUNCTION calculate_total_km(start_km DECIMAL, end_km DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  IF start_km IS NULL OR end_km IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN end_km - start_km;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 6: Update existing deliveries and pickups columns with calculated values
-- ============================================================================

-- Update deliveries column to maintain backward compatibility
UPDATE sessions 
SET deliveries = calculate_total_deliveries(positive_deliveries, negative_deliveries)
WHERE deliveries != calculate_total_deliveries(positive_deliveries, negative_deliveries)
   OR deliveries IS NULL;

-- Update pickups column to maintain backward compatibility
UPDATE sessions 
SET pickups = calculate_total_pickups(positive_pickups, negative_pickups)
WHERE pickups != calculate_total_pickups(positive_pickups, negative_pickups)
   OR pickups IS NULL;

-- ============================================================================
-- PHASE 7: Create triggers to maintain backward compatibility
-- ============================================================================

-- Trigger function to automatically update total columns when positive/negative values change
CREATE OR REPLACE FUNCTION update_session_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total deliveries
  NEW.deliveries = calculate_total_deliveries(NEW.positive_deliveries, NEW.negative_deliveries);
  
  -- Update total pickups
  NEW.pickups = calculate_total_pickups(NEW.positive_pickups, NEW.negative_pickups);
  
  -- Update total kilometers
  NEW.total_km = calculate_total_km(NEW.start_km, NEW.end_km);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update totals on insert/update
DROP TRIGGER IF EXISTS trigger_update_session_totals ON sessions;
CREATE TRIGGER trigger_update_session_totals
  BEFORE INSERT OR UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_totals();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
  AND column_name IN (
    'positive_deliveries', 'negative_deliveries', 
    'positive_pickups', 'negative_pickups',
    'delivery_comments', 'pickup_comments',
    'start_km', 'end_km', 'total_km'
  )
ORDER BY column_name;

-- Verify audit table was created
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'session_edit_history'
ORDER BY ordinal_position;

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename IN ('sessions', 'session_edit_history')
  AND indexname LIKE '%session%'
ORDER BY tablename, indexname;

-- Verify data migration completed
SELECT 
  COUNT(*) as total_sessions,
  COUNT(positive_deliveries) as sessions_with_pos_deliveries,
  COUNT(positive_pickups) as sessions_with_pos_pickups,
  AVG(deliveries) as avg_total_deliveries,
  AVG(pickups) as avg_total_pickups
FROM sessions;

-- ============================================================================
-- ROLLBACK SCRIPT (commented out - uncomment if rollback needed)
-- ============================================================================

/*
-- WARNING: This will remove all new columns and data!
-- Only run if you need to rollback the migration

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_update_session_totals ON sessions;
DROP FUNCTION IF EXISTS update_session_totals();
DROP FUNCTION IF EXISTS calculate_total_deliveries(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS calculate_total_pickups(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS calculate_total_km(DECIMAL, DECIMAL);

-- Drop audit table
DROP TABLE IF EXISTS session_edit_history;

-- Remove new columns from sessions table
ALTER TABLE sessions DROP COLUMN IF EXISTS positive_deliveries;
ALTER TABLE sessions DROP COLUMN IF EXISTS negative_deliveries;
ALTER TABLE sessions DROP COLUMN IF EXISTS positive_pickups;
ALTER TABLE sessions DROP COLUMN IF EXISTS negative_pickups;
ALTER TABLE sessions DROP COLUMN IF EXISTS delivery_comments;
ALTER TABLE sessions DROP COLUMN IF EXISTS pickup_comments;
ALTER TABLE sessions DROP COLUMN IF EXISTS start_km;
ALTER TABLE sessions DROP COLUMN IF EXISTS end_km;
ALTER TABLE sessions DROP COLUMN IF EXISTS total_km;
*/