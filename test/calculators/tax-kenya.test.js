import { describe, it, expect } from 'vitest';
import {
    calculateKenyaNSSF,
    calculateKenyaSHIF,
    calculateKenyaHousingLevy,
    calculateKenyaGrossPAYE,
    calculateKenyaSalary,
    KENYA_TAX_BRACKETS,
    KENYA_STATUTORY_RATES,
    kenyaSalaryCalculator
} from '../../js/modules/tax-kenya.js';

describe('Kenya Tax & Payroll Engine (Finance Act & KRA)', () => {

    describe('Statutory Deductions & Social Funds', () => {
        it('calculates NSSF Tier I & Tier II correctly with statutory caps', () => {
            // Low income (below Tier I cap of 7,000 KSh): 5,000 KSh
            const nssfLow = calculateKenyaNSSF(5000);
            expect(nssfLow.tierI).toBe(300); // 6% of 5,000
            expect(nssfLow.tierII).toBe(0);
            expect(nssfLow.totalEmployeeNssf).toBe(300);

            // Exactly at Tier I cap (7,000 KSh)
            const nssfTierI = calculateKenyaNSSF(7000);
            expect(nssfTierI.tierI).toBe(420); // 6% of 7,000
            expect(nssfTierI.tierII).toBe(0);
            expect(nssfTierI.totalEmployeeNssf).toBe(420);

            // Mid income (between Tier I and Tier II): 20,000 KSh
            const nssfMid = calculateKenyaNSSF(20000);
            expect(nssfMid.tierI).toBe(420);
            expect(nssfMid.tierII).toBe(780); // 6% of (20,000 - 7,000)
            expect(nssfMid.totalEmployeeNssf).toBe(1200);

            // High income (at or above Tier II cap of 36,000 KSh): 50,000 KSh
            const nssfCapped = calculateKenyaNSSF(50000);
            expect(nssfCapped.tierI).toBe(420);
            expect(nssfCapped.tierII).toBe(1740); // 6% of (36,000 - 7,000)
            expect(nssfCapped.totalEmployeeNssf).toBe(2160); // Maximum cap
            expect(nssfCapped.totalEmployerNssf).toBe(2160);
        });

        it('calculates SHIF at 2.75% of gross with KSh 300 minimum', () => {
            // Extremely low income: 5,000 KSh -> 5,000 * 2.75% = 137.50 -> floor at 300
            expect(calculateKenyaSHIF(5000)).toBe(300);
            // Standard income: 50,000 KSh -> 50,000 * 0.0275 = 1,375.00 KSh
            expect(calculateKenyaSHIF(50000)).toBe(1375);
            // Executive: 200,000 KSh -> 200,000 * 0.0275 = 5,500.00 KSh
            expect(calculateKenyaSHIF(200000)).toBe(5500);
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
            // 2,400 + (8,333.33 * 0.25 = 2,083.33) = 4,483.33
            expect(grossPaye).toBe(4483.33);
        });

        it('taxes 32,334 - 500,000 KSh at 30%', () => {
            const { grossPaye } = calculateKenyaGrossPAYE(50000);
            // 2,400 + 2,083.33 + (50,000 - 32,333.33) * 0.30 = 2,400 + 2,083.33 + 5,300.00 = 9,783.33
            expect(grossPaye).toBe(9783.33);
        });
    });

    describe('Full Payroll Scenarios & Net Take-Home Pay', () => {
        it('yields 0 KSh PAYE tax for minimum wage earner (KSh 24,000 Gross) due to personal relief', () => {
            const res = calculateKenyaSalary({ basicSalary: 24000 });
            
            expect(res.monthly.grossSalary).toBe(24000);
            // NSSF: 420 + 6% of (24,000 - 7,000) = 420 + 1,020 = 1,440
            expect(res.monthly.employeeNssf).toBe(1440);
            // Taxable Pay: 24,000 - 1,440 = 22,560
            expect(res.monthly.taxablePay).toBe(22560);
            // Gross PAYE: 22,560 * 10% = 2,256
            expect(res.monthly.grossPaye).toBe(2256);
            // Personal relief (2,400) > Gross PAYE (2,256) -> Net PAYE is 0
            expect(res.monthly.netPaye).toBe(0);
            // SHIF: 24,000 * 2.75% = 660
            expect(res.monthly.shif).toBe(660);
            // AHL: 24,000 * 1.5% = 360
            expect(res.monthly.employeeAhl).toBe(360);
            // Total Deductions = 0 (PAYE) + 1,440 (NSSF) + 660 (SHIF) + 360 (AHL) = 2,460
            expect(res.monthly.totalDeductions).toBe(2460);
            // Net Pay = 24,000 - 2,460 = 21,540
            expect(res.monthly.netSalary).toBe(21540);
        });

        it('calculates middle-income salary (KSh 50,000 Gross) with all statutory reliefs', () => {
            const res = calculateKenyaSalary({ basicSalary: 50000 });
            
            // NSSF maxed: 2,160
            expect(res.monthly.employeeNssf).toBe(2160);
            // Taxable pay: 50,000 - 2,160 = 47,840
            expect(res.monthly.taxablePay).toBe(47840);
            // Gross PAYE: 2,400 + 2,083.33 + (47,840 - 32,333.33) * 0.30 = 9,135.33
            expect(res.monthly.grossPaye).toBe(9135.33);
            // SHIF: 50,000 * 0.0275 = 1,375
            expect(res.monthly.shif).toBe(1375);
            // Housing Levy: 50,000 * 0.015 = 750
            expect(res.monthly.employeeAhl).toBe(750);
            // Reliefs: Personal (2,400) + Insurance (15% of 1,375 = 206.25) + Housing (15% of 750 = 112.50) = 2,718.75
            expect(res.monthly.totalReliefs).toBe(2718.75);
            // Net PAYE: 9,135.33 - 2,718.75 = 6,416.58
            expect(res.monthly.netPaye).toBe(6416.58);
            // Net salary: 50,000 - (6,416.58 + 2,160 + 1,375 + 750) = 39,298.42
            expect(res.monthly.netSalary).toBe(39298.42);
            // Employer CTC: 50,000 + 2,160 (NSSF) + 750 (Housing) = 52,910
            expect(res.monthly.costToEmployer).toBe(52910);
        });

        it('calculates package with taxable and non-taxable allowances and voluntary pension', () => {
            const res = calculateKenyaSalary({
                basicSalary: 80000,
                taxableAllowance: 20000,     // Total taxable = 100,000
                nonTaxableAllowance: 10000,  // Gross = 110,000
                voluntaryPension: 5000       // Tax allowable deduction
            });

            expect(res.monthly.grossSalary).toBe(110000);
            expect(res.monthly.employeeNssf).toBe(2160);
            // Allowable pension: 2,160 + 5,000 = 7,160 (below 20,000 cap)
            // Taxable earnings: 80,000 + 20,000 = 100,000
            // Taxable pay: 100,000 - 7,160 = 92,840
            expect(res.monthly.taxablePay).toBe(92840);
            // SHIF on Gross: 110,000 * 0.0275 = 3,025
            expect(res.monthly.shif).toBe(3025);
            // AHL on Gross: 110,000 * 0.015 = 1,650
            expect(res.monthly.employeeAhl).toBe(1650);
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
        });
    });
});
