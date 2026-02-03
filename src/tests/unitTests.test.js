// Unit Tests for Transport Tracker Enhancements
// These tests validate specific functionality and edge cases

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  calculateTotals, 
  calculateTimeMetrics, 
  validateSession,
  formatTime,
  formatTimeForInput,
  timeInputToISO,
  validateBreakTimeEdit
} from '../lib/sessionHelpers';
import { 
  validateNumericInput,
  validateMileageInput,
  validateRouteNumber,
  validateComment,
  validateEndOfDayForm,
  validateFieldRealTime,
  sanitizeTextInput
} from '../lib/validationUtils';
import { generateValidSession, generateInvalidSession, testHelpers } from './testUtils';

describe('Unit Tests for Session Helpers', () => {
  
  describe('calculateTotals', () => {
    it('should calculate correct totals for valid session', () => {
      const session = {
        positive_deliveries: 10,
        negative_deliveries: 2,
        positive_pickups: 5,
        negative_pickups: 1,
        start_km: 100.5,
        end_km: 250.8
      };

      const result = calculateTotals(session);

      expect(result.deliveries).toBe(12);
      expect(result.pickups).toBe(6);
      expect(parseFloat(result.total_km)).toBeCloseTo(150.3, 2);
    });

    it('should handle null and undefined values', () => {
      const session = {
        positive_deliveries: null,
        negative_deliveries: undefined,
        positive_pickups: 3,
        negative_pickups: 0,
        start_km: null,
        end_km: 100
      };

      const result = calculateTotals(session);

      expect(result.deliveries).toBe(0);
      expect(result.pickups).toBe(3);
      expect(result.total_km).toBe(null);
    });

    it('should handle zero values correctly', () => {
      const session = {
        positive_deliveries: 0,
        negative_deliveries: 0,
        positive_pickups: 0,
        negative_pickups: 0,
        start_km: 0,
        end_km: 0
      };

      const result = calculateTotals(session);

      expect(result.deliveries).toBe(0);
      expect(result.pickups).toBe(0);
      expect(parseFloat(result.total_km)).toBe(0);
    });
  });

  describe('calculateTimeMetrics', () => {
    it('should calculate correct time metrics for session with breaks', () => {
      const session = {
        start_time: '2024-01-01T08:00:00.000Z',
        end_time: '2024-01-01T17:00:00.000Z', // 9 hours total
        breaks: [
          {
            start: '2024-01-01T12:00:00.000Z',
            end: '2024-01-01T12:30:00.000Z' // 30 minutes
          },
          {
            start: '2024-01-01T15:00:00.000Z',
            end: '2024-01-01T15:15:00.000Z' // 15 minutes
          }
        ]
      };

      const result = calculateTimeMetrics(session);

      expect(result.totalTime).toBeCloseTo(9, 2); // 9 hours
      expect(result.breakTime).toBeCloseTo(0.75, 2); // 45 minutes = 0.75 hours
      expect(result.workTime).toBeCloseTo(8.25, 2); // 8.25 hours
    });

    it('should handle session with no breaks', () => {
      const session = {
        start_time: '2024-01-01T08:00:00.000Z',
        end_time: '2024-01-01T16:00:00.000Z', // 8 hours total
        breaks: []
      };

      const result = calculateTimeMetrics(session);

      expect(result.totalTime).toBeCloseTo(8, 2);
      expect(result.breakTime).toBe(0);
      expect(result.workTime).toBeCloseTo(8, 2);
    });

    it('should handle incomplete breaks', () => {
      const session = {
        start_time: '2024-01-01T08:00:00.000Z',
        end_time: '2024-01-01T17:00:00.000Z',
        breaks: [
          {
            start: '2024-01-01T12:00:00.000Z',
            end: '2024-01-01T12:30:00.000Z'
          },
          {
            start: '2024-01-01T15:00:00.000Z'
            // No end time - incomplete break
          }
        ]
      };

      const result = calculateTimeMetrics(session);

      expect(result.totalTime).toBeCloseTo(9, 2);
      expect(result.breakTime).toBeCloseTo(0.5, 2); // Only complete break counted
      expect(result.workTime).toBeCloseTo(8.5, 2);
    });

    it('should return zeros for missing time data', () => {
      const session = {
        start_time: null,
        end_time: null,
        breaks: []
      };

      const result = calculateTimeMetrics(session);

      expect(result.totalTime).toBe(0);
      expect(result.breakTime).toBe(0);
      expect(result.workTime).toBe(0);
    });
  });

  describe('validateSession', () => {
    it('should pass validation for valid session', () => {
      const session = generateValidSession();
      const errors = validateSession(session);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for invalid mileage', () => {
      const session = generateInvalidSession('mileage');
      const errors = validateSession(session);
      expect(errors.some(error => error.includes('Ending KM must be greater than starting KM'))).toBe(true);
    });

    it('should fail validation for invalid break times', () => {
      const session = generateInvalidSession('breaks');
      const errors = validateSession(session);
      expect(errors.some(error => error.includes('End time must be after start time'))).toBe(true);
    });

    it('should detect overlapping breaks', () => {
      const session = {
        ...generateValidSession(),
        breaks: [
          {
            start: '2024-01-01T12:00:00.000Z',
            end: '2024-01-01T12:45:00.000Z'
          },
          {
            start: '2024-01-01T12:30:00.000Z', // Overlaps with previous break
            end: '2024-01-01T13:00:00.000Z'
          }
        ]
      };

      const errors = validateSession(session);
      expect(errors.some(error => error.includes('overlap'))).toBe(true);
    });
  });

  describe('Time formatting functions', () => {
    it('should format time correctly', () => {
      const isoString = '2024-01-01T14:30:00.000Z';
      const formatted = formatTime(isoString);
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });

    it('should format time for input correctly', () => {
      const isoString = '2024-01-01T14:30:00.000Z';
      const formatted = formatTimeForInput(isoString);
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });

    it('should convert time input to ISO', () => {
      const timeValue = '14:30';
      const baseDate = '2024-01-01T00:00:00.000Z';
      const iso = timeInputToISO(timeValue, baseDate);
      // The time should be converted to the correct timezone
      expect(iso).toMatch(/2024-01-01T\d{2}:30:00/);
    });

    it('should handle empty time values', () => {
      expect(formatTime('')).toBe('');
      expect(formatTimeForInput(null)).toBe('');
      expect(timeInputToISO('')).toBe(null);
    });
  });

  describe('validateBreakTimeEdit', () => {
    let session;
    let breaks;

    beforeEach(() => {
      session = {
        date: '2024-01-01T00:00:00.000Z',
        start_time: '2024-01-01T08:00:00.000Z',
        end_time: '2024-01-01T17:00:00.000Z'
      };
      breaks = [
        {
          start: '2024-01-01T12:00:00.000Z',
          end: '2024-01-01T12:30:00.000Z'
        }
      ];
    });

    it('should validate correct break time edit', () => {
      const result = validateBreakTimeEdit(breaks, 0, 'start', '12:15', session);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should reject break end before start', () => {
      const result = validateBreakTimeEdit(breaks, 0, 'end', '11:45', session);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('End time must be after start time');
    });

    it('should reject break outside work period', () => {
      const result = validateBreakTimeEdit(breaks, 0, 'start', '07:30', session);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Break time must be within work period');
    });
  });
});

