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
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['mortgage-calculator']) {
            return window.TOOLS['mortgage-calculator'].calculate(v);
        }
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
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['loan-calculator']) {
            return window.TOOLS['loan-calculator'].calculate(v);
        }
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

// ── Retirement Calculator ──────────────────────────────────────
export const retirementCalculator = {
    id: 'retirement-calculator',
    name: 'Retirement Calculator',
    category: 'Finance',
    icon: 'fa-umbrella',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Determine how much money you need to retire comfortably, estimate your future nest egg balance, and calculate required monthly savings based on inflation and life expectancy.',
    metaTitle: 'Retirement Calculator for Early Career Professionals | Free Template - GetCalcu',
    metaDescription: 'Free online Retirement Savings Calculator for early career professionals. Estimate your target retirement nest egg, monthly savings requirements, compound returns, and inflation impact. Start planning at 25.',
    fields: [
        { id: 'current_age', label: 'Your Current Age', type: 'number', default: 25, min: 18, max: 75, step: 1, hint: 'Your age today. The calculator uses this to determine years remaining until retirement.' },
        { id: 'retirement_age', label: 'Desired Retirement Age', type: 'number', default: 65, min: 30, max: 85, step: 1, hint: 'The age you plan to stop working and begin drawing upon your nest egg.' },
        { id: 'current_savings', label: 'Current Retirement Savings ($)', type: 'number', default: 0, min: 0, step: 1000, hint: 'Total combined balance across all retirement accounts: 401k, IRA, Roth IRA, and taxable brokerage.' },
        { id: 'monthly_contribution', label: 'Monthly Contribution ($)', type: 'number', default: 500, min: 0, step: 50, hint: 'Total monthly savings directed into investments. Even modest contributions compound powerfully over decades.' },
        { id: 'annual_income', label: 'Annual Pre-Tax Income ($)', type: 'number', default: 55000, min: 10000, step: 5000, hint: 'Your current gross yearly salary. Used to benchmark your required retirement replacement income.' },
        { id: 'annual_return', label: 'Expected Annual Return (%)', type: 'number', default: 7.0, min: 0.1, max: 30, step: 0.1, hint: 'Expected average annual nominal portfolio growth.' },
        { id: 'inflation_rate', label: 'Expected Inflation Rate (%)', type: 'number', default: 3.0, min: 0, max: 20, step: 0.1, hint: 'Expected long-term annual rise in consumer prices.' },
        { id: 'income_replacement', label: 'Desired Retirement Income (% of salary)', type: 'number', default: 80, min: 10, max: 120, step: 5, hint: 'Percentage of pre-retirement income needed to maintain your standard of living.' },
        { id: 'life_expectancy', label: 'Life Expectancy (years)', type: 'number', default: 95, min: 50, max: 120, step: 1, hint: 'How long your portfolio needs to support you in retirement.' }
    ],
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['retirement-calculator']) {
            return window.TOOLS['retirement-calculator'].calculate(v);
        }
        const currentAge = Math.max(1, safeNum(v.current_age, 25));
        const currentSavings = Math.max(0, safeNum(v.current_savings, 0));
        const annualIncome = Math.max(0, safeNum(v.annual_income, 55000));
        const monthlyContrib = Math.max(0, safeNum(v.monthly_contribution, 500));
        const annualReturn = safeNum(v.annual_return, 7) / 100;
        const rawInflation = safeNum(v.inflation_rate, 3) / 100;
        const inflationRate = rawInflation <= -1 ? -0.99 : rawInflation;
        const retirementAge = safeNum(v.retirement_age, 65);
        const lifeExpectancy = safeNum(v.life_expectancy, 95);
        const incomeReplace = Math.max(0, safeNum(v.income_replacement, 80)) / 100;

        if (retirementAge <= currentAge) {
            return errorResult('Retirement age must be greater than your current age.');
        }
        if (lifeExpectancy <= retirementAge) {
            return errorResult('Life expectancy must be greater than retirement age.');
        }

        const yearsToRetire = retirementAge - currentAge;
        const realReturn = (1 + annualReturn) / (1 + inflationRate) - 1;
        const monthlyRealRet = realReturn / 12;
        const totalMonths = yearsToRetire * 12;

        const fvCurrentSavings = currentSavings * Math.pow(1 + realReturn, yearsToRetire);
        let fvContributions;
        if (monthlyRealRet === 0) {
            fvContributions = monthlyContrib * totalMonths;
        } else {
            const growthFactor = Math.pow(1 + monthlyRealRet, totalMonths);
            fvContributions = monthlyContrib * (growthFactor - 1) / monthlyRealRet;
        }

        const totalNestEgg = roundTo(fvCurrentSavings + fvContributions, 2);
        const totalContribs = roundTo(currentSavings + monthlyContrib * 12 * yearsToRetire, 2);
        const totalGrowth = roundTo(totalNestEgg - totalContribs, 2);
        const desiredIncomeToday = annualIncome * incomeReplace;
        const targetNestEgg = roundTo(desiredIncomeToday * 25, 2);
        const monthlyRetireIncome = roundTo(totalNestEgg * 0.04 / 12, 2);
        const annualRetireIncome = roundTo(totalNestEgg * 0.04, 2);
        const futureNominalMonthly = roundTo(monthlyRetireIncome * Math.pow(1 + inflationRate, yearsToRetire), 2);
        const achievedReplaceRate = annualIncome > 0 ? roundTo((annualRetireIncome / annualIncome) * 100, 1) : 0;
        const fundedRatio = targetNestEgg > 0 ? (totalNestEgg / targetNestEgg) : 1;
        const fundedPct = Math.round(fundedRatio * 100);

        let status = 'On Track ✓';
        if (totalNestEgg < targetNestEgg * 0.75) {
            status = 'Needs Attention - Boost Contributions';
        } else if (totalNestEgg < targetNestEgg) {
            status = 'Close - Increase Savings';
        }

        let additionalMonthlyNeeded = 0;
        if (totalNestEgg < targetNestEgg && monthlyRealRet > 0) {
            const fvCurrentOnly = currentSavings * Math.pow(1 + realReturn, yearsToRetire);
            const neededFromContribs = targetNestEgg - fvCurrentOnly;
            if (neededFromContribs > 0) {
                const gf = Math.pow(1 + monthlyRealRet, totalMonths);
                const pmtNeeded = neededFromContribs * monthlyRealRet / (gf - 1);
                additionalMonthlyNeeded = roundTo(Math.max(0, pmtNeeded - monthlyContrib), 2);
            }
        }

        return {
            stats: [
                { label: "Projected Nest Egg (Today's $)", value: fmt(totalNestEgg), highlight: true },
                { label: "Target Nest Egg (4% Rule)", value: fmt(targetNestEgg) },
                { label: 'Status', value: status, warn: totalNestEgg < targetNestEgg },
                { label: "Monthly Income (Today's $)", value: fmt(monthlyRetireIncome) },
                { label: "Annual Income (Today's $)", value: fmt(annualRetireIncome) },
                { label: 'Total Contributions', value: fmt(totalContribs) },
                { label: 'Investment Growth', value: fmt(totalGrowth) },
                { label: 'Future Monthly (At Retirement $)', value: fmt(futureNominalMonthly) },
                { label: 'Income Replacement Rate', value: pct(achievedReplaceRate / 100) },
                { label: 'Additional Monthly Savings Needed', value: fmt(additionalMonthlyNeeded), warn: additionalMonthlyNeeded > 0 }
            ]
        };
    },
    article: { heading: 'Retirement Planning & Compound Wealth Accumulation', intro: '', sections: [] },
    howTo: [], examples: [], formula: 'FV = PV(1+r)^n + PMT[((1+r)^n - 1)/r]', faqs: []
};

