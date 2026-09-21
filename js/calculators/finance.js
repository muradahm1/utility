/**
 * Finance Calculators Module
 * 
 * Contains all finance-related calculator definitions.
 * Calculators are exported and can be registered with the central tool registry.
 * 
 * @module calculators/finance
 */

// Import shared utilities
import { safeNum, safeStr, roundTo, fmt, fmtN, pct } from '../utils/index.js';
import { escapeHtml } from '../utils/index.js';

// Import shared helper functions that calculators need
const errorResult = (message) => ({ error: true, stats: [{ label: 'Error', value: message, warn: true }] });
const bmiCategory = (bmi) => {
    if (!isFinite(bmi)) return { label: '—', color: '#64748B' };
    if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (bmi < 25) return { label: 'Normal Weight', color: '#10B981' };
    if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
};
const buildAmortization = (principal, r, n, payment) => {
    const rows = [];
    let balance = safeNum(principal, 0);
    for (let i = 1; i <= n; i++) {
        const interest = roundTo(balance * r, 2);
        let principalPaid = roundTo(payment - interest, 2);
        if (principalPaid > balance) principalPaid = balance;
        balance = roundTo(balance - principalPaid, 2);
        rows.push({ 
            month: i, 
            payment: (i === n && balance > 0) ? roundTo(principalPaid + balance, 2) : payment, 
            principal: principalPaid, 
            interest, 
            balance: Math.max(0, balance) 
        });
        if (balance <= 0 && i < n) break;
    }
    if (rows.length > 0) {
        rows[rows.length - 1].balance = 0;
        rows[rows.length - 1].payment = roundTo(rows[rows.length - 1].principal + rows[rows.length - 1].interest, 2);
    }
    return rows;
};

// ── Mortgage Calculator ────────────────────────────────────────

export const mortgageCalculator = {
    id: 'mortgage-calculator',
    name: 'Mortgage Calculator',
    category: 'Finance',
    icon: 'fa-house',
    iconClass: 'icon-home',
    tagClass: 'tag-finance',
    description: 'Calculate your monthly mortgage payment, total interest paid, and full amortization schedule.',
    metaDescription: 'Free mortgage calculator — instantly calculate monthly payments, total interest, and amortization schedule for any home loan.',
    fields: [
        { id: 'home_price', label: 'Home Price ($)', type: 'number', default: 400000, min: 1000, step: 1000, hint: 'The total purchase price of the home.' },
        { id: 'down_payment', label: 'Down Payment ($)', type: 'number', default: 80000, min: 0, step: 1000, hint: 'Cash paid upfront.' },
        { id: 'interest_rate', label: 'Annual Interest Rate (%)', type: 'number', default: 7.0, min: 0.01, step: 0.05, max: 50, hint: 'The yearly interest rate (APR).' },
        { id: 'loan_term', label: 'Loan Term (years)', type: 'select', default: 30, options: [10,15,20,25,30].map(v => ({ value: v, label: `${v} years` })), hint: 'How long you take to repay the loan.' },
        { id: 'property_tax', label: 'Annual Property Tax ($)', type: 'number', default: 4800, min: 0, step: 100, hint: 'Yearly property tax.' },
        { id: 'insurance', label: 'Annual Insurance ($)', type: 'number', default: 1200, min: 0, step: 100, hint: 'Yearly homeowners insurance premium.' },
    ],
    calculate(v) {
        const principal = safeNum(v.home_price, 0) - safeNum(v.down_payment, 0);
        if (principal <= 0) return errorResult('Down payment must be less than home price.');
        const annualRate = safeNum(v.interest_rate, 0);
        const r = annualRate / 100 / 12;
        const n = Math.round(safeNum(v.loan_term, 30)) * 12;
        const taxMonthly = safeNum(v.property_tax, 0) / 12;
        const insMonthly = safeNum(v.insurance, 0) / 12;
        const base = r === 0 ? principal / n : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const monthlyPI = roundTo(base, 2);
        const monthlyTotal = roundTo(monthlyPI + taxMonthly + insMonthly, 2);
        const totalPaid = roundTo(monthlyTotal * n, 2);
        const totalInterest = roundTo(monthlyPI * n - principal, 2);
        const totalTaxIns = roundTo((taxMonthly + insMonthly) * n, 2);
        const trueTotalCost = roundTo(safeNum(v.down_payment, 0) + monthlyTotal * n, 2);
        const schedule = buildAmortization(principal, r, n, monthlyPI);
        return {
            stats: [
                { label: 'Monthly Payment', value: fmt(monthlyTotal), highlight: true },
                { label: 'Principal & Interest', value: fmt(monthlyPI) },
                { label: 'Total Interest', value: fmt(totalInterest), warn: true },
                { label: 'Property Tax & Insurance', value: fmt(totalTaxIns) },
                { label: 'Total Cost', value: fmt(trueTotalCost) },
                { label: 'Loan Amount', value: fmt(principal) },
                { label: 'Down Payment', value: pct(safeNum(v.down_payment, 0) / safeNum(v.home_price, 1)) },
            ],
            chart: { principal, totalInterest },
            table: schedule,
        };
    },
    article: { heading: 'How to Calculate Your Mortgage Payment Accurately', intro: 'Your monthly mortgage payment is more than just principal and interest.', sections: [] },
    howTo: [], examples: [], formula: 'M = P × [r(1+r)^n] / [(1+r)^n − 1]', faqs: []
};

