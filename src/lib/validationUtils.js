// Additional validation utilities for form inputs and data integrity

/**
 * Validate numeric input for deliveries/pickups
 * @param {string|number} value - The input value
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} {isValid: boolean, error: string, value: number}
 */
export const validateNumericInput = (value, fieldName) => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: true, error: null, value: 0 };
  }
  
  const numValue = parseInt(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} must be a valid number`, value: 0 };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative`, value: 0 };
  }
  
  if (numValue > 9999) {
    return { isValid: false, error: `${fieldName} seems unusually high (max 9999)`, value: 0 };
  }
  
  return { isValid: true, error: null, value: numValue };
};

/**
 * Validate mileage input
 * @param {string|number} value - The mileage value
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} {isValid: boolean, error: string, value: number}
 */
export const validateMileageInput = (value, fieldName) => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: true, error: null, value: null };
  }
  
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} must be a valid number`, value: null };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative`, value: null };
  }
  
  if (numValue > 9999999) {
    return { isValid: false, error: `${fieldName} seems unusually high`, value: null };
  }
  
  return { isValid: true, error: null, value: numValue };
};

/**
 * Validate route number format
 * @param {string} routeNumber - The route number
 * @returns {Object} {isValid: boolean, error: string}
 */
export const validateRouteNumber = (routeNumber) => {
  if (!routeNumber || routeNumber.trim() === '') {
    return { isValid: false, error: 'Route number is required' };
  }
  
  const trimmed = routeNumber.trim();
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Route number is too long (max 50 characters)' };
  }
  
  // Allow alphanumeric, spaces, hyphens, and hash symbols
  const validPattern = /^[a-zA-Z0-9\s\-#]+$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'Route number contains invalid characters' };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validate comment text
 * @param {string} comment - The comment text
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} {isValid: boolean, error: string}
 */
export const validateComment = (comment, fieldName) => {
  if (!comment || comment.trim() === '') {
    return { isValid: true, error: null }; // Comments are optional
  }
  
  const trimmed = comment.trim();
  
  if (trimmed.length > 500) {
    return { isValid: false, error: `${fieldName} is too long (max 500 characters)` };
  }
  
  return { isValid: true, error: null };
};

/**
 * Validate complete end-of-day form
 * @param {Object} formData - Form data object
 * @returns {Object} {isValid: boolean, errors: Array, cleanData: Object}
 */
export const validateEndOfDayForm = (formData) => {
  const errors = [];
  const cleanData = {};
  
  // Validate route number
  const routeValidation = validateRouteNumber(formData.routeNumber);
  if (!routeValidation.isValid) {
    errors.push(routeValidation.error);
  } else {
    cleanData.route_number = formData.routeNumber.trim();
  }
  
  // Validate positive deliveries
  const posDelValidation = validateNumericInput(formData.positiveDeliveries, 'Positive deliveries');
  if (!posDelValidation.isValid) {
    errors.push(posDelValidation.error);
  } else {
    cleanData.positive_deliveries = posDelValidation.value;
  }
  
  // Validate negative deliveries
  const negDelValidation = validateNumericInput(formData.negativeDeliveries, 'Negative deliveries');
  if (!negDelValidation.isValid) {
    errors.push(negDelValidation.error);
  } else {
    cleanData.negative_deliveries = negDelValidation.value;
  }
  
  // Validate positive pickups
  const posPickValidation = validateNumericInput(formData.positivePickups, 'Positive pickups');
  if (!posPickValidation.isValid) {
    errors.push(posPickValidation.error);
  } else {
    cleanData.positive_pickups = posPickValidation.value;
  }
  
  // Validate negative pickups
  const negPickValidation = validateNumericInput(formData.negativePickups, 'Negative pickups');
  if (!negPickValidation.isValid) {
    errors.push(negPickValidation.error);
  } else {
    cleanData.negative_pickups = negPickValidation.value;
  }
  
  // Validate delivery comments
  const delCommentValidation = validateComment(formData.deliveryComments, 'Delivery comments');
  if (!delCommentValidation.isValid) {
    errors.push(delCommentValidation.error);
  } else {
    cleanData.delivery_comments = formData.deliveryComments?.trim() || null;
  }
  
  // Validate pickup comments
  const pickupCommentValidation = validateComment(formData.pickupComments, 'Pickup comments');
  if (!pickupCommentValidation.isValid) {
    errors.push(pickupCommentValidation.error);
  } else {
    cleanData.pickup_comments = formData.pickupComments?.trim() || null;
  }
  
  // Validate ending mileage
  const endKmValidation = validateMileageInput(formData.endKm, 'Ending KM');
  if (!endKmValidation.isValid) {
    errors.push(endKmValidation.error);
  } else {
    cleanData.end_km = endKmValidation.value;
  }
  
  // Validate mileage relationship (if both start and end are provided)
  if (formData.startKm && cleanData.end_km) {
    const startKmValidation = validateMileageInput(formData.startKm, 'Starting KM');
    if (startKmValidation.isValid && startKmValidation.value >= cleanData.end_km) {
      errors.push('Ending KM must be greater than starting KM');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    cleanData
  };
};

/**
 * Client-side validation with real-time feedback
 * @param {string} fieldName - Name of the field being validated
 * @param {any} value - Current field value
 * @param {Object} context - Additional context (e.g., other form values)
 * @returns {Object} {isValid: boolean, error: string, warning: string}
 */
export const validateFieldRealTime = (fieldName, value, context = {}) => {
  switch (fieldName) {
    case 'routeNumber':
      const routeResult = validateRouteNumber(value);
      return { ...routeResult, warning: null };
      
    case 'positiveDeliveries':
    case 'negativeDeliveries':
    case 'positivePickups':
    case 'negativePickups':
      const numResult = validateNumericInput(value, fieldName);
      let warning = null;
      
      // Add warnings for unusual values
      if (numResult.isValid && numResult.value > 100) {
        warning = 'This seems like a high number. Please double-check.';
      }
      
      return { ...numResult, warning };
      
    case 'startKm':
    case 'endKm':
      const kmResult = validateMileageInput(value, fieldName);
      let kmWarning = null;
      
      // Check mileage relationship
      if (fieldName === 'endKm' && context.startKm && kmResult.isValid && kmResult.value) {
        const startKm = parseFloat(context.startKm);
        const distance = kmResult.value - startKm;
        
        if (distance > 1000) {
          kmWarning = 'Distance driven seems very high. Please verify.';
        } else if (distance < 1) {
          kmWarning = 'Very short distance. Is this correct?';
        }
      }
      
      return { ...kmResult, warning: kmWarning };
      
    case 'deliveryComments':
    case 'pickupComments':
      const commentResult = validateComment(value, fieldName);
      return { ...commentResult, warning: null };
      
    default:
      return { isValid: true, error: null, warning: null };
  }
};

/**
 * Sanitize text input to prevent XSS and clean up formatting
 * @param {string} text - Input text
 * @returns {string} Sanitized text
 */
export const sanitizeTextInput = (text) => {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500); // Limit length
};

/**
 * Format validation errors for display
 * @param {Array} errors - Array of error messages
 * @returns {string} Formatted error message
 */
export const formatValidationErrors = (errors) => {
  if (!errors || errors.length === 0) return '';
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  return `Please fix the following issues:\n• ${errors.join('\n• ')}`;
};