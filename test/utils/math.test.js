/**
 * Unit tests for js/utils/math.js
 * Covers financial formulas, edge cases (zero rates, NaN, Infinity, large numbers)
 * and mathematical correctness against independently computed values.
 */
import {
    safeNumber, safeNum, clamp, lerp, mapRange,
    roundTo, roundUp, roundDown, truncateTo,
    percentageOf, calculatePercentage, percentageChange, percentageDifference, applyPercentage,
    compoundInterest, compoundInterestWithContributions, timeToTarget,
    mortgagePayment, loanAmountFromPayment, remainingBalance, totalInterestPaid,
    generateAmortizationSchedule, calculateExtraPaymentSavings,
    futureValueWithInflation, presentValueFromFuture, calculatePurchasingPowerLoss,
    calculateCAGR, futureValueFromCAGR,
    mean, median, mode, standardDeviation, variance, percentile,
    simpleInterest, effectiveAnnualRate, presentValue, futureValue,
    netPresentValue, calculateROI, paybackPeriod,
    debtToIncomeRatio, loanToValueRatio,
    FINANCIAL_CONSTANTS, ROUNDING
} from '../../js/utils/math.js';

describe('safeNumber / safeNum', () => {
    it('converts valid numbers', () => {
        expect(safeNumber('42', 0)).toBe(42);
        expect(safeNum(3.14, 0)).toBe(3.14);
    });
    it('returns fallback for null/undefined/NaN/Infinity', () => {
        expect(safeNumber(null, 99)).toBe(99);
        expect(safeNumber(undefined, 99)).toBe(99);
        expect(safeNumber(NaN, 99)).toBe(99);
        expect(safeNumber(Infinity, 99)).toBe(99);
        expect(safeNumber('abc', 99)).toBe(99);
    });
    it('safeNum is an alias of safeNumber', () => {
        expect(safeNum).toBe(safeNumber);
    });
});

describe('roundTo', () => {
    it('rounds to specified decimals', () => {
        expect(roundTo(3.14159, 2)).toBe(3.14);
        expect(roundTo(3.14159, 4)).toBe(3.1416);
        expect(roundTo(3.14159, 0)).toBe(3);
    });
    it('returns 0 for non-finite values', () => {
        expect(roundTo(NaN, 2)).toBe(0);
        expect(roundTo(Infinity, 2)).toBe(0);
    });
    it('handles negative numbers', () => {
        expect(roundTo(-3.14159, 2)).toBe(-3.14);
    });
});

describe('clamp', () => {
    it('clamps values within range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(15, 0, 10)).toBe(10);
    });
});

describe('compoundInterest', () => {
    it('calculates compound interest correctly', () => {
        // FV = 1000 * (1 + 0.05/12)^(12*10) = 1647.01
        expect(compoundInterest(1000, 0.05, 10, 12)).toBeCloseTo(1647.01, 2);
    });
    it('returns principal when rate is 0', () => {
        expect(compoundInterest(1000, 0, 10, 12)).toBe(1000);
    });
    it('handles annual compounding', () => {
        // FV = 1000 * (1.05)^10 = 1628.89
        expect(compoundInterest(1000, 0.05, 10, 1)).toBeCloseTo(1628.89, 2);
    });
});

describe('compoundInterestWithContributions', () => {
    it('calculates FV with monthly contributions', () => {
        // P=1000, r=0.05, t=10, PMT=100, n=12
        // FV = 1000*(1+0.05/12)^120 + 100*((1+0.05/12)^120 - 1)/(0.05/12)
        const expected = 1000 * Math.pow(1 + 0.05/12, 120) + 100 * (Math.pow(1 + 0.05/12, 120) - 1) / (0.05/12);
        expect(compoundInterestWithContributions(1000, 0.05, 10, 100, 12)).toBeCloseTo(expected, 2);
    });
    it('returns principal + contributions when rate is 0', () => {
        expect(compoundInterestWithContributions(1000, 0, 10, 100, 12)).toBe(1000 + 100 * 12 * 10);
    });
});

