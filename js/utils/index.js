/**
 * Utils Module Index
 * 
 * Central export point for all utility modules
 * Provides tree-shakeable imports for currency, date, and math utilities
 * 
 * @module utils
 */

// ── Currency Utilities ─────────────────────────────────────────
export {
    formatCurrency,
    formatCurrencyWithSymbol,
    formatAbbreviated,
    formatNumber,
    formatPercentage,
    formatOrdinal,
    roundTo,
    roundUp,
    roundDown,
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
    generateAmortizationSchedule,
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
console.log('Utils module index loaded');
console.log('  - Currency utilities: Available');
console.log('  - Date utilities: Available');
console.log('  - Math utilities: Available');