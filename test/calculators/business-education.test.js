import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    // Execute tools.js in a function scope to populate window.TOOLS
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('Business Calculators', () => {
    describe('Profit Margin Calculator', () => {
        const calc = () => TOOLS()['profit-margin-calculator'];

        it('is registered in Business category', () => {
            expect(calc()).toBeDefined();
            expect(calc().name).toBe('Profit Margin Calculator');
            expect(calc().category).toBe('Business');
        });

        it('calculates gross margin, markup, and net profit from price and cost', () => {
            const res = calc().calculate({
                calc_mode: 'margin_from_price',
                cost: 60,
                revenue: 100,
                operating_expenses: 15
            });

            expect(res.error).toBeFalsy();
            expect(res.stats).toBeDefined();

            const grossProfit = res.stats.find(s => s.label === 'Gross Profit');
            expect(grossProfit.value).toBe('$40.00');

            const grossMargin = res.stats.find(s => s.label === 'Gross Margin');
            expect(grossMargin.value).toBe('40.00%');

            const markup = res.stats.find(s => s.label === 'Markup Percentage');
            expect(markup.value).toBe('66.67%');

            const netProfit = res.stats.find(s => s.label.includes('Net Profit'));
            expect(netProfit.value).toBe('$25.00');
        });

        it('calculates selling price required for target margin', () => {
            const res = calc().calculate({
                calc_mode: 'price_from_margin',
                cost: 60,
                target_margin: 40,
                operating_expenses: 10
            });

            expect(res.error).toBeFalsy();
            const price = res.stats.find(s => s.label === 'Selling Price');
            expect(price.value).toBe('$100.00');
        });

        it('returns error on zero or negative cost', () => {
            const res = calc().calculate({ cost: 0, revenue: 100 });
            expect(res.error).toBe(true);
        });
    });

    describe('Break-Even Calculator', () => {
        const calc = () => TOOLS()['break-even-calculator'];

        it('is registered in Business category', () => {
            expect(calc()).toBeDefined();
            expect(calc().name).toBe('Break-Even Calculator');
            expect(calc().category).toBe('Business');
        });

        it('calculates break-even units and revenue accurately', () => {
            const res = calc().calculate({
                fixed_costs: 6000,
                sale_price: 50,
                variable_cost: 20,
                target_profit: 3000
            });

            expect(res.error).toBeFalsy();
            // Contribution Margin = 50 - 20 = $30. Units = 6000 / 30 = 200 units.
            const beUnits = res.stats.find(s => s.label === 'Break-Even Units');
            expect(beUnits.value).toContain('200');

            const beRev = res.stats.find(s => s.label === 'Break-Even Sales Revenue');
            expect(beRev.value).toBe('$10,000.00');

            const targetUnits = res.stats.find(s => s.label === 'Units to Target Profit');
            expect(targetUnits.value).toContain('300');
        });

        it('returns error when price <= variable cost', () => {
            const res = calc().calculate({
                fixed_costs: 5000,
                sale_price: 20,
                variable_cost: 25
            });
            expect(res.error).toBe(true);
        });
    });

    describe('Customer Lifetime Value (LTV / CAC) Calculator', () => {
        const calc = () => TOOLS()['customer-lifetime-value-calculator'];

        it('is registered in Business category', () => {
            expect(calc()).toBeDefined();
            expect(calc().name).toContain('Customer Lifetime Value');
            expect(calc().category).toBe('Business');
        });

        it('calculates LTV, LTV:CAC ratio, and payback timeline', () => {
            const res = calc().calculate({
                avg_order_value: 100,
                purchase_frequency: 12, // $1,200 annual revenue
                customer_lifespan: 3,   // $3,600 gross lifetime revenue
                gross_margin: 80,       // LTV = $2,880
                cac: 720                // LTV:CAC = 4.0x
            });

            expect(res.error).toBeFalsy();
            const ltv = res.stats.find(s => s.label.includes('Customer Lifetime Value'));
            expect(ltv.value).toBe('$2,880.00');

            const ratio = res.stats.find(s => s.label === 'LTV to CAC Ratio');
            expect(ratio.value).toBe('4x');
        });
    });
});

