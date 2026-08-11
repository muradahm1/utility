/**
 * Validation Module
 * 
 * Centralized input validation, sanitization, and error handling.
 * Pure functions with no side effects, tree-shake friendly.
 * 
 * @module modules/validation
 */

import { escapeHtml } from '../utils/index.js';

// ── Validation Functions ─────────────────────────────────────────

export function validateRequired(value, fieldName = 'Field') {
    if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} is required`;
    }
    return null;
}

export function validateNumber(value, options = {}) {
    const { min, max, required, fieldName = 'Value' } = options;
    
    if (value === null || value === undefined || value === '') {
        if (required) return `${fieldName} is required`;
        return null;
    }
    
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
        return `${fieldName} must be a valid number`;
    }
    
    if (min !== undefined && num < min) {
        return `${fieldName} must be at least ${min}`;
    }
    
    if (max !== undefined && num > max) {
        return `${fieldName} must be at most ${max}`;
    }
    
    return null;
}

export function validateInteger(value, options = {}) {
    const { min, max, required, fieldName = 'Value' } = options;
    
    if (value === null || value === undefined || value === '') {
        if (required) return `${fieldName} is required`;
        return null;
    }
    
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num)) {
        return `${fieldName} must be a whole number`;
    }
    
    if (min !== undefined && num < min) {
        return `${fieldName} must be at least ${min}`;
    }
    
    if (max !== undefined && num > max) {
        return `${fieldName} must be at most ${max}`;
    }
    
    return null;
}

export function validatePercentage(value, options = {}) {
    const { min = 0, max = 100, required, fieldName = 'Percentage' } = options;
    return validateNumber(value, { min, max, required, fieldName });
}

export function validateEmail(value, required = false) {
    if (!value || value.trim() === '') {
        if (required) return 'Email is required';
        return null;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
    }
    
    return null;
}

export function validateUrl(value, required = false) {
    if (!value || value.trim() === '') {
        if (required) return 'URL is required';
        return null;
    }
    
    try {
        new URL(value);
        return null;
    } catch {
        return 'Please enter a valid URL';
    }
}

export function validateDate(value, options = {}) {
    const { min, max, required, fieldName = 'Date' } = options;
    
    if (!value) {
        if (required) return `${fieldName} is required`;
        return null;
    }
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        return `${fieldName} must be a valid date`;
    }
    
    if (min && date < new Date(min)) {
        return `${fieldName} must be on or after ${min}`;
    }
    
    if (max && date > new Date(max)) {
        return `${fieldName} must be on or before ${max}`;
    }
    
    return null;
}

export function validateLength(value, options = {}) {
    const { min, max, required, fieldName = 'Text' } = options;
    
    if (!value || value.trim() === '') {
        if (required) return `${fieldName} is required`;
        return null;
    }
    
    const len = value.length;
    if (min !== undefined && len < min) {
        return `${fieldName} must be at least ${min} characters`;
    }
    
    if (max !== undefined && len > max) {
        return `${fieldName} must be at most ${max} characters`;
    }
    
    return null;
}

export function validateSelection(value, allowed, required = false) {
    if (!value && !required) return null;
    if (!value) return 'Please make a selection';
    if (!allowed.includes(value)) return 'Invalid selection';
    return null;
}

// ── Sanitization ─────────────────────────────────────────────────

export function sanitizeString(value, options = {}) {
    const { maxLength, trim = true } = options;
    if (value === null || value === undefined) return '';
    let str = String(value);
    if (trim) str = str.trim();
    if (maxLength) str = str.slice(0, maxLength);
    return escapeHtml(str);
}

export function sanitizeNumber(value, fallback = 0) {
    const num = Number(value);
    return isFinite(num) ? num : fallback;
}

// ── Form Validation ──────────────────────────────────────────────

export function validateForm(values, rules) {
    const errors = {};
    let isValid = true;
    
    Object.entries(rules).forEach(([field, rule]) => {
        const value = values[field];
        let error = null;
        
        switch (rule.type) {
            case 'required':
                error = validateRequired(value, rule.label || field);
                break;
            case 'number':
                error = validateNumber(value, { ...rule, fieldName: rule.label || field });
                break;
            case 'integer':
                error = validateInteger(value, { ...rule, fieldName: rule.label || field });
                break;
            case 'percentage':
                error = validatePercentage(value, { ...rule, fieldName: rule.label || field });
                break;
            case 'email':
                error = validateEmail(value, rule.required);
                break;
            case 'url':
                error = validateUrl(value, rule.required);
                break;
            case 'date':
                error = validateDate(value, { ...rule, fieldName: rule.label || field });
                break;
            case 'length':
                error = validateLength(value, { ...rule, fieldName: rule.label || field });
                break;
            case 'selection':
                error = validateSelection(value, rule.allowed, rule.required);
                break;
            default:
                if (rule.validator && typeof rule.validator === 'function') {
                    error = rule.validator(value, values);
                }
        }
        
        if (error) {
            errors[field] = error;
            isValid = false;
        }
    });
    
    return { isValid, errors };
}

export function createValidationSchema(fields) {
    const schema = {};
    fields.forEach(field => {
        if (field.required) {
            schema[field.id] = { type: field.type || 'text', required: true, label: field.label };
        }
        if (field.type === 'number' || field.type === 'range') {
            schema[field.id] = {
                type: 'number',
                label: field.label,
                required: field.required,
                min: field.min,
                max: field.max
            };
        }
    });
    return schema;
}

export function validateCalculatorInputs(values, fields) {
    const errors = {};
    
    fields.forEach(field => {
        if (field.type !== 'number') return;
        const value = values[field.id];
        
        if (value === '' || value === null || value === undefined) {
            if (field.required) errors[field.id] = 'This field is required';
            return;
        }
        
        const num = parseFloat(value);
        if (isNaN(num)) {
            errors[field.id] = 'Please enter a valid number';
            return;
        }
        
        if (field.min !== undefined && num < field.min) {
            errors[field.id] = `Minimum value is ${field.min}`;
        }
        
        if (field.max !== undefined && num > field.max) {
            errors[field.id] = `Maximum value is ${field.max}`;
        }
    });
    
    return { isValid: Object.keys(errors).length === 0, errors };
}

// ── Error Display ────────────────────────────────────────────────

export function showFieldError(fieldId, error) {
    const input = document.getElementById(fieldId);
    const errEl = document.querySelector(`[data-error="${fieldId}"]`);
    if (input) input.classList.toggle('input-error', !!error);
    if (errEl) {
        errEl.textContent = error || '';
        errEl.classList.toggle('hidden', !error);
    }
}

export function clearFieldError(fieldId) {
    showFieldError(fieldId, null);
}

export function clearAllErrors(container) {
    if (!container) return;
    container.querySelectorAll('.field-error').forEach(el => {
        el.textContent = '';
        el.classList.add('hidden');
    });
    container.querySelectorAll('.input-error').forEach(el => {
        el.classList.remove('input-error');
    });
}