// ── Loan Calculator ────────────────────────────────────────────

export const loanCalculator = {
    id: 'loan-calculator',
    name: 'Loan Calculator',
    category: 'Finance',
    icon: 'fa-sack-dollar',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate monthly loan payments, total interest, and total cost for any personal or auto loan.',
    metaDescription: 'Free loan calculator — estimate monthly payments, total interest, and total repayment for auto, personal, or student loans.',
    fields: [
        { id: 'loan_amount', label: 'Loan Amount ($)', type: 'number', default: 30000, min: 1, step: 100, hint: 'The total amount you are borrowing.' },
        { id: 'interest_rate', label: 'Annual Interest Rate (%)', type: 'number', default: 6.5, min: 0.01, step: 0.05, max: 50, hint: 'The yearly interest rate (APR).' },
        { id: 'loan_term', label: 'Loan Term (years)', type: 'select', default: 5, options: [1,2,3,4,5,6,7,10].map(v => ({ value: v, label: `${v} year${v > 1 ? 's' : ''}` })), hint: 'How many years you will take to repay the loan.' },
    ],
    calculate(v) {
        const principal = safeNum(v.loan_amount, 0);
        if (principal <= 0) return errorResult('Loan amount must be greater than zero.');
        const annualRate = safeNum(v.interest_rate, 0);
        const r = annualRate / 100 / 12;
        const n = Math.round(safeNum(v.loan_term, 5)) * 12;
        const payment = r === 0 ? principal / n : principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const monthlyPayment = roundTo(payment, 2);
        const totalPaid = roundTo(monthlyPayment * n, 2);
        const totalInterest = roundTo(totalPaid - principal, 2);
        const schedule = buildAmortization(principal, r, n, monthlyPayment);
        return {
            stats: [
                { label: 'Monthly Payment', value: fmt(monthlyPayment), highlight: true },
                { label: 'Total Interest', value: fmt(totalInterest), warn: true },
                { label: 'Total Paid', value: fmt(totalPaid) },
                { label: 'Loan Amount', value: fmt(principal) },
            ],
            chart: { principal, totalInterest },
            table: schedule,
        };
    },
    article: { heading: 'How to Calculate Loan Payments', intro: 'Whether it is a car, personal, or student loan, knowing your monthly payment is essential.', sections: [] },
    howTo: [], examples: [], formula: 'M = P × [r(1+r)^n] / [(1+r)^n − 1]', faqs: []
};

// ── Export all finance calculators ──────────────────────────────