describe('mortgagePayment', () => {
    it('calculates monthly mortgage payment', () => {
        // M = 300000 * [0.065/12 * (1+0.065/12)^360] / [(1+0.065/12)^360 - 1]
        const expected = 300000 * (0.065/12 * Math.pow(1 + 0.065/12, 360)) / (Math.pow(1 + 0.065/12, 360) - 1);
        expect(mortgagePayment(300000, 0.065, 30)).toBeCloseTo(expected, 2);
    });
    it('handles zero interest rate', () => {
        expect(mortgagePayment(120000, 0, 30)).toBeCloseTo(120000 / 360, 2);
    });
});

describe('remainingBalance', () => {
    it('calculates remaining balance after payments', () => {
        const payment = mortgagePayment(300000, 0.065, 30);
        const balance = remainingBalance(300000, 0.065, 30, 120);
        // After 10 years (120 payments), balance should be less than original
        expect(balance).toBeLessThan(300000);
        expect(balance).toBeGreaterThan(0);
    });
    it('returns 0 after all payments', () => {
        const payment = mortgagePayment(300000, 0.065, 30);
        const balance = remainingBalance(300000, 0.065, 30, 360);
        expect(balance).toBeCloseTo(0, 2);
    });
    it('handles zero interest', () => {
        expect(remainingBalance(120000, 0, 30, 120)).toBeCloseTo(120000 * (1 - 120/360), 2);
    });
});

describe('totalInterestPaid', () => {
    it('calculates total interest', () => {
        expect(totalInterestPaid(300000, 1800, 360)).toBe(1800 * 360 - 300000);
    });
});

describe('generateAmortizationSchedule', () => {
    it('generates correct number of rows', () => {
        const payment = mortgagePayment(100000, 0.05, 1);
        const schedule = generateAmortizationSchedule(100000, 0.05/12, 12, payment);
        expect(schedule.length).toBe(12);
    });
    it('first row has correct interest', () => {
        const payment = mortgagePayment(100000, 0.05, 1);
        const schedule = generateAmortizationSchedule(100000, 0.05/12, 12, payment);
        expect(schedule[0].interest).toBeCloseTo(100000 * 0.05/12, 2);
    });
    it('final balance is 0', () => {
        const payment = mortgagePayment(100000, 0.05, 1);
        const schedule = generateAmortizationSchedule(100000, 0.05/12, 12, payment);
        expect(schedule[schedule.length - 1].balance).toBe(0);
    });
});

describe('futureValueWithInflation', () => {
    it('calculates future value with inflation', () => {
        // FV = 1000 * (1.03)^10 = 1343.92
        expect(futureValueWithInflation(1000, 0.03, 10)).toBeCloseTo(1343.92, 2);
    });
});

describe('presentValueFromFuture', () => {
    it('calculates present value from future value', () => {
        // PV = 1000 / (1.03)^10 = 744.09
        expect(presentValueFromFuture(1000, 0.03, 10)).toBeCloseTo(744.09, 2);
    });
});

describe('calculateCAGR', () => {
    it('calculates CAGR correctly', () => {
        // CAGR = (100/10)^(1/3) - 1 = 2.1544 - 1 = 1.1544
        expect(calculateCAGR(10, 100, 3)).toBeCloseTo(1.1544, 4);
    });
    it('returns 0 for invalid inputs', () => {
        expect(calculateCAGR(0, 100, 3)).toBe(0);
        expect(calculateCAGR(10, 100, 0)).toBe(0);
    });
});

describe('futureValueFromCAGR', () => {
    it('calculates future value from CAGR', () => {
        expect(futureValueFromCAGR(1000, 0.05, 10)).toBeCloseTo(1628.89, 2);
    });
});

