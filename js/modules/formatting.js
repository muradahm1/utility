/**
 * Formatting Module
 * 
 * Shared number, currency, percentage, and text formatting.
 * 
 * @module modules/formatting
 */

import { formatCurrency, formatNumber, formatPercentage, formatAbbreviated, formatOrdinal, roundTo } from '../utils/index.js';

export function formatValue(value, options = {}) {
    const { decimals = 2, locale = 'en-US' } = options;
    const num = Number(value);
    if (isNaN(num)) return '—';
    return num.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatLargeNumber(value, decimals = 1) {
    return formatAbbreviated(value, decimals);
}

export function formatPercent(value, decimals = 2) {
    return formatPercentage(value, { decimals });
}

export function formatRate(value, decimals = 4) {
    return formatValue(value, { decimals });
}

export function formatMoney(value, currency = 'USD') {
    return formatCurrency(value, { currency });
}

export function formatMoneyNoCents(value) {
    const num = Number(value);
    if (isNaN(num)) return '$0';
    return '$' + Math.round(num).toLocaleString('en-US');
}

export function formatMoneyScale(value) {
    const num = Number(value);
    if (isNaN(num)) return '$0';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + ' Billion';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + ' Million';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + ' Thousand';
    return '$' + num.toFixed(2);
}

export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function titleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => capitalize(word)).join(' ');
}

export function truncate(str, maxLength, suffix = '...') {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length).trimEnd() + suffix;
}

export function formatPhone(phone) {
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

export function formatSSN(ssn) {
    const cleaned = String(ssn).replace(/\D/g, '');
    if (cleaned.length === 9) {
        return `${cleaned.slice(0,3)}-${cleaned.slice(3,5)}-${cleaned.slice(5)}`;
    }
    return ssn;
}

export function formatAddress(address) {
    if (!address) return '';
    const parts = [address.street, address.city, address.state, address.zip, address.country].filter(Boolean);
    return parts.join(', ');
}

export function formatFileSize(bytes) {
    const num = Number(bytes);
    if (isNaN(num)) return '0 Bytes';
    if (num === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatCreditCard(cardNumber) {
    const cleaned = String(cardNumber).replace(/\D/g, '');
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function maskCreditCard(cardNumber) {
    const cleaned = String(cardNumber).replace(/\D/g, '');
    if (cleaned.length <= 4) return cleaned;
    const last4 = cleaned.slice(-4);
    return '*'.repeat(Math.max(0, cleaned.length - 4)) + last4;
}

export function formatList(items, options = {}) {
    const { separator = ', ', conjunction = 'and' } = options;
    if (!items || !items.length) return '';
    if (items.length === 1) return String(items[0]);
    if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
    return items.slice(0, -1).join(separator) + `${separator}${conjunction} ${items[items.length - 1]}`;
}

export function formatBulletedList(items, bullet = '•') {
    if (!items || !items.length) return '';
    return items.map(item => `${bullet} ${item}`).join('\n');
}

export function formatDuration(seconds) {
    const s = Number(seconds);
    if (isNaN(s) || s < 0) return '0 seconds';
    
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs > 1 ? 's' : ''}`);
    
    return parts.join(', ');
}

export function formatTimeAgo(date) {
    const d = new Date(date);
    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return d.toLocaleDateString();
}
