// Test utilities and generators for transport tracker testing
import fc from 'fast-check';

/**
 * Generate a valid session object for testing
 */
export const generateValidSession = () => {
  const startTime = new Date('2024-01-01T08:00:00');
  const endTime = new Date('2024-01-01T17:00:00');
  const startKm = Math.random() * 100000;
  const endKm = startKm + Math.random() * 500;

  return {
    id: 'test-session-' + Date.now(),
    user_id: 'test-user-id',
    date: '2024-01-01T00:00:00.000Z',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: 'ended',
    route_number: 'Route #42',
    positive_deliveries: Math.floor(Math.random() * 20),
    negative_deliveries: Math.floor(Math.random() * 3),
    positive_pickups: Math.floor(Math.random() * 15),
    negative_pickups: Math.floor(Math.random() * 2),
    delivery_comments: 'Test delivery comments',
    pickup_comments: 'Test pickup comments',
    start_km: startKm,
    end_km: endKm,
    breaks: [
      {
        start: '2024-01-01T12:00:00.000Z',
        end: '2024-01-01T12:30:00.000Z'
      },
      {
        start: '2024-01-01T15:00:00.000Z',
        end: '2024-01-01T15:15:00.000Z'
      }
    ]
  };
};

/**
 * Generate invalid session data for testing validation
 */
export const generateInvalidSession = (invalidationType = 'mileage') => {
  const baseSession = generateValidSession();

  switch (invalidationType) {
    case 'mileage':
      return {
        ...baseSession,
        start_km: 100,
        end_km: 50 // Invalid: end < start
      };
    
    case 'breaks':
      return {
        ...baseSession,
        breaks: [
          {
            start: '2024-01-01T12:30:00.000Z',
            end: '2024-01-01T12:00:00.000Z' // Invalid: end before start
          }
        ]
      };
    
    case 'negative_values':
      return {
        ...baseSession,
        positive_deliveries: -5, // Invalid: negative value
        negative_deliveries: -2
      };
    
    default:
      return baseSession;
  }
};

/**
 * Fast-check generators for property-based testing
 */
export const generators = {
  // Generate positive integers for deliveries/pickups
  positiveInteger: fc.integer({ min: 0, max: 100 }),
  
  // Generate mileage values
  mileage: fc.float({ min: 0, max: 999999, noNaN: true }),
  
  // Generate time within a work day
  workTime: fc.date({ 
    min: new Date('2024-01-01T06:00:00'), 
    max: new Date('2024-01-01T20:00:00') 
  }),
  
  // Generate break duration (15 minutes to 2 hours)
  breakDuration: fc.integer({ min: 15, max: 120 }),
  
  // Generate route number
  routeNumber: fc.oneof(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.constantFrom('Route #1', 'Route #42', 'Route A', 'Special Route')
  ),
  
  // Generate comments
  comment: fc.oneof(
    fc.constant(''),
    fc.constant(null),
    fc.string({ minLength: 1, maxLength: 100 })
  ),
  
  // Generate session status
  sessionStatus: fc.constantFrom('working', 'on-break', 'ended'),
  
  // Generate a complete valid session
  validSession: fc.record({
    positive_deliveries: fc.integer({ min: 0, max: 50 }),
    negative_deliveries: fc.integer({ min: 0, max: 10 }),
    positive_pickups: fc.integer({ min: 0, max: 30 }),
    negative_pickups: fc.integer({ min: 0, max: 5 }),
    start_km: fc.float({ min: 0, max: 999999, noNaN: true }),
    end_km: fc.float({ min: 0, max: 999999, noNaN: true }),
    route_number: fc.string({ minLength: 1, maxLength: 50 }),
    delivery_comments: fc.oneof(fc.constant(null), fc.string({ maxLength: 500 })),
    pickup_comments: fc.oneof(fc.constant(null), fc.string({ maxLength: 500 }))
  }).filter(session => session.end_km > session.start_km), // Ensure valid mileage
  
  // Generate breaks array
  breaksArray: fc.array(
    fc.record({
      start: fc.date({ min: new Date('2024-01-01T09:00:00'), max: new Date('2024-01-01T16:00:00') }),
      end: fc.date({ min: new Date('2024-01-01T09:15:00'), max: new Date('2024-01-01T16:30:00') })
    }).filter(brk => brk.end > brk.start), // Ensure valid break times
    { maxLength: 5 }
  )
};

