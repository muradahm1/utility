/**
 * Formatting Module
 * 
 * Shared number, currency, percentage, and text formatting utilities used by the UI.
 * Provides consistent formatting across all calculators and modules.
 * 
 * @module modules/formatting
 */

import { 
    formatCurrency, 
    formatNumber, 
    formatPercentage, 
    formatAbbreviated,
    formatOrdinal,
    formatFinancialScale,
    formatPercentageChange,
    formatRatio,
    DECIMAL_PLACES 
} from '../utils/currency.js';

// ── Number Formatting ──────────────────────────────────────────

/**
 * Format a number with default settings
 * @param {number} value - Value to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number
 */
export function formatValue(value, options = {}) {
    const { decimals = 2, locale = 'en-US' } = options;
    const num = safeNumber(value, 0);
    
    return num.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Format large numbers with abbreviations
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Abbreviated number
 */
export function formatLargeNumber(value, decimals = 1) {
    return formatAbbreviated(value, decimals);
}

/**
 * Format percentage with sign
 * @param {number} value - Value to format (decimal)
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Formatted percentage
 */
export function formatPercent(value, decimals = 1) {
    return formatPercentageChange(value, decimals);
}

/**
 * Format ratio or rate
 * @param {number} value - Value to format
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted ratio
 */
export function formatRate(value, decimals = 2) {
    return formatRatio(value, decimals);
}

// ── Currency Formatting ────────────────────────────────────────

/**
 * Format currency with symbol
 * @param {number} value - Value to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency
 */
export function formatMoney(value, currency = 'USD', options = {}) {
    return formatCurrency(value, { currency, ...options });
}

/**
 * Format currency without cents
 * @param {number} value - Value to format
 * @returns {string} Formatted currency
 */
export function formatMoneyNoCents(value) {
    return formatCurrency(value, { minFractionDigits: 0, maxFractionDigits: 0 });
}

/**
 * Format currency in thousands/millions
 * @param {number} value - Value to format
 * @returns {string} Formatted currency
 */
export function formatMoneyScale(value) {
    return formatFinancialScale(value, 2);
}

// ── Text Formatting ────────────────────────────────────────────

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} Title case string
 */
export function titleCase(str) {
    if (!str) return '';
    return str.split(' ').map(word => capitalize(word)).join(' ');
}

/**
 * Truncate text with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength = 100) {
    if (!str || str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength).trim() + '...';
}

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
    if (!phone) return '';
    
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    if (cleaned.length === 11 && cleaned[0] === '1') {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return phone;
}

/**
 * Format SSN
 * @param {string} ssn - SSN
 * @returns {string} Formatted SSN
 */
export function formatSSN(ssn) {
    if (!ssn) return '';
    
    const cleaned = ssn.replace(/\D/g, '');
    
    if (cleaned.length === 9) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
    }
    
    return ssn;
}

// ── List Formatting ────────────────────────────────────────────

/**
 * Format array as comma-separated list
 * @param {Array} items - Array of items
 * @param {Object} options - Formatting options
 * @returns {string} Formatted list
 */
export function formatList(items, options = {}) {
    const {
        separator = ', ',
        lastSeparator = ' and ',
        maxItems = null
    } = options;
    
    if (!items || items.length === 0) {
        return '';
    }
    
    let displayItems = items;
    
    if (maxItems && items.length > maxItems) {
        displayItems = items.slice(0, maxItems);
        displayItems.push(`+${items.length - maxItems} more`);
    }
    
    if (displayItems.length === 1) {
        return displayItems[0];
    }
    
    if (displayItems.length === 2) {
        return displayItems.join(lastSeparator);
    }
    
    const lastItem = displayItems.pop();
    return displayItems.join(separator) + separator + lastItem;
}

/**
 * Format array as bulleted list
 * @param {Array} items - Array of items
 * @param {string} bullet - Bullet character (default: '•')
 * @returns {string} Formatted bulleted list
 */
