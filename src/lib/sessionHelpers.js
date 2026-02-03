// Helper functions for session calculations and validation
// Used by TimeTracking and other components

/**
 * Calculate total deliveries/pickups for backward compatibility
 * @param {Object} session - Session object with positive/negative counts
 * @returns {Object} Session with calculated totals
 */
export const calculateTotals = (session) => {
  const positiveDeliveries = parseInt(session.positive_deliveries) || 0;
  const negativeDeliveries = parseInt(session.negative_deliveries) || 0;
  const positivePickups = parseInt(session.positive_pickups) || 0;
  const negativePickups = parseInt(session.negative_pickups) || 0;
  
  let totalKm = null;
  if (session.end_km != null && session.start_km != null) {
    const endKm = parseFloat(session.end_km);
    const startKm = parseFloat(session.start_km);
    if (!isNaN(endKm) && !isNaN(startKm)) {
      totalKm = (endKm - startKm).toFixed(2);
    }
  }
  
  return {
    ...session,
    deliveries: positiveDeliveries + negativeDeliveries,
    pickups: positivePickups + negativePickups,
    total_km: totalKm
  };
};

/**
 * Calculate enhanced time metrics for KPI reporting
 * @param {Object} session - Session object with time data
 * @returns {Object} Time metrics in hours
 */
export const calculateTimeMetrics = (session) => {
  if (!session.start_time || !session.end_time) {
    return {
      totalTime: 0,
      breakTime: 0,
      workTime: 0
    };
  }

  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  const totalTime = end - start;
  
  const breakTime = (session.breaks || []).reduce((total, brk) => {
    if (brk.end) {
      return total + (new Date(brk.end) - new Date(brk.start));
    }
    return total;
  }, 0);
  
  const workTime = totalTime - breakTime;
  
  return {
    totalTime: totalTime / (1000 * 60 * 60), // hours
    breakTime: breakTime / (1000 * 60 * 60), // hours
    workTime: workTime / (1000 * 60 * 60)    // hours
  };
};

/**
 * Validate session data before saving
 * @param {Object} sessionData - Session data to validate
 * @returns {Array} Array of error messages (empty if valid)
 */
export const validateSession = (sessionData) => {
  const errors = [];
  
  // Mileage validation
  if (sessionData.end_km != null && sessionData.start_km != null) {
    const endKm = parseFloat(sessionData.end_km);
    const startKm = parseFloat(sessionData.start_km);
    
    if (isNaN(endKm) || isNaN(startKm)) {
      errors.push('Mileage values must be valid numbers');
    } else if (endKm < startKm) {
      errors.push('Ending KM must be greater than starting KM');
    }
  }
  
  // Delivery/pickup validation
  const posDeliveries = parseInt(sessionData.positive_deliveries) || 0;
  const negDeliveries = parseInt(sessionData.negative_deliveries) || 0;
  const posPickups = parseInt(sessionData.positive_pickups) || 0;
  const negPickups = parseInt(sessionData.negative_pickups) || 0;
  
  if (posDeliveries < 0 || negDeliveries < 0) {
    errors.push('Delivery counts cannot be negative');
  }
  
  if (posPickups < 0 || negPickups < 0) {
    errors.push('Pickup counts cannot be negative');
  }
  
  // Time sequence validation for breaks
  if (sessionData.breaks && Array.isArray(sessionData.breaks)) {
    sessionData.breaks.forEach((brk, idx) => {
      if (brk.start && brk.end) {
        const startTime = new Date(brk.start);
        const endTime = new Date(brk.end);
        
        if (endTime <= startTime) {
          errors.push(`Break ${idx + 1}: End time must be after start time`);
        }
        
        // Check if break times are within work period
        if (sessionData.start_time && sessionData.end_time) {
          const workStart = new Date(sessionData.start_time);
          const workEnd = new Date(sessionData.end_time);
          
          if (startTime < workStart || endTime > workEnd) {
            errors.push(`Break ${idx + 1}: Break times must be within work period`);
          }
        }
      }
    });
    
    // Check for overlapping breaks
    for (let i = 0; i < sessionData.breaks.length - 1; i++) {
      const currentBreak = sessionData.breaks[i];
      const nextBreak = sessionData.breaks[i + 1];
      
      if (currentBreak.end && nextBreak.start) {
        const currentEnd = new Date(currentBreak.end);
        const nextStart = new Date(nextBreak.start);
        
        if (currentEnd > nextStart) {
          errors.push(`Breaks ${i + 1} and ${i + 2}: Breaks cannot overlap`);
        }
      }
    }
  }
  
  return errors;
};

