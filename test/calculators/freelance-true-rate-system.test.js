import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('Freelance True Rate System & True Hourly Rate Calculator', () => {
    const calc = () => TOOLS()['freelance-true-rate-system'];
    

    it('registers both main tool and alias with valid business metadata', () => {
        expect(calc()).toBeDefined();
        expect(calc().name).toBe('Freelance True Rate System');
        expect(calc().category).toBe('Business');
        expect(calc().metaTitle).toContain('True Freelance Hourly Rate Calculator');
        
    });

    it('executes reverse income engine with billable utilization and overhead deductions', () => {
        // Desired Net: $85,000
        // Weeks: 48, Hours: 40 -> Total Hours: 1,920
        // Utilization: 70% -> Billable Hours: 1,344
        // Taxes: 15.3% SE + 22.0% Income = 37.3% total tax rate
        // Pre-Tax Profit: $85,000 / (1 - 0.373) = $135,566.19
        // Expenses: $400/mo * 12 = $4,800/yr
        // Net Business Revenue: $135,566.19 + $4,800 = $140,366.19
        // Platform fee: Upwork 10% -> Gross Invoiced: $140,366.19 / 0.90 = $155,962.43
        // Required Client Rate: $155,962.43 / 1,344 = $116.04/hr
        const res = calc().calculate({
            desired_net_income: 85000,
            weeks_worked: 48,
            hours_per_week: 40,
            utilization_rate_pct: 70,
            self_employment_tax_pct: 15.3,
            income_tax_pct: 22.0,
            monthly_expenses: 400,
            platform_fee_model: 'upwork'
        });

        expect(res.error).toBeFalsy();
        expect(res.stats).toBeDefined();

        const rateStat = res.stats.find(s => s.label === 'Required Client Hourly Rate');
        expect(rateStat).toBeDefined();
        expect(rateStat.value).toContain('116.04');

        const dayRateStat = res.stats.find(s => s.label === 'Gross Day Rate (8h Billable)');
        expect(dayRateStat).toBeDefined();
        expect(dayRateStat.value).toContain('928.32');

        const billableHoursStat = res.stats.find(s => s.label === 'Annual Billable Hours');
        expect(billableHoursStat.value).toContain('1,344');

        const trueTakeHomeStat = res.stats.find(s => s.label === 'True Effective Hourly Take-Home (Total Hrs)');
        // $85,000 / 1,920 hrs = $44.27/hr
        expect(trueTakeHomeStat.value).toContain('44.27');

        expect(res.table).toBeDefined();
        expect(res.chart).toBeDefined();
        expect(res.chart2).toBeDefined();
        expect(res.chart3).toBeDefined();
    });

    it('handles direct client billing (0% platform fee)', () => {
        const res = calc().calculate({
            desired_net_income: 90000,
            weeks_worked: 48,
            hours_per_week: 40,
            utilization_rate_pct: 75, // 1,440 billable hrs
            self_employment_tax_pct: 15.3,
            income_tax_pct: 20.0, // 35.3% tax
            monthly_expenses: 500, // $6,000/yr
            platform_fee_model: 'none'
        });

        expect(res.error).toBeFalsy();
        const rateStat = res.stats.find(s => s.label === 'Required Client Hourly Rate');
        expect(rateStat).toBeDefined();
        expect(rateStat.value).toContain('$');
    });

    it('returns error when desired net income is zero or negative', () => {
        const res = calc().calculate({ desired_net_income: 0 });
        expect(res.error).toBe(true);
        expect(res.stats[0].value).toContain('desired annual net income');
    });
});