// ── Debt Snowball Calculator ───────────────────────────────────
export const debtSnowballCalculator = {
    id: 'debt-snowball-calculator',
    name: 'Debt Payoff & Snowball Calculator',
    category: 'Finance',
    icon: 'fa-snowflake',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Model Debt Snowball and Debt Avalanche repayment schedules, quantify interest savings, and project your exact debt-free horizon.',
    metaDescription: 'Free debt payoff calculator. Compare Debt Snowball vs. Debt Avalanche strategies, determine optimal repayment order, and calculate total interest saved.',
    fields: [
        { id: 'extra_payment', label: 'Additional Monthly Contribution ($)', type: 'number', default: 200, min: 0, step: 25, hint: 'Extra cash allocated toward principal reduction each month beyond required minimums.' },
        { id: 'strategy', label: 'Repayment Strategy', type: 'select', default: 'snowball', options: [
            { value: 'snowball', label: 'Debt Snowball (Lowest Balance First — Behavioral Momentum)' },
            { value: 'avalanche', label: 'Debt Avalanche (Highest APR First — Mathematical Optimization)' }
        ], hint: 'Choose between behavioral momentum (Snowball) or maximum financing interest savings (Avalanche).' },
        { id: 'debt1_name', label: 'Debt 1 Account Name', type: 'text', default: 'Credit Card', hint: 'Creditor or loan designation.' },
        { id: 'debt1_balance', label: 'Debt 1 Balance ($)', type: 'number', default: 2500, min: 0, step: 50, hint: 'Current unpaid principal balance.' },
        { id: 'debt1_rate', label: 'Debt 1 Interest Rate (APR %)', type: 'number', default: 24.99, min: 0, max: 99, step: 0.1, hint: 'Annual percentage rate assessed on revolving balances.' },
        { id: 'debt1_min', label: 'Debt 1 Minimum Monthly Payment ($)', type: 'number', default: 75, min: 1, step: 5, hint: 'Required scheduled minimum installment.' },
        { id: 'debt2_name', label: 'Debt 2 Account Name', type: 'text', default: 'Car Loan', hint: 'Creditor or loan designation.' },
        { id: 'debt2_balance', label: 'Debt 2 Balance ($)', type: 'number', default: 8000, min: 0, step: 100, hint: 'Current unpaid principal balance.' },
        { id: 'debt2_rate', label: 'Debt 2 Interest Rate (APR %)', type: 'number', default: 6.5, min: 0, max: 99, step: 0.1, hint: 'Annual percentage rate assessed on revolving balances.' },
        { id: 'debt2_min', label: 'Debt 2 Minimum Monthly Payment ($)', type: 'number', default: 200, min: 1, step: 5, hint: 'Required scheduled minimum installment.' },
        { id: 'debt3_name', label: 'Debt 3 Account Name', type: 'text', default: 'Personal Loan', hint: 'Creditor or loan designation.' },
        { id: 'debt3_balance', label: 'Debt 3 Balance ($)', type: 'number', default: 4500, min: 0, step: 50, hint: 'Current unpaid principal balance.' },
        { id: 'debt3_rate', label: 'Debt 3 Interest Rate (APR %)', type: 'number', default: 12.0, min: 0, max: 99, step: 0.1, hint: 'Annual percentage rate assessed on revolving balances.' },
        { id: 'debt3_min', label: 'Debt 3 Minimum Monthly Payment ($)', type: 'number', default: 125, min: 1, step: 5, hint: 'Required scheduled minimum installment.' }
    ],
    calculate(v) {
        return window.TOOLS['debt-snowball-calculator'].calculate(v);
    },
    article: { heading: 'Accelerated Debt Repayment: Snowball vs. Avalanche Frameworks', intro: '', sections: [] },
    howTo: [], examples: [], formula: 'M = P * r', faqs: []
};

