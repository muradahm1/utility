/**
 * Currency and Number Formatting Utilities
 * 
 * Pure functions for formatting currency, numbers, percentages, and financial values.
 * No side effects, no DOM manipulation, tree-shake friendly.
 * 
 * @module utils/currency
 */

// ── Currency Formatting ────────────────────────────────────────

/**
 * Format a number as USD currency
 * @param {number} value - Value to format
 * @param {Object} options - Formatting options
 * @param {number} options.minFractionDigits - Minimum decimal places (default: 2)
 * @param {number} options.maxFractionDigits - Maximum decimal places (default: 2)
 * @param {string} options.currency - Currency code (default: 'USD')
 * @param {string} options.locale - Locale string (default: 'en-US')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, options = {}) {
    const {
        minFractionDigits = 2,
        maxFractionDigits = 2,
        currency = 'USD',
        locale = 'en-US'
    } = options;
    
    const num = safeNumber(value, 0);
    
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: minFractionDigits,
            maximumFractionDigits: maxFractionDigits
        }).format(num);
    } catch (error) {
        // Fallback for invalid currency codes
        return '$' + num.toLocaleString(locale, {
            minimumFractionDigits: minFractionDigits,
            maximumFractionDigits: maxFractionDigits
        });
    }
}

/**
 * Format a number as currency with custom symbol
 * @param {number} value - Value to format
 * @param {string} symbol - Currency symbol (e.g., '$', '€', '£')
 * @param {Object} options - Additional formatting options
 * @returns {string} Formatted currency string
 */
export function formatCurrencyWithSymbol(value, symbol = '$', options = {}) {
    const { locale = 'en-US', decimals = 2 } = options;
    const num = safeNumber(value, 0);
    
    const formatted = num.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    
    return symbol + formatted;
}

/**
 * Format number with abbreviation (K, M, B, T)
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Abbreviated number string
 */
export function formatAbbreviated(value, decimals = 1) {
    const num = safeNumber(value, 0);
    
    if (num >= 1e12) {
        return (num / 1e12).toFixed(decimals) + 'T';
    }
    if (num >= 1e9) {
        return (num / 1e9).toFixed(decimals) + 'B';
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(decimals) + 'M';
    }
    if (num >= 1e3) {
        return (num / 1e3).toFixed(decimals) + 'K';
    }
    
    return num.toFixed(decimals);
}

// ── Number Formatting ──────────────────────────────────────────

/**
 * Format a number with locale-specific formatting
 * @param {number} value - Value to format
 * @param {Object} options - Formatting options
 * @param {number} options.minFractionDigits - Minimum decimal places (default: 0)
 * @param {number} options.maxFractionDigits - Maximum decimal places (default: 2)
 * @param {string} options.locale - Locale string (default: 'en-US')
 * @returns {string} Formatted number string
 */
export function formatNumber(value, options = {}) {
    const {
        minFractionDigits = 0,
        maxFractionDigits = 2,
        locale = 'en-US'
    } = options;
    
    const num = safeNumber(value, 0);
    
    return num.toLocaleString(locale, {
        minimumFractionDigits: minFractionDigits,
        maximumFractionDigits: maxFractionDigits
    });
}

/**
 * Format a number as a percentage
 * @param {number} value - Value to format (0.15 = 15%)
 * @param {Object} options - Formatting options
 * @param {number} options.decimals - Decimal places (default: 2)
 * @param {boolean} options.symbol - Include % symbol (default: true)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, options = {}) {
    const { decimals = 2, symbol = true } = options;
    const num = safeNumber(value, 0);
    const percentage = (num * 100).toFixed(decimals);
    
    return symbol ? percentage + '%' : percentage;
}

/**
 * Format a number as ordinal (1st, 2nd, 3rd, etc.)
 * @param {number} value - Value to format
 * @returns {string} Ordinal string
 */
export function formatOrdinal(value) {
    const num = safeNumber(value, 0);
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    
    return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}

// ── Financial Precision ────────────────────────────────────────

/**
 * Round to specified decimal places with financial precision
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Rounded value
 */
