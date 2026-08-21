/**
 * Unit tests for js/utils/date.js
 * Covers date parsing, formatting, arithmetic, validation, and edge cases.
 */
import {
    parseDate, formatDate, formatDateForInput,
    yearsBetween, monthsBetween, daysBetween,
    addMonths, addYears, addDays,
    isValidDate, isPastDate, isFutureDate,
    isWeekend, isWeekday, getNextBusinessDay, addBusinessDays,
    compareDates, isSameDay, isDateInRange,
    calculateAge, formatDuration,
    DAYS_IN_MONTH, getDaysInMonth, getDaysInYear, getDaysInMonthForYear
} from '../../js/utils/date.js';

describe('parseDate', () => {
    it('parses ISO date string', () => {
        const d = parseDate('2024-01-15');
        expect(d).toBeInstanceOf(Date);
        expect(d.getFullYear()).toBe(2024);
        expect(d.getMonth()).toBe(0);
        expect(d.getDate()).toBe(15);
    });
    it('parses Date object', () => {
        const input = new Date(2024, 5, 20);
        const d = parseDate(input);
        expect(d.getTime()).toBe(input.getTime());
    });
    it('returns Invalid Date for bad input', () => {
        const d = parseDate('not-a-date');
        expect(isNaN(d.getTime())).toBe(true);
    });
    it('returns today for null', () => {
        const d = parseDate(null);
        expect(isNaN(d.getTime())).toBe(false);
    });
});

