/**
 * Date and Time Utilities
 * 
 * Pure functions for date calculations, payment schedules, and timeline generation.
 * No side effects, no DOM manipulation, tree-shake friendly.
 * 
 * @module utils/date
 */

// ── Date Parsing and Formatting ────────────────────────────────

/**
 * Parse a date string to Date object
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {Date} Parsed date
 */
export function parseDate(dateInput) {
    if (dateInput instanceof Date) {
        return new Date(dateInput);
    }
    
    if (typeof dateInput === 'string') {
        // Handle ISO format (YYYY-MM-DD)
        if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateInput.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        
        // Handle other common formats
        return new Date(dateInput);
    }
    
    return new Date();
}

/**
 * Format date to string
 * @param {Date} date - Date to format
 * @param {Object} options - Formatting options
 * @param {string} options.format - Format type: 'short', 'medium', 'long', 'full'
 * @param {string} options.locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
    const { format = 'medium', locale = 'en-US' } = options;
    const d = parseDate(date);
    
    const formats = {
        short: { month: 'numeric', day: 'numeric', year: '2-digit' },
        medium: { month: 'short', day: 'numeric', year: 'numeric' },
        long: { month: 'long', day: 'numeric', year: 'numeric' },
        full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
    };
    
    return d.toLocaleDateString(locale, formats[format] || formats.medium);
}

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} ISO date string
 */