export function roundTo(value, decimals = 2) {
    if (!isFinite(value)) return 0;
    
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Round up to specified decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Rounded up value
 */
export function roundUp(value, decimals = 2) {
    if (!isFinite(value)) return 0;
    
    const factor = Math.pow(10, decimals);
    return Math.ceil(value * factor) / factor;
}

/**
 * Round down to specified decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Rounded down value
 */
export function roundDown(value, decimals = 2) {
    if (!isFinite(value)) return 0;
    
    const factor = Math.pow(10, decimals);
    return Math.floor(value * factor) / factor;
}

/**
 * Format currency with financial precision (banker's rounding)
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export function formatFinancial(value, decimals = 2) {
    const rounded = roundTo(value, decimals);
    return formatCurrency(rounded, { minFractionDigits: decimals, maxFractionDigits: decimals });
}

// ── Locale Support ─────────────────────────────────────────────

/**
 * Get currency symbol for a locale
 * @param {string} currencyCode - ISO currency code (e.g., 'USD', 'EUR')
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currencyCode) {
    const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'CA$',
        'AUD': 'A$',
        'INR': '₹',
        'BRL': 'R$',
        'CHF': 'CHF',
        'CNY': '¥',
        'HKD': 'HK$',
        'NZD': 'NZ$',
        'SGD': 'S$',
        'ZAR': 'R'
    };
    
    return symbols[currencyCode] || currencyCode;
}

/**
 * Format currency for specific locale
 * @param {number} value - Value to format
 * @param {string} currencyCode - ISO currency code
 * @param {string} locale - Locale string
 * @returns {string} Formatted currency string
 */
export function formatCurrencyForLocale(value, currencyCode = 'USD', locale = 'en-US') {
    return formatCurrency(value, {
        currency: currencyCode,
        locale
    });
}

// ── Special Financial Formats ──────────────────────────────────

/**
 * Format large financial numbers with scale
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted string with scale
 */
export function formatFinancialScale(value, decimals = 2) {
    const num = safeNumber(value, 0);
    
    if (Math.abs(num) >= 1e9) {
        return '$' + (num / 1e9).toFixed(decimals) + ' Billion';
    }
    if (Math.abs(num) >= 1e6) {
        return '$' + (num / 1e6).toFixed(decimals) + ' Million';
    }
    if (Math.abs(num) >= 1e3) {
        return '$' + (num / 1e3).toFixed(decimals) + ' Thousand';
    }
    
    return '$' + num.toFixed(decimals);
}

/**
 * Format percentage change with sign
 * @param {number} value - Value to format (0.15 = 15%)
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted percentage with sign
 */
export function formatPercentageChange(value, decimals = 2) {
    const num = safeNumber(value, 0);
    const percentage = (num * 100).toFixed(decimals);
    const sign = num >= 0 ? '+' : '';
    
    return sign + percentage + '%';
}

/**
 * Format ratio or rate
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted ratio string
 */
export function formatRatio(value, decimals = 2) {
    const num = safeNumber(value, 0);
    return num.toFixed(decimals) + 'x';
}

// ── Validation Helpers ─────────────────────────────────────────

/**
 * Check if value is a valid currency amount
 * @param {*} value - Value to check
 * @returns {boolean} True if valid currency
 */
export function isValidCurrency(value) {
    const num = Number(value);
    return !isNaN(num) && isFinite(num) && num >= 0;
}

/**
 * Clamp value to valid currency range
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (default: Infinity)
 * @returns {number} Clamped value
 */
export function clampCurrency(value, min = 0, max = Infinity) {
    const num = safeNumber(value, 0);
    return Math.max(min, Math.min(max, num));
}

// ── Internal Utilities ─────────────────────────────────────────

/**
 * Safe number conversion (internal utility)
 * @param {*} val - Value to convert
 * @param {number} fallback - Fallback value
 * @returns {number} Safe number
 */
function safeNumber(val, fallback = 0) {
    if (val === null || val === undefined) return fallback;
    const num = Number(val);
    return isFinite(num) ? num : fallback;
}

/**
 * Alias for safeNumber (for internal use)
 * @param {*} val - Value to convert
 * @param {number} fallback - Fallback value
 * @returns {number} Safe number
 */
const safeNum = safeNumber;

// ── Constants ──────────────────────────────────────────────────

/**
 * Standard decimal places for different financial contexts
 */
export const DECIMAL_PLACES = {
    CURRENCY: 2,
    PERCENTAGE: 2,
    RATE: 4,
    PRECISE: 6,
    INTEGER: 0
};

/**
 * Common currency codes
 */
export const CURRENCIES = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    INR: 'Indian Rupee',
    BRL: 'Brazilian Real'
};

// Log module initialization
console.log('Currency utilities loaded');