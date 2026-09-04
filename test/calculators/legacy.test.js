/**
 * Legacy calculator tests — loads js/tools.js (classic script) in jsdom
 * and tests the calculate() functions for P0 fixes:
 * - ISSUE-004: Retirement calculator (no crash on edge cases)
 * - ISSUE-005: HYSA calculator (no negative rates/years)
 * Plus regression tests for mortgage, BMI, and percentage calculators.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

// Load the legacy tools.js classic script into the jsdom global scope.
// tools.js defines `const TOOLS = {...}` then assigns `window.TOOLS = TOOLS`.
const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    // Execute tools.js in a function scope; window.TOOLS gets populated.
    // eslint-disable-next-line no-new-func
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('ISSUE-004: Retirement Calculator', () => {
    const calc = () => TOOLS()['retirement-calculator'];

    it('has a calculate function', () => {
        expect(typeof calc().calculate).toBe('function');
    });

    it('normal calculation produces stats', () => {
        const r = calc().calculate({
            current_age: 25, current_savings: 10000, annual_income: 55000,
            monthly_contribution: 500, annual_return: 7, inflation_rate: 3,
            retirement_age: 65, life_expectancy: 95, income_replacement: 80,
        });
        expect(r.error).toBeFalsy();
        expect(r.stats).toBeDefined();
        expect(r.stats.length).toBeGreaterThan(0);
    });

    it('does NOT crash when retirement_age < current_age (returns error)', () => {
        const r = calc().calculate({
            current_age: 40, current_savings: 10000, annual_income: 55000,
            monthly_contribution: 500, annual_return: 7, inflation_rate: 3,
            retirement_age: 30, life_expectancy: 95, income_replacement: 80,
        });
        expect(r.error).toBe(true);
    });

    it('does NOT crash when retirement_age equals current_age', () => {
        const r = calc().calculate({
            current_age: 50, current_savings: 10000, annual_income: 55000,
            monthly_contribution: 500, annual_return: 7, inflation_rate: 3,
            retirement_age: 50, life_expectancy: 95, income_replacement: 80,
        });
        expect(r.error).toBe(true);
    });

    it('does NOT crash when life_expectancy <= retirement_age', () => {
        const r = calc().calculate({
            current_age: 25, current_savings: 10000, annual_income: 55000,
            monthly_contribution: 500, annual_return: 7, inflation_rate: 3,
            retirement_age: 65, life_expectancy: 60, income_replacement: 80,
        });
        expect(r.error).toBe(true);
    });

    it('does NOT crash with zero savings and zero contributions', () => {
        const r = calc().calculate({
            current_age: 25, current_savings: 0, annual_income: 55000,
            monthly_contribution: 0, annual_return: 7, inflation_rate: 3,
            retirement_age: 65, life_expectancy: 95, income_replacement: 80,
        });
        expect(r).toBeDefined();
    });
});

describe('ISSUE-005: HYSA / Savings Calculator', () => {
    const calc = () => TOOLS()['savings-calculator'];

    it('has a calculate function', () => {
        expect(typeof calc().calculate).toBe('function');
    });

    it('normal HYSA calculation produces stats', () => {
        const r = calc().calculate({
            mode: 'hysa-real-yield',
            initial_deposit: 10000,
            recurring_deposit: 500,
            interest_rate: 4.5,
            duration_years: 5,
            tax_rate: 22,
            inflation_rate: 2.5,
        });
        expect(r.error).toBeFalsy();
        expect(r.stats).toBeDefined();
        expect(r.stats.length).toBeGreaterThan(0);
    });

    it('does NOT crash with negative interest rate (clamped to 0)', () => {
        const r = calc().calculate({
            mode: 'hysa-real-yield',
            initial_deposit: 10000,
            recurring_deposit: 500,
            interest_rate: -5,
            duration_years: 5,
            tax_rate: 22,
            inflation_rate: 2.5,
        });
        expect(r).toBeDefined();
        expect(r.error).toBeFalsy();
    });

    it('does NOT crash with zero duration', () => {
        const r = calc().calculate({
            mode: 'hysa-real-yield',
            initial_deposit: 10000,
            recurring_deposit: 500,
            interest_rate: 4.5,
            duration_years: 0,
            tax_rate: 22,
            inflation_rate: 2.5,
        });
        expect(r).toBeDefined();
    });

    it('goal-timeline mode works', () => {
        const r = calc().calculate({
            mode: 'goal-timeline',
            initial_deposit: 5000,
            recurring_deposit: 200,
            interest_rate: 3.0,
            target_goal: 20000,
            duration_years: 5,
        });
        expect(r).toBeDefined();
    });
});

describe('Mortgage Calculator (regression)', () => {
    const calc = () => TOOLS()['mortgage-calculator'];

    it('calculates monthly payment for 30-year loan', () => {
        const r = calc().calculate({
            home_price: 400000, down_payment_type: 'dollar', down_payment: 80000,
            mortgage_rate: 7.0, loan_term: 30, property_tax: 4800, insurance: 1200,
        });
        expect(r.error).toBeFalsy();
        expect(r.stats).toBeDefined();
        expect(r.stats.length).toBeGreaterThan(0);
        const payment = r.stats.find(s => s.label === 'Monthly Payment');
        expect(payment).toBeDefined();
        const paymentNum = parseFloat(payment.value.replace(/[$,]/g, ''));
        expect(paymentNum).toBeGreaterThan(0);
    });

    it('returns error when down payment >= home price', () => {
        const r = calc().calculate({
            home_price: 400000, down_payment_type: 'dollar', down_payment: 400000,
            mortgage_rate: 7.0, loan_term: 30, property_tax: 4800, insurance: 1200,
        });
        expect(r.error).toBe(true);
    });
});

describe('BMI Calculator (regression)', () => {
    const calc = () => TOOLS()['bmi-calculator'];

    it('calculates BMI for normal weight', () => {
        const r = calc().calculate({
            weight: 150, height: 68, unit: 'imperial',
        });
        expect(r.error).toBeFalsy();
        expect(r.stats).toBeDefined();
        expect(r.stats.length).toBeGreaterThan(0);
    });

    it('returns error for zero height', () => {
        const r = calc().calculate({
            weight: 150, height: 0, unit: 'imperial',
        });
        expect(r.error).toBe(true);
    });
});

describe('Percentage Calculator (regression)', () => {
    const calc = () => TOOLS()['percentage-calculator'];

    it('calculates percentage of a number', () => {
        const r = calc().calculate({
            percentage: 20, number: 150,
        });
        expect(r).toBeDefined();
        expect(r.stats).toBeDefined();
        expect(r.stats.length).toBeGreaterThan(0);
    });
});

describe('Currency Converter (Feature)', () => {
    const calc = () => TOOLS()['currency-converter'];

    it('exists and has calculate method', () => {
        expect(calc()).toBeDefined();
        expect(typeof calc().calculate).toBe('function');
    });

    it('converts USD to EUR correctly', () => {
        const r = calc().calculate({ amount: 100, from_currency: 'USD', to_currency: 'EUR' });
        expect(r.error).toBeFalsy();
        expect(r.stats).toBeDefined();
        expect(r.stats[0].value).toContain('92.00');
        expect(r.table).toBeDefined();
        expect(r.table.length).toBeGreaterThan(0);
    });

    it('handles zero or negative amount with errorResult', () => {
        const r = calc().calculate({ amount: 0, from_currency: 'USD', to_currency: 'EUR' });
        expect(r.error).toBe(true);
    });
});

describe('Beam Deflection Calculator (Engineering)', () => {
    const calc = () => TOOLS()['beam-deflection-calculator'];

    it('exists and has calculate method', () => {
        expect(calc()).toBeDefined();
        expect(typeof calc().calculate).toBe('function');
    });

    it('calculates simply supported beam deflection', () => {
        const r = calc().calculate({ beamType: 'simply', length: 10, load: 1000, moi: 100 });
        expect(r.error).toBeFalsy();
        expect(r.stats).toBeDefined();
        expect(r.stats.some(s => s.label === 'Beam Type')).toBe(true);
        expect(r.stats.some(s => s.label === 'Max Deflection')).toBe(true);
    });

    it('calculates cantilever beam deflection', () => {
        const r = calc().calculate({ beamType: 'cantilever', length: 8, load: 500, moi: 200 });
        expect(r.error).toBeFalsy();
        expect(r.stats).toBeDefined();
    });

    it('returns error on invalid inputs', () => {
        const r = calc().calculate({ beamType: 'simply', length: 0, load: 1000, moi: 100 });
        expect(r.error).toBe(true);
    });
});

