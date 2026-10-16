import { describe, it, expect } from 'vitest';
import {
    calculateNigeriaCRA,
    calculateNigeriaPension,
    calculateNigeriaNHF,
    calculateNigeriaPAYE,
    calculateNigeriaSalary,
    NIGERIA_TAX_BRACKETS,
    NIGERIA_STATUTORY_RATES,
    nigeriaSalaryCalculator
} from '../../js/modules/tax-nigeria.js';

describe('Nigeria Tax & Payroll Engine (PITA, PRA 2014 & Finance Acts)', () => {

    describe('Consolidated Relief Allowance (CRA)', () => {
        it('calculates CRA correctly when ₦16,666.67 exceeds 1% of gross (income below ₦1.67M/mo)', () => {
            // Gross: ₦250,000/mo
            // Base relief: max(16,666.67, 250,000 * 0.01 = 2,500) = 16,666.67
            // Variable relief: 250,000 * 0.20 = 50,000
            // Total CRA = 16,666.67 + 50,000 = 66,666.67
            expect(calculateNigeriaCRA(250000)).toBe(66666.67);
        });

        it('calculates CRA correctly when 1% of gross exceeds ₦16,666.67 (income above ₦1.67M/mo)', () => {
            // Gross: ₦2,000,000/mo
            // Base relief: max(16,666.67, 2,000,000 * 0.01 = 20,000) = 20,000
            // Variable relief: 2,000,000 * 0.20 = 400,000
            // Total CRA = 20,000 + 400,000 = 420,000
            expect(calculateNigeriaCRA(2000000)).toBe(420000);
        });

        it('returns 0 for zero or negative gross', () => {
            expect(calculateNigeriaCRA(0)).toBe(0);
            expect(calculateNigeriaCRA(-50000)).toBe(0);
        });
    });

    describe('Pension Reform Act (PRA) 2014 Contributions', () => {
        it('computes 8% employee and 10% employer contributions accurately', () => {
            const pension = calculateNigeriaPension(200000);
            expect(pension.employeePension).toBe(16000); // 8% of 200,000
            expect(pension.employerPension).toBe(20000); // 10% of 200,000
            expect(pension.totalPension).toBe(36000);
        });

        it('returns 0 for zero or non-numeric pensionable salary', () => {
            const pension = calculateNigeriaPension(0);
            expect(pension.employeePension).toBe(0);
            expect(pension.employerPension).toBe(0);
            expect(pension.totalPension).toBe(0);
        });
    });

    describe('National Housing Fund (NHF)', () => {
        it('calculates 2.5% on basic salary', () => {
            // Basic salary: ₦100,000 -> 2.5% = ₦2,500
            expect(calculateNigeriaNHF(100000)).toBe(2500);
            // Basic salary: ₦150,000 -> 2.5% = ₦3,750
            expect(calculateNigeriaNHF(150000)).toBe(3750);
        });

        it('returns 0 for zero basic salary', () => {
            expect(calculateNigeriaNHF(0)).toBe(0);
        });
    });

    describe('PITA Progressive Tax Brackets (Sixth Schedule)', () => {
        it('taxes first ₦25,000 at 7%', () => {
            const { tax } = calculateNigeriaPAYE(25000);
            expect(tax).toBe(1750); // 25,000 * 0.07
        });

        it('taxes next ₦25,000 (up to ₦50,000) at 11%', () => {
            const { tax } = calculateNigeriaPAYE(50000);
            // (25,000 * 0.07 = 1,750) + (25,000 * 0.11 = 2,750) = 4,500
            expect(tax).toBe(4500);
        });

        it('taxes next ₦41,666.67 (up to ₦91,666.67) at 15%', () => {
            const { tax } = calculateNigeriaPAYE(91666.67);
            // 4,500 + (41,666.67 * 0.15 = 6,250) = 10,750
            expect(tax).toBe(10750);
        });

        it('taxes across all 6 progressive brackets including highest 24% rate', () => {
            // Chargeable: ₦500,000
            // Bracket 1 (25,000 @ 7%): 1,750
            // Bracket 2 (25,000 @ 11%): 2,750
            // Bracket 3 (41,666.67 @ 15%): 6,250
            // Bracket 4 (41,666.67 @ 19%): 7,916.67
            // Bracket 5 (133,333.33 @ 21%): 28,000
            // Subtotal for first 266,666.67 = 46,666.67
            // Bracket 6 (500,000 - 266,666.67 = 233,333.33 @ 24%): 56,000
            // Total Tax = 46,666.67 + 56,000 = 102,666.67
            const { tax } = calculateNigeriaPAYE(500000);
            expect(tax).toBe(102666.67);
        });
    });

    describe('Full Payroll Scenarios & Net Take-Home Pay', () => {
        it('exempts National Minimum Wage earners (₦70,000/mo) from PAYE under Finance Act', () => {
            const res = calculateNigeriaSalary({
                basicSalary: 45000,
                housingAllowance: 15000,
                transportAllowance: 10000,
                deductNhf: true
            });

            expect(res.monthly.grossSalary).toBe(70000);
            // Pension: 8% of 70,000 = 5,600
            expect(res.monthly.employeePension).toBe(5600);
            // NHF: 2.5% of 45,000 = 1,125
            expect(res.monthly.nhf).toBe(1125);
            // Minimum wage exemption -> net PAYE is ₦0
            expect(res.monthly.netPaye).toBe(0);
            // Deductions = 5,600 (Pension) + 1,125 (NHF) = 6,725
            expect(res.monthly.totalDeductions).toBe(6725);
            // Net = 70,000 - 6,725 = 63,275
            expect(res.monthly.netSalary).toBe(63275);
            expect(res.rates.effectiveTaxRate).toBe(0);
        });

        it('calculates mid-level professional (₦250,000 Gross) correctly', () => {
            // Breakdown: Basic: 150,000, Housing: 60,000, Transport: 40,000
            const res = calculateNigeriaSalary({
                basicSalary: 150000,
                housingAllowance: 60000,
                transportAllowance: 40000,
                deductNhf: true
            });

            expect(res.monthly.grossSalary).toBe(250000);
            expect(res.monthly.pensionableEmoluments).toBe(250000);

            // Pension: 8% of 250,000 = 20,000
            expect(res.monthly.employeePension).toBe(20000);
            expect(res.monthly.employerPension).toBe(25000); // 10%

            // NHF: 2.5% of 150,000 = 3,750
            expect(res.monthly.nhf).toBe(3750);

            // CRA: Higher of (16,666.67 or 2,500) + 20% of 250,000 (50,000) = 66,666.67
            expect(res.monthly.cra).toBe(66666.67);

            // Allowable Deductions = 20,000 (Pension) + 3,750 (NHF) = 23,750
            expect(res.monthly.allowableDeductions).toBe(23750);

            // Chargeable Income = 250,000 - 66,666.67 - 23,750 = 159,583.33
            expect(res.monthly.chargeableIncome).toBe(159583.33);

            // PAYE on 159,583.33:
            // 25,000 @ 7% = 1,750
            // 25,000 @ 11% = 2,750
            // 41,666.67 @ 15% = 6,250
            // 41,666.67 @ 19% = 7,916.67
            // Remaining: 159,583.33 - 133,333.34 = 26,249.99 @ 21% = 5,512.50
            // Total PAYE = 1,750 + 2,750 + 6,250 + 7,916.67 + 5,512.50 = 24,179.17
            expect(res.monthly.netPaye).toBe(24179.17);

            // Total Deductions = 24,179.17 (PAYE) + 20,000 (Pension) + 3,750 (NHF) = 47,929.17
            expect(res.monthly.totalDeductions).toBe(47929.17);

            // Net Salary = 250,000 - 47,929.17 = 202,070.83
            expect(res.monthly.netSalary).toBe(202070.83);

            // Employer Cost = 250,000 + 25,000 = 275,000
            expect(res.monthly.costToEmployer).toBe(275000);
        });

        it('enforces Minimum Tax Rule (1% of Gross) when chargeable income tax is lower than 1%', () => {
            // E.g., Gross ₦80,000 (above ₦70k minimum wage), but high reliefs or low taxable slice
            // Gross: 80,000. Basic: 50,000, Housing: 15,000, Transport: 15,000
            // Pension: 8% of 80,000 = 6,400. NHF: 2.5% of 50,000 = 1,250
            // CRA: 16,666.67 + 16,000 = 32,666.67
            // Chargeable: 80,000 - 32,666.67 - 7,650 = 39,683.33
            // Calculated PAYE: 25,000 * 0.07 (1,750) + 14,683.33 * 0.11 (1,615.17) = 3,365.17
            // 1% of 80,000 = 800. Since 3,365.17 > 800, normal tax applies.
            // But if deductions wiped out almost all income: e.g. voluntary pension of ₦35,000:
            const res = calculateNigeriaSalary({
                basicSalary: 50000,
                housingAllowance: 15000,
                transportAllowance: 15000,
                voluntaryPension: 35000,
                deductNhf: true
            });
            // Chargeable = max(0, 80,000 - 32,666.67 - (6,400 + 35,000 + 1,250)) = max(0, 80,000 - 75,316.67) = 4,683.33
            // Taxable on 4,683.33 @ 7% = 327.83
            // Minimum tax rule: 1% of 80,000 = 800.00
            // Since 327.83 < 800.00, net PAYE is lifted to 800.00!
            expect(res.monthly.netPaye).toBe(800.00);
        });

        it('calculates senior executive at ₦1,500,000 Gross', () => {
            const res = calculateNigeriaSalary({
                basicSalary: 750000,
                housingAllowance: 450000,
                transportAllowance: 300000,
                deductNhf: false // NHF opted out
            });

            expect(res.monthly.grossSalary).toBe(1500000);
            expect(res.monthly.nhf).toBe(0);
            // Pension: 8% of 1,500,000 = 120,000
            expect(res.monthly.employeePension).toBe(120000);
            // CRA: 16,666.67 + (1,500,000 * 0.20 = 300,000) = 316,666.67
            expect(res.monthly.cra).toBe(316666.67);
            // Chargeable = 1,500,000 - 316,666.67 - 120,000 = 1,063,333.33
            expect(res.monthly.chargeableIncome).toBe(1063333.33);

            // First 266,666.67 tax = 46,666.67
            // Above 266,666.67 = (1,063,333.33 - 266,666.67) * 0.24 = 796,666.66 * 0.24 = 191,200.00
            // Total PAYE = 46,666.67 + 191,200 = 237,866.67
            expect(res.monthly.netPaye).toBe(237866.67);
            expect(res.monthly.netSalary).toBe(1500000 - 237866.67 - 120000);
        });
    });

    describe('Standard Tool Adapter Interface', () => {
        it('exports a valid GetCalcu tool object', () => {
            expect(nigeriaSalaryCalculator.id).toBe('salary-calculator');
            expect(nigeriaSalaryCalculator.slug).toBe('salary-calculator/ng');
            expect(nigeriaSalaryCalculator.country).toBe('ng');
            expect(nigeriaSalaryCalculator.currency).toBe('NGN');
            expect(nigeriaSalaryCalculator.currencySymbol).toBe('₦');
            expect(typeof nigeriaSalaryCalculator.calculate).toBe('function');
            expect(Array.isArray(nigeriaSalaryCalculator.fields)).toBe(true);
            expect(Array.isArray(nigeriaSalaryCalculator.presets)).toBe(true);
            expect(Array.isArray(nigeriaSalaryCalculator.faqs)).toBe(true);
            expect(nigeriaSalaryCalculator.faqs.length).toBeGreaterThanOrEqual(5);
        });

        it('runs calculate() with default values without error', () => {
            const defaultVals = {};
            nigeriaSalaryCalculator.fields.forEach(f => {
                defaultVals[f.id] = f.default;
            });
            const result = nigeriaSalaryCalculator.calculate(defaultVals);

            expect(result.stats).toBeDefined();
            expect(result.stats.length).toBeGreaterThanOrEqual(4);
            expect(result.insight).toBeDefined();
            expect(result.chart).toBeDefined();
            expect(result.bars).toBeDefined();

            // Validate take-home pay is present in stats
            const netItem = result.stats.find(s => s.label.includes('Take-Home'));
            expect(netItem).toBeDefined();
            expect(netItem.value).toContain('₦');
        });

        it('includes comprehensive SEO educational content and statutory references', () => {
            expect(nigeriaSalaryCalculator.article).toBeDefined();
            expect(nigeriaSalaryCalculator.article.sections.length).toBeGreaterThanOrEqual(3);
            expect(nigeriaSalaryCalculator.methodology.standards).toContain('Personal Income Tax Act');
            expect(nigeriaSalaryCalculator.methodology.standards).toContain('Pension Reform Act');

            expect(nigeriaSalaryCalculator.faqs).toBeDefined();
            expect(nigeriaSalaryCalculator.faqs.length).toBeGreaterThanOrEqual(5);
        });
    });
});
