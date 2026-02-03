-- Verification script for transport tracker enhancements migration
-- Run this after executing supabase-enhancements.sql

-- ============================================================================
-- VERIFICATION 1: Check that all new columns exist
-- ============================================================================

SELECT 
  'Column Check' as verification_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
  AND column_name IN (
    'positive_deliveries', 'negative_deliveries', 
    'positive_pickups', 'negative_pickups',
    'delivery_comments', 'pickup_comments',
    'start_km', 'end_km', 'total_km'
  )
ORDER BY column_name;

-- ============================================================================
-- VERIFICATION 2: Check audit table structure
-- ============================================================================

SELECT 
  'Audit Table Check' as verification_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'session_edit_history'
ORDER BY ordinal_position;

-- ============================================================================
-- VERIFICATION 3: Check data migration results
-- ============================================================================

SELECT 
  'Data Migration Check' as verification_type,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN positive_deliveries IS NOT NULL THEN 1 END) as sessions_with_pos_deliveries,
  COUNT(CASE WHEN positive_pickups IS NOT NULL THEN 1 END) as sessions_with_pos_pickups,
  COUNT(CASE WHEN deliveries != (COALESCE(positive_deliveries, 0) + COALESCE(negative_deliveries, 0)) THEN 1 END) as delivery_mismatch,
  COUNT(CASE WHEN pickups != (COALESCE(positive_pickups, 0) + COALESCE(negative_pickups, 0)) THEN 1 END) as pickup_mismatch
FROM sessions;

-- ============================================================================
-- VERIFICATION 4: Check that backward compatibility is maintained
-- ============================================================================

SELECT 
  'Backward Compatibility Check' as verification_type,
  id,
  deliveries as old_deliveries,
  positive_deliveries,
  negative_deliveries,
  (positive_deliveries + negative_deliveries) as calculated_deliveries,
  pickups as old_pickups,
  positive_pickups,
  negative_pickups,
  (positive_pickups + negative_pickups) as calculated_pickups
FROM sessions 
WHERE deliveries != (COALESCE(positive_deliveries, 0) + COALESCE(negative_deliveries, 0))
   OR pickups != (COALESCE(positive_pickups, 0) + COALESCE(negative_pickups, 0))
LIMIT 10;

-- ============================================================================
-- VERIFICATION 5: Check indexes were created
-- ============================================================================

SELECT 
  'Index Check' as verification_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('sessions', 'session_edit_history')
  AND indexname LIKE '%session%'
ORDER BY tablename, indexname;

-- ============================================================================
-- VERIFICATION 6: Check functions were created
-- ============================================================================

SELECT 
  'Function Check' as verification_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN (
  'calculate_total_deliveries',
  'calculate_total_pickups', 
  'calculate_total_km',
  'update_session_totals'
)
ORDER BY routine_name;

-- ============================================================================
-- VERIFICATION 7: Check triggers were created
-- ============================================================================

SELECT 
  'Trigger Check' as verification_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_session_totals';

-- ============================================================================
-- VERIFICATION 8: Test trigger functionality
-- ============================================================================

-- This would be run in a test environment to verify triggers work
-- DO NOT RUN IN PRODUCTION without proper testing

/*
-- Test insert trigger
INSERT INTO sessions (user_id, date, start_time, positive_deliveries, negative_deliveries, positive_pickups, negative_pickups, start_km, end_km)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW(),
  5, 2, 3, 1, 100.5, 150.8
);

-- Check that totals were calculated correctly
SELECT 
  deliveries, positive_deliveries, negative_deliveries,
  pickups, positive_pickups, negative_pickups,
  total_km, start_km, end_km
FROM sessions 
WHERE id = (SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1);

-- Clean up test data
DELETE FROM sessions WHERE id = (SELECT id FROM sessions ORDER BY created_at DESC LIMIT 1);
*/

-- ============================================================================
-- VERIFICATION 9: Sample data check
-- ============================================================================

SELECT 
  'Sample Data Check' as verification_type,
  id,
  date,
  route_number,
  deliveries,
  positive_deliveries,
  negative_deliveries,
  pickups,
  positive_pickups,
  negative_pickups,
  start_km,
  end_km,
  total_km
FROM sessions 
ORDER BY date DESC 
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
  'Migration Status' as verification_type,
  'Migration verification completed successfully' as message,
  NOW() as verified_at;