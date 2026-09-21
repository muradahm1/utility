import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('Savings Calculator: HYSA Percentage Scaling Fix', () => {
    it('formats real return, advertised APY, and post-tax return correctly', () => {
        const calc = TOOLS()['savings-calculator'];
        const res = calc.calculate({
            mode: 'hysa-real-yield',
            initial_deposit: 10000,
            recurring_deposit: 0,
            interest_rate: 5,
            tax_rate: 20,
            inflation_rate: 3,
            duration_years: 1,
        });
        expect(res.error).toBeFalsy();
        const m = {};
        res.stats.forEach(s => { m[s.label] = s.value; });
        expect(m['Advertised APY']).toBe('5.00%');
        expect(m['Post-Tax Nominal Return']).toBe('4.00%');
        expect(m['Real Return (Post-Tax, Post-Inflation)']).toBe('0.97%');
        expect(m['Inflation Drag']).toBe('3.03%');
    });
});

describe('Retirement Calculator: Inflation Scaling Fix', () => {
    it('does not double-discount inflation on real monthly retirement income', () => {
        const calc = TOOLS()['retirement-calculator'];
        const res = calc.calculate({
            current_age: 25,
            current_savings: 10000,
            annual_income: 55000,
            monthly_contribution: 500,
            annual_return: 7,
            inflation_rate: 3,
            retirement_age: 65,
            life_expectancy: 95,
            income_replacement: 80,
        });
        expect(res.error).toBeFalsy();
        const m = {};
        res.stats.forEach(s => { m[s.label] = s.value; });
        expect(m["Monthly Income (Today's $)"]).toBe('$2,066.58');
        expect(m['Future Monthly (At Retirement $)']).toBe('$6,741.26');
        expect(m["Projected Nest Egg (Today's $)"]).toBe('$619,975.42');
    });
});

describe('Emergency Fund Calculator', () => {
    it('computes 6-month target and shortfall correctly', () => {
        const calc = TOOLS()['emergency-fund-calculator'];
        const res = calc.calculate({
            housing_rent: 1500,
            food_groceries: 600,
            utilities_bills: 300,
            transportation: 400,
            healthcare_insurance: 250,
            debt_minimums: 250,
            current_savings: 4000,
            monthly_contribution: 500,
            target_runway: 6,
            hysa_rate: 4.5,
        });
        expect(res.error).toBeFalsy();
        const m = {};
        res.stats.forEach(s => { m[s.label] = s.value; });
        expect(m['Monthly Essential Expenses']).toBe('$3,300.00');
        expect(m['Target Emergency Fund']).toBe('$19,800.00');
        expect(m['Current Savings Balance']).toBe('$4,000.00');
        expect(m['Current Runway']).toBe('1.2 months');
        expect(m['Funding Shortfall']).toBe('$15,800.00');
        expect(m['Months to Reach Goal']).toBe('32 months');
    });
});

describe('401(k) Retirement Calculator', () => {
    it('projects balance with employer match and salary growth', () => {
        const calc = TOOLS()['401k-calculator'];
        const res = calc.calculate({
            current_age: 30,
            retire_age: 65,
            annual_salary: 75000,
            current_balance: 25000,
            employee_contrib_pct: 8,
            employer_match_pct: 50,
            employer_match_limit_pct: 6,
            annual_salary_growth: 2.5,
            annual_return: 7.5,
        });
        expect(res.error).toBeFalsy();
        expect(res.stats.length).toBeGreaterThanOrEqual(7);
        const m = {};
        res.stats.forEach(s => { m[s.label] = s.value; });
        expect(m['Projected 401(k) Balance']).toBeDefined();
        expect(m['Total Employer Match ("Free Money")']).toBeDefined();
    });
    it('returns error when retirement age <= current age', () => {
        const calc = TOOLS()['401k-calculator'];
        const res = calc.calculate({ current_age: 50, retire_age: 45 });
        expect(res.error).toBe(true);
    });
});
