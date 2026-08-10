/**
 * Validation Module
 * 
 * Centralized input validation, sanitization, and error handling.
 * Provides consistent validation across all calculators.
 * 
 * @module modules/validation
 */

// ── Validation Rules ───────────────────────────────────────────

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string} error - Error message if invalid
 * @property {*} value - Validated/sanitized value
 */

/**
 * Validate required field
 * @param {*} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {ValidationResult} Validation result
 */
export function validateRequired(value, fieldName = 'This field') {
    if (value === null || value === undefined || value === '') {
        return {
            isValid: false,
            error: `${fieldName} is required`,
            value: null
        };
    }
    
    return {
        isValid: true,
        error: null,
        value: value
    };
}

/**
 * Validate number
 * @param {*} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {boolean} options.required - Whether field is required
 * @param {string} options.fieldName - Field name for error message
 * @returns {ValidationResult} Validation result
 */
export function validateNumber(value, options = {}) {
    const {
        min = -Infinity,
        max = Infinity,
        required = false,
        fieldName = 'This field'
    } = options;
    
    // Check required
    if (value === null || value === undefined || value === '') {
        if (required) {
            return {
                isValid: false,
                error: `${fieldName} is required`,
                value: null
            };
        }
        return {
            isValid: true,
            error: null,
            value: null
        };
    }
    
    // Parse number
    const num = parseFloat(value);
    
    if (isNaN(num)) {
        return {
            isValid: false,
            error: `${fieldName} must be a valid number`,
            value: null
        };
    }
    
    // Check range
    if (num < min) {
        return {
            isValid: false,
            error: `${fieldName} must be at least ${min}`,
            value: null
        };
    }
    
    if (num > max) {
        return {
            isValid: false,
            error: `${fieldName} must be at most ${max}`,
            value: null
        };
    }
    
    return {
        isValid: true,
        error: null,
        value: num
    };
}

/**
 * Validate integer
 * @param {*} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
export function validateInteger(value, options = {}) {
    const result = validateNumber(value, options);
    
    if (result.isValid && result.value !== null) {
        if (!Number.isInteger(result.value)) {
            return {
                isValid: false,
                error: options.fieldName || 'This field' + ' must be a whole number',
                value: null
            };
        }
    }
    
    return result;
}

/**
 * Validate percentage
 * @param {*} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
export function validatePercentage(value, options = {}) {
    const {
        min = 0,
        max = 100,
        fieldName = 'Percentage'
    } = options;
    
    const result = validateNumber(value, {
        min,
        max,
        fieldName,
        required: options.required
    });
    
    if (result.isValid && result.value !== null) {
        // Convert to decimal if needed
        if (result.value > 1 && result.value <= 100) {
            result.value = result.value / 100;
        }
    }
    
    return result;
}

/**
 * Validate email
 * @param {string} value - Email to validate
 * @param {boolean} required - Whether field is required
 * @returns {ValidationResult} Validation result
 */
export function validateEmail(value, required = false) {
    if (!value || value.trim() === '') {
        if (required) {
            return {
                isValid: false,
                error: 'Email is required',
                value: null
            };
        }
        return {
            isValid: true,
            error: null,
            value: null
        };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(value)) {
        return {
            isValid: false,
            error: 'Please enter a valid email address',
            value: null
        };
    }
    
    return {
        isValid: true,
        error: null,
        value: value.toLowerCase().trim()
    };
}

/**
 * Validate URL
 * @param {string} value - URL to validate
 * @param {boolean} required - Whether field is required
 * @returns {ValidationResult} Validation result
 */
export function validateUrl(value, required = false) {
    if (!value || value.trim() === '') {
        if (required) {
            return {
                isValid: false,
                error: 'URL is required',
                value: null
            };
        }
        return {
            isValid: true,
            error: null,
            value: null
        };
    }
    
    try {
        new URL(value);
        return {
            isValid: true,
            error: null,
            value: value
        };
    } catch (error) {
        return {
            isValid: false,
            error: 'Please enter a valid URL',
            value: null
        };
    }
}