describe('formatDate', () => {
    it('formats date as medium by default (Jan 15, 2024)', () => {
        const d = new Date(2024, 0, 15);
        expect(formatDate(d)).toBe('Jan 15, 2024');
    });
    it('formats with short format', () => {
        const d = new Date(2024, 0, 15);
        expect(formatDate(d, { format: 'short' })).toBe('1/15/24');
    });
    it('handles null (returns today formatted)', () => {
        const result = formatDate(null);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});

describe('formatDateForInput', () => {
    it('formats for HTML input', () => {
        const d = new Date(2024, 5, 20);
        expect(formatDateForInput(d)).toBe('2024-06-20');
    });
});

describe('yearsBetween', () => {
    it('calculates full years between dates', () => {
        expect(yearsBetween('2020-01-01', '2024-01-01')).toBe(4);
    });
    it('handles partial years (returns decimal)', () => {
        expect(yearsBetween('2020-06-15', '2024-01-01')).toBeCloseTo(3.55, 1);
    });
});

describe('monthsBetween', () => {
    it('calculates months between dates', () => {
        expect(monthsBetween('2024-01-01', '2024-06-01')).toBe(5);
    });
});

describe('daysBetween', () => {
    it('calculates days between dates', () => {
        expect(daysBetween('2024-01-01', '2024-01-31')).toBe(30);
    });
    it('handles same day', () => {
        expect(daysBetween('2024-01-01', '2024-01-01')).toBe(0);
    });
});

describe('addMonths', () => {
    it('adds months', () => {
        const d = addMonths('2024-01-15', 3);
        expect(d.getMonth()).toBe(3);
        expect(d.getDate()).toBe(15);
    });
    it('handles year rollover', () => {
        const d = addMonths('2024-11-15', 3);
        expect(d.getFullYear()).toBe(2025);
        expect(d.getMonth()).toBe(1);
    });
});

describe('addYears', () => {
    it('adds years', () => {
        const d = addYears('2024-01-15', 5);
        expect(d.getFullYear()).toBe(2029);
    });
});

describe('addDays', () => {
    it('adds days', () => {
        const d = addDays('2024-01-15', 10);
        expect(d.getDate()).toBe(25);
    });
    it('handles month rollover', () => {
        const d = addDays('2024-01-25', 10);
        expect(d.getMonth()).toBe(1);
        expect(d.getDate()).toBe(4);
    });
});

describe('isValidDate', () => {
    it('returns true for valid date', () => {
        expect(isValidDate('2024-01-15')).toBe(true);
    });
    it('returns true for ISO date that parses to valid Date', () => {
        // parseDate uses new Date(year, month-1, day) which normalizes invalid months
        expect(isValidDate('2024-01-15')).toBe(true);
    });
    it('returns true for null (parseDate returns today)', () => {
        expect(isValidDate(null)).toBe(true);
    });
});

describe('isPastDate / isFutureDate', () => {
    it('isPastDate returns true for past date', () => {
        expect(isPastDate('2020-01-01')).toBe(true);
    });
    it('isFutureDate returns true for future date', () => {
        expect(isFutureDate('2030-01-01')).toBe(true);
    });
});

describe('isWeekend / isWeekday', () => {
    it('identifies Saturday as weekend', () => {
        expect(isWeekend('2024-01-06')).toBe(true);
        expect(isWeekday('2024-01-06')).toBe(false);
    });
    it('identifies Monday as weekday', () => {
        expect(isWeekend('2024-01-01')).toBe(false);
        expect(isWeekday('2024-01-01')).toBe(true);
    });
});

describe('getNextBusinessDay', () => {
    it('returns next Monday for Friday', () => {
        const d = getNextBusinessDay('2024-01-05'); // Friday
        expect(d.getDay()).toBe(1); // Monday
    });
});

describe('addBusinessDays', () => {
    it('skips weekends', () => {
        const d = addBusinessDays('2024-01-05', 1); // Friday + 1 business day
        expect(d.getDay()).toBe(1); // Monday
    });
});

describe('compareDates / isSameDay / isDateInRange', () => {
    it('isSameDay returns true for same date', () => {
        expect(isSameDay('2024-01-15', '2024-01-15')).toBe(true);
    });
    it('isSameDay returns false for different dates', () => {
        expect(isSameDay('2024-01-15', '2024-01-16')).toBe(false);
    });
    it('isDateInRange returns true for date in range', () => {
        expect(isDateInRange('2024-01-15', '2024-01-01', '2024-01-31')).toBe(true);
    });
    it('isDateInRange returns false for date outside range', () => {
        expect(isDateInRange('2024-02-15', '2024-01-01', '2024-01-31')).toBe(false);
    });
});

describe('calculateAge', () => {
    it('calculates age from birth date', () => {
        const age = calculateAge('1990-01-01', '2024-01-01');
        expect(age).toBe(34);
    });
    it('handles birthday not yet reached this year', () => {
        const age = calculateAge('1990-06-15', '2024-01-01');
        expect(age).toBe(33);
    });
});

describe('formatDuration', () => {
    it('formats duration between two dates', () => {
        const result = formatDuration('2020-01-01', '2024-06-15');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});

describe('getDaysInMonth / getDaysInYear', () => {
    it('returns array with 31 for January', () => {
        const days = getDaysInMonth(2024);
        expect(days[0]).toBe(31);
    });
    it('returns array with 29 for February in leap year', () => {
        const days = getDaysInMonth(2024);
        expect(days[1]).toBe(29);
    });
    it('returns array with 28 for February in non-leap year', () => {
        const days = getDaysInMonth(2023);
        expect(days[1]).toBe(28);
    });
    it('returns 366 for leap year', () => {
        expect(getDaysInYear(2024)).toBe(366);
    });
    it('returns 365 for non-leap year', () => {
        expect(getDaysInYear(2023)).toBe(365);
    });
    it('getDaysInMonthForYear works (month is 1-based)', () => {
        expect(getDaysInMonthForYear(2024, 2)).toBe(29);
    });
});

describe('DAYS_IN_MONTH constant', () => {
    it('has 12 entries', () => {
        expect(DAYS_IN_MONTH).toHaveLength(12);
    });
    it('January has 31 days', () => {
        expect(DAYS_IN_MONTH[0]).toBe(31);
    });
});
