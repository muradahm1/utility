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

export const financeCalculators = [
    mortgageCalculator,
    loanCalculator,
    // Additional finance calculators will be added here
];

/**
 * Register all finance calculators with the tool registry
 * @param {Function} registerTool - Tool registration function
 */
export function registerFinanceCalculators(registerTool) {
    financeCalculators.forEach(calculator => {
        registerTool(calculator.id, calculator);
    });
}

console.log('Finance calculators module loaded');
console.log(`  - ${financeCalculators.length} calculators available`);