/**
 * Mock data for testing
 */
export const mockData = {
  users: [
    {
      id: 'admin-1',
      name: 'Admin User',
      username: 'admin',
      role: 'admin'
    },
    {
      id: 'driver-1',
      name: 'John Driver',
      username: 'john.driver',
      role: 'driver'
    },
    {
      id: 'driver-2',
      name: 'Jane Driver',
      username: 'jane.driver',
      role: 'driver'
    }
  ],
  
  sessions: [
    generateValidSession(),
    {
      ...generateValidSession(),
      id: 'session-2',
      positive_deliveries: 15,
      negative_deliveries: 2,
      positive_pickups: 8,
      negative_pickups: 1
    }
  ],
  
  editHistory: [
    {
      id: 'edit-1',
      session_id: 'session-1',
      edited_by: 'admin-1',
      field_name: 'positive_deliveries',
      old_value: '10',
      new_value: '12',
      edited_at: '2024-01-01T14:30:00.000Z',
      editor: { name: 'Admin User', username: 'admin' },
      session: { 
        date: '2024-01-01T00:00:00.000Z',
        user: { name: 'John Driver' }
      }
    }
  ]
};

/**
 * Test helper functions
 */
export const testHelpers = {
  /**
   * Create a session with specific properties for testing
   */
  createSessionWith: (overrides = {}) => ({
    ...generateValidSession(),
    ...overrides
  }),
  
  /**
   * Create multiple sessions for testing
   */
  createSessions: (count = 3) => {
    return Array.from({ length: count }, (_, i) => ({
      ...generateValidSession(),
      id: `test-session-${i + 1}`,
      date: new Date(2024, 0, i + 1).toISOString()
    }));
  },
  
  /**
   * Assert that two numbers are approximately equal (for floating point comparisons)
   */
  assertApproximatelyEqual: (actual, expected, tolerance = 0.01) => {
    return Math.abs(actual - expected) < tolerance;
  },
  
  /**
   * Create a time range for testing
   */
  createTimeRange: (startHour = 8, endHour = 17, date = '2024-01-01') => ({
    start: new Date(`${date}T${startHour.toString().padStart(2, '0')}:00:00.000Z`),
    end: new Date(`${date}T${endHour.toString().padStart(2, '0')}:00:00.000Z`)
  }),
  
  /**
   * Create breaks within a time range
   */
  createBreaksInRange: (timeRange, count = 2) => {
    const duration = timeRange.end - timeRange.start;
    const breakDuration = 30 * 60 * 1000; // 30 minutes
    const breaks = [];
    
    for (let i = 0; i < count; i++) {
      const startOffset = (duration / (count + 1)) * (i + 1);
      const breakStart = new Date(timeRange.start.getTime() + startOffset);
      const breakEnd = new Date(breakStart.getTime() + breakDuration);
      
      breaks.push({
        start: breakStart.toISOString(),
        end: breakEnd.toISOString()
      });
    }
    
    return breaks;
  }
};

/**
 * Property test configurations
 */
export const testConfigs = {
  // Standard configuration for most property tests
  standard: {
    numRuns: 100,
    timeout: 5000
  },
  
  // Quick configuration for faster tests during development
  quick: {
    numRuns: 20,
    timeout: 2000
  },
  
  // Thorough configuration for comprehensive testing
  thorough: {
    numRuns: 500,
    timeout: 10000
  }
};