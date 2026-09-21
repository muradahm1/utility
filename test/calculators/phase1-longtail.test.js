import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

function loadTools() {
  const source = fs.readFileSync(path.resolve(__dirname, '../../js/tools.js'), 'utf8');
  const sandbox = {
    window: {},
    document: { createElement: () => ({ setAttribute() {}, appendChild() {} }) },
    navigator: { userAgent: 'node' },
    console,
    URLSearchParams,
    URL,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    JSON,
    isFinite,
    isNaN,
    parseFloat,
    parseInt,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'tools.js' });
  return sandbox.window.TOOLS || {};
}

describe('Phase 1 High-Intent Long-Tail Calculators', () => {
  const tools = loadTools();

  it('15-year-mortgage-calculator calculates monthly payments and interest savings accurately', () => {
    const calc = tools['15-year-mortgage-calculator'];
    expect(calc).toBeDefined();
    expect(calc.category).toBe('Finance');
    expect(calc.fields.length).toBeGreaterThan(4);
    expect(calc.presets.length).toBeGreaterThanOrEqual(3);

    const result = calc.calculate({
      home_price: 400000,
      down_payment: 80000,
      rate_15: 5.85,
      rate_30: 6.75,
      property_tax: 4800,
      insurance: 1200,
      sp500_return: 8.0
    });

    expect(result.error).toBeUndefined();
    expect(result.stats).toBeDefined();
    const saved = result.stats.find(s => s.label === 'Total Interest Saved (15-Yr)');
    expect(saved).toBeDefined();
    expect(saved.value).toContain('$');
    expect(parseFloat(saved.value.replace(/[^0-9.]/g, ''))).toBeGreaterThan(150000);
  });

  it('fha-loan-calculator includes 3.5% down and financed upfront MIP', () => {
    const calc = tools['fha-loan-calculator'];
    expect(calc).toBeDefined();
    expect(calc.category).toBe('Finance');

    const result = calc.calculate({
      home_price: 300000,
      down_payment: 10500,
      interest_rate: 6.5,
      loan_term: 30,
      annual_mip_rate: 0.55,
      property_tax: 3600,
      insurance: 1100,
      conv_rate: 6.85,
      conv_pmi_rate: 0.85
    });

    expect(result.error).toBeUndefined();
    const payment = result.stats.find(s => s.label === 'Total Monthly FHA Payment');
    const mip = result.stats.find(s => s.label === 'Monthly Mortgage Insurance (MIP)');
    const ufmip = result.stats.find(s => s.label === 'Upfront MIP Financed (1.75%)');

    expect(payment).toBeDefined();
    expect(mip).toBeDefined();
    expect(ufmip).toBeDefined();
    expect(ufmip.value).toBe('$5,066.25');
  });

  it('auto-refinance-calculator calculates monthly and lifetime savings', () => {
    const calc = tools['auto-refinance-calculator'];
    expect(calc).toBeDefined();
    expect(calc.category).toBe('Finance');

    const result = calc.calculate({
      current_balance: 25000,
      current_rate: 9.5,
      months_remaining: 48,
      new_rate: 5.5,
      new_term_months: 48,
      refi_fees: 150
    });

    expect(result.error).toBeUndefined();
    const monthlySavings = result.stats.find(s => s.label === 'Monthly Payment Savings');
    const totalSavings = result.stats.find(s => s.label === 'Net Lifetime Savings');

    expect(monthlySavings).toBeDefined();
    expect(totalSavings).toBeDefined();
    expect(parseFloat(totalSavings.value.replace(/[^0-9.]/g, ''))).toBeGreaterThan(1000);
  });

  it('freelance-hourly-rate-calculator computes accurate 3-tier billable hourly rates', () => {
    const calc = tools['freelance-hourly-rate-calculator'];
    expect(calc).toBeDefined();
    expect(calc.category).toBe('Business');

    const result = calc.calculate({
      desired_net_income: 100000,
      overhead_expenses: 12000,
      effective_tax_rate: 30,
      weeks_vacation: 4,
      billable_hours_per_week: 25,
      retirement_savings: 15000,
      health_insurance_annual: 6000,
      buffer_percent: 15
    });

    expect(result.error).toBeUndefined();
    const targetRate = result.stats.find(s => s.label === 'Target Hourly Rate');
    const floorRate = result.stats.find(s => s.label === 'Minimum Survival Floor Rate');
    const gross = result.stats.find(s => s.label === 'Gross Annual Revenue Needed');

    expect(targetRate).toBeDefined();
    expect(floorRate).toBeDefined();
    expect(gross).toBeDefined();
    expect(targetRate.value).toContain('/ hr');
  });

  it('body-fat-percentage-calculator uses US Navy formula accurately', () => {
    const calc = tools['body-fat-percentage-calculator'];
    expect(calc).toBeDefined();
    expect(calc.category).toBe('Health');

    const resultMale = calc.calculate({
      gender: 'male',
      unit: 'imperial',
      height: 70,
      neck: 15,
      waist: 32,
      hip: 38,
      weight: 175,
    });

    expect(resultMale.error).toBeUndefined();
    const bfMale = resultMale.stats.find(s => s.label === 'Body Fat Percentage');
    expect(bfMale).toBeDefined();
    expect(parseFloat(bfMale.value)).toBeGreaterThan(10);
    expect(parseFloat(bfMale.value)).toBeLessThan(20);

    const resultFemale = calc.calculate({
      gender: 'female',
      unit: 'imperial',
      height: 65,
      neck: 13,
      waist: 27,
      hip: 36,
      weight: 135,
    });

    expect(resultFemale.error).toBeUndefined();
    const bfFemale = resultFemale.stats.find(s => s.label === 'Body Fat Percentage');
    expect(bfFemale).toBeDefined();
    expect(parseFloat(bfFemale.value)).toBeGreaterThan(15);
    expect(parseFloat(bfFemale.value)).toBeLessThan(30);
  });
});
