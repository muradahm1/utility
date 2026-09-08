import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('Debt Snowball & Payoff Calculator', () => {
    it('correctly compares snowball and avalanche methods and calculates payoff schedule', () => {
        const calc = TOOLS()['debt-snowball-calculator'];
        expect(calc).toBeDefined();

        const resSnowball = calc.calculate({
            extra_payment: 200,
            strategy: 'snowball',
            debt1_name: 'Credit Card',
            debt1_balance: 2500,
            debt1_rate: 24.99,
            debt1_min: 75,
            debt2_name: 'Car Loan',
            debt2_balance: 8000,
            debt2_rate: 6.5,
            debt2_min: 200,
            debt3_name: 'Personal Loan',
            debt3_balance: 4500,
            debt3_rate: 12.0,
            debt3_min: 125,
        });

        expect(resSnowball.error).toBeFalsy();
        const m = {};
        resSnowball.stats.forEach(s => { m[s.label] = s.value; });
        expect(m['Time Until Debt-Free']).toBeDefined();
        expect(m['Total Interest Saved']).toBeDefined();
        expect(m['First Debt to Knock Out']).toContain('Credit Card');
        expect(resSnowball.table.length).toBe(3);

        const resAvalanche = calc.calculate({
            extra_payment: 200,
            strategy: 'avalanche',
            debt1_name: 'Credit Card',
            debt1_balance: 2500,
            debt1_rate: 24.99,
            debt1_min: 75,
            debt2_name: 'Car Loan',
            debt2_balance: 8000,
            debt2_rate: 6.5,
            debt2_min: 200,
            debt3_name: 'Personal Loan',
            debt3_balance: 4500,
            debt3_rate: 12.0,
            debt3_min: 125,
        });
        expect(resAvalanche.error).toBeFalsy();
        expect(resAvalanche.insight.headline).toContain('debt-free');
    });

    it('returns error when no debts or zero minimum payments provided', () => {
        const calc = TOOLS()['debt-snowball-calculator'];
        const resEmpty = calc.calculate({ debt1_balance: 0, debt2_balance: 0, debt3_balance: 0 });
        expect(resEmpty.error).toBe(true);

        const resZeroMin = calc.calculate({
            debt1_balance: 5000,
            debt1_rate: 15,
            debt1_min: 0,
        });
        expect(resZeroMin.error).toBe(true);
    });
});

describe('Mortgage Refinance Break-Even Calculator', () => {
    it('computes exact monthly savings, break-even month, and net stay profit', () => {
        const calc = TOOLS()['refinance-calculator'];
        expect(calc).toBeDefined();

        const res = calc.calculate({
            current_balance: 320000,
            current_rate: 6.75,
            current_years_remaining: 26,
            new_rate: 5.25,
            new_term_years: 30,
            closing_costs: 4500,
            years_in_home: 7,
        });

        expect(res.error).toBeFalsy();
        const m = {};
        res.stats.forEach(s => { m[s.label] = s.value; });
        expect(m['Monthly Payment Savings']).toContain('+');
        expect(m['Break-Even Point']).toBeDefined();
        expect(m['Net Profit Over 7 Years']).toBeDefined();
        expect(m['Refinance Verdict']).toBe('YES — Worth Refinancing');
        expect(res.insight.tone).toBe('positive');
    });

    it('warns when moving before break-even month', () => {
        const calc = TOOLS()['refinance-calculator'];
        const res = calc.calculate({
            current_balance: 320000,
            current_rate: 6.75,
            current_years_remaining: 26,
            new_rate: 5.25,
            new_term_years: 30,
            closing_costs: 10000,
            years_in_home: 1,
        });
        expect(res.error).toBeFalsy();
        const m = {};
        res.stats.forEach(s => { m[s.label] = s.value; });
        expect(m['Refinance Verdict']).toBe('NO — Costs Outweigh Savings');
        expect(res.insight.tone).toBe('warning');
    });
});

describe('1099 Self-Employment Tax Calculator', () => {
    it('accurately calculates SECA 15.3% tax, deductions, and quarterly payments', () => {
        const calc = TOOLS()['self-employment-tax-calculator'];
        expect(calc).toBeDefined();

        const res = calc.calculate({
            gross_income: 85000,
            business_expenses: 12000,
            filing_status: 'single',
            state_tax_rate: 4.5,
            other_w2_income: 0,
        });

        expect(res.error).toBeFalsy();
        const m = {};
        res.stats.forEach(s => { m[s.label] = s.value; });
        expect(m['Save From Every Check']).toContain('Save');
        expect(m['Quarterly Estimated Payment']).toBeDefined();
        expect(m['Total Estimated Annual Tax']).toBeDefined();
        expect(m['Self-Employment Tax (SECA)']).toBeDefined();
        expect(m['Net Take-Home Cash in Pocket']).toBeDefined();

        const secaNum = parseFloat(m['Self-Employment Tax (SECA)'].replace(/[^0-9.]/g, ''));
        expect(secaNum).toBeGreaterThan(10000);
        expect(secaNum).toBeLessThan(10600);
    });

    it('returns error when no income is entered', () => {
        const calc = TOOLS()['self-employment-tax-calculator'];
        const res = calc.calculate({ gross_income: 0, other_w2_income: 0 });
        expect(res.error).toBe(true);
    });
});
