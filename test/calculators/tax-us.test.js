import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

function loadTools() {
    const toolsPath = path.resolve(__dirname, '../../js/tools.js');
    const content = fs.readFileSync(toolsPath, 'utf8');
    const sandbox = {
        document: {},
        window: {},
        console,
        Math,
        Date,
        Number,
        String,
        Boolean,
        Array,
        Object,
        parseInt,
        parseFloat,
        isFinite,
        isNaN
    };
    vm.createContext(sandbox);
    vm.runInContext(content + '\nglobalThis.__TOOLS__ = TOOLS;\nglobalThis.__US_TAX_SCHEDULES__ = US_TAX_SCHEDULES;', sandbox);
    return {
        tools: sandbox.__TOOLS__,
        schedules: sandbox.__US_TAX_SCHEDULES__
    };
}

describe('US Tax Engines & Multi-Year Statutory Compliance', () => {
    const { tools, schedules } = loadTools();
    const salaryCalc = tools['salary-calculator'];
    const seCalc = tools['self-employment-tax-calculator'];

    describe('Statutory Wage Caps and Standard Deductions (SSA & IRS)', () => {
        it('verifies 2026 SSA wage base ($184,500) and standard deductions ($16,100 / $32,200)', () => {
            expect(schedules['2026'].socSecCap).toBe(184500);
            expect(schedules['2026'].standardDeduction.single).toBe(16100);
            expect(schedules['2026'].standardDeduction.married).toBe(32200);
            expect(schedules['2026'].standardDeduction.head).toBe(24150);
        });

        it('verifies historical 2025 and 2024 schedules', () => {
            expect(schedules['2025'].socSecCap).toBe(176100);
            expect(schedules['2025'].standardDeduction.single).toBe(15000);
            expect(schedules['2025'].standardDeduction.married).toBe(30000);

            expect(schedules['2024'].socSecCap).toBe(168600);
            expect(schedules['2024'].standardDeduction.single).toBe(14600);
            expect(schedules['2024'].standardDeduction.married).toBe(29200);
        });
    });

    describe('Salary Calculator: FICA vs Federal Tax Separation', () => {
        it('calculates FICA on gross wages without reducing for standard deduction', () => {
            const res = salaryCalc.calculate({
                gross_income: 100000,
                pay_frequency: 'annual',
                filing_status: 'single',
                state_tax_rate: 0,
                pretax_401k: 0,
                pretax_health: 0,
                tax_year: '2026'
            });

            // FICA = 6.2% SS ($6,200) + 1.45% Medicare ($1,450) = $7,650
            const ficaStat = res.stats.find(s => s.label.includes('FICA'));
            expect(ficaStat.value).toBe('$7,650.00');

            // Federal taxable income = $100,000 - $16,100 (2026 standard deduction) = $83,900
            // Tax:
            // First $12,400 @ 10% = $1,240
            // $12,400 to $50,400 ($38,000) @ 12% = $4,560
            // $50,400 to $83,900 ($33,500) @ 22% = $7,370
            // Total Fed Tax = 1,240 + 4,560 + 7,370 = $13,170.00
            const fedStat = res.stats.find(s => s.label.includes('Federal Income Tax'));
            expect(fedStat.value).toBe('$13,170.00');
        });

        it('caps Social Security tax at $184,500 in 2026 for high earners', () => {
            const res = salaryCalc.calculate({
                gross_income: 250000,
                pay_frequency: 'annual',
                filing_status: 'single',
                state_tax_rate: 0,
                pretax_401k: 0,
                pretax_health: 0,
                tax_year: '2026'
            });

            // Social Security: 6.2% of $184,500 = $11,439.00
            // Medicare: 1.45% of $250,000 = $3,625.00 + 0.9% of ($250,000 - $200,000 = $50,000) = $450.00 -> $4,075.00
            // Total FICA = $11,439.00 + $4,075.00 = $15,514.00
            const ficaStat = res.stats.find(s => s.label.includes('FICA'));
            expect(ficaStat.value).toBe('$15,514.00');
        });

        it('preserves 2024 calculation when historical year is selected', () => {
            const res2024 = salaryCalc.calculate({
                gross_income: 200000,
                pay_frequency: 'annual',
                filing_status: 'single',
                state_tax_rate: 0,
                pretax_401k: 0,
                pretax_health: 0,
                tax_year: '2024'
            });

            // In 2024: SS cap was $168,600 -> SS tax = 168,600 * 0.062 = $10,453.20
            // Medicare on 200,000 = $2,900.00
            // Total FICA = $13,353.20
            const ficaStat = res2024.stats.find(s => s.label.includes('FICA'));
            expect(ficaStat.value).toBe('$13,353.20');
        });
    });

    describe('1099 Self-Employment Tax Calculator Multi-Year Support', () => {
        it('calculates SECA and respects 2026 $184,500 cap', () => {
            const res = seCalc.calculate({
                gross_income: 250000,
                business_expenses: 20000,
                filing_status: 'single',
                state_tax_rate: 0,
                other_w2_income: 0,
                tax_year: '2026'
            });

            expect(res.error).toBeFalsy();
            // Net profit = $230,000
            // SE earnings = $230,000 * 0.9235 = $212,405
            // SS tax on $184,500 (2026 cap) = 184,500 * 0.124 = $22,878.00
            // Medicare on $212,405 = 212,405 * 0.029 = $6,159.75
            // Additional Medicare on ($230,000 - $200,000 = $30,000) @ 0.9% = $270.00
            // Total SECA = 22,878 + 6,159.75 + 270 = $29,307.75
            const m = {};
            res.stats.forEach(s => { m[s.label] = s.value; });
            const secaNum = parseFloat(m['Self-Employment Tax (SECA)'].replace(/[^0-9.]/g, ''));
            expect(secaNum).toBe(29307.75);
        });
    });
});
