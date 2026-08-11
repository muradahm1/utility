/**
 * Utils Module Index
 * 
 * Central export point for all utility modules
 * Provides tree-shakeable imports for currency, date, and math utilities
 * 
 * @module utils
 */

// ── Currency Utilities ─────────────────────────────────────────
import { formatCurrency, formatPercentage } from './currency.js';
export {
    formatCurrency,
    formatCurrencyWithSymbol,
    formatAbbreviated,
    formatNumber,
    formatPercentage,
    formatOrdinal,
    formatFinancial,
    getCurrencySymbol,
    formatCurrencyForLocale,
    formatFinancialScale,
    formatPercentageChange,
    formatRatio,
    isValidCurrency,
    clampCurrency,
    DECIMAL_PLACES,
    CURRENCIES
} from './currency.js';

// ── Date Utilities ─────────────────────────────────────────────
export {
    parseDate,
    formatDate,
    formatDateForInput,
    yearsBetween,
    monthsBetween,
    daysBetween,
    addMonths,
    addYears,
    addDays,
    generatePaymentSchedule,
    generatePaymentDateSchedule,
    generateTimeline,
    generateYearMarkers,
    isValidDate,
    isPastDate,
    isFutureDate,
    getEarliestDate,
    getLatestDate,
    isWeekend,
    isWeekday,
    getNextBusinessDay,
    addBusinessDays,
    compareDates,
    isSameDay,
    isDateInRange,
    calculateAge,
    formatDuration,
    DAYS_IN_MONTH,
    getDaysInMonth,
    getDaysInYear,
    getDaysInMonthForYear
} from './date.js';

// ── Math Utilities ─────────────────────────────────────────────
export {
    safeNumber,
    safeNum,
    clamp,
    lerp,
    mapRange,
    roundTo,
    roundUp,
    roundDown,
    truncateTo,
    percentageOf,
    calculatePercentage,
    percentageChange,
    percentageDifference,
    applyPercentage,
    compoundInterest,
    compoundInterestWithContributions,
    timeToTarget,
    mortgagePayment,
    loanAmountFromPayment,
    remainingBalance,
    totalInterestPaid,
    generateAmortizationSchedule,
    calculateExtraPaymentSavings,
    futureValueWithInflation,
    presentValueFromFuture,
    calculatePurchasingPowerLoss,
    calculateCAGR,
    futureValueFromCAGR,
    mean,
    median,
    mode,
    standardDeviation,
    variance,
    percentile,
    debtToIncomeRatio,
    loanToValueRatio,
    simpleInterest,
    effectiveAnnualRate,
    presentValue,
    futureValue,
    calculateROI,
    paybackPeriod,
    netPresentValue,
    straightLineDepreciation,
    decliningBalanceDepreciation,
    yearOverYearGrowth,
    cagr,
    movingAverage,
    FINANCIAL_CONSTANTS,
    ROUNDING
} from './math.js';

// ── Validation Utilities ────────────────────────────────────────
// Note: Validation utilities are exported from js/modules/index.js
// Use: import { validateRequired, ... } from './modules/index.js';

export function safeStr(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

export function fmt(value, options = {}) {
    return formatCurrency(value, options);
}

export function fmtN(value, options = {}) {
    const { minFractionDigits = 2, maxFractionDigits = 2, locale = 'en-US' } = options;
    const num = safeNumber(value, 0);
    return Number.isFinite(num)
        ? num.toLocaleString(locale, {
            minimumFractionDigits: minFractionDigits,
            maximumFractionDigits: maxFractionDigits
        })
        : '0';
}

export function pct(value, options = {}) {
    return formatPercentage(value, options);
}

// ── Convenience Bundles ────────────────────────────────────────

/**
 * Commonly used currency formatting functions
 */
export const currency = {
    format: (value, options) => formatCurrency(value, options),
    formatUSD: (value) => formatCurrency(value, { currency: 'USD' }),
    formatEUR: (value) => formatCurrency(value, { currency: 'EUR' }),
    formatGBP: (value) => formatCurrency(value, { currency: 'GBP' }),
    formatAbbreviated: (value, decimals) => formatAbbreviated(value, decimals),
    formatPercentage: (value, options) => formatPercentage(value, options),
    round: (value, decimals) => roundTo(value, decimals)
};

/**
 * Commonly used date functions
 */
export const date = {
    parse: (input) => parseDate(input),
    format: (date, options) => formatDate(date, options),
    addMonths: (date, months) => addMonths(date, months),
    addYears: (date, years) => addYears(date, years),
    addDays: (date, days) => addDays(date, days),
    between: (start, end) => ({
        years: yearsBetween(start, end),
        months: monthsBetween(start, end),
        days: daysBetween(start, end)
    })
};

/**
 * Commonly used math functions
 */
export const math = {
    safe: (val, fallback) => safeNumber(val, fallback),
    round: (value, decimals) => roundTo(value, decimals),
    clamp: (value, min, max) => clamp(value, min, max),
    percentage: (part, total) => calculatePercentage(part, total),
    compoundInterest: (principal, rate, time, compounds) => 
        compoundInterest(principal, rate, time, compounds),
    mortgage: (principal, rate, years) => mortgagePayment(principal, rate, years)
};

// Log module initialization