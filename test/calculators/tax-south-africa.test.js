import { describe, it, expect } from 'vitest';
import {
    calculateSouthAfricaRebate,
    calculateSouthAfricaUIF,
    calculateSouthAfricaRetirementDeduction,
    calculateSouthAfricaMedicalCredit,
    calculateSouthAfricaGrossPAYE,
    calculateSouthAfricaSalary,
    SA_ANNUAL_TAX_BRACKETS,
    SA_STATUTORY_RATES,
    southAfricaSalaryCalculator
} from '../../js/modules/tax-south-africa.js';

describe('South Africa Tax & Payroll Engine (SARS & UIF)', () => {

    describe('Section 6 Age-Based Tax Rebates', () => {
        it('calculates Primary Rebate correctly for taxpayers under 65', () => {
            const rebate = calculateSouthAfricaRebate('under65');
            expect(rebate.annualRebate).toBe(17235);
            expect(rebate.monthlyRebate).toBe(1436.25);
            expect(rebate.secondaryRebate).toBe(0);
            expect(rebate.tertiaryRebate).toBe(0);
        });

        it('calculates Primary + Secondary Rebate for taxpayers aged 65 to 74', () => {
            const rebate = calculateSouthAfricaRebate('65to74');
            // 17,235 + 9,444 = 26,679
            expect(rebate.annualRebate).toBe(26679);
            expect(rebate.monthlyRebate).toBe(2223.25);
            expect(rebate.secondaryRebate).toBe(9444);
            expect(rebate.tertiaryRebate).toBe(0);
        });

        it('calculates Primary + Secondary + Tertiary Rebate for taxpayers 75 and older', () => {
            const rebate = calculateSouthAfricaRebate('75plus');
            // 17,235 + 9,444 + 3,145 = 29,824
            expect(rebate.annualRebate).toBe(29824);
            expect(rebate.monthlyRebate).toBe(2485.33);
            expect(rebate.tertiaryRebate).toBe(3145);
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
            // Remuneration: R40,000 -> 27.5% is R11,000
            // Contribution: R5,000 (below cap)
            const ret = calculateSouthAfricaRetirementDeduction(5000, 40000);
            expect(ret.allowableDeduction).toBe(5000);
            expect(ret.excessContribution).toBe(0);
            expect(ret.percentageCap).toBe(11000);
        });

        it('caps deduction at 27.5% when contribution exceeds 27.5%', () => {
            // Remuneration: R40,000 -> 27.5% is R11,000
            // Contribution: R15,000
            const ret = calculateSouthAfricaRetirementDeduction(15000, 40000);
            expect(ret.allowableDeduction).toBe(11000);
            expect(ret.excessContribution).toBe(4000);
        });

        it('caps deduction at statutory annual ceiling of R350,000 (R29,166.67/mo) for high earners', () => {
            // Remuneration: R150,000/mo -> 27.5% = R41,250
            // Statutory ceiling = R29,166.67/mo
            // Contribution: R35,000
            const ret = calculateSouthAfricaRetirementDeduction(35000, 150000);
            expect(ret.allowableDeduction).toBe(29166.67);
            expect(ret.excessContribution).toBe(5833.33); // 35,000 - 29,166.67
        });
    });

    describe('Section 6A Medical Scheme Fees Tax Credits (MTC)', () => {
        it('returns 0 when taxpayer has no medical aid scheme', () => {
            expect(calculateSouthAfricaMedicalCredit(false, 0).monthlyCredit).toBe(0);
            expect(calculateSouthAfricaMedicalCredit('no', 2).monthlyCredit).toBe(0);
        });

        it('grants R364/mo for single main member', () => {
            const med = calculateSouthAfricaMedicalCredit(true, 0);
            expect(med.monthlyCredit).toBe(364);
            expect(med.annualCredit).toBe(4368);
        });

        it('grants R728/mo for main member plus 1 dependent (R364 + R364)', () => {
            const med = calculateSouthAfricaMedicalCredit('yes', 1);
            expect(med.monthlyCredit).toBe(728);
            expect(med.annualCredit).toBe(8736);
        });

        it('grants R364 + R364 + R246*2 = R1,220/mo for main member plus 3 dependents', () => {
            const med = calculateSouthAfricaMedicalCredit('yes', 3);
            expect(med.monthlyCredit).toBe(1220); // 364 + 364 + 246 + 246
            expect(med.annualCredit).toBe(14640);
        });
    });

    describe('SARS Annual Gross PAYE Brackets', () => {
        it('taxes income up to R237,100 at 18%', () => {
            const { annualGrossTax } = calculateSouthAfricaGrossPAYE(200000);
            expect(annualGrossTax).toBe(36000); // 200,000 * 0.18
        });

        it('taxes income in bracket 2 (26%) correctly', () => {
            // Income: R300,000
            // First 237,100 @ 18% = 42,678
            // Remaining (300,000 - 237,100 = 62,900) @ 26% = 16,354
            // Total = 42,678 + 16,354 = 59,032
            const { annualGrossTax } = calculateSouthAfricaGrossPAYE(300000);
            expect(annualGrossTax).toBe(59032);
        });

        it('taxes income in top marginal bracket (45%) correctly', () => {
            // Income: R2,000,000
            // First 1,817,000 tax = 644,489
            // Remaining (2,000,000 - 1,817,000 = 183,000) @ 45% = 82,350
            // Total = 644,489 + 82,350 = 726,839
            const { annualGrossTax } = calculateSouthAfricaGrossPAYE(2000000);
            expect(annualGrossTax).toBe(726839);
        });
    });

    describe('Full Payroll Scenarios & Net Take-Home Pay', () => {
        it('exempts low earner below SARS tax threshold (R7,500/mo) from PAYE', () => {
            const res = calculateSouthAfricaSalary({
                basicSalary: 7500,
                ageCategory: 'under65',
                retirementContribution: 0,
                hasMedicalAid: false
            });

            expect(res.monthly.grossSalary).toBe(7500);
            // Annual income: 90,000 (below threshold of 95,750)
            // Gross tax: 90,000 * 0.18 = 16,200
            // Rebate: 17,235 -> Net PAYE is 0
            expect(res.monthly.netPaye).toBe(0);
            // UIF: 1% of 7,500 = 75.00
            expect(res.monthly.uif).toBe(75);
            // Total deductions = 75
            expect(res.monthly.totalDeductions).toBe(75);
            // Net salary = 7,500 - 75 = 7,425
            expect(res.monthly.netSalary).toBe(7425);
            expect(res.rates.effectiveTaxRate).toBe(0);
        });

        it('calculates mid-level professional (R35,000 Gross) correctly with pension and medical aid', () => {
            const res = calculateSouthAfricaSalary({
                basicSalary: 30000,
                cashAllowances: 5000,
                ageCategory: 'under65',
                retirementContribution: 2500,
                hasMedicalAid: true,
                medicalDependents: 1
            });

            expect(res.monthly.grossSalary).toBe(35000);
            // Taxable income = 35,000 - 2,500 (allowable pension) = 32,500/mo (390,000/yr)
            expect(res.monthly.monthlyTaxableIncome).toBe(32500);
            expect(res.annual.taxableIncome).toBe(390000);

            // Gross tax on 390,000:
            // First 370,500 tax = 77,362
            // Remaining (390,000 - 370,500 = 19,500) @ 31% = 6,045
            // Total annual gross tax = 77,362 + 6,045 = 83,407
            expect(res.annual.grossPaye).toBe(83407);

            // Less Primary Rebate: 17,235 -> Tax after rebate = 83,407 - 17,235 = 66,172
            // Less Medical Tax Credit: (364 + 364) * 12 = 8,736 -> Net tax = 66,172 - 8,736 = 57,436
            expect(res.annual.netPaye).toBe(57436);
            expect(res.monthly.netPaye).toBe(4786.33); // 57,436 / 12

            // UIF: capped at R177.12
            expect(res.monthly.uif).toBe(177.12);

            // Total Deductions = 4,786.33 (PAYE) + 177.12 (UIF) + 2,500 (Pension) = 7,463.45
            expect(res.monthly.totalDeductions).toBe(7463.45);
            // Net Take-Home = 35,000 - 7,463.45 = 27,536.55
            expect(res.monthly.netSalary).toBe(27536.55);
        });

        it('applies Secondary Rebate for working senior citizen aged 68', () => {
            const res = calculateSouthAfricaSalary({
                basicSalary: 25000,
                ageCategory: '65to74',
                retirementContribution: 0,
                hasMedicalAid: false
            });

            expect(res.monthly.grossSalary).toBe(25000);
            // Annual income: 300,000
            // Gross annual tax: 42,678 + 26% of (300,000 - 237,100 = 62,900) = 42,678 + 16,354 = 59,032
            // Combined Primary + Secondary Rebate: 17,235 + 9,444 = 26,679
            // Net annual tax = 59,032 - 26,679 = 32,353
            // Monthly net tax = 32,353 / 12 = 2,696.08
            expect(res.monthly.netPaye).toBe(2696.08);
            expect(res.annual.rebate).toBe(26679);
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
            expect(southAfricaSalaryCalculator.faqs.length).toBeGreaterThanOrEqual(5);
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

            // Validate take-home pay is present in stats
            const netItem = result.stats.find(s => s.label.includes('Take-Home'));
            expect(netItem).toBeDefined();
            expect(netItem.value).toContain('R');
        });

        it('includes comprehensive SEO educational content and statutory references', () => {
            expect(southAfricaSalaryCalculator.article).toBeDefined();
            expect(southAfricaSalaryCalculator.article.sections.length).toBeGreaterThanOrEqual(3);
            expect(southAfricaSalaryCalculator.methodology.standards).toContain('South African Revenue Service');
            expect(southAfricaSalaryCalculator.methodology.standards).toContain('Income Tax Act');

            expect(southAfricaSalaryCalculator.faqs).toBeDefined();
            expect(southAfricaSalaryCalculator.faqs.length).toBeGreaterThanOrEqual(5);
        });
    });
});