// ── Amortization Calculator ───────────────────────────────────
export const amortizationCalculator = {
    id: 'amortization-calculator',
    name: 'Amortization Calculator',
    category: 'Finance',
    icon: 'fa-chart-simple',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate loan payments, generate a complete amortization schedule, visualize principal and interest over time, and analyze the impact of extra payments.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['amortization-calculator']) {
            return window.TOOLS['amortization-calculator'].calculate(v);
        }
        return errorResult('Amortization calculator not loaded');
    }
};

// ── Compound Interest Calculator ──────────────────────────────
export const compoundInterestCalculator = {
    id: 'compound-interest-calculator',
    name: 'Compound Interest Calculator',
    category: 'Finance',
    icon: 'fa-chart-line',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate compound interest on savings and investments with regular deposits and multiple compounding frequencies.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['compound-interest-calculator']) {
            return window.TOOLS['compound-interest-calculator'].calculate(v);
        }
        return errorResult('Compound interest calculator not loaded');
    }
};

// ── Investment Calculator ─────────────────────────────────────
export const investmentCalculator = {
    id: 'investment-calculator',
    name: 'Investment Calculator',
    category: 'Finance',
    icon: 'fa-arrow-trend-up',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Project portfolio growth over time from lump sums and monthly contributions, calculate return on investment, and model savings milestones.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['investment-calculator']) {
            return window.TOOLS['investment-calculator'].calculate(v);
        }
        return errorResult('Investment calculator not loaded');
    }
};