/**
 * Validate date
 * @param {*} value - Date to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
export function validateDate(value, options = {}) {
    const {
        min,
        max,
        required = false,
        fieldName = 'Date'
    } = options;
    
    if (!value || value === '') {
        if (required) {
            return {
                isValid: false,
                error: `${fieldName} is required`,
                value: null
            };
        }
        return {
            isValid: true,
            error: null,
            value: null
        };
    }
    
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
        return {
            isValid: false,
            error: `${fieldName} must be a valid date`,
            value: null
        };
    }
    
    // Check min date
    if (min) {
        const minDate = new Date(min);
        if (date < minDate) {
            return {
                isValid: false,
                error: `${fieldName} must be after ${minDate.toLocaleDateString()}`,
                value: null
            };
        }
    }
    
    // Check max date
    if (max) {
        const maxDate = new Date(max);
        if (date > maxDate) {
            return {
                isValid: false,
                error: `${fieldName} must be before ${maxDate.toLocaleDateString()}`,
                value: null
            };
        }
    }
    
    return {
        isValid: true,
        error: null,
        value: date
    };
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {Object} options - Validation options
 * @returns {ValidationResult} Validation result
 */
export function validateLength(value, options = {}) {
    const {
        min = 0,
        max = Infinity,
        required = false,
        fieldName = 'This field'
    } = options;
    
    if (!value || value.trim() === '') {
        if (required) {
            return {
                isValid: false,
                error: `${fieldName} is required`,
                value: null
            };
        }
        return {
            isValid: true,
            error: null,
            value: value
        };
    }
    
    const length = value.length;
    
    if (length < min) {
        return {
            isValid: false,
            error: `${fieldName} must be at least ${min} characters`,
            value: null
        };
    }
    
    if (length > max) {
        return {
            isValid: false,
            error: `${fieldName} must be at most ${max} characters`,
            value: null
        };
    }
    
    return {
        isValid: true,
        error: null,
        value: value
    };
}

/**
 * Validate selection
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Allowed values
 * @param {boolean} required - Whether field is required
 * @param {string} fieldName - Field name for error message
 * @returns {ValidationResult} Validation result
 */
export function validateSelection(value, allowedValues, required = false, fieldName = 'This field') {
    if (value === null || value === undefined || value === '') {
        if (required) {
            return {
                isValid: false,
                error: `${fieldName} is required`,
                value: null
            };
        }
        return {
            isValid: true,
            error: null,
            value: null
        };
    }
    
    if (!allowedValues.includes(value)) {
        return {
            isValid: false,
            error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
            value: null
        };
    }
    
    return {
        isValid: true,
        error: null,
        value: value
    };
}

// ── Sanitization ───────────────────────────────────────────────

/**
 * Sanitize string input
 * @param {string} value - Value to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeString(value, options = {}) {
    const {
        trim = true,
        escapeHtml = true,
        maxLength = null
    } = options;
    
    if (value === null || value === undefined) {
        return '';
    }
    
    let sanitized = String(value);
    
    // Trim whitespace
    if (trim) {
        sanitized = sanitized.trim();
    }
    
    // Escape HTML
    if (escapeHtml) {
        sanitized = escapeHtml(sanitized);
    }
    
    // Limit length
    if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
}

/**
 * Sanitize number input
 * @param {*} value - Value to sanitize
 * @param {number} fallback - Fallback value
 * @returns {number} Sanitized number
 */
export function sanitizeNumber(value, fallback = 0) {
    if (value === null || value === undefined) {
        return fallback;
    }
    
    const num = parseFloat(value);
    
    if (isNaN(num) || !isFinite(num)) {
        return fallback;
    }
    
    return num;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) {
        return '';
    }
    
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// ── Form Validation ────────────────────────────────────────────

