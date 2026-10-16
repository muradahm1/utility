import { describe, it, expect } from 'vitest';
import {
    calculateEthiopianTax,
    calculateEthiopianSalary,
    getTaxBracketBreakdown,
    ETHIOPIA_TAX_BRACKETS,
    PENSION_RATES
} from '../../js/modules/tax-ethiopia.js';

describe('Ethiopian Tax Engine (Proclamation No. 979/2016)', () => {

    describe('Bracket-by-bracket threshold validation', () => {
        it('taxes 0 ETB on income <= 600 ETB (Exempt Bracket)', () => {
            expect(calculateEthiopianTax(0)).toBe(0);
            expect(calculateEthiopianTax(300)).toBe(0);
            expect(calculateEthiopianTax(600)).toBe(0);
        });

        it('taxes 10% (minus 60 ETB deduction) on 601 – 1,650 ETB', () => {
            // At 1,000 ETB: 1000 * 0.10 - 60 = 40 ETB
            expect(calculateEthiopianTax(1000)).toBe(40);
            // At 1,650 ETB (upper boundary): 1650 * 0.10 - 60 = 105 ETB
            expect(calculateEthiopianTax(1650)).toBe(105);
        });

        it('taxes 15% (minus 142.50 ETB deduction) on 1,651 – 3,200 ETB', () => {
            // At 2,000 ETB: 2000 * 0.15 - 142.50 = 157.50 ETB
            expect(calculateEthiopianTax(2000)).toBe(157.50);
            // At 3,200 ETB (upper boundary): 3200 * 0.15 - 142.50 = 337.50 ETB
            expect(calculateEthiopianTax(3200)).toBe(337.50);
        });

        it('taxes 20% (minus 302.50 ETB deduction) on 3,201 – 5,250 ETB', () => {
            // At 5,000 ETB: 5000 * 0.20 - 302.50 = 697.50 ETB
            expect(calculateEthiopianTax(5000)).toBe(697.50);
            // At 5,250 ETB (upper boundary): 5250 * 0.20 - 302.50 = 747.50 ETB
            expect(calculateEthiopianTax(5250)).toBe(747.50);
        });

        it('taxes 25% (minus 565 ETB deduction) on 5,251 – 7,800 ETB', () => {
            // At 6,000 ETB: 6000 * 0.25 - 565 = 935 ETB
            expect(calculateEthiopianTax(6000)).toBe(935);
            // At 7,800 ETB (upper boundary): 7800 * 0.25 - 565 = 1,385 ETB
            expect(calculateEthiopianTax(7800)).toBe(1385);
        });

        it('taxes 30% (minus 955 ETB deduction) on 7,801 – 10,900 ETB', () => {
            // At 10,000 ETB: 10000 * 0.30 - 955 = 2,045 ETB
            expect(calculateEthiopianTax(10000)).toBe(2045);
            // At 10,900 ETB (upper boundary): 10900 * 0.30 - 955 = 2,315 ETB
            expect(calculateEthiopianTax(10900)).toBe(2315);
        });

        it('taxes 35% (minus 1,500 ETB deduction) on income > 10,900 ETB', () => {
            // At 20,000 ETB: 20000 * 0.35 - 1500 = 5,500 ETB
            expect(calculateEthiopianTax(20000)).toBe(5500);
            // At 50,000 ETB: 50000 * 0.35 - 1500 = 16,000 ETB
            expect(calculateEthiopianTax(50000)).toBe(16000);
            // At 100,000 ETB: 100000 * 0.35 - 1500 = 33,500 ETB
            expect(calculateEthiopianTax(100000)).toBe(33500);
        });
    });

    describe('Full Salary Package & Take-Home Calculation (Proclamation 715/2011)', () => {
        it('calculates take-home pay for standard middle-income salary (5,000 ETB)', () => {
            const res = calculateEthiopianSalary({ basicSalary: 5000 });
            
            expect(res.monthly.grossSalary).toBe(5000);
            expect(res.monthly.taxableIncome).toBe(5000);
            expect(res.monthly.incomeTax).toBe(697.50);
            expect(res.monthly.employeePension).toBe(350); // 7% of 5,000
            expect(res.monthly.employerPension).toBe(550); // 11% of 5,000
            expect(res.monthly.totalDeductions).toBe(1047.50); // 697.50 + 350
            expect(res.monthly.netSalary).toBe(3952.50); // 5000 - 1047.50
            expect(res.monthly.costToEmployer).toBe(5550); // 5000 + 550
        });

        it('calculates package with taxable and non-taxable allowances', () => {
            const res = calculateEthiopianSalary({
                basicSalary: 20000,
                taxableAllowance: 5000,     // Transport/representation
                nonTaxableAllowance: 2000,  // Hardship/exempt allowance
                voluntaryDeductions: 1000   // Loan repayment/saving
            });

            // Gross = 20,000 + 5,000 + 2,000 = 27,000
            expect(res.monthly.grossSalary).toBe(27000);
            // Taxable = 20,000 + 5,000 = 25,000
            expect(res.monthly.taxableIncome).toBe(25000);
            // Tax on 25,000 = 25,000 * 0.35 - 1,500 = 7,250
            expect(res.monthly.incomeTax).toBe(7250);
            // Pension is 7% of Basic Salary ONLY (not allowances) = 20,000 * 0.07 = 1,400
            expect(res.monthly.employeePension).toBe(1400);
            // Total Deductions = 7,250 + 1,400 + 1,000 = 9,650
            expect(res.monthly.totalDeductions).toBe(9650);
            // Net Pay = 27,000 - 9,650 = 17,350
            expect(res.monthly.netSalary).toBe(17350);
            // Employer Pension = 20,000 * 0.11 = 2,200
            expect(res.monthly.employerPension).toBe(2200);
            // Cost to Employer = Gross (27,000) + Employer Pension (2,200) = 29,200
            expect(res.monthly.costToEmployer).toBe(29200);
        });

        it('computes annual figures accurately', () => {
            const res = calculateEthiopianSalary({ basicSalary: 10000 });
            expect(res.annual.gross).toBe(120000);
            expect(res.annual.tax).toBe(24540); // 2,045 * 12
            expect(res.annual.employeePension).toBe(8400); // 700 * 12
            expect(res.annual.net).toBe(87060); // 7,255 * 12
        });

        it('handles boundary conditions gracefully', () => {
            const zeroRes = calculateEthiopianSalary({ basicSalary: 0 });
            expect(zeroRes.monthly.incomeTax).toBe(0);
            expect(zeroRes.monthly.netSalary).toBe(0);
            expect(zeroRes.rates.effectiveTaxRate).toBe(0);

            const negativeRes = calculateEthiopianSalary({ basicSalary: -5000 });
            expect(negativeRes.monthly.basicSalary).toBe(0);
            expect(negativeRes.monthly.netSalary).toBe(0);
        });

        it('provides progressive bracket breakdown rows', () => {
            const breakdown = getTaxBracketBreakdown(5000);
            expect(breakdown.length).toBe(4); // Hits 0%, 10%, 15%, 20%
            const totalTaxFromBreakdown = breakdown.reduce((sum, b) => sum + b.taxPaid, 0);
            expect(Math.round(totalTaxFromBreakdown * 100) / 100).toBe(697.50);
        });
    });
});
