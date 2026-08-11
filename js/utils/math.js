/**
 * Mathematical and Financial Formula Utilities
 * 
 * Pure functions for financial calculations, compound interest, mortgage formulas,
 * statistical helpers, and common mathematical operations.
 * No side effects, no DOM manipulation, tree-shake friendly.
 * 
 * @module utils/math
 */

// ── Basic Math Utilities ───────────────────────────────────────

/**
 * Safe number conversion
 * @param {*} val - Value to convert
 * @param {number} fallback - Fallback value
 * @returns {number} Safe number
 */
export function safeNumber(val, fallback = 0) {
    if (val === null || val === undefined) return fallback;
    const num = Number(val);
    return isFinite(num) ? num : fallback;
}

/**
 * Alias for safeNumber
 * @param {*} val - Value to convert
 * @param {number} fallback - Fallback value
 * @returns {number} Safe number
 */
export const safeNum = safeNumber;

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Map a value from one range to another
 * @param {number} value - Value to map
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} Mapped value
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// ── Rounding and Precision ─────────────────────────────────────

/**
 * Round to specified decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Decimal places (default: 2)
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
 * @param {number} decimals - Decimal places (default: 2)
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
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {number} Rounded down value
 */
export function roundDown(value, decimals = 2) {
    if (!isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.floor(value * factor) / factor;
}

/**
 * Truncate to specified decimal places (no rounding)
 * @param {number} value - Value to truncate
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {number} Truncated value
 */
export function truncateTo(value, decimals = 2) {
    if (!isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.trunc(value * factor) / factor;
}

// ── Percentage Calculations ────────────────────────────────────

/**
 * Calculate percentage of a value
 * @param {number} value - Base value
 * @param {number} percentage - Percentage (e.g., 15 for 15%)
 * @returns {number} Percentage of value
 */
export function percentageOf(value, percentage) {
    return (value * percentage) / 100;
}

/**
 * Calculate what percentage one value is of another
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
export function calculatePercentage(part, total) {
    if (total === 0) return 0;
    return (part / total) * 100;
}

/**
 * Calculate percentage change between two values
 * @param {number} oldValue - Original value
 * @param {number} newValue - New value
 * @returns {number} Percentage change
 */
export function percentageChange(oldValue, newValue) {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Calculate percentage difference between two values
 * @param {number} value1 - First value
 * @param {number} value2 - Second value
 * @returns {number} Percentage difference
 */
export function percentageDifference(value1, value2) {
    const avg = (value1 + value2) / 2;
    if (avg === 0) return 0;
    return ((value2 - value1) / avg) * 100;
}

/**
 * Apply percentage increase/decrease
 * @param {number} value - Base value
 * @param {number} percentage - Percentage to apply
 * @returns {number} New value
 */
export function applyPercentage(value, percentage) {
    return value * (1 + percentage / 100);
}

// ── Compound Interest ──────────────────────────────────────────

/**
 * Calculate compound interest
 * @param {number} principal - Initial amount
 * @param {number} rate - Annual interest rate (decimal, e.g., 0.05 for 5%)
 * @param {number} time - Time in years
 * @param {number} compoundsPerYear - Compounding frequency (default: 12 for monthly)
 * @returns {number} Future value
 */
export function compoundInterest(principal, rate, time, compoundsPerYear = 12) {
    if (rate === 0) return principal;
    return principal * Math.pow(1 + rate / compoundsPerYear, compoundsPerYear * time);
}

/**
 * Calculate compound interest with regular contributions
 * @param {number} principal - Initial amount
 * @param {number} rate - Annual interest rate (decimal)
 * @param {number} time - Time in years
 * @param {number} contribution - Regular contribution per period
 * @param {number} compoundsPerYear - Compounding frequency (default: 12)
 * @returns {number} Future value
 */
export function compoundInterestWithContributions(principal, rate, time, contribution, compoundsPerYear = 12) {
    if (rate === 0) {
        return principal + (contribution * compoundsPerYear * time);
    }
    
    const compoundFactor = Math.pow(1 + rate / compoundsPerYear, compoundsPerYear * time);
    const futureValueOfPrincipal = principal * compoundFactor;
    const futureValueOfContributions = contribution * ((compoundFactor - 1) / (rate / compoundsPerYear));
    
    return futureValueOfPrincipal + futureValueOfContributions;
}

/**
 * Calculate time to reach a target with compound interest
 * @param {number} principal - Initial amount
 * @param {number} target - Target amount
 * @param {number} rate - Annual interest rate (decimal)
 * @param {number} contribution - Regular contribution per period
 * @param {number} compoundsPerYear - Compounding frequency (default: 12)
 * @returns {number} Time in years
 */
export function timeToTarget(principal, target, rate, contribution, compoundsPerYear = 12) {
    if (target <= principal) return 0;
    if (rate === 0) {
        return (target - principal) / (contribution * compoundsPerYear);
    }
    
    const r = rate / compoundsPerYear;
    let years = 0;
    let balance = principal;
    const maxYears = 100; // Safety limit
    
    while (balance < target && years < maxYears) {
        balance = balance * (1 + r) + contribution;
        years++;
    }
    
    return years;
}

// ── Mortgage and Loan Formulas ─────────────────────────────────

/**
 * Calculate monthly mortgage payment (principal and interest only)
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate (decimal, e.g., 0.065 for 6.5%)
 * @param {number} years - Loan term in years
 * @returns {number} Monthly payment
 */
export function mortgagePayment(principal, annualRate, years) {
    if (annualRate === 0) {
        return principal / (years * 12);
    }
    
    const monthlyRate = annualRate / 12;
    const numPayments = years * 12;
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/**
 * Calculate loan amount from monthly payment
 * @param {number} monthlyPayment - Monthly payment amount
 * @param {number} annualRate - Annual interest rate (decimal)
 * @param {number} years - Loan term in years
 * @returns {number} Maximum loan amount
 */
export function loanAmountFromPayment(monthlyPayment, annualRate, years) {
    if (annualRate === 0) {
        return monthlyPayment * years * 12;
    }
    
    const monthlyRate = annualRate / 12;
    const numPayments = years * 12;
    
    return monthlyPayment * (Math.pow(1 + monthlyRate, numPayments) - 1) / 
           (monthlyRate * Math.pow(1 + monthlyRate, numPayments));
}

/**
 * Calculate remaining loan balance
 * @param {number} principal - Original loan amount
 * @param {number} annualRate - Annual interest rate (decimal)
 * @param {number} years - Original loan term in years
 * @param {number} paymentsMade - Number of payments made
 * @returns {number} Remaining balance
 */
export function remainingBalance(principal, annualRate, years, paymentsMade) {
    if (annualRate === 0) {
        return principal * (1 - paymentsMade / (years * 12));
    }
    
    const monthlyRate = annualRate / 12;
    const numPayments = years * 12;
    
    return principal * (Math.pow(1 + monthlyRate, numPayments) - Math.pow(1 + monthlyRate, paymentsMade)) / 
           (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/**
 * Calculate total interest paid on loan
 * @param {number} principal - Loan amount
 * @param {number} monthlyPayment - Monthly payment
 * @param {number} totalPayments - Total number of payments
 * @returns {number} Total interest paid
 */
export function totalInterestPaid(principal, monthlyPayment, totalPayments) {
    return (monthlyPayment * totalPayments) - principal;
}

// ── Amortization ───────────────────────────────────────────────

/**
 * Generate amortization schedule
 * @param {number} principal - Loan amount
 * @param {number} rate - Periodic interest rate
 * @param {number} totalPayments - Total number of payments
 * @param {number} payment - Payment amount per period
 * @returns {Array<Object>} Amortization schedule
 */
export function generateAmortizationSchedule(principal, rate, totalPayments, payment) {
    const rows = [];
    let balance = safeNumber(principal, 0);
    
    for (let i = 1; i <= totalPayments; i++) {
        const interest = roundTo(balance * rate, 2);
        let principalPaid = roundTo(payment - interest, 2);
        
        if (principalPaid > balance) {
            principalPaid = balance;
        }
        
        balance = roundTo(balance - principalPaid, 2);
        
        rows.push({
            month: i,
            payment: payment,
            principal: principalPaid,
            interest: interest,
            balance: Math.max(0, balance)
        });
        
        if (balance <= 0 && i < totalPayments) {
            // Adjust final payment
            rows[i - 1].balance = 0;
            rows[i - 1].payment = roundTo(rows[i - 1].principal + rows[i - 1].interest, 2);
            break;
        }
    }
    
    return rows;
}

/**
 * Calculate interest savings from extra payments
 * @param {number} principal - Loan amount
 * @param {number} rate - Periodic interest rate
 * @param {number} totalPayments - Total number of payments
 * @param {number} payment - Regular payment amount
 * @param {number} extraPayment - Extra payment per period
 * @returns {Object} Savings analysis
 */
export function calculateExtraPaymentSavings(principal, rate, totalPayments, payment, extraPayment) {
    // Original schedule
    const originalSchedule = generateAmortizationSchedule(principal, rate, totalPayments, payment);
    const originalInterest = originalSchedule.reduce((sum, row) => sum + row.interest, 0);
    const originalPayments = originalSchedule.length;
    
    // With extra payments
    let balance = principal;
    let totalInterest = 0;
    let paymentsMade = 0;
    
    for (let i = 0; i < totalPayments && balance > 0; i++) {
        const interest = roundTo(balance * rate, 2);
        let principalPaid = roundTo(payment - interest, 2);
        
        if (principalPaid > balance) {
            principalPaid = balance;
        }
        
        const totalPrincipalPaid = principalPaid + extraPayment;
        if (totalPrincipalPaid > balance) {
            // Adjust extra payment if it exceeds remaining balance
        }
        
        totalInterest += interest;
        balance = roundTo(balance - principalPaid - Math.min(extraPayment, balance - principalPaid), 2);
        paymentsMade++;
        
        if (balance <= 0) break;
    }
    
    const interestSaved = roundTo(originalInterest - totalInterest, 2);
    const timeSaved = originalPayments - paymentsMade;
    
    return {
        interestSaved,
        timeSaved,
        originalInterest,
        newInterest: totalInterest,
        originalPayments,
        newPayments: paymentsMade
    };
}

// ── Inflation Calculations ─────────────────────────────────────

/**
 * Calculate future value with inflation
 * @param {number} presentValue - Current value
 * @param {number} inflationRate - Annual inflation rate (decimal)
 * @param {number} years - Number of years
 * @returns {number} Future value
 */
export function futureValueWithInflation(presentValue, inflationRate, years) {
    return presentValue * Math.pow(1 + inflationRate, years);
}

/**
 * Calculate present value from future value (inflation-adjusted)
 * @param {number} futureValue - Future value
 * @param {number} inflationRate - Annual inflation rate (decimal)
 * @param {number} years - Number of years
 * @returns {number} Present value
 */
export function presentValueFromFuture(futureValue, inflationRate, years) {
    return futureValue / Math.pow(1 + inflationRate, years);
}

/**
 * Calculate purchasing power loss
 * @param {number} amount - Amount to analyze
 * @param {number} inflationRate - Annual inflation rate (decimal)
 * @param {number} years - Number of years
 * @returns {Object} Purchasing power analysis
 */
export function calculatePurchasingPowerLoss(amount, inflationRate, years) {
    const futureCost = futureValueWithInflation(amount, inflationRate, years);
    const realValue = presentValueFromFuture(amount, inflationRate, years);
    const loss = roundTo(futureCost - amount, 2);
    const lossPercentage = roundTo((loss / futureCost) * 100, 2);
    
    return {
        futureCost,
        realValue,
        loss,
        lossPercentage,
        cumulativeInflation: roundTo((Math.pow(1 + inflationRate, years) - 1) * 100, 2)
    };
}

// ── CAGR (Compound Annual Growth Rate) ─────────────────────────

/**
 * Calculate Compound Annual Growth Rate
 * @param {number} beginningValue - Starting value
 * @param {number} endingValue - Ending value
 * @param {number} years - Number of years
 * @returns {number} CAGR as decimal
 */
export function calculateCAGR(beginningValue, endingValue, years) {
    if (beginningValue <= 0 || years <= 0) return 0;
    return Math.pow(endingValue / beginningValue, 1 / years) - 1;
}

/**
 * Calculate future value from CAGR
 * @param {number} presentValue - Present value
 * @param {number} cagr - CAGR as decimal
 * @param {number} years - Number of years
 * @returns {number} Future value
 */
export function futureValueFromCAGR(presentValue, cagr, years) {
    return presentValue * Math.pow(1 + cagr, years);
}

// ── Statistical Helpers ────────────────────────────────────────

/**
 * Calculate mean (average)
 * @param {Array<number>} values - Array of values
 * @returns {number} Mean value
 */
export function mean(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate median
 * @param {Array<number>} values - Array of values
 * @returns {number} Median value
 */
export function median(values) {
    if (!values || values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate mode (most frequent value)
 * @param {Array<number>} values - Array of values
 * @returns {Array<number>} Array of modes
 */
export function mode(values) {
    if (!values || values.length === 0) return [];
    
    const frequency = {};
    let maxFreq = 0;
    
    values.forEach(val => {
        frequency[val] = (frequency[val] || 0) + 1;
        maxFreq = Math.max(maxFreq, frequency[val]);
    });
    
    return Object.keys(frequency)
        .filter(val => frequency[val] === maxFreq)
        .map(Number);
}

/**
 * Calculate standard deviation
 * @param {Array<number>} values - Array of values
 * @param {boolean} population - True for population std dev, false for sample
 * @returns {number} Standard deviation
 */
export function standardDeviation(values, population = false) {
    if (!values || values.length === 0) return 0;
    
    const avg = mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = mean(squareDiffs);
    
    return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate variance
 * @param {Array<number>} values - Array of values
 * @param {boolean} population - True for population variance, false for sample
 * @returns {number} Variance
 */
export function variance(values, population = false) {
    if (!values || values.length === 0) return 0;
    
    const avg = mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    
    return mean(squareDiffs);
}

/**
 * Calculate percentile
 * @param {Array<number>} values - Array of values
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} Percentile value
 */
export function percentile(values, percentile) {
    if (!values || values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
        return sorted[lower];
    }
    
    return lerp(sorted[lower], sorted[upper], index - lower);
}

// ── Financial Ratios and Metrics ───────────────────────────────

/**
 * Calculate debt-to-income ratio
 * @param {number} monthlyDebt - Total monthly debt payments
 * @param {number} grossMonthlyIncome - Gross monthly income
 * @returns {number} DTI ratio (0-1)
 */
export function debtToIncomeRatio(monthlyDebt, grossMonthlyIncome) {
    if (grossMonthlyIncome === 0) return 0;
    return monthlyDebt / grossMonthlyIncome;
}

/**
 * Calculate loan-to-value ratio
 * @param {number} loanAmount - Loan amount
 * @param {number} propertyValue - Property value
 * @returns {number} LTV ratio (0-1)
 */
export function loanToValueRatio(loanAmount, propertyValue) {
    if (propertyValue === 0) return 0;
    return loanAmount / propertyValue;
}

/**
 * Calculate simple interest
 * @param {number} principal - Principal amount
 * @param {number} rate - Annual interest rate (decimal)
 * @param {number} time - Time in years
 * @returns {number} Interest amount
 */
export function simpleInterest(principal, rate, time) {
    return principal * rate * time;
}

/**
 * Calculate effective annual rate (EAR)
 * @param {number} nominalRate - Nominal annual rate (decimal)
 * @param {number} compoundsPerYear - Compounding frequency
 * @returns {number} Effective annual rate
 */
export function effectiveAnnualRate(nominalRate, compoundsPerYear) {
    return Math.pow(1 + nominalRate / compoundsPerYear, compoundsPerYear) - 1;
}

/**
 * Calculate present value of future amount
 * @param {number} futureValue - Future value
 * @param {number} rate - Discount rate (decimal)
 * @param {number} periods - Number of periods
 * @returns {number} Present value
 */
export function presentValue(futureValue, rate, periods) {
    if (rate === 0) return futureValue;
    return futureValue / Math.pow(1 + rate, periods);
}

/**
 * Calculate future value of present amount
 * @param {number} presentValue - Present value
 * @param {number} rate - Interest rate (decimal)
 * @param {number} periods - Number of periods
 * @returns {number} Future value
 */
export function futureValue(presentValue, rate, periods) {
    if (rate === 0) return presentValue;
    return presentValue * Math.pow(1 + rate, periods);
}

// ── Investment Calculations ────────────────────────────────────

/**
 * Calculate return on investment (ROI)
 * @param {number} gain - Gain from investment
 * @param {number} cost - Cost of investment
 * @returns {number} ROI as decimal
 */
export function calculateROI(gain, cost) {
    if (cost === 0) return 0;
    return (gain - cost) / cost;
}

/**
 * Calculate payback period
 * @param {number} initialInvestment - Initial investment amount
 * @param {number} cashFlow - Annual cash flow
 * @returns {number} Payback period in years
 */
export function paybackPeriod(initialInvestment, cashFlow) {
    if (cashFlow <= 0) return Infinity;
    return initialInvestment / cashFlow;
}

/**
 * Calculate net present value (NPV)
 * @param {number} initialInvestment - Initial investment (negative)
 * @param {Array<number>} cashFlows - Array of future cash flows
 * @param {number} discountRate - Discount rate (decimal)
 * @returns {number} Net present value
 */
export function netPresentValue(initialInvestment, cashFlows, discountRate) {
    let npv = initialInvestment;
    
    cashFlows.forEach((cashFlow, index) => {
        npv += cashFlow / Math.pow(1 + discountRate, index + 1);
    });
    
    return npv;
}

// ── Depreciation ───────────────────────────────────────────────

/**
 * Calculate straight-line depreciation
 * @param {number} cost - Asset cost
 * @param {number} salvageValue - Salvage value at end of life
 * @param {number} usefulLife - Useful life in years
 * @param {number} yearsPassed - Years passed
 * @returns {Object} Depreciation calculation
 */
export function straightLineDepreciation(cost, salvageValue, usefulLife, yearsPassed) {
    const annualDepreciation = (cost - salvageValue) / usefulLife;
    const accumulatedDepreciation = annualDepreciation * yearsPassed;
    const bookValue = cost - accumulatedDepreciation;
    
    return {
        annualDepreciation,
        accumulatedDepreciation: Math.min(accumulatedDepreciation, cost - salvageValue),
        bookValue: Math.max(bookValue, salvageValue)
    };
}

/**
 * Calculate declining balance depreciation
 * @param {number} cost - Asset cost
 * @param {number} salvageValue - Salvage value
 * @param {number} usefulLife - Useful life in years
 * @param {number} rate - Depreciation rate (e.g., 2 for double declining)
 * @param {number} year - Current year
 * @returns {Object} Depreciation calculation
 */
export function decliningBalanceDepreciation(cost, salvageValue, usefulLife, rate = 2, year = 1) {
    const depreciationRate = rate / usefulLife;
    let bookValue = cost;
    let accumulatedDepreciation = 0;
    
    for (let i = 1; i <= year; i++) {
        const depreciation = bookValue * depreciationRate;
        const maxDepreciation = bookValue - salvageValue;
        const actualDepreciation = Math.min(depreciation, maxDepreciation);
        
        accumulatedDepreciation += actualDepreciation;
        bookValue -= actualDepreciation;
    }
    
    return {
        annualDepreciation: year === 1 ? accumulatedDepreciation : accumulatedDepreciation - (bookValue + accumulatedDepreciation - cost),
        accumulatedDepreciation,
        bookValue: Math.max(bookValue, salvageValue)
    };
}

// ── Growth and Trend Calculations ──────────────────────────────

/**
 * Calculate year-over-year growth
 * @param {number} currentValue - Current period value
 * @param {number} previousValue - Previous period value
 * @returns {number} Growth rate as decimal
 */
export function yearOverYearGrowth(currentValue, previousValue) {
    if (previousValue === 0) return 0;
    return (currentValue - previousValue) / Math.abs(previousValue);
}

/**
 * Calculate compound annual growth rate over multiple periods
 * @param {number} beginningValue - Starting value
 * @param {number} endingValue - Ending value
 * @param {number} periods - Number of periods
 * @returns {number} CAGR as decimal
 */
export function cagr(beginningValue, endingValue, periods) {
    return calculateCAGR(beginningValue, endingValue, periods);
}

/**
 * Calculate moving average
 * @param {Array<number>} values - Array of values
 * @param {number} period - Moving average period
 * @returns {Array<number>} Moving averages
 */
export function movingAverage(values, period) {
    if (!values || values.length < period) return [];
    
    const averages = [];
    
    for (let i = period - 1; i < values.length; i++) {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        averages.push(sum / period);
    }
    
    return averages;
}

// ── Constants ──────────────────────────────────────────────────

/**
 * Common financial constants
 */
export const FINANCIAL_CONSTANTS = {
    MONTHS_IN_YEAR: 12,
    DAYS_IN_YEAR: 365.25,
    WEEKS_IN_YEAR: 52,
    BIWEEKLY_PERIODS: 26,
    DEFAULT_COMPOUNDING: 12, // Monthly
    DEFAULT_INFLATION_RATE: 0.03, // 3%
    DEFAULT_DISCOUNT_RATE: 0.10 // 10%
};

/**
 * Common rounding presets
 */
export const ROUNDING = {
    CURRENCY: 2,
    PERCENTAGE: 2,
    RATE: 4,
    PRECISE: 6,
    INTEGER: 0
};

// Log module initialization