export function formatBulletedList(items, bullet = '•') {
    if (!items || items.length === 0) {
        return '';
    }
    
    return items.map(item => `${bullet} ${item}`).join('\n');
}

// ── Time Formatting ────────────────────────────────────────────

/**
 * Format duration in human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
    if (!seconds || seconds < 0) {
        return '0 seconds';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    
    if (hours > 0) {
        parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    if (secs > 0 || parts.length === 0) {
        parts.push(`${secs} second${secs > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
}

/**
 * Format time ago
 * @param {Date|string} date - Date to format
 * @returns {string} Time ago string
 */
export function formatTimeAgo(date) {
    const d = new Date(date);
    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);
    
    if (seconds < 60) {
        return 'just now';
    }
    
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    
    if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    const days = Math.floor(hours / 24);
    
    if (days < 7) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    const weeks = Math.floor(days / 7);
    
    if (weeks < 4) {
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    
    const months = Math.floor(days / 30);
    
    if (months < 12) {
        return `${months} month${months > 1 ? 's' : ''} ago`;
    }
    
    const years = Math.floor(days / 365);
    
    return `${years} year${years > 1 ? 's' : ''} ago`;
}

// ── Address Formatting ─────────────────────────────────────────

/**
 * Format address
 * @param {Object} address - Address object
 * @returns {string} Formatted address
 */
export function formatAddress(address) {
    if (!address) return '';
    
    const parts = [];
    
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
}

// ── File Size Formatting ───────────────────────────────────────

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes, decimals = 2) {
    if (!bytes || bytes === 0) {
        return '0 Bytes';
    }
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
    
    return `${size} ${sizes[i]}`;
}

// ── Card Formatting ────────────────────────────────────────────

/**
 * Format credit card number
 * @param {string} cardNumber - Card number
 * @returns {string} Formatted card number
 */
export function formatCreditCard(cardNumber) {
    if (!cardNumber) return '';
    
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Format in groups of 4
    return cleaned.match(/.{1,4}/g)?.join(' ') || cardNumber;
}

/**
 * Format credit card expiry
 * @param {string} expiry - Expiry date (MM/YY or MM/YYYY)
 * @returns {string} Formatted expiry
 */
export function formatCreditCardExpiry(expiry) {
    if (!expiry) return '';
    
    const cleaned = expiry.replace(/\D/g, '');
    
    if (cleaned.length === 4) {
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    
    return expiry;
}

/**
 * Mask credit card number
 * @param {string} cardNumber - Card number
 * @returns {string} Masked card number
 */
export function maskCreditCard(cardNumber) {
    if (!cardNumber) return '';
    
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.length < 4) {
        return cardNumber;
    }
    
    const lastFour = cleaned.slice(-4);
    const masked = '*'.repeat(cleaned.length - 4);
    
    return formatCreditCard(masked + lastFour);
}

// ── Utility Functions ──────────────────────────────────────────

/**
 * Safe number conversion
 * @param {*} val - Value to convert
 * @param {number} fallback - Fallback value
 * @returns {number} Safe number
 */
function safeNumber(val, fallback = 0) {
    if (val === null || val === undefined) {
        return fallback;
    }
    
    const num = parseFloat(val);
    
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
function escapeHtml(str) {
    if (str === null || str === undefined) {
        return '';
    }
    
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// ── Formatting Presets ─────────────────────────────────────────

/**
 * Common formatting presets
 */
export const FORMAT_PRESETS = {
    CURRENCY: {
        decimals: 2,
        locale: 'en-US'
    },
    PERCENTAGE: {
        decimals: 2,
        asPercentage: true
    },
    RATE: {
        decimals: 4,
        asPercentage: true
    },
    INTEGER: {
        decimals: 0
    },
    PRECISE: {
        decimals: 6
    }
};

// Log module initialization
console.log('Formatting module loaded');