import { describe, it, expect } from 'vitest';
import {
    calculateEthiopianTax,
    calculateEthiopianSalary,
    getTaxBracketBreakdown,
    ETHIOPIA_TAX_SCHEDULES,
    ETHIOPIA_TAX_BRACKETS,
    ETHIOPIA_TAX_BRACKETS_2025,
    ETHIOPIA_TAX_BRACKETS_2016,
    PENSION_RATES,
    TRANSPORT_ALLOWANCE_CAP,
    ethiopiaSalaryCalculator
} from '../../js/modules/tax-ethiopia.js';

describe('Ethiopian Tax Engine (Forensic Statutory Verification)', () => {

    describe('Proclamation No. 1395/2025 (Active Schedule A)', () => {
        it('taxes 0 ETB on income <= 2,000 ETB (Exempt Bracket)', () => {
            expect(calculateEthiopianTax(0, '2025')).toBe(0);
            expect(calculateEthiopianTax(500, '2025')).toBe(0);
            expect(calculateEthiopianTax(1500, '2025')).toBe(0);
            expect(calculateEthiopianTax(2000, '2025')).toBe(0);
            // Default parameter should be 2025
            expect(calculateEthiopianTax(2000)).toBe(0);
        });

        it('taxes 15% (minus 300 ETB deduction) on 2,001 – 4,000 ETB', () => {
            // At 2,001 ETB: 2001 * 0.15 - 300 = 0.15 ETB
            expect(calculateEthiopianTax(2001)).toBe(0.15);
            // At 3,000 ETB: 3000 * 0.15 - 300 = 150 ETB
            expect(calculateEthiopianTax(3000)).toBe(150);
            // At 4,000 ETB (upper boundary): 4000 * 0.15 - 300 = 300 ETB
            expect(calculateEthiopianTax(4000)).toBe(300);
        });

        it('taxes 20% (minus 500 ETB deduction) on 4,001 – 7,000 ETB', () => {
            // At 4,001 ETB: 4001 * 0.20 - 500 = 300.20 ETB
            expect(calculateEthiopianTax(4001)).toBe(300.20);
            // At 5,000 ETB: 5000 * 0.20 - 500 = 500 ETB
            expect(calculateEthiopianTax(5000)).toBe(500);
            // At 7,000 ETB (upper boundary): 7000 * 0.20 - 500 = 900 ETB
            expect(calculateEthiopianTax(7000)).toBe(900);
        });

        it('taxes 25% (minus 850 ETB deduction) on 7,001 – 10,000 ETB', () => {
            // At 7,001 ETB: 7001 * 0.25 - 850 = 900.25 ETB
            expect(calculateEthiopianTax(7001)).toBe(900.25);
            // At 8,000 ETB: 8000 * 0.25 - 850 = 1,150 ETB
            expect(calculateEthiopianTax(8000)).toBe(1150);
            // At 9,000 ETB: 9000 * 0.25 - 850 = 1,400 ETB
            expect(calculateEthiopianTax(9000)).toBe(1400);
            // At 10,000 ETB (upper boundary): 10000 * 0.25 - 850 = 1,650 ETB
            expect(calculateEthiopianTax(10000)).toBe(1650);
        });

        it('taxes 30% (minus 1,350 ETB deduction) on 10,001 – 14,000 ETB', () => {
            // At 10,001 ETB: 10001 * 0.30 - 1350 = 1,650.30 ETB
            expect(calculateEthiopianTax(10001)).toBe(1650.30);
            // At 12,000 ETB: 12000 * 0.30 - 1350 = 2,250 ETB
            expect(calculateEthiopianTax(12000)).toBe(2250);
            // At 14,000 ETB (upper boundary): 14000 * 0.30 - 1350 = 2,850 ETB
            expect(calculateEthiopianTax(14000)).toBe(2850);
        });

        it('taxes 35% (minus 2,050 ETB deduction) on income > 14,000 ETB', () => {
            // At 14,001 ETB: 14001 * 0.35 - 2050 = 2,850.35 ETB
            expect(calculateEthiopianTax(14001)).toBe(2850.35);
            // At 20,000 ETB: 20000 * 0.35 - 2050 = 4,950 ETB
            expect(calculateEthiopianTax(20000)).toBe(4950);
            // At 30,000 ETB: 30000 * 0.35 - 2050 = 8,450 ETB
            expect(calculateEthiopianTax(30000)).toBe(8450);
            // At 50,000 ETB: 50000 * 0.35 - 2050 = 15,450 ETB
            expect(calculateEthiopianTax(50000)).toBe(15450);
            // At 90,000 ETB: 90000 * 0.35 - 2050 = 29,450 ETB
            expect(calculateEthiopianTax(90000)).toBe(29450);
        });
    });

    describe('Proclamation No. 979/2016 (Historical Schedule A Multi-Year Support)', () => {
        it('preserves exact historical tax calculations for 2016–2024 periods', () => {
            expect(calculateEthiopianTax(600, '2016')).toBe(0);
            expect(calculateEthiopianTax(1000, '2016')).toBe(40);
            expect(calculateEthiopianTax(1650, '2016')).toBe(105);
            expect(calculateEthiopianTax(2000, '2016')).toBe(157.50);
            expect(calculateEthiopianTax(3200, '2016')).toBe(337.50);
            expect(calculateEthiopianTax(5000, '2016')).toBe(697.50);
            expect(calculateEthiopianTax(5250, '2016')).toBe(747.50);
            expect(calculateEthiopianTax(7800, '2016')).toBe(1385);
            expect(calculateEthiopianTax(10900, '2016')).toBe(2315);
            expect(calculateEthiopianTax(20000, '2016')).toBe(5500);
            expect(calculateEthiopianTax(50000, '2016')).toBe(16000);
        });
    });

    describe('Full Salary Package & Take-Home Calculation (Proclamations 1395/2025 & 1268/2022)', () => {
        it('calculates take-home pay for standard middle-income salary (5,000 ETB)', () => {
            const res = calculateEthiopianSalary({ basicSalary: 5000, taxYear: '2025' });

            expect(res.monthly.grossSalary).toBe(5000);
            expect(res.monthly.taxableIncome).toBe(5000);
            expect(res.monthly.incomeTax).toBe(500); // 5000 * 0.20 - 500
            expect(res.monthly.employeePension).toBe(350); // 7% of 5,000 under Proc. 1268/2022
            expect(res.monthly.employerPension).toBe(550); // 11% of 5,000 under Proc. 1268/2022
            expect(res.monthly.totalDeductions).toBe(850); // 500 + 350
            expect(res.monthly.netSalary).toBe(4150); // 5000 - 850 (Under old law was 3952.50)
            expect(res.monthly.costToEmployer).toBe(5550); // 5000 + 550
        });

        it('calculates package with taxable and non-taxable allowances under Proc. 1395/2025', () => {
            const res = calculateEthiopianSalary({
                basicSalary: 20000,
                taxableAllowance: 5000,     // Representation/mobile
                nonTaxableAllowance: 2000,  // Transport allowance (within 2,200 ETB statutory cap)
                voluntaryDeductions: 1000   // Loan repayment/saving
            });

            // Gross = 20,000 + 5,000 + 2,000 = 27,000
            expect(res.monthly.grossSalary).toBe(27000);
            // Taxable = 20,000 + 5,000 = 25,000
            expect(res.monthly.taxableIncome).toBe(25000);
            // Tax on 25,000 under Proc. 1395/2025: 25,000 * 0.35 - 2,050 = 6,700 ETB
            expect(res.monthly.incomeTax).toBe(6700);
            // Pension is 7% of Basic Salary ONLY (not allowances) = 20,000 * 0.07 = 1,400
            expect(res.monthly.employeePension).toBe(1400);
            // Total Deductions = 6,700 + 1,400 + 1,000 = 9,100
            expect(res.monthly.totalDeductions).toBe(9100);
            // Net Pay = 27,000 - 9,100 = 17,900
            expect(res.monthly.netSalary).toBe(17900);
            // Employer Pension = 20,000 * 0.11 = 2,200
            expect(res.monthly.employerPension).toBe(2200);
            // Cost to Employer = Gross (27,000) + Employer Pension (2,200) = 29,200
            expect(res.monthly.costToEmployer).toBe(29200);
        });

        it('correctly distinguishes 2025 active law vs 2016 historical law in calculateEthiopianSalary', () => {
            const res2025 = calculateEthiopianSalary({ basicSalary: 25000, taxableAllowance: 5000, taxYear: '2025' });
            const res2016 = calculateEthiopianSalary({ basicSalary: 25000, taxableAllowance: 5000, taxYear: '2016' });

            // Taxable = 30,000 ETB
            // 2025: 30,000 * 0.35 - 2,050 = 8,450 ETB
            expect(res2025.monthly.incomeTax).toBe(8450);
            // 2016: 30,000 * 0.35 - 1,500 = 9,000 ETB
            expect(res2016.monthly.incomeTax).toBe(9000);

            // Employee tax savings under 2025 law: 550 ETB/mo
            expect(res2016.monthly.incomeTax - res2025.monthly.incomeTax).toBe(550);
            expect(res2025.monthly.netSalary - res2016.monthly.netSalary).toBe(550);
        });

        it('computes annual figures accurately', () => {
            const res = calculateEthiopianSalary({ basicSalary: 10000 });
            // Taxable = 10,000 ETB. Under 2025: 10000 * 0.25 - 850 = 1,650 ETB
            expect(res.monthly.incomeTax).toBe(1650);
            expect(res.annual.gross).toBe(120000);
            expect(res.annual.tax).toBe(19800); // 1,650 * 12
            expect(res.annual.employeePension).toBe(8400); // 700 * 12
            expect(res.annual.net).toBe(91800); // (10000 - 1650 - 700) * 12 = 7,650 * 12
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

        it('provides progressive bracket breakdown rows matching total tax', () => {
            const breakdown = getTaxBracketBreakdown(5000, '2025');
            // Hits 0% (up to 2000), 15% (2000 to 4000 = 300), 20% (4000 to 5000 = 200) -> Total 500
            expect(breakdown.length).toBe(3);
            const totalTaxFromBreakdown = breakdown.reduce((sum, b) => sum + b.taxPaid, 0);
            expect(Math.round(totalTaxFromBreakdown * 100) / 100).toBe(500);
        });

        it('runs through the interactive tool calculate method with correct presets', () => {
            const entryPreset = ethiopiaSalaryCalculator.presets[0].values;
            const toolResult = ethiopiaSalaryCalculator.calculate(entryPreset);
            expect(toolResult.stats).toBeDefined();
            expect(toolResult.stats[0].label).toBe('Take-Home Pay (Monthly)');
            expect(toolResult.stats[0].value).toBe('Br 7,540.00');
            expect(toolResult.chart.data).toEqual([7540, 1400, 560, 0]);
        });
    });
});
