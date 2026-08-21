/**
 * Unit tests for js/utils/currency.js
 * Covers formatting, edge cases (zero, negative, NaN, large numbers),
 * and currency symbol handling.
 */
import {
    formatCurrency, formatCurrencyWithSymbol, formatAbbreviated,
    formatNumber, formatPercentage, formatOrdinal, formatFinancial,
    getCurrencySymbol, formatCurrencyForLocale, formatFinancialScale,
    formatPercentageChange, formatRatio, isValidCurrency, clampCurrency,
    DECIMAL_PLACES, CURRENCIES
} from '../../js/utils/currency.js';

describe('formatCurrency', () => {
    it('formats USD by default', () => {
        expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });
    it('formats with specified currency', () => {
        expect(formatCurrency(1234.56, { currency: 'EUR' })).toBe('€1,234.56');
    });
    it('handles zero', () => {
        expect(formatCurrency(0)).toBe('$0.00');
    });
    it('handles negative values', () => {
        expect(formatCurrency(-500)).toBe('-$500.00');
    });
    it('handles NaN', () => {
        expect(formatCurrency(NaN)).toBe('$0.00');
    });
    it('handles large numbers', () => {
        expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });
    it('handles string input', () => {
        expect(formatCurrency('99.99')).toBe('$99.99');
    });
});

describe('formatCurrencyWithSymbol', () => {
    it('formats with explicit symbol', () => {
        const result = formatCurrencyWithSymbol(100, { symbol: '$' });
        expect(result).toContain('100');
    });
});

describe('formatAbbreviated', () => {
    it('abbreviates thousands', () => {
        expect(formatAbbreviated(1500)).toBe('1.5K');
    });
    it('abbreviates millions', () => {
        expect(formatAbbreviated(2500000)).toBe('2.5M');
    });
    it('abbreviates billions', () => {
        expect(formatAbbreviated(1500000000)).toBe('1.5B');
    });
    it('handles small numbers (1 decimal default)', () => {
        expect(formatAbbreviated(500)).toBe('500.0');
    });
});

describe('formatNumber', () => {
    it('formats with commas', () => {
        expect(formatNumber(1234567)).toBe('1,234,567');
    });
    it('handles decimals', () => {
        expect(formatNumber(1234.5678, { decimals: 2 })).toBe('1,234.57');
    });
    it('handles zero', () => {
        expect(formatNumber(0)).toBe('0');
    });
});

describe('formatPercentage', () => {
    it('formats as percentage', () => {
        expect(formatPercentage(0.15)).toBe('15.00%');
    });
    it('handles zero', () => {
        expect(formatPercentage(0)).toBe('0.00%');
    });
    it('handles negative', () => {
        expect(formatPercentage(-0.05)).toBe('-5.00%');
    });
    it('handles values > 1', () => {
        expect(formatPercentage(1.5)).toBe('150.00%');
    });
});

describe('formatOrdinal', () => {
    it('adds st suffix', () => {
        expect(formatOrdinal(1)).toBe('1st');
        expect(formatOrdinal(21)).toBe('21st');
    });
    it('adds nd suffix', () => {
        expect(formatOrdinal(2)).toBe('2nd');
        expect(formatOrdinal(22)).toBe('22nd');
    });
    it('adds rd suffix', () => {
        expect(formatOrdinal(3)).toBe('3rd');
        expect(formatOrdinal(23)).toBe('23rd');
    });
    it('adds th suffix', () => {
        expect(formatOrdinal(4)).toBe('4th');
        expect(formatOrdinal(11)).toBe('11th');
        expect(formatOrdinal(12)).toBe('12th');
        expect(formatOrdinal(13)).toBe('13th');
    });
});

describe('getCurrencySymbol', () => {
    it('returns USD symbol', () => {
        expect(getCurrencySymbol('USD')).toBe('$');
    });
    it('returns EUR symbol', () => {
        expect(getCurrencySymbol('EUR')).toBe('€');
    });
    it('returns GBP symbol', () => {
        expect(getCurrencySymbol('GBP')).toBe('£');
    });
    it('returns the code itself for unknown', () => {
        expect(getCurrencySymbol('XYZ')).toBe('XYZ');
    });
});

describe('isValidCurrency', () => {
    it('returns true for valid numeric amounts', () => {
        expect(isValidCurrency(100)).toBe(true);
        expect(isValidCurrency(0)).toBe(true);
        expect(isValidCurrency(99.99)).toBe(true);
    });
    it('returns false for non-numeric values', () => {
        expect(isValidCurrency('USD')).toBe(false);
        expect(isValidCurrency(NaN)).toBe(false);
        expect(isValidCurrency(Infinity)).toBe(false);
    });
});

describe('clampCurrency', () => {
    it('clamps to min', () => {
        expect(clampCurrency(-100, 0, 1000000)).toBe(0);
    });
    it('clamps to max', () => {
        expect(clampCurrency(2000000, 0, 1000000)).toBe(1000000);
    });
    it('passes through valid values', () => {
        expect(clampCurrency(500, 0, 1000000)).toBe(500);
    });
});

describe('formatPercentageChange', () => {
    it('formats positive change with + sign', () => {
        expect(formatPercentageChange(0.2)).toBe('+20.00%');
    });
    it('formats negative change with - sign', () => {
        expect(formatPercentageChange(-0.2)).toBe('-20.00%');
    });
    it('handles zero', () => {
        expect(formatPercentageChange(0)).toBe('+0.00%');
    });
});

describe('formatRatio', () => {
    it('formats ratio with x suffix', () => {
        expect(formatRatio(0.75)).toBe('0.75x');
    });
    it('formats whole number ratio', () => {
        expect(formatRatio(3)).toBe('3.00x');
    });
});

describe('Constants', () => {
    it('DECIMAL_PLACES is defined', () => {
        expect(DECIMAL_PLACES).toBeDefined();
    });
    it('CURRENCIES is an object', () => {
        expect(typeof CURRENCIES).toBe('object');
        expect(CURRENCIES.USD).toBeDefined();
    });
});
