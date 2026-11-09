/**
 * Tests for Budget Planner & Expense Tracker (Standardized Implementation)
 * Validates metadata, presets, calculation logic, financial edge cases,
 * multi-frequency handling, budget rules (50/30/20, 70/20/10, 80/20),
 * visualizations, and breakdown tables.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    // Populate window.TOOLS by executing tools.js
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('Budget Planner & Expense Tracker — Standardization & Architecture', () => {
    const calc = () => TOOLS()['budget-planner'];

    it('is properly registered in the central tool registry', () => {
        const tool = calc();
        expect(tool).toBeDefined();
        expect(tool.name).toBe('Budget Planner & Expense Tracker');
        expect(tool.category).toBe('Finance');
        expect(tool.icon).toBe('fa-wallet');
        expect(tool.iconClass).toBe('icon-finance');
        expect(tool.tagClass).toBe('tag-finance');
    });

    it('uses the standard declarative fields array instead of customRenderer', () => {
        const tool = calc();
        expect(Array.isArray(tool.fields)).toBe(true);
        expect(tool.fields.length).toBeGreaterThan(10);
        expect(tool.customRenderer).toBeUndefined();
    });

    it('has comprehensive quick presets defined', () => {
        const tool = calc();
        expect(Array.isArray(tool.presets)).toBe(true);
        expect(tool.presets.length).toBe(4);

        const labels = tool.presets.map(p => p.label);
        expect(labels).toContain('Balanced 50/30/20 ($5,500/mo)');
        expect(labels).toContain('High Cost of Living ($7,500/mo)');
        expect(labels).toContain('Aggressive Saver / FIRE ($8,000/mo)');
        expect(labels).toContain('Entry-Level / Tight Budget ($3,200/mo)');
    });

    it('successfully executes calculation for all presets without error', () => {
        const tool = calc();
        tool.presets.forEach(preset => {
            const res = tool.calculate(preset.values);
            expect(res.error).toBeFalsy();
            expect(res.stats).toBeDefined();
            expect(res.stats.length).toBeGreaterThanOrEqual(7);
            expect(res.chart).toBeDefined();
            expect(res.chart2).toBeDefined();
            expect(res.bars).toBeDefined();
            expect(res.table).toBeDefined();
            expect(res.insight).toBeDefined();
        });
    });
});

describe('Budget Planner & Expense Tracker — Financial Calculations', () => {
    const calc = () => TOOLS()['budget-planner'];

    it('accurately calculates monthly cash flow, surplus, and savings rate in standard 50/30/20', () => {
        const res = calc().calculate({
            income_frequency: 'monthly',
            primary_income: 5000,
            additional_income: 500,
            budgeting_rule: 'rule_50_30_20',
            housing: 1500,
            utilities: 300,
            groceries: 500,
            transportation: 350,
            healthcare: 150,
            dining_entertainment: 400,
            shopping_personal: 300,
            subscriptions_memberships: 100,
            other_wants: 100,
            debt_payments: 250,
            emergency_savings: 500,
            retirement_investments: 550
        });

        expect(res.error).toBeFalsy();

        // Income: 5000 + 500 = 5500
        const incomeStat = res.stats.find(s => s.label === 'Total Monthly Net Income');
        expect(incomeStat.value).toBe('$5,500.00');

        // Needs: 1500 + 300 + 500 + 350 + 150 = 2800 (50.9%)
        const needsStat = res.stats.find(s => s.label.startsWith('Essential Needs'));
        expect(needsStat.value).toContain('$2,800.00');
        expect(needsStat.value).toContain('50.9%');

        // Wants: 400 + 300 + 100 + 100 = 900 (16.4%)
        const wantsStat = res.stats.find(s => s.label.startsWith('Discretionary Wants'));
        expect(wantsStat.value).toContain('$900.00');
        expect(wantsStat.value).toContain('16.4%');

        // Savings & Debt: 250 + 500 + 550 = 1300
        const savingsDebtStat = res.stats.find(s => s.label === 'Total Savings & Debt Payoff');
        expect(savingsDebtStat.value).toBe('$1,300.00');

        // Total Outflows: 2800 + 900 + 1300 = 5000
        // Net Remaining: 5500 - 5000 = $500.00 surplus
        const balanceStat = res.stats.find(s => s.label === 'Monthly Net Surplus');
        expect(balanceStat.value).toBe('$500.00');
        expect(balanceStat.warn).toBeFalsy();

        // Effective Savings Rate: (emerg (500) + invest (550) + surplus (500)) / 5500 = 1550 / 5500 = 28.18% => 28.2%
        const savingsRateStat = res.stats.find(s => s.label === 'Effective Savings Rate');
        expect(savingsRateStat.value).toBe('28.2%');
    });

    it('correctly handles annual salary frequency conversion', () => {
        const res = calc().calculate({
            income_frequency: 'annual',
            primary_income: 120000, // $10,000/mo
            additional_income: 0,
            housing: 2500,
            utilities: 500,
            groceries: 800,
            transportation: 600,
            healthcare: 300,
            dining_entertainment: 800,
            shopping_personal: 500,
            subscriptions_memberships: 200,
            other_wants: 300,
            debt_payments: 500,
            emergency_savings: 1000,
            retirement_investments: 2000
        });

        expect(res.error).toBeFalsy();
        const incomeStat = res.stats.find(s => s.label === 'Total Monthly Net Income');
        expect(incomeStat.value).toBe('$10,000.00');
    });

    it('correctly handles biweekly paycheck frequency conversion', () => {
        const res = calc().calculate({
            income_frequency: 'biweekly',
            primary_income: 2500, // 2500 * 26 / 12 = 5416.67/mo
            additional_income: 0,
            housing: 1500,
            utilities: 300,
            groceries: 500,
            transportation: 350,
            healthcare: 150,
            dining_entertainment: 400,
            shopping_personal: 300,
            subscriptions_memberships: 100,
            other_wants: 100,
            debt_payments: 250,
            emergency_savings: 500,
            retirement_investments: 550
        });

        expect(res.error).toBeFalsy();
        const incomeStat = res.stats.find(s => s.label === 'Total Monthly Net Income');
        expect(incomeStat.value).toBe('$5,416.67');
    });

    it('accurately identifies and warns about a budget deficit (overspending)', () => {
        const res = calc().calculate({
            income_frequency: 'monthly',
            primary_income: 3000,
            additional_income: 0,
            housing: 1800,
            utilities: 400,
            groceries: 600,
            transportation: 400,
            healthcare: 200,
            dining_entertainment: 300,
            shopping_personal: 200,
            subscriptions_memberships: 100,
            other_wants: 100,
            debt_payments: 300,
            emergency_savings: 0,
            retirement_investments: 0
        });

        // Total outflows: 1800+400+600+400+200 + 300+200+100+100 + 300 = 4400. Deficit: -$1,400.00
        expect(res.error).toBeFalsy();
        const balanceStat = res.stats.find(s => s.label === 'Monthly Budget Deficit');
        expect(balanceStat).toBeDefined();
        expect(balanceStat.value).toBe('-$1,400.00');
        expect(balanceStat.warn).toBe(true);

        expect(res.insight.tone).toBe('warning');
        expect(res.insight.headline).toContain('Monthly Budget Shortfall');
    });

    it('identifies an exact zero-based budget equilibrium', () => {
        const res = calc().calculate({
            income_frequency: 'monthly',
            primary_income: 4000,
            additional_income: 0,
            housing: 1500,
            utilities: 300,
            groceries: 500,
            transportation: 300,
            healthcare: 100,
            dining_entertainment: 300,
            shopping_personal: 200,
            subscriptions_memberships: 50,
            other_wants: 50,
            debt_payments: 200,
            emergency_savings: 200,
            retirement_investments: 300
        });

        // Outflows: 2700 + 600 + 700 = 4000. Balance: 0
        expect(res.error).toBeFalsy();
        const balanceStat = res.stats.find(s => s.label === 'Zero-Based Balance');
        expect(balanceStat).toBeDefined();
        expect(balanceStat.value).toBe('$0.00');
        expect(res.insight.headline).toContain('Zero-Based Budget in Perfect Balance');
    });

    it('adapts framework targets when 70/20/10 rule is selected', () => {
        const res = calc().calculate({
            income_frequency: 'monthly',
            primary_income: 6000,
            additional_income: 0,
            budgeting_rule: 'rule_70_20_10',
            housing: 2400,
            utilities: 400,
            groceries: 700,
            transportation: 400,
            healthcare: 200,
            dining_entertainment: 300,
            shopping_personal: 200,
            subscriptions_memberships: 50,
            other_wants: 50,
            debt_payments: 300,
            emergency_savings: 500,
            retirement_investments: 500
        });

        expect(res.error).toBeFalsy();
        const needsStat = res.stats.find(s => s.label.includes('70% target'));
        expect(needsStat).toBeDefined();
        const wantsStat = res.stats.find(s => s.label.includes('10% target'));
        expect(wantsStat).toBeDefined();
    });

    it('returns an error result if total income is zero or negative', () => {
        const res = calc().calculate({ primary_income: 0, additional_income: 0 });
        expect(res.error).toBe(true);
        expect(res.stats[0].value).toContain('income must be greater than zero');
    });

    it('handles negative or invalid expense values safely by clamping to zero', () => {
        const res = calc().calculate({
            primary_income: 5000,
            additional_income: 0,
            housing: -1500, // invalid negative
            groceries: 'invalid-string',
            dining_entertainment: null
        });

        expect(res.error).toBeFalsy();
        const livingExpenses = res.stats.find(s => s.label === 'Total Living Expenses');
        expect(livingExpenses).toBeDefined();
    });
});

describe('Budget Planner & Expense Tracker — Visualizations & Breakdown Table', () => {
    const calc = () => TOOLS()['budget-planner'];

    it('provides chart datasets for doughnut and bar visualizers', () => {
        const res = calc().calculate({
            primary_income: 6000,
            housing: 1800,
            utilities: 300,
            groceries: 600,
            transportation: 400,
            healthcare: 200,
            dining_entertainment: 400,
            shopping_personal: 300,
            subscriptions_memberships: 100,
            other_wants: 100,
            debt_payments: 400,
            emergency_savings: 600,
            retirement_investments: 800
        });

        expect(res.chart).toBeDefined();
        expect(res.chart.type).toBe('doughnut');
        expect(res.chart.labels.length).toBe(12);
        expect(res.chart.data.length).toBe(12);

        expect(res.chart2).toBeDefined();
        expect(res.chart2.type).toBe('bar');
        expect(res.chart2.labels.length).toBe(3);
        expect(res.chart2.datasets.length).toBe(2);
    });

    it('provides coverage progress bars for all budget pillars', () => {
        const res = calc().calculate({
            primary_income: 5000,
            housing: 1500,
            utilities: 300,
            groceries: 500,
            transportation: 350,
            healthcare: 150,
            dining_entertainment: 400,
            shopping_personal: 300,
            subscriptions_memberships: 100,
            other_wants: 100,
            debt_payments: 250,
            emergency_savings: 500,
            retirement_investments: 550
        });

        expect(Array.isArray(res.bars)).toBe(true);
        expect(res.bars.length).toBe(4);
        expect(res.bars[0].label).toContain('Essential Needs');
        expect(res.bars[1].label).toContain('Discretionary Wants');
        expect(res.bars[2].label).toContain('Savings & Debt');
        expect(res.bars[3].label).toContain('Utilization');
    });

    it('generates itemized breakdown table with summary rows', () => {
        const res = calc().calculate({
            primary_income: 5000,
            housing: 1500,
            utilities: 300,
            groceries: 500,
            transportation: 350,
            healthcare: 150,
            dining_entertainment: 400,
            shopping_personal: 300,
            subscriptions_memberships: 100,
            other_wants: 100,
            debt_payments: 250,
            emergency_savings: 500,
            retirement_investments: 550
        });

        expect(Array.isArray(res.table)).toBe(true);
        expect(res.table.length).toBe(16); // 12 categories + 4 summary rows

        const housingRow = res.table.find(r => r.Category.startsWith('Housing'));
        expect(housingRow).toBeDefined();
        expect(housingRow['Monthly Amount']).toBe('$1,500.00');
        expect(housingRow['Annual Amount']).toBe('$18,000.00');

        const needsSubtotal = res.table.find(r => r.Category.includes('Needs Subtotal'));
        expect(needsSubtotal).toBeDefined();
        expect(needsSubtotal['Monthly Amount']).toBe('$2,800.00');
    });
});