// ── Mortgage Refinance Calculator ───────────────────────────────
export const refinanceCalculator = {
    id: 'refinance-calculator',
    name: 'Mortgage Refinance Break-Even Calculator',
    category: 'Finance',
    icon: 'fa-house-chimney-window',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Evaluate mortgage refinancing viability by calculating payment reductions, upfront closing cost break-even horizons, and net cash savings.',
    metaDescription: 'Free mortgage refinance calculator. Calculate monthly payment reduction, exact break-even timeline in months, and cumulative net savings after closing costs.',
    fields: [
        { id: 'current_balance', label: 'Current Mortgage Balance ($)', type: 'number', default: 320000, min: 1000, step: 5000, hint: 'The remaining unpaid principal balance on your existing mortgage note.' },
        { id: 'current_rate', label: 'Current Interest Rate (%)', type: 'number', default: 6.75, min: 0.1, max: 20, step: 0.125, hint: 'The annual note rate currently charged on your existing mortgage.' },
        { id: 'current_years_remaining', label: 'Remaining Amortization Term (Years)', type: 'number', default: 26, min: 1, max: 40, step: 1, hint: 'Number of remaining years until your existing mortgage is fully retired.' },
        { id: 'new_rate', label: 'Proposed Interest Rate (%)', type: 'number', default: 5.25, min: 0.1, max: 20, step: 0.125, hint: 'The lower interest rate offered by the refinancing lender.' },
        { id: 'new_term_years', label: 'New Loan Term (Years)', type: 'number', default: 30, min: 5, max: 40, step: 5, hint: 'Standard amortization term for the replacement loan (e.g. 15, 20, or 30 years).' },
        { id: 'closing_costs', label: 'Estimated Refinance Closing Costs ($)', type: 'number', default: 4500, min: 0, step: 250, hint: 'Total origination, appraisal, title, escrow, and recording fees required at settlement.' },
        { id: 'years_in_home', label: 'Anticipated Occupancy Horizon (Years)', type: 'number', default: 7, min: 1, max: 40, step: 1, hint: 'Expected duration you plan to retain and occupy the mortgaged property.' }
    ],
    calculate(v) {
        return window.TOOLS['refinance-calculator'].calculate(v);
    },
    article: { heading: 'Mortgage Refinance Break-Even Analysis & Capital Recovery', intro: '', sections: [] },
    howTo: [], examples: [], formula: 'T = Closing Costs / Savings', faqs: []
};

// ── 1099 Self-Employment Tax Calculator ────────────────────────
export const selfEmploymentTaxCalculator = {
    id: 'self-employment-tax-calculator',
    name: '1099 Self-Employment Tax Calculator',
    category: 'Finance',
    icon: 'fa-receipt',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate federal self-employment tax (SECA), effective tax brackets, and quarterly estimated IRS 1040-ES payments for independent contractors and sole proprietors.',
    metaDescription: 'Free 1099 self-employment tax calculator. Calculate 15.3% SECA tax, progressive federal and state income taxes, Schedule SE deductions, and quarterly 1040-ES payments.',
    fields: [
        { id: 'gross_income', label: 'Annual 1099 Gross Revenue ($)', type: 'number', default: 85000, min: 0, step: 1000, hint: 'Total gross revenue or client receipts prior to business expenses and tax deductions.' },
        { id: 'business_expenses', label: 'Ordinary & Necessary Business Deductions ($)', type: 'number', default: 12000, min: 0, step: 500, hint: 'Allowable Schedule C business write-offs (mileage, software, hardware, professional services).' },
        { id: 'filing_status', label: 'Tax Filing Status', type: 'select', default: 'single', options: [
            { value: 'single', label: 'Single Filer' },
            { value: 'married_joint', label: 'Married Filing Jointly' },
            { value: 'head_household', label: 'Head of Household' }
        ], hint: 'IRS tax filing status determining progressive bracket thresholds and standard deductions.' },
        { id: 'state_tax_rate', label: 'Applicable State Income Tax Rate (%)', type: 'number', default: 4.5, min: 0, max: 15, step: 0.5, hint: 'State income tax rate (0% for states without individual income tax including TX, FL, WA, TN).' },
        { id: 'other_w2_income', label: 'Concurrent W-2 Compensation ($)', type: 'number', default: 0, min: 0, step: 1000, hint: 'W-2 wage earnings subject to mandatory FICA withholding (adjusts Social Security wage cap).' }
    ],
    calculate(v) {
        return window.TOOLS['self-employment-tax-calculator'].calculate(v);
    },
    article: { heading: 'Self-Employment Tax (SECA) & Estimated Tax Compliance', intro: '', sections: [] },
    howTo: [], examples: [], formula: 'Tax = SECA + Fed + State', faqs: []
};

export const financeCalculators = [
    mortgageCalculator,
    loanCalculator,
    // Additional finance calculators will be added here
];

/**
 * Register all finance calculators with the tool registry
 * Only registers if the tool is not already registered (preserves richer legacy definitions)
 * @param {Function} registerTool - Tool registration function
 * @param {Function} toolExists - Tool existence check function
 */
export function registerFinanceCalculators(registerTool, toolExists) {
    financeCalculators.forEach(calculator => {
        // Skip if already registered (legacy tools have richer content)
        if (toolExists && toolExists(calculator.id)) {
            return;
        }
        registerTool(calculator.id, calculator);
    });
}