/**
 * Format time for display
 * @param {string} isoString - ISO timestamp string
 * @returns {string} Formatted time string
 */
export const formatTime = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format time for HTML time input
 * @param {string} isoString - ISO timestamp string
 * @returns {string} Time string in HH:MM format
 */
export const formatTimeForInput = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toTimeString().slice(0, 5); // HH:MM format
};

/**
 * Convert time input value to ISO string for current date
 * @param {string} timeValue - Time in HH:MM format
 * @param {string} baseDate - Base date ISO string (optional, defaults to today)
 * @returns {string} ISO timestamp string
 */
export const timeInputToISO = (timeValue, baseDate = null) => {
  if (!timeValue) return null;
  
  const base = baseDate ? new Date(baseDate) : new Date();
  const [hours, minutes] = timeValue.split(':').map(Number);
  
  const result = new Date(base);
  result.setHours(hours, minutes, 0, 0);
  
  return result.toISOString();
};

/**
 * Validate break time edit
 * @param {Array} breaks - Current breaks array
 * @param {number} breakIndex - Index of break being edited
 * @param {string} field - 'start' or 'end'
 * @param {string} newTime - New time value in HH:MM format
 * @param {Object} session - Full session object for context
 * @returns {Object} {isValid: boolean, error: string}
 */
export const validateBreakTimeEdit = (breaks, breakIndex, field, newTime, session) => {
  if (!newTime) {
    return { isValid: false, error: 'Time is required' };
  }
  
  const breakToEdit = breaks[breakIndex];
  if (!breakToEdit) {
    return { isValid: false, error: 'Break not found' };
  }
  
  // Create updated break with new time
  const updatedBreak = { ...breakToEdit };
  updatedBreak[field] = timeInputToISO(newTime, session.date);
  
  // Validate the updated break
  if (updatedBreak.start && updatedBreak.end) {
    const startTime = new Date(updatedBreak.start);
    const endTime = new Date(updatedBreak.end);
    
    if (endTime <= startTime) {
      return { isValid: false, error: 'End time must be after start time' };
    }
  }
  
  // Check against work period
  if (session.start_time && session.end_time) {
    const workStart = new Date(session.start_time);
    const workEnd = new Date(session.end_time);
    const newTimeDate = new Date(updatedBreak[field]);
    
    if (newTimeDate < workStart || newTimeDate > workEnd) {
      return { isValid: false, error: 'Break time must be within work period' };
    }
  }
  
  // Check for overlaps with other breaks
  const updatedBreaks = [...breaks];
  updatedBreaks[breakIndex] = updatedBreak;
  
  for (let i = 0; i < updatedBreaks.length; i++) {
    if (i === breakIndex) continue;
    
    const otherBreak = updatedBreaks[i];
    if (!otherBreak.start || !otherBreak.end || !updatedBreak.start || !updatedBreak.end) continue;
    
    const otherStart = new Date(otherBreak.start);
    const otherEnd = new Date(otherBreak.end);
    const thisStart = new Date(updatedBreak.start);
    const thisEnd = new Date(updatedBreak.end);
    
    // Check for overlap
    if ((thisStart < otherEnd && thisEnd > otherStart)) {
      return { isValid: false, error: `Break overlaps with break ${i + 1}` };
    }
  }
  
  return { isValid: true, error: null };
};

/**
 * Get default form values for new session
 * @returns {Object} Default form values
 */
export const getDefaultFormValues = () => ({
  routeNumber: '',
  positiveDeliveries: '',
  negativeDeliveries: '',
  positivePickups: '',
  negativePickups: '',
  deliveryComments: '',
  pickupComments: '',
  startKm: '',
  endKm: ''
});

/**
 * Check if comments are required based on negative counts
 * @param {number} negativeCount - Number of negative deliveries/pickups
 * @returns {boolean} Whether comments are recommended
 */
export const areCommentsRecommended = (negativeCount) => {
  return parseInt(negativeCount) > 0;
};