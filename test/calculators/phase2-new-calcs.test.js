import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    // Execute tools.js in a function scope to populate window.TOOLS
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('Phase 2: Auto Loan Calculator', () => {
    const calc = () => TOOLS()['auto-loan-calculator'];

    it('is registered with valid metadata', () => {
        expect(calc()).toBeDefined();
        expect(calc().name).toBe('Auto Loan Calculator');
        expect(calc().category).toBe('Finance');
    });

    it('calculates monthly payment and total interest for a standard 60-month loan', () => {
        const res = calc().calculate({
            vehicle_price: 35000,
            down_payment: 5000,
            trade_in_value: 0,
            trade_in_owed: 0,
            interest_rate: 6.5,
            loan_term_months: 60,
            sales_tax_rate: 6.0,
            dealer_fees: 500
        });

        expect(res.error).toBeFalsy();
        expect(res.stats).toBeDefined();
        const monthly = res.stats.find(s => s.label === 'Monthly Payment');
        expect(monthly).toBeDefined();
        expect(monthly.value).toContain('$');
        expect(res.table).toBeDefined();
        expect(res.table.length).toBe(60);
    });

    it('handles 0% interest auto loan without division by zero', () => {
        const res = calc().calculate({
            vehicle_price: 30000,
            down_payment: 6000,
            trade_in_value: 0,
            trade_in_owed: 0,
            interest_rate: 0,
            loan_term_months: 48,
            sales_tax_rate: 0,
            dealer_fees: 0
        });

        expect(res.error).toBeFalsy();
        const monthly = res.stats.find(s => s.label === 'Monthly Payment');
        expect(monthly.value).toBe('$500.00');
    });

    it('handles negative equity on trade-in vehicle (rolling over balance)', () => {
        const res = calc().calculate({
            vehicle_price: 25000,
            down_payment: 2000,
            trade_in_value: 8000,
            trade_in_owed: 10000, // $2,000 negative equity
            interest_rate: 5.0,
            loan_term_months: 36,
            sales_tax_rate: 5.0,
            dealer_fees: 200
        });

        expect(res.error).toBeFalsy();
        const financed = res.stats.find(s => s.label === 'Loan Amount (Financed)');
        expect(financed).toBeDefined();
    });

    it('returns error on zero or negative vehicle price', () => {
        const res = calc().calculate({ vehicle_price: 0 });
        expect(res.error).toBe(true);
    });
});

describe('Phase 2: Salary & Paycheck Calculator', () => {
    const calc = () => TOOLS()['salary-calculator'];

    it('is registered with valid metadata', () => {
        expect(calc()).toBeDefined();
        expect(calc().name).toBe('Salary & Paycheck Calculator');
        expect(calc().category).toBe('Finance');
    });

    it('calculates annual, monthly, and biweekly net take-home pay for single filer', () => {
        const res = calc().calculate({
            gross_income: 75000,
            pay_frequency: 'annual',
            filing_status: 'single',
            state_tax_rate: 5.0,
            pretax_401k: 4000,
            pretax_health: 200
        });

        expect(res.error).toBeFalsy();
        expect(res.stats).toBeDefined();
        const biweekly = res.stats.find(s => s.label === 'Take-Home Pay (Biweekly)');
        expect(biweekly).toBeDefined();
        const effectiveTax = res.stats.find(s => s.label === 'Effective Total Tax Rate');
        expect(effectiveTax).toBeDefined();
    });

    it('calculates take-home pay for hourly workers correctly', () => {
        const res = calc().calculate({
            gross_income: 35, // $35/hour
            pay_frequency: 'hourly',
            hours_per_week: 40,
            filing_status: 'single',
            state_tax_rate: 4.0,
            pretax_401k: 0,
            pretax_health: 0
        });

        expect(res.error).toBeFalsy();
        const annual = res.stats.find(s => s.label === 'Take-Home Pay (Annual)');
        expect(annual).toBeDefined();
    });

    it('returns error on zero or negative income', () => {
        const res = calc().calculate({ gross_income: 0 });
        expect(res.error).toBe(true);
    });
});

describe('Phase 2: TDEE & Calorie Calculator', () => {
    const calc = () => TOOLS()['tdee-calculator'];

    it('is registered with valid metadata', () => {
        expect(calc()).toBeDefined();
        expect(calc().name).toBe('TDEE & Daily Calorie Calculator');
        expect(calc().category).toBe('Health');
    });

    it('calculates BMR, TDEE, and macro split for metric user', () => {
        const res = calc().calculate({
            unit: 'metric',
            gender: 'male',
            age: 28,
            weight: 75,
            height: 178,
            activity_level: 'moderate',
            goal: 'cut_standard' // -500 kcal
        });

        expect(res.error).toBeFalsy();
        expect(res.stats).toBeDefined();
        const target = res.stats.find(s => s.label === 'Target Daily Calories');
        expect(target).toBeDefined();
        expect(target.value).toContain('kcal/day');
        const protein = res.stats.find(s => s.label === 'Daily Protein Target');
        expect(protein).toBeDefined();
    });

    it('calculates BMR and TDEE for imperial user', () => {
        const res = calc().calculate({
            unit: 'imperial',
            gender: 'female',
            age: 30,
            weight: 140, // lbs
            height: 65,  // inches
            activity_level: 'light',
            goal: 'maintain'
        });

        expect(res.error).toBeFalsy();
        const tdee = res.stats.find(s => s.label === 'Maintenance Calories (TDEE)');
        expect(tdee).toBeDefined();
    });

    it('returns error on zero or negative weight/height', () => {
        const res = calc().calculate({ weight: 0, height: 170 });
        expect(res.error).toBe(true);
    });
});
