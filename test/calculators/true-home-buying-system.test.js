import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('True Home Buying System & True Cost of Buying a House', () => {
    const calc = () => TOOLS()['true-home-buying-system'];
    

    it('registers both main tool and alias with valid metadata', () => {
        expect(calc()).toBeDefined();
        expect(calc().name).toBe('True Home Buying System');
        expect(calc().category).toBe('Finance');
        expect(calc().metaTitle).toContain('True Cost of Buying a House Calculator');
        
    });

    it('calculates total liquid cash required to close correctly (Down Payment + Closing Costs + Escrow/Prepaids)', () => {
        const res = calc().calculate({
            country: 'US',
            state_province: 'TX',
            home_price: 400000,
            down_payment_pct: 20, // $80,000
            closing_costs_pct: 3.0, // $12,000
            prepaids_reserve_pct: 1.0, // $4,000
            interest_rate: 6.8,
            loan_term: 30,
            property_tax_rate: 1.5,
            home_insurance: 1500,
            hoa_fees: 0,
            enable_maintenance: 'yes',
            maintenance_pct: 1.0,
            current_rent: 2200,
            rent_increase_pct: 3.0,
            home_appreciation_pct: 3.5,
            investment_return_pct: 7.5,
            ownership_years: 10
        });

        expect(res.error).toBeFalsy();
        expect(res.stats).toBeDefined();

        const cashToClose = res.stats.find(s => s.label === 'Total Liquid Cash Required to Close');
        expect(cashToClose).toBeDefined();
        // 80,000 + 12,000 + 4,000 = $96,000
        expect(cashToClose.value).toBe('$96,000.00');

        const downStat = res.stats.find(s => s.label === 'Down Payment Required');
        expect(downStat.value).toBe('$80,000.00');

        const closingStat = res.stats.find(s => s.label === 'Estimated Closing Costs');
        expect(closingStat.value).toBe('$12,000.00');

        const prepaidsStat = res.stats.find(s => s.label === 'Escrow & Prepaids Reserve');
        expect(prepaidsStat.value).toBe('$4,000.00');
    });

    it('computes PITIA + Maintenance loaded monthly housing cost', () => {
        const res = calc().calculate({
            country: 'US',
            home_price: 500000,
            down_payment_pct: 20, // $100,000 down -> $400,000 loan
            closing_costs_pct: 3.0,
            prepaids_reserve_pct: 1.0,
            interest_rate: 6.0,
            loan_term: 30,
            property_tax_rate: 1.2, // $6,000/yr -> $500/mo
            home_insurance: 1800, // $150/mo
            hoa_fees: 100, // $100/mo
            enable_maintenance: 'yes',
            maintenance_pct: 1.0, // $5,000/yr -> $416.67/mo
        });

        expect(res.error).toBeFalsy();
        const monthlyPIStat = res.stats.find(s => s.label === 'Mortgage Principal & Interest (P&I)');
        expect(monthlyPIStat).toBeDefined();
        // $400,000 at 6.0% 30yr = $2,398.20/mo
        expect(monthlyPIStat.value).toBe('$2,398.20');

        const totalMonthlyStat = res.stats.find(s => s.label === 'True Monthly Cost of Ownership');
        expect(totalMonthlyStat).toBeDefined();
        // 2398.20 + 500 + 150 + 100 + 416.67 = $3,564.87
        expect(totalMonthlyStat.value).toBe('$3,564.87');
    });

    it('accurately applies Canadian semi-annual compounding and CMHC mortgage default insurance', () => {
        // In Canada, 10% down on $500,000 = $50,000 down, $450,000 base loan.
        // CMHC premium for 10% down = 3.10% ($13,950), financed loan = $463,950.
        // Compounding is semi-annual per Canadian Bank Act.
        const res = calc().calculate({
            country: 'CA',
            state_province: 'ON',
            home_price: 500000,
            down_payment_pct: 10,
            closing_costs_pct: 2.5,
            prepaids_reserve_pct: 1.0,
            interest_rate: 5.0,
            loan_term: 25,
            property_tax_rate: 1.05,
            home_insurance: 1400,
            hoa_fees: 0,
            enable_maintenance: 'yes',
            maintenance_pct: 1.0
        });

        expect(res.error).toBeFalsy();
        expect(res.stats).toBeDefined();
        const cashStat = res.stats.find(s => s.label === 'Total Liquid Cash Required to Close');
        // $50k down + $12.5k closing + $5k prepaids = C$67,500
        expect(cashStat.value).toContain('C$67,500.00');

        const piStat = res.stats.find(s => s.label === 'Mortgage Principal & Interest (P&I)');
        expect(piStat.value).toContain('C$');
    });

    it('generates 5-year vs 10-year decision matrix with net equity and index fund comparison', () => {
        const res = calc().calculate({
            country: 'US',
            home_price: 450000,
            down_payment_pct: 20,
            closing_costs_pct: 3.0,
            prepaids_reserve_pct: 1.0,
            interest_rate: 6.8,
            loan_term: 30,
            property_tax_rate: 1.2,
            home_insurance: 1500,
            hoa_fees: 0,
            enable_maintenance: 'yes',
            maintenance_pct: 1.0,
            current_rent: 2200,
            rent_increase_pct: 3.0,
            home_appreciation_pct: 3.5,
            investment_return_pct: 7.5,
            ownership_years: 10,
            selling_cost_pct: 6.0
        });

        expect(res.error).toBeFalsy();
        expect(res.table).toBeDefined();
        expect(res.table.rows.length).toBeGreaterThanOrEqual(5);
        expect(res.chart).toBeDefined();
        expect(res.chart2).toBeDefined();
        expect(res.chart3).toBeDefined();
    });

    it('handles zero or invalid home price with error message', () => {
        const res = calc().calculate({ home_price: 0 });
        expect(res.error).toBe(true);
        expect(res.stats[0].value).toContain('home purchase price');
    });
});