/**
 * Validate form fields
 * @param {Object} values - Form values
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result
 */
export function validateForm(values, rules) {
    const errors = {};
    const sanitizedValues = {};
    
    Object.entries(rules).forEach(([fieldName, rule]) => {
        const value = values[fieldName];
        let result;
        
        // Apply validation rule
        switch (rule.type) {
            case 'required':
                result = validateRequired(value, rule.label || fieldName);
                break;
            
            case 'number':
                result = validateNumber(value, {
                    ...rule,
                    fieldName: rule.label || fieldName
                });
                break;
            
            case 'integer':
                result = validateInteger(value, {
                    ...rule,
                    fieldName: rule.label || fieldName
                });
                break;
            
            case 'percentage':
                result = validatePercentage(value, {
                    ...rule,
                    fieldName: rule.label || fieldName
                });
                break;
            
            case 'email':
                result = validateEmail(value, rule.required);
                break;
            
            case 'url':
                result = validateUrl(value, rule.required);
                break;
            
            case 'date':
                result = validateDate(value, {
                    ...rule,
                    fieldName: rule.label || fieldName
                });
                break;
            
            case 'length':
                result = validateLength(value, {
                    ...rule,
                    fieldName: rule.label || fieldName
                });
                break;
            
            case 'selection':
                result = validateSelection(value, rule.allowedValues, rule.required, rule.label || fieldName);
                break;
            
            default:
                result = { isValid: true, error: null, value };
        }
        
        // Store result
        if (!result.isValid) {
            errors[fieldName] = result.error;
        }
        
        // Sanitize value
        if (rule.type === 'number' || rule.type === 'integer' || rule.type === 'percentage') {
            sanitizedValues[fieldName] = result.value;
        } else if (rule.type === 'string') {
            sanitizedValues[fieldName] = sanitizeString(result.value, rule.sanitize);
        } else {
            sanitizedValues[fieldName] = result.value;
        }
    });
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        values: sanitizedValues
    };
}

/**
 * Show validation error for field
 * @param {string} fieldId - Field ID
 * @param {string} error - Error message
 */
export function showFieldError(fieldId, error) {
    const field = document.getElementById(fieldId);
    const errorElement = document.querySelector(`[data-error="${fieldId}"]`);
    
    if (field) {
        field.classList.add('error');
    }
    
    if (errorElement) {
        errorElement.textContent = error;
        errorElement.classList.remove('hidden');
    }
}

/**
 * Clear validation error for field
 * @param {string} fieldId - Field ID
 */
export function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.querySelector(`[data-error="${fieldId}"]`);
    
    if (field) {
        field.classList.remove('error');
    }
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
    }
}

/**
 * Clear all validation errors
 * @param {HTMLElement} container - Container element
 */
export function clearAllErrors(container) {
    const errorElements = container.querySelectorAll('.field-error');
    const errorFields = container.querySelectorAll('.error');
    
    errorElements.forEach(el => {
        el.textContent = '';
        el.classList.add('hidden');
    });
    
    errorFields.forEach(el => {
        el.classList.remove('error');
    });
}

// ── Validation Helpers ─────────────────────────────────────────

/**
 * Create validation schema for a calculator
 * @param {Array} fields - Field definitions
 * @returns {Object} Validation rules
 */
export function createValidationSchema(fields) {
    const rules = {};
    
    fields.forEach(field => {
        if (!field.validations) return;
        
        rules[field.id] = {
            type: field.validations.type || 'number',
            required: field.required || false,
            label: field.label,
            ...field.validations
        };
    });
    
    return rules;
}

/**
 * Validate calculator inputs
 * @param {Object} values - Input values
 * @param {Array} fields - Field definitions
 * @returns {Object} Validation result
 */
export function validateCalculatorInputs(values, fields) {
    const rules = createValidationSchema(fields);
    return validateForm(values, rules);
}

// Log module initialization
console.log('Validation module loaded');