// ── 401(k) Calculator ─────────────────────────────────────────
export const fourOhOneKCalculator = {
    id: '401k-calculator',
    name: '401(k) Retirement Growth Calculator',
    category: 'Finance',
    icon: 'fa-piggy-bank',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Project your 401(k) retirement balance, company match growth, and tax-advantaged compound interest.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['401k-calculator']) {
            return window.TOOLS['401k-calculator'].calculate(v);
        }
        return errorResult('401(k) calculator not loaded');
    }
};

// ── Net Worth Calculator ──────────────────────────────────────
export const netWorthCalculator = {
    id: 'net-worth-calculator',
    name: 'Net Worth Calculator',
    category: 'Finance',
    icon: 'fa-scale-balanced',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Track your total assets and liabilities to calculate your current personal net worth.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['net-worth-calculator']) {
            return window.TOOLS['net-worth-calculator'].calculate(v);
        }
        return errorResult('Net worth calculator not loaded');
    }
};

// ── House Affordability Calculator ────────────────────────────
export const houseAffordabilityCalculator = {
    id: 'house-affordability-calculator',
    name: 'House Affordability Calculator',
    category: 'Finance',
    icon: 'fa-house-chimney',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate how much home you can afford based on income, down payment, monthly debts, and DTI ratios.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['house-affordability-calculator']) {
            return window.TOOLS['house-affordability-calculator'].calculate(v);
        }
        return errorResult('House affordability calculator not loaded');
    }
};

// ── Emergency Fund Calculator ─────────────────────────────────
export const emergencyFundCalculator = {
    id: 'emergency-fund-calculator',
    name: 'Emergency Fund Calculator',
    category: 'Finance',
    icon: 'fa-shield-halved',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate your target emergency safety net buffer in months of living expenses.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['emergency-fund-calculator']) {
            return window.TOOLS['emergency-fund-calculator'].calculate(v);
        }
        return errorResult('Emergency fund calculator not loaded');
    }
};

// ── 15-Year vs 30-Year Mortgage Calculator ────────────────────
export const fifteenYearMortgageCalculator = {
    id: '15-year-mortgage-calculator',
    name: '15-Year vs. 30-Year Mortgage Calculator',
    category: 'Finance',
    icon: 'fa-house-chimney',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Compare 15-year and 30-year fixed mortgages side-by-side with investment opportunity cost.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['15-year-mortgage-calculator']) {
            return window.TOOLS['15-year-mortgage-calculator'].calculate(v);
        }
        return errorResult('15-Year mortgage calculator not loaded');
    }
};

// ── Auto Loan Calculator ──────────────────────────────────────
export const autoLoanCalculator = {
    id: 'auto-loan-calculator',
    name: 'Auto Loan Calculator',
    category: 'Finance',
    icon: 'fa-car',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate monthly auto loan payments, total interest, and total purchase costs.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['auto-loan-calculator']) {
            return window.TOOLS['auto-loan-calculator'].calculate(v);
        }
        return errorResult('Auto loan calculator not loaded');
    }
};

// ── Auto Refinance Calculator ─────────────────────────────────
export const autoRefinanceCalculator = {
    id: 'auto-refinance-calculator',
    name: 'Auto Loan Refinance Calculator',
    category: 'Finance',
    icon: 'fa-arrows-rotate',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate auto loan refinance payment reduction, lifetime interest savings, and break-even point.',
    calculate(v) {
        if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS['auto-refinance-calculator']) {
            return window.TOOLS['auto-refinance-calculator'].calculate(v);
        }
        return errorResult('Auto refinance calculator not loaded');
    }
};

export const financeCalculators = [
    mortgageCalculator,
    loanCalculator,
    debtSnowballCalculator,
    refinanceCalculator,
    selfEmploymentTaxCalculator,
    retirementCalculator,
    amortizationCalculator,
    compoundInterestCalculator,
    investmentCalculator,
    fourOhOneKCalculator,
    netWorthCalculator,
    houseAffordabilityCalculator,
    emergencyFundCalculator,
    fifteenYearMortgageCalculator,
    autoLoanCalculator,
    autoRefinanceCalculator
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
