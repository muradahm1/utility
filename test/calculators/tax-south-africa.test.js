import { describe, it, expect } from 'vitest';
import {
    calculateSouthAfricaRebate,
    calculateSouthAfricaUIF,
    calculateSouthAfricaRetirementDeduction,
    calculateSouthAfricaMedicalCredit,
    calculateSouthAfricaGrossPAYE,
    calculateSouthAfricaSalary,
    SA_TAX_YEARS,
    SA_ANNUAL_TAX_BRACKETS,
    SA_ANNUAL_TAX_BRACKETS_2027,
    SA_ANNUAL_TAX_BRACKETS_2026,
    SA_STATUTORY_RATES,
    southAfricaSalaryCalculator
} from '../../js/modules/tax-south-africa.js';

describe('South Africa Tax & Payroll Engine (Statutory Verification)', () => {

    describe('Section 6 Age-Based Tax Rebates (2027 Active & 2026 Historical)', () => {
        it('calculates 2027 Primary Rebate correctly for taxpayers under 65', () => {
            const rebate = calculateSouthAfricaRebate('under65', '2027');
            expect(rebate.annualRebate).toBe(17820);
            expect(rebate.monthlyRebate).toBe(1485.00);
            expect(rebate.secondaryRebate).toBe(0);
            expect(rebate.tertiaryRebate).toBe(0);

            // Default parameter should be 2027
            const defaultRebate = calculateSouthAfricaRebate('under65');
            expect(defaultRebate.annualRebate).toBe(17820);
        });

        it('calculates 2027 Primary + Secondary Rebate for taxpayers aged 65 to 74', () => {
            const rebate = calculateSouthAfricaRebate('65to74', '2027');
            // 17,820 + 9,765 = 27,585
            expect(rebate.annualRebate).toBe(27585);
            expect(rebate.monthlyRebate).toBe(2298.75);
            expect(rebate.secondaryRebate).toBe(9765);
        });

        it('calculates 2027 Primary + Secondary + Tertiary Rebate for taxpayers 75 and older', () => {
            const rebate = calculateSouthAfricaRebate('75plus', '2027');
            // 17,820 + 9,765 + 3,249 = 30,834
            expect(rebate.annualRebate).toBe(30834);
            expect(rebate.monthlyRebate).toBe(2569.50);
            expect(rebate.tertiaryRebate).toBe(3249);
        });

        it('preserves 2026 historical rebates', () => {
            const histUnder65 = calculateSouthAfricaRebate('under65', '2026');
            expect(histUnder65.annualRebate).toBe(17235);
            const hist65to74 = calculateSouthAfricaRebate('65to74', '2026');
            expect(hist65to74.annualRebate).toBe(26679);
            const hist75plus = calculateSouthAfricaRebate('75plus', '2026');
            expect(hist75plus.annualRebate).toBe(29824);
        });
    });

    describe('Unemployment Insurance Fund (UIF)', () => {
        it('calculates 1% employee and employer contribution below statutory ceiling', () => {
            const uif = calculateSouthAfricaUIF(12000);
            expect(uif.employeeUif).toBe(120); // 1% of 12,000
            expect(uif.employerUif).toBe(120);
            expect(uif.totalUif).toBe(240);
            expect(uif.isCapped).toBe(false);
        });

        it('caps UIF contribution at R177.12 per month when remuneration exceeds R17,712', () => {
            const uif = calculateSouthAfricaUIF(35000);
            expect(uif.employeeUif).toBe(177.12);
            expect(uif.employerUif).toBe(177.12);
            expect(uif.totalUif).toBe(354.24);
            expect(uif.isCapped).toBe(true);

            const uifHigh = calculateSouthAfricaUIF(100000);
            expect(uifHigh.employeeUif).toBe(177.12);
            expect(uifHigh.isCapped).toBe(true);
        });

        it('handles zero or negative remuneration safely', () => {
            expect(calculateSouthAfricaUIF(0).employeeUif).toBe(0);
            expect(calculateSouthAfricaUIF(-5000).employeeUif).toBe(0);
        });
    });

    describe('Section 11F Retirement Fund Deductions (Pension/Provident/RA)', () => {
        it('allows deduction when contribution is below 27.5% of remuneration', () => {
            const ret = calculateSouthAfricaRetirementDeduction(5000, 40000);
            expect(ret.allowableDeduction).toBe(5000);
            expect(ret.excessContribution).toBe(0);
            expect(ret.percentageCap).toBe(11000);
        });

        it('caps deduction at 27.5% when contribution exceeds 27.5%', () => {
            const ret = calculateSouthAfricaRetirementDeduction(15000, 40000);
            expect(ret.allowableDeduction).toBe(11000);
            expect(ret.excessContribution).toBe(4000);
        });

        it('caps deduction at statutory annual ceiling of R350,000 (R29,166.67/mo) for high earners', () => {
            const ret = calculateSouthAfricaRetirementDeduction(35000, 150000);
            expect(ret.allowableDeduction).toBe(29166.67);
            expect(ret.excessContribution).toBe(5833.33);
        });
    });

    describe('Section 6A Medical Scheme Fees Tax Credits (MTC)', () => {
        it('returns 0 when taxpayer has no medical aid scheme', () => {
            expect(calculateSouthAfricaMedicalCredit(false, 0, '2027').monthlyCredit).toBe(0);
            expect(calculateSouthAfricaMedicalCredit('no', 2, '2027').monthlyCredit).toBe(0);
        });

        it('grants 2027 rates: R376/mo main member', () => {
            const med = calculateSouthAfricaMedicalCredit(true, 0, '2027');
            expect(med.monthlyCredit).toBe(376);
            expect(med.annualCredit).toBe(4512);
        });

        it('grants 2027 rates: R752/mo for main member plus 1 dependent (R376 + R376)', () => {
            const med = calculateSouthAfricaMedicalCredit('yes', 1, '2027');
            expect(med.monthlyCredit).toBe(752);
            expect(med.annualCredit).toBe(9024);
        });

        it('grants 2027 rates: R376 + R376 + R254*2 = R1,260/mo for main member plus 3 dependents', () => {
            const med = calculateSouthAfricaMedicalCredit('yes', 3, '2027');
            expect(med.monthlyCredit).toBe(1260); // 376 + 376 + 254 + 254
            expect(med.annualCredit).toBe(15120);
        });

        it('preserves 2026 historical medical tax credits (R364 main, R364 1st dep, R246 addl)', () => {
            const med2026 = calculateSouthAfricaMedicalCredit('yes', 1, '2026');
            expect(med2026.monthlyCredit).toBe(728);
            expect(med2026.annualCredit).toBe(8736);
        });
    });

    describe('SARS Annual Gross PAYE Brackets (2027 & 2026)', () => {
        it('taxes 2027 income up to R245,100 at 18%', () => {
            const { annualGrossTax } = calculateSouthAfricaGrossPAYE(200000, '2027');
            expect(annualGrossTax).toBe(36000); // 200,000 * 0.18
        });

        it('taxes 2027 income in bracket 2 (26%) correctly', () => {
            // Income: R300,000
            // First 245,100 @ 18% = 44,118
            // Remaining (300,000 - 245,100 = 54,900) @ 26% = 14,274
            // Total = 44,118 + 14,274 = 58,392
            const { annualGrossTax } = calculateSouthAfricaGrossPAYE(300000, '2027');
            expect(annualGrossTax).toBe(58392);
        });

        it('preserves 2026 historical brackets', () => {
            const { annualGrossTax } = calculateSouthAfricaGrossPAYE(300000, '2026');
            expect(annualGrossTax).toBe(59032);
        });
    });

    describe('Full Payroll Scenarios & Net Take-Home Pay', () => {
        it('exempts earner below 2027 SARS tax threshold (R99,000/yr / R8,250/mo) from PAYE', () => {
            const res = calculateSouthAfricaSalary({
                basicSalary: 8250,
                ageCategory: 'under65',
                retirementContribution: 0,
                hasMedicalAid: false,
                taxYear: '2027'
            });

            expect(res.monthly.grossSalary).toBe(8250);
            expect(res.annual.taxableIncome).toBe(99000);
            // Gross tax: 99,000 * 0.18 = 17,820
            // Rebate: 17,820 -> Net PAYE is 0
            expect(res.monthly.netPaye).toBe(0);
            // UIF: 1% of 8,250 = 82.50
            expect(res.monthly.uif).toBe(82.50);
            expect(res.monthly.totalDeductions).toBe(82.50);
            expect(res.monthly.netSalary).toBe(8167.50);
            expect(res.rates.effectiveTaxRate).toBe(0);
        });

        it('calculates mid-level professional (R35,000 Gross) under 2027 active rates', () => {
            const res = calculateSouthAfricaSalary({
                basicSalary: 30000,
                cashAllowances: 5000,
                ageCategory: 'under65',
                retirementContribution: 2500,
                hasMedicalAid: true,
                medicalDependents: 1,
                taxYear: '2027'
            });

            expect(res.monthly.grossSalary).toBe(35000);
            // Taxable: 35,000 - 2,500 = 32,500/mo (390,000/yr)
            expect(res.annual.taxableIncome).toBe(390000);
            // Gross tax on 390,000 under 2027:
            // 245,100 @ 18% = 44,118
            // 138,000 @ 26% = 35,880
            // 6,900 @ 31% = 2,139
            // Annual Gross = 82,137
            expect(res.annual.grossPaye).toBe(82137);
            // Less primary rebate (17,820) -> 64,317
            // Less medical credit (752 * 12 = 9,024) -> 55,293
            expect(res.annual.netPaye).toBe(55293);
            expect(res.monthly.netPaye).toBe(4607.75); // 55,293 / 12
            expect(res.monthly.uif).toBe(177.12);
            // Total Deductions = 4,607.75 + 177.12 + 2,500 = 7,284.87
            expect(res.monthly.totalDeductions).toBe(7284.87);
            expect(res.monthly.netSalary).toBe(27715.13);
        });

        it('preserves historical 2026 calculation for mid-level professional', () => {
            const res = calculateSouthAfricaSalary({
                basicSalary: 30000,
                cashAllowances: 5000,
                ageCategory: 'under65',
                retirementContribution: 2500,
                hasMedicalAid: true,
                medicalDependents: 1,
                taxYear: '2026'
            });

            expect(res.annual.grossPaye).toBe(83407);
            expect(res.annual.netPaye).toBe(57436);
            expect(res.monthly.netPaye).toBe(4786.33);
            expect(res.monthly.netSalary).toBe(27536.55);
        });
    });

    describe('Standard Tool Adapter Interface', () => {
        it('exports a valid GetCalcu tool object', () => {
            expect(southAfricaSalaryCalculator.id).toBe('salary-calculator');
            expect(southAfricaSalaryCalculator.slug).toBe('salary-calculator/za');
            expect(southAfricaSalaryCalculator.country).toBe('za');
            expect(southAfricaSalaryCalculator.currency).toBe('ZAR');
            expect(southAfricaSalaryCalculator.currencySymbol).toBe('R');
            expect(typeof southAfricaSalaryCalculator.calculate).toBe('function');
            expect(Array.isArray(southAfricaSalaryCalculator.fields)).toBe(true);
            expect(Array.isArray(southAfricaSalaryCalculator.presets)).toBe(true);
            expect(Array.isArray(southAfricaSalaryCalculator.faqs)).toBe(true);
        });

        it('runs calculate() with default values without error', () => {
            const defaultVals = {};
            southAfricaSalaryCalculator.fields.forEach(f => {
                defaultVals[f.id] = f.default;
            });
            const result = southAfricaSalaryCalculator.calculate(defaultVals);
            expect(result.stats).toBeDefined();
            expect(result.stats.length).toBeGreaterThanOrEqual(4);
            expect(result.insight).toBeDefined();
            expect(result.chart).toBeDefined();
            expect(result.bars).toBeDefined();
        });
    });
});