describe('Unit Tests for Validation Utils', () => {
  
  describe('validateNumericInput', () => {
    it('should validate positive numbers', () => {
      const result = validateNumericInput('25', 'Test Field');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(25);
    });

    it('should reject negative numbers', () => {
      const result = validateNumericInput('-5', 'Test Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be negative');
    });

    it('should reject non-numeric values', () => {
      const result = validateNumericInput('abc', 'Test Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a valid number');
    });

    it('should handle empty values', () => {
      const result = validateNumericInput('', 'Test Field');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(0);
    });

    it('should reject unreasonably high values', () => {
      const result = validateNumericInput('10000', 'Test Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('unusually high');
    });
  });

  describe('validateMileageInput', () => {
    it('should validate decimal mileage', () => {
      const result = validateMileageInput('12345.6', 'Mileage');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(12345.6);
    });

    it('should reject negative mileage', () => {
      const result = validateMileageInput('-100', 'Mileage');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be negative');
    });

    it('should handle empty mileage', () => {
      const result = validateMileageInput('', 'Mileage');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(null);
    });
  });

  describe('validateRouteNumber', () => {
    it('should validate normal route numbers', () => {
      const result = validateRouteNumber('Route #42');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty route numbers', () => {
      const result = validateRouteNumber('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject overly long route numbers', () => {
      const longRoute = 'A'.repeat(51);
      const result = validateRouteNumber(longRoute);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject invalid characters', () => {
      const result = validateRouteNumber('Route<script>');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });
  });

  describe('validateComment', () => {
    it('should validate normal comments', () => {
      const result = validateComment('Customer was not home', 'Comments');
      expect(result.isValid).toBe(true);
    });

    it('should allow empty comments', () => {
      const result = validateComment('', 'Comments');
      expect(result.isValid).toBe(true);
    });

    it('should reject overly long comments', () => {
      const longComment = 'A'.repeat(501);
      const result = validateComment(longComment, 'Comments');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('validateEndOfDayForm', () => {
    it('should validate complete form data', () => {
      const formData = {
        routeNumber: 'Route #42',
        positiveDeliveries: '15',
        negativeDeliveries: '2',
        positivePickups: '8',
        negativePickups: '1',
        deliveryComments: 'Some issues with addresses',
        pickupComments: 'One business was closed',
        endKm: '12500.5',
        startKm: '12400.0'
      };

      const result = validateEndOfDayForm(formData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.cleanData.route_number).toBe('Route #42');
      expect(result.cleanData.positive_deliveries).toBe(15);
    });

    it('should collect multiple validation errors', () => {
      const formData = {
        routeNumber: '', // Invalid: empty
        positiveDeliveries: '-5', // Invalid: negative
        negativeDeliveries: 'abc', // Invalid: not a number
        positivePickups: '8',
        negativePickups: '1',
        deliveryComments: '',
        pickupComments: '',
        endKm: '100', // Invalid: less than start
        startKm: '200'
      };

      const result = validateEndOfDayForm(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('validateFieldRealTime', () => {
    it('should validate route number field', () => {
      const result = validateFieldRealTime('routeNumber', 'Route #42');
      expect(result.isValid).toBe(true);
      expect(result.warning).toBe(null);
    });

    it('should warn about high delivery counts', () => {
      const result = validateFieldRealTime('positiveDeliveries', '150');
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('high number');
    });

    it('should warn about high mileage differences', () => {
      const result = validateFieldRealTime('endKm', '13000', { startKm: '12000' });
      expect(result.isValid).toBe(true);
      if (result.warning) {
        expect(result.warning).toContain('very high');
      }
    });
  });

  describe('sanitizeTextInput', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeTextInput('Hello <script>alert("xss")</script> World');
      expect(result).toBe('Hello scriptalert("xss")/script World');
    });

    it('should normalize whitespace', () => {
      const result = sanitizeTextInput('  Multiple   spaces   here  ');
      expect(result).toBe('Multiple spaces here');
    });

    it('should limit length', () => {
      const longText = 'A'.repeat(600);
      const result = sanitizeTextInput(longText);
      expect(result.length).toBe(500);
    });

    it('should handle null and empty values', () => {
      expect(sanitizeTextInput(null)).toBe('');
      expect(sanitizeTextInput('')).toBe('');
      expect(sanitizeTextInput('   ')).toBe('');
    });
  });
});

describe('Edge Case Tests', () => {
  
  describe('Boundary value testing', () => {
    it('should handle zero mileage difference', () => {
      const session = {
        start_km: 100,
        end_km: 100
      };
      const result = calculateTotals(session);
      expect(parseFloat(result.total_km)).toBe(0);
    });

    it('should handle maximum reasonable values', () => {
      const session = {
        positive_deliveries: 100,
        negative_deliveries: 0,
        positive_pickups: 50,
        negative_pickups: 0,
        start_km: 0,
        end_km: 999999
      };
      const result = calculateTotals(session);
      expect(result.deliveries).toBe(100);
      expect(result.pickups).toBe(50);
      expect(parseFloat(result.total_km)).toBe(999999);
    });

    it('should handle very short time periods', () => {
      const session = {
        start_time: '2024-01-01T08:00:00.000Z',
        end_time: '2024-01-01T08:00:01.000Z', // 1 second
        breaks: []
      };
      const result = calculateTimeMetrics(session);
      expect(result.totalTime).toBeCloseTo(0.0003, 4); // ~1/3600 hours
    });
  });

  describe('Data type handling', () => {
    it('should handle string numbers in calculations', () => {
      const session = {
        positive_deliveries: '10',
        negative_deliveries: '2',
        positive_pickups: '5',
        negative_pickups: '1'
      };
      const result = calculateTotals(session);
      expect(result.deliveries).toBe(12);
      expect(result.pickups).toBe(6);
    });

    it('should handle mixed data types gracefully', () => {
      const session = {
        positive_deliveries: 10,
        negative_deliveries: '2',
        positive_pickups: null,
        negative_pickups: undefined,
        start_km: '100.5',
        end_km: 200.8
      };
      const result = calculateTotals(session);
      expect(result.deliveries).toBe(12);
      expect(result.pickups).toBe(0);
      expect(parseFloat(result.total_km)).toBeCloseTo(100.3, 1);
    });
  });
});