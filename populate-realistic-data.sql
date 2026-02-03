-- Populate Realistic Delivery and Pickup Data
-- Based on: 10-16 deliveries, 1-4 pickups, 90% success rate

-- First, let's see what sessions we have to work with
SELECT 
  COUNT(*) as total_sessions,
  MIN(date) as earliest_session,
  MAX(date) as latest_session
FROM sessions;

-- Update sessions with realistic delivery and pickup data
UPDATE sessions 
SET 
  -- Generate random deliveries between 10-16
  positive_deliveries = FLOOR(RANDOM() * 7 + 10)::INTEGER,
  
  -- Generate random pickups between 1-4  
  positive_pickups = FLOOR(RANDOM() * 4 + 1)::INTEGER,
  
  -- 10% failure rate for deliveries (1-2 failed deliveries occasionally)
  negative_deliveries = CASE 
    WHEN RANDOM() < 0.3 THEN FLOOR(RANDOM() * 2 + 1)::INTEGER 
    ELSE 0 
  END,
  
  -- 10% failure rate for pickups (0-1 failed pickups occasionally)
  negative_pickups = CASE 
    WHEN RANDOM() < 0.2 THEN 1 
    ELSE 0 
  END,
  
  -- Add some realistic mileage data (50-200 km per day)
  start_km = FLOOR(RANDOM() * 50000 + 10000)::DECIMAL(10,2),
  end_km = start_km + FLOOR(RANDOM() * 150 + 50)::DECIMAL(10,2)

WHERE end_time IS NOT NULL; -- Only update completed sessions

-- Update the calculated totals using our trigger function
UPDATE sessions 
SET 
  deliveries = positive_deliveries + negative_deliveries,
  pickups = positive_pickups + negative_pickups,
  total_km = end_km - start_km
WHERE end_time IS NOT NULL;

-- Add some realistic comments for failed deliveries/pickups
UPDATE sessions 
SET 
  delivery_comments = CASE 
    WHEN negative_deliveries > 0 THEN 
      CASE FLOOR(RANDOM() * 4)::INTEGER
        WHEN 0 THEN 'Customer not home'
        WHEN 1 THEN 'Address not found'
        WHEN 2 THEN 'Package damaged'
        ELSE 'Access denied'
      END
    ELSE NULL
  END,
  
  pickup_comments = CASE 
    WHEN negative_pickups > 0 THEN 
      CASE FLOOR(RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'Package not ready'
        WHEN 1 THEN 'Business closed'
        ELSE 'Wrong pickup time'
      END
    ELSE NULL
  END

WHERE end_time IS NOT NULL;

-- Verify the data looks realistic
SELECT 
  COUNT(*) as total_sessions,
  ROUND(AVG(deliveries), 1) as avg_deliveries,
  ROUND(AVG(pickups), 1) as avg_pickups,
  ROUND(AVG(positive_deliveries), 1) as avg_positive_deliveries,
  ROUND(AVG(negative_deliveries), 1) as avg_negative_deliveries,
  ROUND(AVG(positive_pickups), 1) as avg_positive_pickups,
  ROUND(AVG(negative_pickups), 1) as avg_negative_pickups,
  ROUND(AVG(total_km), 1) as avg_km_per_day,
  COUNT(CASE WHEN delivery_comments IS NOT NULL THEN 1 END) as sessions_with_delivery_comments,
  COUNT(CASE WHEN pickup_comments IS NOT NULL THEN 1 END) as sessions_with_pickup_comments
FROM sessions 
WHERE end_time IS NOT NULL;

-- Show sample of the generated data
SELECT 
  date,
  deliveries,
  pickups,
  positive_deliveries,
  negative_deliveries,
  positive_pickups,
  negative_pickups,
  total_km,
  delivery_comments,
  pickup_comments
FROM sessions 
WHERE end_time IS NOT NULL
ORDER BY date DESC
LIMIT 10;

-- Show success rates to verify they're around 90%
SELECT 
  ROUND(
    (SUM(positive_deliveries)::DECIMAL / NULLIF(SUM(deliveries), 0)) * 100, 1
  ) as delivery_success_rate_percent,
  ROUND(
    (SUM(positive_pickups)::DECIMAL / NULLIF(SUM(pickups), 0)) * 100, 1
  ) as pickup_success_rate_percent,
  SUM(deliveries) as total_deliveries,
  SUM(pickups) as total_pickups,
  SUM(positive_deliveries) as total_successful_deliveries,
  SUM(positive_pickups) as total_successful_pickups
FROM sessions 
WHERE end_time IS NOT NULL;