describe('effectiveAnnualRate', () => {
    it('calculates EAR from nominal rate', () => {
        // EAR = (1 + 0.06/12)^12 - 1 = 0.06168
        expect(effectiveAnnualRate(0.06, 12)).toBeCloseTo(0.06168, 5);
    });
});

describe('simpleInterest', () => {
    it('calculates simple interest', () => {
        expect(simpleInterest(1000, 0.05, 2)).toBe(100);
    });
});

describe('presentValue / futureValue', () => {
    it('presentValue discounts correctly', () => {
        expect(presentValue(1000, 0.05, 1)).toBeCloseTo(952.38, 2);
    });
    it('futureValue compounds correctly', () => {
        expect(futureValue(1000, 0.05, 1)).toBeCloseTo(1050, 2);
    });
});

describe('netPresentValue', () => {
    it('calculates NPV of cash flows', () => {
        // NPV = -1000 + 500/1.1 + 500/1.1^2 + 500/1.1^3
        const expected = -1000 + 500/1.1 + 500/1.21 + 500/1.331;
        expect(netPresentValue(-1000, [500, 500, 500], 0.1)).toBeCloseTo(expected, 2);
    });
});

describe('calculateROI', () => {
    it('calculates ROI', () => {
        // calculateROI(gain, cost) = (gain - cost) / cost
        expect(calculateROI(150, 100)).toBeCloseTo(0.5, 2);
    });
});

describe('paybackPeriod', () => {
    it('calculates payback period', () => {
        expect(paybackPeriod(1000, 250)).toBe(4);
    });
});

describe('debtToIncomeRatio', () => {
    it('calculates DTI', () => {
        // Returns ratio (0-1), not percentage
        expect(debtToIncomeRatio(1500, 5000)).toBeCloseTo(0.3, 2);
    });
});

describe('loanToValueRatio', () => {
    it('calculates LTV', () => {
        // Returns ratio (0-1), not percentage
        expect(loanToValueRatio(240000, 300000)).toBeCloseTo(0.8, 2);
    });
});

describe('Statistical helpers', () => {
    it('mean', () => {
        expect(mean([1, 2, 3, 4, 5])).toBe(3);
    });
    it('median (odd)', () => {
        expect(median([1, 3, 2])).toBe(2);
    });
    it('median (even)', () => {
        expect(median([1, 2, 3, 4])).toBe(2.5);
    });
    it('mode', () => {
        expect(mode([1, 2, 2, 3, 3, 3])).toEqual([3]);
    });
    it('standardDeviation (population)', () => {
        const sd = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
        expect(sd).toBeCloseTo(2, 2);
    });
    it('variance (population)', () => {
        expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4, 2);
    });
    it('percentile', () => {
        expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });
});

describe('Edge cases — NaN / Infinity / large numbers', () => {
    it('compoundInterest with Infinity returns Infinity or finite', () => {
        const result = compoundInterest(1000, Infinity, 10, 12);
        expect(isFinite(result) || result === Infinity).toBe(true);
    });
    it('mortgagePayment with very large principal', () => {
        const result = mortgagePayment(1e9, 0.05, 30);
        expect(result).toBeGreaterThan(1e6);
        expect(isFinite(result)).toBe(true);
    });
    it('roundTo handles very small decimals', () => {
        expect(roundTo(0.0000001, 2)).toBe(0);
    });
    it('percentageChange with zero old value returns 0', () => {
        expect(percentageChange(0, 100)).toBe(0);
    });
    it('calculatePercentage with zero total returns 0', () => {
        expect(calculatePercentage(50, 0)).toBe(0);
    });
});

describe('Constants', () => {
    it('FINANCIAL_CONSTANTS exists', () => {
        expect(FINANCIAL_CONSTANTS).toBeDefined();
        expect(typeof FINANCIAL_CONSTANTS).toBe('object');
    });
    it('ROUNDING exists', () => {
        expect(ROUNDING).toBeDefined();
    });
});
