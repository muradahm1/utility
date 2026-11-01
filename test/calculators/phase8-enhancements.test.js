import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { buildInsightsHtml, buildChartsHtml } from '../../js/core/calculator-engine.js';
import { ChartManager } from '../../js/modules/charts.js';

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

    it('provides multi-dataset trajectory charts, executive insight, and AI financialContract', () => {
        const calc = TOOLS()['retirement-calculator'];
        const res = calc.calculate({
            current_age: 25,
            current_savings: 0,
            annual_income: 55000,
            monthly_contribution: 500,
            annual_return: 7,
            inflation_rate: 3,
            retirement_age: 65,
            life_expectancy: 95,
            income_replacement: 80,
        });

        // 1. Primary timeline trajectory chart
        expect(res.chart).toBeDefined();
        expect(res.chart.type).toBe('area');
        expect(res.chart.labels.length).toBeGreaterThan(5);
        expect(res.chart.datasets).toHaveLength(3);
        expect(res.chart.datasets[0].label).toContain('Projected Portfolio');
        expect(res.chart.datasets[1].label).toContain('Total Cumulative Contributions');
        expect(res.chart.datasets[2].label).toContain('4% Rule Target Nest Egg');

        // 2. Secondary portfolio composition chart
        expect(res.chart2).toBeDefined();
        expect(res.chart2.type).toBe('doughnut');
        expect(res.chart2.data).toEqual([240000, 334070.19]);

        // 3. Goal progress ring
        expect(res.compareChart).toBeDefined();
        expect(res.compareChart.type).toBe('doughnut');
        expect(res.compareChart.labels).toEqual(['Target Funded', 'Remaining Gap']);

        // 4. Executive insight banner
        expect(res.insight).toBeDefined();
        expect(res.insight.tone).toBe('warning');
        expect(res.insight.headline).toContain('Savings Shortfall');
        expect(res.insight.detail).toContain('$458.07');

        // 5. Takeaways array
        expect(res.insights).toBeDefined();
        expect(res.insights).toHaveLength(3);
        expect(res.insights[0].title).toBe('Compound Growth Leverage');

        // 6. Future AI data contract
        expect(res.financialContract).toBeDefined();
        expect(res.financialContract.schemaVersion).toBe('1.0.0');
        expect(res.financialContract.calculator).toBe('retirement-calculator');
        expect(res.financialContract.inputs.currentAge).toBe(25);
        expect(res.financialContract.inputs.yearsToRetire).toBe(40);
        expect(res.financialContract.assumptions.fisherRealReturnRate).toBeCloseTo(3.8835, 3);
        expect(res.financialContract.outputs.projectedNestEggTodayDollars).toBe(574070.19);
        expect(res.financialContract.provenance.realRateEquation).toBeDefined();
        expect(res.financialContract.limitations.length).toBeGreaterThan(0);

        // 7. Unified 4-view switcher chart architecture
        expect(res.charts).toBeDefined();
        expect(res.charts).toHaveLength(4);
        expect(res.charts.map(c => c.id)).toEqual(['trajectory', 'breakdown', 'portfolio-split', 'target-progress']);
        expect(res.charts[1].type).toBe('stackedBar');
        expect(res.charts[1].datasets).toHaveLength(2);

        // 8. Year-by-year schedule data table
        expect(res.table).toBeDefined();
        expect(res.table.mode).toBe('schedule');
        expect(res.table.title).toBe('Year-by-Year Retirement Growth Schedule');
        expect(res.table.columns).toHaveLength(5);
        expect(res.table.rows).toHaveLength(40);
        expect(res.table.rows[0].year).toBe('Yr 1 (Age 26)');

        // 9. Personalized insights formatting (NO [object Object])
        const insightsHtml = buildInsightsHtml(res.insights);
        expect(insightsHtml).not.toContain('[object Object]');
        expect(insightsHtml).toContain('Compound Growth Leverage:');

        // 10. Unified chart HTML rendering
        const chartsHtml = buildChartsHtml(res);
        expect(chartsHtml).toContain('chart-view-card');
        expect(chartsHtml).toContain('chart-view-tabs');
        expect(chartsHtml).toContain('Growth Trajectory');
        expect(chartsHtml).toContain('Annual Breakdown');
    });

    it('verifies presets integrity and execution', () => {
        const tool = TOOLS()['retirement-calculator'];
        expect(tool.presets).toBeDefined();
        expect(tool.presets.length).toBe(3);

        tool.presets.forEach(preset => {
            expect(preset.label).toBeDefined();
            const res = tool.calculate(preset.values);
            expect(res.error).toBeFalsy();
            expect(res.stats.length).toBeGreaterThan(0);
            expect(res.chart).toBeDefined();
            expect(res.financialContract).toBeDefined();
        });
    });

    it('safely handles zero annual income and zero contributions without NaN', () => {
        const calc = TOOLS()['retirement-calculator'];
        const res = calc.calculate({
            current_age: 30,
            current_savings: 50000,
            annual_income: 0,
            monthly_contribution: 0,
            annual_return: 6,
            inflation_rate: 2.5,
            retirement_age: 60,
            life_expectancy: 85,
            income_replacement: 0,
        });

        expect(res.error).toBeFalsy();
        const m = {};
        res.stats.forEach(s => { m[s.label] = s.value; });
        expect(m["Target Nest Egg (4% Rule)"]).toBe('$0.00');
        expect(m["Income Replacement Rate"]).toBe('0.00%');
        expect(res.financialContract.outputs.achievedReplacementRatePct).toBe(0);
    });

    it('seamlessly transitions between multiple chart views on the same canvas without losing canvas identity', () => {
        const calc = TOOLS()['retirement-calculator'];
        const res = calc.calculate({
            current_age: 30,
            current_savings: 20000,
            annual_income: 60000,
            monthly_contribution: 600,
            annual_return: 7,
            inflation_rate: 3,
            retirement_age: 65,
            life_expectancy: 90,
            income_replacement: 80,
        });

        // Setup DOM container with canvas
        const container = document.createElement('div');
        container.className = 'chart-container chart-container--unified';
        const canvas = document.createElement('canvas');
        canvas.id = 'result-chart';
        container.appendChild(canvas);
        document.body.appendChild(container);

        // Switch through all 4 views consecutively across 3 cycles (12 conversions)
        for (let cycle = 0; cycle < 3; cycle++) {
            res.charts.forEach((chartView) => {
                ChartManager.create({
                    id: 'result-chart',
                    type: chartView.type === 'stackedBar' ? 'bar' : (chartView.type === 'area' ? 'line' : (chartView.type || 'doughnut')),
                    container,
                    data: {
                        labels: chartView.labels || ['A', 'B'],
                        datasets: chartView.datasets || [{ data: chartView.data || [50, 50] }]
                    }
                });

                // Canvas must NEVER be removed, detached, or lose its ID
                const currentCanvas = document.getElementById('result-chart');
                expect(currentCanvas).not.toBeNull();
                expect(currentCanvas.id).toBe('result-chart');
                expect(currentCanvas.parentElement).toBe(container);
            });
        }

        ChartManager.destroy('result-chart');
        container.remove();
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
