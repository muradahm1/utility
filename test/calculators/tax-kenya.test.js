import { describe, it, expect } from 'vitest';
import {
    calculateKenyaNSSF,
    calculateKenyaSHIF,
    calculateKenyaHousingLevy,
    calculateKenyaGrossPAYE,
    calculateKenyaSalary,
    KENYA_TAX_BRACKETS,
    KENYA_NSSF_SCHEDULES,
    KENYA_STATUTORY_RATES,
    kenyaSalaryCalculator
} from '../../js/modules/tax-kenya.js';

describe('Kenya Tax & Payroll Engine (Statutory Verification)', () => {

    describe('NSSF Multi-Year Schedules (NSSF Act 2013 Third Schedule)', () => {
        it('calculates Year 4 (2026/2027 Active) NSSF Tier I & Tier II correctly with KSh 6,480 cap', () => {
            // Below Year 4 Tier I cap (9,000 KSh): 5,000 KSh
            const low = calculateKenyaNSSF(5000, 'year4');
            expect(low.tierI).toBe(300); // 6% of 5,000
            expect(low.tierII).toBe(0);
            expect(low.totalEmployeeNssf).toBe(300);

            // Exactly at Tier I cap (9,000 KSh)
            const atTierI = calculateKenyaNSSF(9000, 'year4');
            expect(atTierI.tierI).toBe(540); // 6% of 9,000
            expect(atTierI.tierII).toBe(0);
            expect(atTierI.totalEmployeeNssf).toBe(540);

            // Mid income: 50,000 KSh
            const mid = calculateKenyaNSSF(50000, 'year4');
            expect(mid.tierI).toBe(540);
            expect(mid.tierII).toBe(2460); // 6% of (50,000 - 9,000 = 41,000)
            expect(mid.totalEmployeeNssf).toBe(3000);

            // High income at or above Tier II cap (108,000 KSh): 150,000 KSh
            const capped = calculateKenyaNSSF(150000, 'year4');
            expect(capped.tierI).toBe(540);
            expect(capped.tierII).toBe(5940); // 6% of (108,000 - 9,000 = 99,000)
            expect(capped.totalEmployeeNssf).toBe(6480); // Maximum cap
            expect(capped.totalEmployerNssf).toBe(6480);

            // Defaults to Year 4 when no schedule passed
            const defaultSched = calculateKenyaNSSF(150000);
            expect(defaultSched.totalEmployeeNssf).toBe(6480);
        });

        it('calculates Year 2 (2024 Historical) NSSF Tier I & Tier II with KSh 2,160 cap', () => {
            const yr2 = calculateKenyaNSSF(50000, 'year2');
            expect(yr2.tierI).toBe(420); // 6% of 7,000
            expect(yr2.tierII).toBe(1740); // 6% of (36,000 - 7,000)
            expect(yr2.totalEmployeeNssf).toBe(2160);
        });

        it('calculates Year 3 (2025 Historical) NSSF Tier I & Tier II with KSh 4,320 cap', () => {
            const yr3 = calculateKenyaNSSF(80000, 'year3');
            expect(yr3.tierI).toBe(480); // 6% of 8,000
            expect(yr3.tierII).toBe(3840); // 6% of (72,000 - 8,000)
            expect(yr3.totalEmployeeNssf).toBe(4320);
        });
    });

    describe('Statutory Health (SHIF) & Housing Levy (AHL)', () => {
        it('calculates SHIF at 2.75% of gross with KSh 300 minimum', () => {
            expect(calculateKenyaSHIF(5000)).toBe(300); // 5000 * 0.0275 = 137.50 -> floor at 300
            expect(calculateKenyaSHIF(50000)).toBe(1375); // 50000 * 0.0275
            expect(calculateKenyaSHIF(200000)).toBe(5500); // 200000 * 0.0275
        });

        it('calculates Affordable Housing Levy at 1.5% of gross', () => {
            const ahl = calculateKenyaHousingLevy(80000);
            expect(ahl.employeeAhl).toBe(1200); // 1.5% of 80,000
            expect(ahl.employerAhl).toBe(1200);
        });
    });

    describe('KRA PAYE Progressive Brackets', () => {
        it('taxes first 24,000 KSh at 10%', () => {
            const { grossPaye } = calculateKenyaGrossPAYE(24000);
            expect(grossPaye).toBe(2400); // 24,000 * 0.10
        });

        it('taxes 24,001 - 32,333.33 KSh at 25%', () => {
            const { grossPaye } = calculateKenyaGrossPAYE(32333.33);
            expect(grossPaye).toBe(4483.33);
        });

        it('taxes 32,334 - 500,000 KSh at 30%', () => {
            const { grossPaye } = calculateKenyaGrossPAYE(50000);
            expect(grossPaye).toBe(9783.33);
        });
    });

    describe('Full Payroll Scenarios & Tax Laws (Amendment) Act 2024 Sequence', () => {
        it('calculates minimum wage earner (KSh 24,000 Gross) under Year 4 active law', () => {
            const res = calculateKenyaSalary({ basicSalary: 24000, nssfSchedule: 'year4' });

            expect(res.monthly.grossSalary).toBe(24000);
            // Year 4 NSSF on 24,000: Tier I (540) + Tier II (6% of 15,000 = 900) = 1,440
            expect(res.monthly.employeeNssf).toBe(1440);
            // SHIF: 24,000 * 0.0275 = 660
            expect(res.monthly.shif).toBe(660);
            // AHL: 24,000 * 0.015 = 360
            expect(res.monthly.employeeAhl).toBe(360);
            // Allowable pre-tax deductions: 1,440 + 660 + 360 = 2,460
            // Taxable Pay: 24,000 - 2,460 = 21,540
            expect(res.monthly.taxablePay).toBe(21540);
            // Gross PAYE: 21,540 * 10% = 2,154
            expect(res.monthly.grossPaye).toBe(2154);
            // Personal Relief (2,400) > Gross PAYE (2,154) -> Net PAYE is 0
            expect(res.monthly.netPaye).toBe(0);
            // Total Deductions = 0 + 1,440 + 660 + 360 = 2,460
            expect(res.monthly.totalDeductions).toBe(2460);
            // Net Pay = 24,000 - 2,460 = 21,540
            expect(res.monthly.netSalary).toBe(21540);
        });

        it('calculates mid-level professional (KSh 80,000 Gross: 70k basic + 10k allowance) under Year 4 active law', () => {
            const res = calculateKenyaSalary({
                basicSalary: 70000,
                taxableAllowance: 10000,
                nssfSchedule: 'year4'
            });

            expect(res.monthly.grossSalary).toBe(80000);
            // Basic salary 70,000 NSSF: 540 + 6% of (70,000 - 9,000 = 61,000) = 540 + 3,660 = 4,200
            expect(res.monthly.employeeNssf).toBe(4200);
            // SHIF on 80,000 gross: 80,000 * 0.0275 = 2,200
            expect(res.monthly.shif).toBe(2200);
            // AHL on 80,000 gross: 80,000 * 0.015 = 1,200
            expect(res.monthly.employeeAhl).toBe(1200);
            // Pre-tax allowable deductions: 4,200 + 2,200 + 1,200 = 7,600
            // Taxable Pay: 80,000 - 7,600 = 72,400
            expect(res.monthly.taxablePay).toBe(72400);
            // Gross PAYE on 72,400: 2,400 + 2,083.33 + (72,400 - 32,333.33) * 0.30 = 16,503.33
            expect(res.monthly.grossPaye).toBe(16503.33);
            // Personal relief = 2,400
            // Net PAYE = 16,503.33 - 2,400 = 14,103.33
            expect(res.monthly.netPaye).toBe(14103.33);
            // Total Deductions = 14,103.33 + 4,200 + 2,200 + 1,200 = 21,703.33
            expect(res.monthly.totalDeductions).toBe(21703.33);
            // Net Salary = 80,000 - 21,703.33 = 58,296.67
            expect(res.monthly.netSalary).toBe(58296.67);
            // Employer CTC: 80,000 + 4,200 (NSSF) + 1,200 (AHL) = 85,400
            expect(res.monthly.costToEmployer).toBe(85400);
        });

        it('supports historical 2024 pre-amendment framework with 15% insurance & housing reliefs', () => {
            const histRes = calculateKenyaSalary({
                basicSalary: 50000,
                nssfSchedule: 'year2',
                framework: '2024_PRE_AMENDMENT'
            });

            // NSSF Year 2 max: 2,160
            expect(histRes.monthly.employeeNssf).toBe(2160);
            // Taxable pay under pre-amendment: 50,000 - 2,160 = 47,840
            expect(histRes.monthly.taxablePay).toBe(47840);
            // Gross PAYE: 9,135.33
            expect(histRes.monthly.grossPaye).toBe(9135.33);
            // Reliefs: Personal (2,400) + Insurance (15% of 1,375 = 206.25) + Housing (15% of 750 = 112.50) = 2,718.75
            expect(histRes.monthly.totalReliefs).toBe(2718.75);
            // Net PAYE: 9,135.33 - 2,718.75 = 6,416.58
            expect(histRes.monthly.netPaye).toBe(6416.58);
            // Net salary: 39,298.42
            expect(histRes.monthly.netSalary).toBe(39298.42);
        });

        it('calculates executive salary (KSh 250,000 Gross) with Year 4 cap', () => {
            const execRes = calculateKenyaSalary({
                basicSalary: 200000,
                taxableAllowance: 50000,
                nssfSchedule: 'year4'
            });

            expect(execRes.monthly.employeeNssf).toBe(6480); // Capped at Year 4 max KSh 6,480
            expect(execRes.monthly.shif).toBe(6875); // 250,000 * 2.75%
            expect(execRes.monthly.employeeAhl).toBe(3750); // 250,000 * 1.5%
            // Taxable Pay: 250,000 - (6,480 + 6,875 + 3,750 = 17,105) = 232,895
            expect(execRes.monthly.taxablePay).toBe(232895);
            expect(execRes.monthly.netPaye).toBe(62251.83);
            expect(execRes.monthly.netSalary).toBe(170643.17);
            expect(execRes.monthly.costToEmployer).toBe(260230);
        });
    });

    describe('kenyaSalaryCalculator Tool Definition', () => {
        it('exports a valid GetCalcu tool object', () => {
            expect(kenyaSalaryCalculator.id).toBe('salary-calculator');
            expect(kenyaSalaryCalculator.country).toBe('ke');
            expect(kenyaSalaryCalculator.currency).toBe('KES');
            expect(kenyaSalaryCalculator.currencySymbol).toBe('KSh');
            expect(typeof kenyaSalaryCalculator.calculate).toBe('function');
            expect(Array.isArray(kenyaSalaryCalculator.fields)).toBe(true);
            expect(Array.isArray(kenyaSalaryCalculator.presets)).toBe(true);
            expect(Array.isArray(kenyaSalaryCalculator.faqs)).toBe(true);
            expect(kenyaSalaryCalculator.faqs.length).toBeGreaterThanOrEqual(5);
        });

        it('runs calculate() with default values without error', () => {
            const defaultVals = {};
            kenyaSalaryCalculator.fields.forEach(f => {
                defaultVals[f.id] = f.default;
            });
            const result = kenyaSalaryCalculator.calculate(defaultVals);
            expect(result.stats).toBeDefined();
            expect(result.stats.length).toBeGreaterThan(0);
            expect(result.insight).toBeDefined();
            expect(result.chart).toBeDefined();
            expect(result.bars).toBeDefined();
            expect(result.stats[0].label).toBe('Net Take-Home Pay (Monthly)');
        });
    });
});
