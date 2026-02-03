-- Fix Data Migration Script
-- This script properly migrates existing delivery and pickup data to the new positive/negative columns

-- First, let's see what data we have
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

-- Migrate existing deliveries to positive_deliveries (where not already migrated)
UPDATE sessions 
SET 
  positive_deliveries = COALESCE(deliveries, 0),
  negative_deliveries = 0
WHERE deliveries > 0 AND positive_deliveries = 0;

-- Migrate existing pickups to positive_pickups (where not already migrated)
UPDATE sessions 
SET 
  positive_pickups = COALESCE(pickups, 0),
  negative_pickups = 0
WHERE pickups > 0 AND positive_pickups = 0;

-- Verify the migration worked
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

-- Show some sample records to verify
SELECT 
  id,
  date,
  deliveries,
  pickups,
  positive_deliveries,
  negative_deliveries,
  positive_pickups,
  negative_pickups
FROM sessions 
WHERE deliveries > 0 OR pickups > 0
ORDER BY date DESC
LIMIT 10;