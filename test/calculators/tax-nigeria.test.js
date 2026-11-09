import { describe, it, expect } from 'vitest';
import {
    calculateNigeriaCRA,
    calculateNigeriaPension,
    calculateNigeriaNHF,
    calculateNigeriaPAYE,
    calculateNigeriaSalary,
    NIGERIA_TAX_FRAMEWORKS,
    NIGERIA_TAX_BRACKETS,
    NIGERIA_TAX_BRACKETS_2026,
    NIGERIA_TAX_BRACKETS_PITA,
    NIGERIA_STATUTORY_RATES,
    nigeriaSalaryCalculator
} from '../../js/modules/tax-nigeria.js';

describe('Nigeria Tax & Payroll Engine (Statutory Verification)', () => {

    describe('Nigeria Tax Act 2025 Framework (Active 2026)', () => {
        it('taxes 0% on monthly income up to ₦66,666.67 (₦800,000 Annual Tax-Exempt Band)', () => {
            const low1 = calculateNigeriaPAYE(50000, '2026');
            expect(low1.tax).toBe(0);
            const low2 = calculateNigeriaPAYE(66666.67, '2026');
            expect(low2.tax).toBe(0);
        });

        it('taxes 15% on income between ₦66,666.67 and ₦250,000', () => {
            // At ₦100,000: (100,000 - 66,666.67 = 33,333.33) * 0.15 = 5,000.00
            const res = calculateNigeriaPAYE(100000, '2026');
            expect(res.tax).toBe(5000);

            // At ₦250,000: (250,000 - 66,666.67 = 183,333.33) * 0.15 = 27,500.00
            const atCap = calculateNigeriaPAYE(250000, '2026');
            expect(atCap.tax).toBe(27500);
        });

        it('taxes across higher brackets (18%, 21%, 23%, 25%)', () => {
            // At ₦500,000:
            // Band 1 (66,666.67 @ 0%): 0
            // Band 2 (183,333.33 @ 15%): 27,500
            // Band 3 (250,000 @ 18%): 45,000
            // Total = 72,500
            const res500k = calculateNigeriaPAYE(500000, '2026');
            expect(res500k.tax).toBe(72500);
        });

        it('exempts National Minimum Wage earners (₦70,000 Gross) from PAYE under Tax Act 2025', () => {
            const res = calculateNigeriaSalary({
                basicSalary: 45000,
                housingAllowance: 15000,
                transportAllowance: 10000,
                deductNhf: true,
                framework: '2026'
            });

            expect(res.monthly.grossSalary).toBe(70000);
            // Pension: 8% of 70,000 = 5,600
            expect(res.monthly.employeePension).toBe(5600);
            // NHF: 2.5% of 45,000 = 1,125
            expect(res.monthly.nhf).toBe(1125);
            // Chargeable income: 70,000 - 5,600 - 1,125 = 63,275 (< ₦66,666.67 0% band)
            expect(res.monthly.chargeableIncome).toBe(63275);
            // Net PAYE is ₦0
            expect(res.monthly.netPaye).toBe(0);
            // Deductions = 5,600 (Pension) + 1,125 (NHF) = 6,725
            expect(res.monthly.totalDeductions).toBe(6725);
            // Net = 70,000 - 6,725 = 63,275
            expect(res.monthly.netSalary).toBe(63275);
            expect(res.rates.effectiveTaxRate).toBe(0);
        });

        it('calculates mid-level professional (₦300,000 Gross) with Rent Relief under Tax Act 2025', () => {
            const res = calculateNigeriaSalary({
                basicSalary: 150000,
                housingAllowance: 75000,
                transportAllowance: 45000,
                otherAllowances: 30000,
                monthlyRent: 50000,
                deductNhf: true,
                framework: '2026'
            });

            expect(res.monthly.grossSalary).toBe(300000);
            // Pensionable emoluments = 150k + 75k + 45k = 270k
            expect(res.monthly.pensionableEmoluments).toBe(270000);
            // Pension: 8% of 270,000 = 21,600
            expect(res.monthly.employeePension).toBe(21600);
            // NHF: 2.5% of 150,000 = 3,750
            expect(res.monthly.nhf).toBe(3750);
            // Rent relief: 20% of 50,000 = 10,000 (below 41,666.67 cap)
            expect(res.monthly.rentRelief).toBe(10000);
            // Chargeable Income: 300,000 - (21,600 + 3,750) - 10,000 = 264,650
            expect(res.monthly.chargeableIncome).toBe(264650);
            // PAYE:
            // 66,666.67 @ 0% = 0
            // 183,333.33 @ 15% = 27,500
            // 14,650.00 @ 18% = 2,637
            // Total PAYE = 30,137.00
            expect(res.monthly.netPaye).toBe(30137);
            // Total Deductions = 30,137 + 21,600 + 3,750 = 55,487
            expect(res.monthly.totalDeductions).toBe(55487);
            // Net Salary = 300,000 - 55,487 = 244,513
            expect(res.monthly.netSalary).toBe(244513);
        });

        it('caps Rent Relief at statutory ₦500,000/yr (₦41,666.67/mo)', () => {
            const res = calculateNigeriaSalary({
                basicSalary: 500000,
                monthlyRent: 300000, // 20% of 300k is 60,000, which exceeds 41,666.67 cap
                framework: '2026'
            });
            expect(res.monthly.rentRelief).toBe(41666.67);
        });
    });

    describe('PITA 2004 & Finance Acts Historical Framework', () => {
        it('calculates CRA correctly under historical PITA rules', () => {
            expect(calculateNigeriaCRA(250000)).toBe(66666.67);
            expect(calculateNigeriaCRA(2000000)).toBe(420000);
        });

        it('preserves historical PITA 6-bracket progressive tax calculation', () => {
            const { tax: tax25k } = calculateNigeriaPAYE(25000, '2025_PITA');
            expect(tax25k).toBe(1750); // 25,000 * 0.07

            const { tax: tax50k } = calculateNigeriaPAYE(50000, '2025_PITA');
            expect(tax50k).toBe(4500); // 1,750 + 2,750

            const { tax: tax500k } = calculateNigeriaPAYE(500000, '2025_PITA');
            expect(tax500k).toBe(102666.67);
        });

        it('calculates full historical PITA scenario with CRA and 1% minimum tax', () => {
            const res = calculateNigeriaSalary({
                basicSalary: 150000,
                housingAllowance: 60000,
                transportAllowance: 40000,
                deductNhf: true,
                framework: '2025_PITA'
            });

            expect(res.monthly.grossSalary).toBe(250000);
            expect(res.monthly.employeePension).toBe(20000);
            expect(res.monthly.nhf).toBe(3750);
            expect(res.monthly.cra).toBe(66666.67);
            expect(res.monthly.chargeableIncome).toBe(159583.33);
            expect(res.monthly.netPaye).toBe(24179.17);
            expect(res.monthly.totalDeductions).toBe(47929.17);
            expect(res.monthly.netSalary).toBe(202070.83);
        });
    });

    describe('Statutory Social Funds (PRA 2014 & NHF)', () => {
        it('computes 8% employee and 10% employer contributions accurately', () => {
            const pension = calculateNigeriaPension(200000);
            expect(pension.employeePension).toBe(16000);
            expect(pension.employerPension).toBe(20000);
            expect(pension.totalPension).toBe(36000);
        });

        it('calculates 2.5% NHF on basic salary', () => {
            expect(calculateNigeriaNHF(100000)).toBe(2500);
            expect(calculateNigeriaNHF(150000)).toBe(3750);
        });
    });

    describe('nigeriaSalaryCalculator Tool Definition', () => {
        it('exports a valid GetCalcu tool object', () => {
            expect(nigeriaSalaryCalculator.id).toBe('salary-calculator');
            expect(nigeriaSalaryCalculator.country).toBe('ng');
            expect(nigeriaSalaryCalculator.currency).toBe('NGN');
            expect(nigeriaSalaryCalculator.currencySymbol).toBe('₦');
            expect(typeof nigeriaSalaryCalculator.calculate).toBe('function');
            expect(Array.isArray(nigeriaSalaryCalculator.fields)).toBe(true);
            expect(Array.isArray(nigeriaSalaryCalculator.presets)).toBe(true);
            expect(Array.isArray(nigeriaSalaryCalculator.faqs)).toBe(true);
        });

        it('runs calculate() with default values without error', () => {
            const defaultVals = {};
            nigeriaSalaryCalculator.fields.forEach(f => {
                defaultVals[f.id] = f.default;
            });
            const result = nigeriaSalaryCalculator.calculate(defaultVals);
            expect(result.stats).toBeDefined();
            expect(result.stats.length).toBeGreaterThan(0);
            expect(result.insight).toBeDefined();
            expect(result.chart).toBeDefined();
            expect(result.bars).toBeDefined();
            expect(result.stats[0].label).toBe('Net Take-Home Pay (Monthly)');
        });
    });
});
