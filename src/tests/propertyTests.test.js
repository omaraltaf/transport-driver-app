// Property-Based Tests for Transport Tracker Enhancements
// These tests validate the correctness properties defined in the design document

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  calculateTotals, 
  calculateTimeMetrics, 
  validateSession 
} from '../lib/sessionHelpers';

describe('Property-Based Tests for Transport Tracker', () => {
  
  // Property 1: Total Calculation Consistency
  // Validates: Requirements 1.5
  describe('Total Calculation Consistency', () => {
    it('should always calculate total deliveries as positive + negative deliveries', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // positive_deliveries
          fc.integer({ min: 0, max: 100 }), // negative_deliveries
          (positive, negative) => {
            const session = { 
              positive_deliveries: positive, 
              negative_deliveries: negative 
            };
            const calculated = calculateTotals(session);
            return calculated.deliveries === positive + negative;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always calculate total pickups as positive + negative pickups', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // positive_pickups
          fc.integer({ min: 0, max: 100 }), // negative_pickups
          (positive, negative) => {
            const session = { 
              positive_pickups: positive, 
              negative_pickups: negative 
            };
            const calculated = calculateTotals(session);
            return calculated.pickups === positive + negative;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 2: Mileage Calculation Accuracy
  // Validates: Requirements 4.3
  describe('Mileage Calculation Accuracy', () => {
    it('should always calculate total KM as end KM minus start KM', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 999999, noNaN: true }), // start_km
          fc.float({ min: 0, max: 999999, noNaN: true }), // end_km
          (start, end) => {
            fc.pre(end > start && (end - start) > 0.001); // Precondition: meaningful difference
            const session = { start_km: start, end_km: end };
            const calculated = calculateTotals(session);
            const expectedTotal = (end - start).toFixed(2);
            return Math.abs(parseFloat(calculated.total_km) - parseFloat(expectedTotal)) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for total KM when start or end is missing', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.float({ min: 0, max: 999999, noNaN: true })
          ),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.float({ min: 0, max: 999999, noNaN: true })
          ),
          (start, end) => {
            fc.pre(start === null || start === undefined || end === null || end === undefined);
            const session = { start_km: start, end_km: end };
            const calculated = calculateTotals(session);
            return calculated.total_km === null;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Property 3: Time Sequence Validation
  // Validates: Requirements 2.3
  describe('Time Sequence Validation', () => {
    it('should reject sessions where break end times are before start times', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              start: fc.date({ min: new Date('2024-01-01T08:00:00'), max: new Date('2024-01-01T16:00:00') }),
              end: fc.date({ min: new Date('2024-01-01T08:00:00'), max: new Date('2024-01-01T16:00:00') })
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (breaks) => {
            // Create breaks where end is meaningfully before start (more than 1 second difference)
            const invalidBreaks = breaks
              .filter(brk => Math.abs(brk.end.getTime() - brk.start.getTime()) > 1000) // At least 1 second difference
              .map(brk => {
                // Ensure end is before start by at least 1 second
                const laterTime = brk.end.getTime() > brk.start.getTime() ? brk.end : brk.start;
                const earlierTime = brk.end.getTime() > brk.start.getTime() ? brk.start : brk.end;
                
                return {
                  start: laterTime.toISOString(),
                  end: earlierTime.toISOString()
                };
              });
            
            if (invalidBreaks.length === 0) return true; // Skip if no valid test cases
            
            const session = { breaks: invalidBreaks };
            const errors = validateSession(session);
            
            // Should have validation errors for invalid time sequences
            return errors.some(error => error.includes('End time must be after start time'));
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept sessions where break end times are after start times', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              start: fc.date({ min: new Date('2024-01-01T08:00:00'), max: new Date('2024-01-01T16:00:00') }),
              end: fc.date({ min: new Date('2024-01-01T08:30:00'), max: new Date('2024-01-01T17:00:00') })
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (breaks) => {
            // Ensure breaks are valid (end after start)
            const validBreaks = breaks
              .filter(brk => brk.end > brk.start)
              .map(brk => ({
                start: brk.start.toISOString(),
                end: brk.end.toISOString()
              }));
            
            if (validBreaks.length === 0) return true; // Skip if no valid breaks
            
            const session = { breaks: validBreaks };
            const errors = validateSession(session);
            
            // Should not have time sequence errors for valid breaks
            return !errors.some(error => error.includes('End time must be after start time'));
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Property 4: Work Time Calculation
  // Validates: Requirements 6.1, 6.2, 6.3
  describe('Work Time Calculation', () => {
    it('should calculate work time + break time = total time', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01T08:00:00'), max: new Date('2024-01-01T09:00:00') }), // start_time
          fc.date({ min: new Date('2024-01-01T16:00:00'), max: new Date('2024-01-01T18:00:00') }), // end_time  
          fc.array(
            fc.record({
              start: fc.date({ min: new Date('2024-01-01T10:00:00'), max: new Date('2024-01-01T14:00:00') }),
              end: fc.date({ min: new Date('2024-01-01T10:15:00'), max: new Date('2024-01-01T14:30:00') })
            }),
            { maxLength: 3 }
          ),
          (startTime, endTime, breaks) => {
            fc.pre(endTime > startTime);
            
            // Filter and sort breaks to be within work period and non-overlapping
            const validBreaks = breaks
              .filter(brk => brk.end > brk.start && brk.start >= startTime && brk.end <= endTime)
              .sort((a, b) => a.start - b.start)
              .reduce((acc, brk) => {
                // Prevent overlapping breaks
                if (acc.length === 0 || brk.start >= acc[acc.length - 1].end) {
                  acc.push(brk);
                }
                return acc;
              }, [])
              .map(brk => ({
                start: brk.start.toISOString(),
                end: brk.end.toISOString()
              }));
            
            const session = {
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              breaks: validBreaks
            };
            
            const metrics = calculateTimeMetrics(session);
            const tolerance = 0.001; // 1 millisecond tolerance for floating point precision
            
            return Math.abs(metrics.workTime + metrics.breakTime - metrics.totalTime) < tolerance;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle sessions with no breaks correctly', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01T08:00:00'), max: new Date('2024-01-01T09:00:00') }), // start_time
          fc.date({ min: new Date('2024-01-01T16:00:00'), max: new Date('2024-01-01T18:00:00') }), // end_time
          (startTime, endTime) => {
            fc.pre(endTime > startTime);
            
            const session = {
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              breaks: []
            };
            
            const metrics = calculateTimeMetrics(session);
            
            // With no breaks, work time should equal total time, break time should be 0
            return metrics.breakTime === 0 && 
                   Math.abs(metrics.workTime - metrics.totalTime) < 0.001;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Property 5: Input Validation Consistency
  // Additional property to ensure validation is consistent
  describe('Input Validation Consistency', () => {
    it('should consistently validate mileage constraints', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000000 }), // start_km (including negative values)
          fc.float({ min: -1000, max: 1000000 }), // end_km
          (start, end) => {
            const session = { start_km: start, end_km: end };
            const errors = validateSession(session);
            
            // If both values are provided and end < start, should have error
            if (start != null && end != null && end < start) {
              return errors.some(error => error.includes('Ending KM must be greater than starting KM'));
            }
            
            // If values are valid or missing, should not have mileage error
            return !errors.some(error => error.includes('Ending KM must be greater than starting KM'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null and undefined values gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer({ min: 0, max: 100 })
          ),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer({ min: 0, max: 100 })
          ),
          (positiveDeliveries, negativeDeliveries) => {
            const session = { 
              positive_deliveries: positiveDeliveries, 
              negative_deliveries: negativeDeliveries 
            };
            
            const calculated = calculateTotals(session);
            
            // Should handle null/undefined by treating as 0
            const expectedTotal = (positiveDeliveries || 0) + (negativeDeliveries || 0);
            return calculated.deliveries === expectedTotal;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Test generators and utilities for property-based testing
export const testGenerators = {
  // Generate valid session data
  validSession: () => fc.record({
    positive_deliveries: fc.integer({ min: 0, max: 50 }),
    negative_deliveries: fc.integer({ min: 0, max: 10 }),
    positive_pickups: fc.integer({ min: 0, max: 30 }),
    negative_pickups: fc.integer({ min: 0, max: 5 }),
    start_km: fc.float({ min: 0, max: 999999, noNaN: true }),
    end_km: fc.float({ min: 0, max: 999999, noNaN: true }),
    start_time: fc.date({ min: new Date('2024-01-01T06:00:00'), max: new Date('2024-01-01T10:00:00') }),
    end_time: fc.date({ min: new Date('2024-01-01T14:00:00'), max: new Date('2024-01-01T20:00:00') }),
    breaks: fc.array(
      fc.record({
        start: fc.date({ min: new Date('2024-01-01T10:00:00'), max: new Date('2024-01-01T15:00:00') }),
        end: fc.date({ min: new Date('2024-01-01T10:15:00'), max: new Date('2024-01-01T15:30:00') })
      }),
      { maxLength: 3 }
    )
  }),

  // Generate edge case values
  edgeCaseNumbers: () => fc.oneof(
    fc.constant(0),
    fc.constant(null),
    fc.constant(undefined),
    fc.integer({ min: 1, max: 3 }),
    fc.integer({ min: 97, max: 100 })
  ),

  // Generate time sequences
  timeSequence: () => fc.tuple(
    fc.date({ min: new Date('2024-01-01T08:00:00'), max: new Date('2024-01-01T09:00:00') }),
    fc.date({ min: new Date('2024-01-01T17:00:00'), max: new Date('2024-01-01T18:00:00') })
  ).map(([start, end]) => ({ start, end }))
};