export function formatDateForInput(date) {
    const d = parseDate(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// ── Date Calculations ──────────────────────────────────────────

/**
 * Calculate difference between two dates in years
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Difference in years
 */
export function yearsBetween(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    const diff = end.getTime() - start.getTime();
    return diff / (365.25 * 24 * 60 * 60 * 1000);
}

/**
 * Calculate difference between two dates in months
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Difference in months
 */
export function monthsBetween(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    
    return years * 12 + months;
}

/**
 * Calculate difference between two dates in days
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Difference in days
 */
export function daysBetween(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (24 * 60 * 60 * 1000));
}

/**
 * Add months to a date
 * @param {Date|string} date - Starting date
 * @param {number} months - Number of months to add
 * @returns {Date} New date
 */
export function addMonths(date, months) {
    const d = parseDate(date);
    const newDate = new Date(d);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
}

/**
 * Add years to a date
 * @param {Date|string} date - Starting date
 * @param {number} years - Number of years to add
 * @returns {Date} New date
 */
export function addYears(date, years) {
    const d = parseDate(date);
    const newDate = new Date(d);
    newDate.setFullYear(newDate.getFullYear() + years);
    return newDate;
}

/**
 * Add days to a date
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
export function addDays(date, days) {
    const d = parseDate(date);
    const newDate = new Date(d);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
}

// ── Payment Schedule Generation ────────────────────────────────

/**
 * Generate payment schedule dates
 * @param {Date|string} startDate - Start date of loan
 * @param {number} totalPayments - Total number of payments
 * @param {string} frequency - Payment frequency: 'monthly', 'biweekly', 'weekly'
 * @returns {Array<Date>} Array of payment dates
 */
export function generatePaymentSchedule(startDate, totalPayments, frequency = 'monthly') {
    const dates = [];
    let currentDate = parseDate(startDate);
    
    for (let i = 0; i < totalPayments; i++) {
        dates.push(new Date(currentDate));
        
        switch (frequency) {
            case 'monthly':
                currentDate = addMonths(currentDate, 1);
                break;
            case 'biweekly':
                currentDate = addDays(currentDate, 14);
                break;
            case 'weekly':
                currentDate = addDays(currentDate, 7);
                break;
            default:
                currentDate = addMonths(currentDate, 1);
        }
    }
    
    return dates;
}

/**
 * Generate amortization schedule with dates
 * @param {Date|string} startDate - Start date
 * @param {number} totalPayments - Total number of payments
 * @param {string} frequency - Payment frequency
 * @returns {Array<Object>} Schedule with dates
 */
export function generateAmortizationSchedule(startDate, totalPayments, frequency = 'monthly') {
    const dates = generatePaymentSchedule(startDate, totalPayments, frequency);
    
    return dates.map((date, index) => ({
        paymentNumber: index + 1,
        date: date,
        dateFormatted: formatDate(date, { format: 'medium' }),
        dateForInput: formatDateForInput(date)
    }));
}

// ── Timeline Generation ────────────────────────────────────────

/**
 * Generate timeline markers for charts
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {number} intervals - Number of intervals
 * @param {string} unit - Time unit: 'year', 'month', 'quarter'
 * @returns {Array<Object>} Timeline markers
 */
export function generateTimeline(startDate, endDate, intervals, unit = 'year') {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const markers = [];
    
    for (let i = 0; i <= intervals; i++) {
        const progress = i / intervals;
        const timestamp = start.getTime() + (end.getTime() - start.getTime()) * progress;
        const date = new Date(timestamp);
        
        markers.push({
            index: i,
            date: date,
            label: formatDate(date, { format: 'short' }),
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            progress: progress
        });
    }
    
    return markers;
}

/**
 * Generate year markers for long-term projections
 * @param {Date|string} startDate - Start date
 * @param {number} years - Number of years
 * @returns {Array<Object>} Year markers
 */
export function generateYearMarkers(startDate, years) {
    const markers = [];
    let currentDate = parseDate(startDate);
    
    for (let i = 0; i <= years; i++) {
        markers.push({
            year: i,
            date: new Date(currentDate),
            label: i === 0 ? 'Start' : `Year ${i}`,
            formatted: formatDate(currentDate, { format: 'short' })
        });
        
        currentDate = addYears(currentDate, 1);
    }
    
    return markers;
}

// ── Date Validation ────────────────────────────────────────────

/**
 * Check if date is valid
 * @param {*} date - Date to validate
 * @returns {boolean} True if valid
 */
export function isValidDate(date) {
    const d = parseDate(date);
    return !isNaN(d.getTime());
}

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if in past
 */
export function isPastDate(date) {
    const d = parseDate(date);
    return d.getTime() < Date.now();
}

/**
 * Check if date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if in future
 */
export function isFutureDate(date) {
    const d = parseDate(date);
    return d.getTime() > Date.now();
}

/**
 * Get the earliest date from an array
 * @param {Array<Date|string>} dates - Array of dates
 * @returns {Date} Earliest date
 */
export function getEarliestDate(dates) {
    const parsed = dates.map(d => parseDate(d).getTime());
    const min = Math.min(...parsed);
    return new Date(min);
}

/**
 * Get the latest date from an array
 * @param {Array<Date|string>} dates - Array of dates
 * @returns {Date} Latest date
 */
export function getLatestDate(dates) {
    const parsed = dates.map(d => parseDate(d).getTime());
    const max = Math.max(...parsed);
    return new Date(max);
}

// ── Business Day Calculations ──────────────────────────────────

/**
 * Check if date is a weekend
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if weekend
 */
export function isWeekend(date) {
    const d = parseDate(date);
    const day = d.getDay();
    return day === 0 || day === 6;
}

/**
 * Check if date is a weekday
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if weekday
 */
export function isWeekday(date) {
    const d = parseDate(date);
    const day = d.getDay();
    return day !== 0 && day !== 6;
}

/**
 * Get next business day
 * @param {Date|string} date - Starting date
 * @returns {Date} Next business day
 */
export function getNextBusinessDay(date) {
    let d = parseDate(date);
    
    // If weekend, move to Monday
    if (isWeekend(d)) {
        const daysToAdd = d.getDay() === 6 ? 2 : 1;
        d = addDays(d, daysToAdd);
    } else {
        // Move to next day
        d = addDays(d, 1);
        
        // If next day is weekend, move to Monday
        if (isWeekend(d)) {
            const daysToAdd = d.getDay() === 6 ? 2 : 1;
            d = addDays(d, daysToAdd);
        }
    }
    
    return d;
}

/**
 * Add business days to a date
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of business days to add
 * @returns {Date} New date
 */
export function addBusinessDays(date, days) {
    let d = parseDate(date);
    let addedDays = 0;
    
    while (addedDays < days) {
        d = addDays(d, 1);
        
        if (isWeekday(d)) {
            addedDays++;
        }
    }
    
    return d;
}

// ── Date Comparisons ───────────────────────────────────────────

/**
 * Compare two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1, date2) {
    const d1 = parseDate(date1).getTime();
    const d2 = parseDate(date2).getTime();
    
    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    return 0;
}

/**
 * Check if two dates are the same day
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if same day
 */
export function isSameDay(date1, date2) {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

/**
 * Check if date is within a range
 * @param {Date|string} date - Date to check
 * @param {Date|string} startDate - Range start
 * @param {Date|string} endDate - Range end
 * @returns {boolean} True if within range
 */
export function isDateInRange(date, startDate, endDate) {
    const d = parseDate(date).getTime();
    const start = parseDate(startDate).getTime();
    const end = parseDate(endDate).getTime();
    
    return d >= start && d <= end;
}

// ── Age and Time Period Calculations ───────────────────────────

/**
 * Calculate age from birth date
 * @param {Date|string} birthDate - Birth date
 * @param {Date|string} [asOfDate] - Calculate age as of this date (default: today)
 * @returns {number} Age in years
 */
export function calculateAge(birthDate, asOfDate) {
    const birth = parseDate(birthDate);
    const asOf = asOfDate ? parseDate(asOfDate) : new Date();
    
    let age = asOf.getFullYear() - birth.getFullYear();
    const monthDiff = asOf.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

/**
 * Calculate duration between dates in human-readable format
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {string} Human-readable duration
 */
export function formatDuration(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    const years = Math.floor(yearsBetween(start, end));
    const months = Math.floor(monthsBetween(start, end)) % 12;
    const days = daysBetween(start, end);
    
    const parts = [];
    
    if (years > 0) {
        parts.push(`${years} year${years > 1 ? 's' : ''}`);
    }
    if (months > 0) {
        parts.push(`${months} month${months > 1 ? 's' : ''}`);
    }
    if (days > 0 && years === 0 && months === 0) {
        parts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ') || '0 days';
}

// ── Constants ──────────────────────────────────────────────────

/**
 * Days in each month (non-leap year)
 */
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Days in each month (accounting for leap years)
 * @param {number} year - Year to check
 * @returns {Array<number>} Days in each month
 */
export function getDaysInMonth(year) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const days = [...DAYS_IN_MONTH];
    if (isLeapYear) {
        days[1] = 29; // February
    }
    return days;
}

/**
 * Get total days in a year
 * @param {number} year - Year
 * @returns {number} Total days
 */
export function getDaysInYear(year) {
    return ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) ? 366 : 365;
}

/**
 * Get total days in a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} Days in month
 */
export function getDaysInMonthForYear(year, month) {
    const days = getDaysInMonth(year);
    return days[month - 1];
}

// Log module initialization
console.log('Date utilities loaded');