-- ALWAYS RUN THIS BEFORE ANY MIGRATION
-- Creates a backup table with all current data

-- Create backup table
CREATE TABLE sessions_backup_$(date +%Y%m%d_%H%M%S) AS 
SELECT * FROM sessions;

-- Verify backup was created
SELECT 
  COUNT(*) as original_sessions,
  (SELECT COUNT(*) FROM sessions_backup_$(date +%Y%m%d_%H%M%S)) as backup_sessions,
  SUM(deliveries) as original_deliveries,
  SUM(pickups) as original_pickups
FROM sessions;