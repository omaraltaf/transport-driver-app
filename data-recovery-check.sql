-- Data Recovery Diagnostic Script
-- Run this to check if any data can be recovered

-- Check current state of sessions table
SELECT 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN deliveries > 0 THEN 1 END) as sessions_with_deliveries,
  COUNT(CASE WHEN pickups > 0 THEN 1 END) as sessions_with_pickups,
  COUNT(CASE WHEN positive_deliveries > 0 THEN 1 END) as sessions_with_positive_deliveries,
  COUNT(CASE WHEN positive_pickups > 0 THEN 1 END) as sessions_with_positive_pickups,
  SUM(deliveries) as total_deliveries,
  SUM(pickups) as total_pickups,
  SUM(positive_deliveries) as total_positive_deliveries,
  SUM(positive_pickups) as total_positive_pickups
FROM sessions;

-- Check if there are any sessions with data in other fields that might indicate work was done
SELECT 
  id,
  date,
  start_time,
  end_time,
  deliveries,
  pickups,
  positive_deliveries,
  negative_deliveries,
  positive_pickups,
  negative_pickups,
  breaks,
  route_number
FROM sessions 
WHERE (
  breaks IS NOT NULL AND breaks != '[]'::jsonb
  OR route_number IS NOT NULL
  OR end_time IS NOT NULL
)
ORDER BY date DESC
LIMIT 20;

-- Check if audit history table has any records (might give us clues)
SELECT COUNT(*) as audit_records FROM session_edit_history;

-- Look for any patterns that might help us identify which sessions had data
SELECT 
  DATE(date) as session_date,
  COUNT(*) as sessions_count,
  COUNT(CASE WHEN breaks != '[]'::jsonb THEN 1 END) as sessions_with_breaks,
  COUNT(CASE WHEN route_number IS NOT NULL THEN 1 END) as sessions_with_routes,
  COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as completed_sessions
FROM sessions 
GROUP BY DATE(date)
ORDER BY session_date DESC
LIMIT 30;