describe('Education Calculators', () => {
    describe('GPA Calculator', () => {
        const calc = () => TOOLS()['gpa-calculator'];

        it('is registered in Education category', () => {
            expect(calc()).toBeDefined();
            expect(calc().name).toContain('GPA Calculator');
            expect(calc().category).toBe('Education');
        });

        it('calculates unweighted semester GPA accurately', () => {
            const res = calc().calculate({
                c1_grade: 'A',  c1_credits: 4, // 4.0 * 4 = 16
                c2_grade: 'B',  c2_credits: 4, // 3.0 * 4 = 12
                c3_grade: 'A-', c3_credits: 3, // 3.7 * 3 = 11.1
                c4_grade: 'B+', c4_credits: 3, // 3.3 * 3 = 9.9
                c5_grade: 'A',  c5_credits: 0,
                prior_gpa: 0,
                prior_credits: 0
            });
            // Total points: 49.0 / 14 credits = 3.50
            expect(res.error).toBeFalsy();
            const gpa = res.stats.find(s => s.label.includes('Semester GPA (4.0 Scale)'));
            expect(gpa.value).toBe('3.50');
        });

        it('computes weighted GPA for Honors / AP coursework', () => {
            const res = calc().calculate({
                c1_grade: 'A', c1_credits: 4, c1_scale: 'ap', // (4.0 + 1.0) * 4 = 20
                c2_grade: 'A', c2_credits: 4, c2_scale: 'regular', // 4.0 * 4 = 16
                c3_grade: 'A', c3_credits: 0,
                c4_grade: 'A', c4_credits: 0,
                c5_grade: 'A', c5_credits: 0
            });
            // Total weighted points: 36 / 8 credits = 4.50
            expect(res.error).toBeFalsy();
            const wGpa = res.stats.find(s => s.label.includes('Weighted GPA'));
            expect(wGpa.value).toBe('4.50');
        });
    });

    describe('Final Grade Calculator', () => {
        const calc = () => TOOLS()['final-grade-calculator'];

        it('is registered in Education category', () => {
            expect(calc()).toBeDefined();
            expect(calc().name).toBe('Final Grade Calculator');
            expect(calc().category).toBe('Education');
        });

        it('calculates required final exam score accurately', () => {
            const res = calc().calculate({
                current_grade: 85,
                target_grade: 90,
                final_weight: 20
            });
            // Required = (90 - 85 * 0.8) / 0.2 = (90 - 68) / 0.2 = 22 / 0.2 = 110%
            expect(res.error).toBeFalsy();
            const score = res.stats.find(s => s.label === 'Required Final Exam Score');
            expect(score.value).toBe('110.00%');
        });

        it('handles guaranteed pass when current grade already exceeds target', () => {
            const res = calc().calculate({
                current_grade: 95,
                target_grade: 70,
                final_weight: 20
            });
            expect(res.error).toBeFalsy();
            const score = res.stats.find(s => s.label === 'Required Final Exam Score');
            expect(score.value).toContain('0.00%');
        });
    });

    describe('Student Loan Calculator', () => {
        const calc = () => TOOLS()['student-loan-calculator'];

        it('is registered in Education category', () => {
            expect(calc()).toBeDefined();
            expect(calc().name).toBe('Student Loan Calculator');
            expect(calc().category).toBe('Education');
        });

        it('calculates standard monthly payments and extra payment savings', () => {
            const res = calc().calculate({
                loan_balance: 30000,
                interest_rate: 6.0,
                loan_term: 10,
                extra_payment: 100
            });

            expect(res.error).toBeFalsy();
            const stdPmt = res.stats.find(s => s.label === 'Standard Monthly Payment');
            expect(stdPmt).toBeDefined();
            expect(stdPmt.value).toContain('$333');

            const saved = res.stats.find(s => s.label.includes('Interest Saved'));
            expect(saved).toBeDefined();
            expect(saved.value).toContain('$');
        });
    });
});
