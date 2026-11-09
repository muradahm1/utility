/**
 * Ethiopian Employment Tax & Salary Calculation Engine
 *
 * Implements:
 * - Schedule 'A' Employment Income Tax:
 *   - Active: Income Tax (Amendment) Proclamation No. 1395/2025 (Federal Negarit Gazette Sept 1, 2025)
 *   - Historical: Federal Income Tax Proclamation No. 979/2016
 * - Mandatory Employee Pension (7%): Private Organisations Employees' Pension Proclamation No. 1268/2022
 * - Mandatory Employer Pension (11%): Private Organisations Employees' Pension Proclamation No. 1268/2022
 * - Transport Allowance Exemption: Council of Ministers Regulation No. 410/2017 & Directive No. 21/2001
 *
 * Pure financial computation engine. Zero DOM side effects.
 *
 * @module modules/tax-ethiopia
 */

import { roundTo } from '../utils/math.js';

/**
 * Multi-year Schedule 'A' progressive tax schedules
 */
export const ETHIOPIA_TAX_SCHEDULES = {
    '2025': {
        name: 'Income Tax (Amendment) Proclamation No. 1395/2025',
        effectiveDate: '2025-09-01',
        description: 'Enacted Sept 1, 2025. Tax-free threshold raised to 2,000 ETB; 10% bracket eliminated; 6 progressive tiers.',
        brackets: [
            { min: 0, max: 2000, rate: 0.00, deduction: 0, label: '0 – 2,000 ETB (0%)' },
            { min: 2000, max: 4000, rate: 0.15, deduction: 300, label: '2,001 – 4,000 ETB (15%)' },
            { min: 4000, max: 7000, rate: 0.20, deduction: 500, label: '4,001 – 7,000 ETB (20%)' },
            { min: 7000, max: 10000, rate: 0.25, deduction: 850, label: '7,001 – 10,000 ETB (25%)' },
            { min: 10000, max: 14000, rate: 0.30, deduction: 1350, label: '10,001 – 14,000 ETB (30%)' },
            { min: 14000, max: Infinity, rate: 0.35, deduction: 2050, label: 'Over 14,000 ETB (35%)' }
        ]
    },
    '2016': {
        name: 'Federal Income Tax Proclamation No. 979/2016',
        effectiveDate: '2016-07-08',
        description: 'Historical schedule applicable through August 2025. Tax-free threshold 600 ETB; 7 progressive tiers.',
        brackets: [
            { min: 0, max: 600, rate: 0.00, deduction: 0, label: '0 – 600 ETB (0%)' },
            { min: 600, max: 1650, rate: 0.10, deduction: 60, label: '601 – 1,650 ETB (10%)' },
            { min: 1650, max: 3200, rate: 0.15, deduction: 142.50, label: '1,651 – 3,200 ETB (15%)' },
            { min: 3200, max: 5250, rate: 0.20, deduction: 302.50, label: '3,201 – 5,250 ETB (20%)' },
            { min: 5250, max: 7800, rate: 0.25, deduction: 565, label: '5,251 – 7,800 ETB (25%)' },
            { min: 7800, max: 10900, rate: 0.30, deduction: 955, label: '7,801 – 10,900 ETB (30%)' },
            { min: 10900, max: Infinity, rate: 0.35, deduction: 1500, label: 'Over 10,900 ETB (35%)' }
        ]
    }
};

/** Active default brackets (Proclamation No. 1395/2025) */
export const ETHIOPIA_TAX_BRACKETS = ETHIOPIA_TAX_SCHEDULES['2025'].brackets;
export const ETHIOPIA_TAX_BRACKETS_2025 = ETHIOPIA_TAX_SCHEDULES['2025'].brackets;
export const ETHIOPIA_TAX_BRACKETS_2016 = ETHIOPIA_TAX_SCHEDULES['2016'].brackets;

export const PENSION_RATES = {
    EMPLOYEE: 0.07, // 7% of basic salary (Proc. 1268/2022)
    EMPLOYER: 0.11  // 11% of basic salary (Proc. 1268/2022)
};

/**
 * Statutory transport allowance exempt ceiling (Council of Ministers Reg. 410/2017 & Directive 21/2001)
 * Up to 1/4 of basic salary or 2,200 ETB/month, whichever is lower.
 */
export const TRANSPORT_ALLOWANCE_CAP = 2200;

/**
 * Calculate Ethiopian Monthly Income Tax under specified statutory schedule
 * @param {number} taxableIncome - Monthly taxable income in ETB
 * @param {string} [taxYear='2025'] - Tax year or schedule identifier ('2025' or '2016')
 * @returns {number} Tax amount in ETB rounded to 2 decimal places
 */
export function calculateEthiopianTax(taxableIncome, taxYear = '2025') {
    const income = Math.max(0, Number(taxableIncome) || 0);
    const schedule = ETHIOPIA_TAX_SCHEDULES[taxYear] || ETHIOPIA_TAX_SCHEDULES['2025'];
    const brackets = schedule.brackets;

    const zeroThreshold = brackets[0].max;
    if (income <= zeroThreshold) return 0;

    const bracket = brackets.find(b => income > b.min && income <= b.max)
        || brackets[brackets.length - 1];

    const tax = (income * bracket.rate) - bracket.deduction;
    return roundTo(Math.max(0, tax), 2);
}

/**
 * Generate bracket-by-bracket progressive tax breakdown
 * @param {number} taxableIncome - Monthly taxable income in ETB
 * @param {string} [taxYear='2025'] - Tax year or schedule identifier
 * @returns {Array<Object>} Breakdown of each bracket
 */
export function getTaxBracketBreakdown(taxableIncome, taxYear = '2025') {
    const income = Math.max(0, Number(taxableIncome) || 0);
    const schedule = ETHIOPIA_TAX_SCHEDULES[taxYear] || ETHIOPIA_TAX_SCHEDULES['2025'];
    const brackets = schedule.brackets;

    return brackets.map(bracket => {
        if (income <= bracket.min) {
            return {
                bracket: bracket.label,
                rate: bracket.rate,
                taxableInBracket: 0,
                taxPaid: 0
            };
        }
        const sliceMax = bracket.max === Infinity ? income : Math.min(income, bracket.max);
        const taxableInBracket = roundTo(sliceMax - bracket.min, 2);
        const taxPaid = roundTo(taxableInBracket * bracket.rate, 2);

        return {
            bracket: bracket.label,
            rate: bracket.rate,
            taxableInBracket,
            taxPaid
        };
    }).filter(row => row.taxableInBracket > 0);
}

/**
 * Calculate full Ethiopian salary package and take-home pay
 * @param {Object} inputs
 * @param {number} inputs.basicSalary - Monthly basic salary in ETB (required)
 * @param {number} [inputs.taxableAllowance=0] - Additional taxable allowances (mobile, representation, performance)
 * @param {number} [inputs.nonTaxableAllowance=0] - Statutory exempt allowances (transport up to 2,200 ETB, hardship)
 * @param {number} [inputs.voluntaryDeductions=0] - Other payroll deductions (credit union, insurance, loan repayments)
 * @param {boolean} [inputs.exemptFromPension=false] - If employee is exempt from statutory pension
 * @param {string} [inputs.taxYear='2025'] - Tax year / legal framework ('2025' or '2016')
 * @returns {Object} Comprehensive calculation result
 */
export function calculateEthiopianSalary(inputs = {}) {
    const basicSalary = Math.max(0, Number(inputs.basicSalary) || 0);
    const taxableAllowance = Math.max(0, Number(inputs.taxableAllowance) || 0);
    const nonTaxableAllowance = Math.max(0, Number(inputs.nonTaxableAllowance) || 0);
    const voluntaryDeductions = Math.max(0, Number(inputs.voluntaryDeductions) || 0);
    const exemptFromPension = Boolean(inputs.exemptFromPension);
    const taxYear = inputs.taxYear === '2016' ? '2016' : '2025';

    // 1. Gross Earnings
    const grossSalary = roundTo(basicSalary + taxableAllowance + nonTaxableAllowance, 2);

    // 2. Taxable Income (Basic Salary + Taxable Allowances)
    const taxableIncome = roundTo(basicSalary + taxableAllowance, 2);

    // 3. Statutory Deductions
    const incomeTax = calculateEthiopianTax(taxableIncome, taxYear);
    const employeePension = exemptFromPension ? 0 : roundTo(basicSalary * PENSION_RATES.EMPLOYEE, 2);
    const employerPension = exemptFromPension ? 0 : roundTo(basicSalary * PENSION_RATES.EMPLOYER, 2);
    const totalPensionContribution = roundTo(employeePension + employerPension, 2);

    // 4. Net Take-Home Pay
    const totalDeductions = roundTo(incomeTax + employeePension + voluntaryDeductions, 2);
    const netSalary = roundTo(grossSalary - totalDeductions, 2);

    // 5. Total Employer Cost (CTC)
    const costToEmployer = roundTo(grossSalary + employerPension, 2);

    // 6. Annualized Figures
    const annualGross = roundTo(grossSalary * 12, 2);
    const annualTax = roundTo(incomeTax * 12, 2);
    const annualPensionEmployee = roundTo(employeePension * 12, 2);
    const annualPensionEmployer = roundTo(employerPension * 12, 2);
    const annualNet = roundTo(netSalary * 12, 2);
    const annualEmployerCost = roundTo(costToEmployer * 12, 2);

    // 7. Ratios & Percentages
    const effectiveTaxRate = taxableIncome > 0 ? roundTo((incomeTax / taxableIncome) * 100, 2) : 0;
    const totalDeductionRate = grossSalary > 0 ? roundTo((totalDeductions / grossSalary) * 100, 2) : 0;

    return {
        currency: 'ETB',
        currencySymbol: 'Br',
        monthly: {
            basicSalary,
            taxableAllowance,
            nonTaxableAllowance,
            grossSalary,
            taxableIncome,
            incomeTax,
            employeePension,
            employerPension,
            totalPensionContribution,
            voluntaryDeductions,
            totalDeductions,
            netSalary,
            costToEmployer
        },
        annual: {
            gross: annualGross,
            tax: annualTax,
            employeePension: annualPensionEmployee,
            employerPension: annualPensionEmployer,
            net: annualNet,
            costToEmployer: annualEmployerCost
        },
        rates: {
            effectiveTaxRate,
            totalDeductionRate,
            employeePensionRate: PENSION_RATES.EMPLOYEE * 100,
            employerPensionRate: PENSION_RATES.EMPLOYER * 100
        },
        breakdown: getTaxBracketBreakdown(taxableIncome, taxYear),
        metadata: {
            taxYear,
            legalFramework: taxYear === '2016'
                ? 'Federal Income Tax Proclamation No. 979/2016'
                : 'Income Tax (Amendment) Proclamation No. 1395/2025 (amending Proc. 979/2016)',
            pensionFramework: 'Private Organisations Employees\' Pension Proclamation No. 1268/2022',
            transportAllowanceFramework: 'Council of Ministers Regulation No. 410/2017 & Directive No. 21/2001 (max 2,200 ETB/mo)',
            lastVerified: '2026-10-16',
            jurisdiction: 'ET'
        }
    };
}

/**
 * Standard tool definition for the Ethiopian Salary & Tax Calculator
 * Compatible with GetCalcu tool-runner and build-seo pre-rendering pipelines.
 */
export const ethiopiaSalaryCalculator = {
    id: 'salary-calculator',
    slug: 'salary-calculator/et',
    baseSlug: 'salary-calculator',
    country: 'et',
    countryName: 'Ethiopia',
    countryFlag: '🇪🇹',
    currency: 'ETB',
    currencySymbol: 'Br',
    name: 'Ethiopia Salary & Tax Calculator',
    related: [
        'self-employment-tax-calculator',
        'freelance-hourly-rate-calculator',
        'budget-planner',
        'emergency-fund-calculator'
    ],
    category: 'Finance',
    icon: 'fa-wallet',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    description: 'Calculate monthly net take-home salary, Schedule A employment income tax under Proclamation No. 1395/2025, and mandatory 7% employee & 11% employer pension (Proc. 1268/2022) in Ethiopia.',
    metaTitle: 'Ethiopia Salary & Income Tax Calculator 2026 | Net Pay & Pension (Proc. 1395/2025)',
    metaDescription: 'Free Ethiopian salary & income tax calculator updated for Proclamation No. 1395/2025. Calculate monthly net pay, Schedule A tax, and 7% pension contributions (Proc. 1268/2022).',
    keywords: [
        'ethiopia salary calculator',
        'ethiopian tax calculator',
        'ethiopia net pay calculator',
        'ethiopian income tax proclamation 1395/2025',
        'ethiopian tax proclamation 979/2016',
        'ethiopia pension calculator proclamation 1268/2022',
        'addis ababa salary calculator',
        'ethiopian payroll calculator'
    ],
    presets: [
        {
            label: 'Entry Level (8,000 ETB)',
            values: {
                basicSalary: 8000,
                taxableAllowance: 1000,
                nonTaxableAllowance: 500,
                voluntaryDeductions: 0,
                exemptFromPension: 'no',
                taxYear: '2025'
            }
        },
        {
            label: 'Mid-Level Professional (25,000 ETB)',
            values: {
                basicSalary: 25000,
                taxableAllowance: 5000,
                nonTaxableAllowance: 1500,
                voluntaryDeductions: 500,
                exemptFromPension: 'no',
                taxYear: '2025'
            }
        },
        {
            label: 'Senior / Executive (75,000 ETB)',
            values: {
                basicSalary: 75000,
                taxableAllowance: 15000,
                nonTaxableAllowance: 3000,
                voluntaryDeductions: 1000,
                exemptFromPension: 'no',
                taxYear: '2025'
            }
        }
    ],
    fields: [
        {
            id: 'basicSalary',
            label: 'Monthly Basic Salary (Br)',
            type: 'number',
            default: 25000,
            min: 0,
            step: 500,
            hint: 'Contractual monthly base salary in Ethiopian Birr (ETB) before allowances.'
        },
        {
            id: 'taxableAllowance',
            label: 'Taxable Allowances (Br/mo)',
            type: 'number',
            default: 3000,
            min: 0,
            step: 250,
            hint: 'Taxable allowances: mobile, representation, or performance bonuses.'
        },
        {
            id: 'nonTaxableAllowance',
            label: 'Non-Taxable Allowances (Br/mo)',
            type: 'number',
            default: 1000,
            min: 0,
            step: 100,
            hint: 'Exempt allowances under Council of Ministers Reg. 410/2017 & Directive 21/2001 (e.g. transport up to 2,200 ETB, hardship).'
        },
        {
            id: 'voluntaryDeductions',
            label: 'Other Voluntary Deductions (Br/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 100,
            hint: 'Personal payroll deductions: employee loans, credit union savings, or edir.'
        },
        {
            id: 'exemptFromPension',
            label: 'Statutory Pension Exemption',
            type: 'select',
            default: 'no',
            options: [
                { value: 'no', label: 'Mandatory Pension Covered (Standard)' },
                { value: 'yes', label: 'Exempt from Pension' }
            ],
            hint: 'Private Organisations Employees Pension Proclamation No. 1268/2022 (7% employee, 11% employer).'
        },
        {
            id: 'taxYear',
            label: 'Tax Year / Legal Schedule',
            type: 'select',
            default: '2025',
            options: [
                { value: '2025', label: 'Active Schedule (Proclamation No. 1395/2025 — 2,000 ETB Tax-Free)' },
                { value: '2016', label: 'Historical Schedule (Proclamation No. 979/2016 — 600 ETB Tax-Free)' }
            ],
            hint: 'Select 2025 for active payroll under Proclamation No. 1395/2025, or 2016 for historical reconciliations.'
        }
    ],
    calculate(v) {
        const basicSalary = Math.max(0, Number(v.basicSalary) || 0);
        const taxableAllowance = Math.max(0, Number(v.taxableAllowance) || 0);
        const nonTaxableAllowance = Math.max(0, Number(v.nonTaxableAllowance) || 0);
        const voluntaryDeductions = Math.max(0, Number(v.voluntaryDeductions) || 0);
        const exemptFromPension = v.exemptFromPension === 'yes' || v.exemptFromPension === true;
        const taxYear = v.taxYear === '2016' ? '2016' : '2025';

        if (basicSalary <= 0 && taxableAllowance <= 0) {
            return {
                stats: [
                    { label: 'Take-Home Pay (Monthly)', value: 'Br 0.00', highlight: true }
                ],
                insight: {
                    tone: 'warning',
                    icon: 'fa-triangle-exclamation',
                    headline: 'Input Required',
                    detail: 'Please enter your monthly basic salary to calculate Ethiopian tax and take-home pay.'
                }
            };
        }

        const res = calculateEthiopianSalary({
            basicSalary,
            taxableAllowance,
            nonTaxableAllowance,
            voluntaryDeductions,
            exemptFromPension,
            taxYear
        });

        const m = res.monthly;
        const fmtBr = (n) => 'Br ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const pctStr = (n) => (Number(n) || 0).toFixed(1) + '%';

        const scheduleLabel = taxYear === '2025' ? 'Proc. 1395/2025' : 'Proc. 979/2016';

        return {
            stats: [
                { label: 'Take-Home Pay (Monthly)', value: fmtBr(m.netSalary), highlight: true },
                { label: 'Take-Home Pay (Annual)', value: fmtBr(res.annual.net) },
                { label: `Income Tax (${scheduleLabel})`, value: fmtBr(m.incomeTax) },
                { label: 'Employee Pension (7%)', value: fmtBr(m.employeePension) },
                { label: 'Employer Pension (11%)', value: fmtBr(m.employerPension) },
                { label: 'Total Employer Cost (CTC)', value: fmtBr(m.costToEmployer) },
                { label: 'Effective Tax Rate', value: pctStr(res.rates.effectiveTaxRate), warn: res.rates.effectiveTaxRate > 25 },
                { label: 'Gross Monthly Salary', value: fmtBr(m.grossSalary) },
            ],
            insight: {
                tone: 'positive',
                icon: 'fa-shield-halved',
                headline: `Net Take-Home Pay: ${pctStr((m.netSalary / m.grossSalary) * 100)} of Gross Earnings`,
                detail: `From monthly gross earnings of ${fmtBr(m.grossSalary)}, total deductions equal ${fmtBr(m.totalDeductions)} (${fmtBr(m.incomeTax)} income tax [${scheduleLabel}] + ${fmtBr(m.employeePension)} employee pension [Proc. 1268/2022]). Net take-home pay is ${fmtBr(m.netSalary)}.`
            },
            chart: {
                type: 'doughnut',
                labels: ['Net Take-Home Pay', 'Employment Tax (Schedule A)', 'Employee Pension (7%)', 'Other Deductions'],
                data: [m.netSalary, m.incomeTax, m.employeePension, m.voluntaryDeductions],
                colors: ['#10B981', '#6366F1', '#3B82F6', '#F59E0B']
            },
            bars: [
                { label: 'Net Take-Home Pay', percent: roundTo((m.netSalary / m.grossSalary) * 100, 1), color: '#10B981' },
                { label: 'Income Tax', percent: roundTo((m.incomeTax / m.grossSalary) * 100, 1), color: '#6366F1' },
                { label: 'Employee Pension', percent: roundTo((m.employeePension / m.grossSalary) * 100, 1), color: '#3B82F6' }
            ]
        };
    },
    methodology: {
        standards: 'Federal Income Tax Proclamation No. 979/2016 (as amended by Income Tax Amendment Proclamation No. 1395/2025), Private Organisations Employees\' Pension Proclamation No. 1268/2022, and Council of Ministers Regulation No. 410/2017.',
        sources: [
            'Federal Negarit Gazette — Proclamation No. 1395/2025 (Income Tax Amendment)',
            'Federal Negarit Gazette — Proclamation No. 1268/2022 (Private Organisations Employees\' Pension)',
            'Federal Negarit Gazette — Proclamation No. 979/2016 (Federal Income Tax)',
            'Ministry of Revenues (Ethiopia) Directives & Council of Ministers Regulation No. 410/2017'
        ],
        lastReviewed: 'October 2026',
        assumptions: [
            'Basic salary is the sole legal basis for mandatory 7% employee and 11% employer pension contributions under Proclamation No. 1268/2022.',
            'Schedule A progressive rates apply to total monthly taxable income (basic salary plus taxable allowances) with statutory deductibles under Proclamation No. 1395/2025 (or Proclamation 979/2016 if selected).',
            'Non-taxable allowances conform to Ministry of Revenues thresholds (e.g., transport allowance up to 1/4 basic salary or 2,200 ETB/mo under Regulation No. 410/2017 & Directive No. 21/2001) and are exempt from income tax.'
        ]
    },
    article: {
        heading: 'How Ethiopian Employment Income Tax & Pension Contributions Are Calculated',
        intro: 'Ethiopian payroll calculations are governed by federal statutes enacted by the House of Peoples\' Representatives: the Income Tax (Amendment) Proclamation No. 1395/2025 (which updated Schedule "A" employment income tax from Proclamation No. 979/2016), the Private Organisations Employees\' Pension Proclamation No. 1268/2022 (which repealed and replaced Proclamation No. 715/2011), and Council of Ministers Regulation No. 410/2017 governing exempt allowances.',
        sections: [
            {
                heading: 'Schedule \'A\' Progressive Income Tax Brackets (Proclamation No. 1395/2025)',
                body: 'Under Proclamation No. 1395/2025 (effective September 1, 2025), the tax-free personal exemption was increased from 600 ETB to 2,000 ETB per month, and the former 10% bracket was eliminated. Taxable income is taxed in six progressive bands: 0 to 2,000 ETB (0%); 2,001 to 4,000 ETB (15% minus 300 ETB constant); 4,001 to 7,000 ETB (20% minus 500 ETB constant); 7,001 to 10,000 ETB (25% minus 850 ETB constant); 10,001 to 14,000 ETB (30% minus 1,350 ETB constant); and exceeding 14,000 ETB (35% minus 2,050 ETB constant). Historical calculations under Proclamation No. 979/2016 remain supported for prior fiscal periods.'
            },
            {
                heading: 'Mandatory Pension Scheme (Proclamation No. 1268/2022)',
                body: 'Private organization employees and civil servants participate in mandatory defined-benefit social pension schemes. Under Proclamation No. 1268/2022 (replacing Proclamation 715/2011), employees contribute 7% of their Basic Salary each month via payroll withholding. Simultaneously, employers contribute an additional 11% of the employee\'s Basic Salary from company funds. Crucially, statutory pension contributions are computed strictly on Basic Salary—allowances (such as transport, housing, or performance bonuses) are excluded from the pension base.'
            },
            {
                heading: 'Taxable vs. Non-Taxable Allowances & Transport Exemption Limits',
                body: 'Gross compensation in Ethiopia often includes various allowances. Taxable allowances (such as representation allowances, communication/mobile allowances, and performance stipends) are added directly to basic salary to establish Monthly Taxable Income. Non-taxable allowances—including qualified transport allowances up to the legal statutory cap (the lesser of 1/4 of basic salary or 2,200 ETB/mo under Council of Ministers Regulation No. 410/2017 & Directive No. 21/2001), valid hardship/desert allowances, and legally exempt per diems—are paid out in gross compensation but excluded from taxable income, significantly increasing net take-home pay.'
            },
            {
                heading: 'Total Employer Cost of Employment (Cost-to-Company)',
                body: 'From an employer perspective, an employee\'s total monthly cost consists of their gross salary plus the mandatory 11% employer pension contribution. When budgeting for new hires in Addis Ababa and across Ethiopia, human resource departments and business owners calculate total Cost to Company (CTC = Gross Salary + 11% Employer Pension) to assess true payroll liabilities.'
            }
        ]
    },
    howTo: [
        'Enter your contractual Monthly Basic Salary in Ethiopian Birr (ETB).',
        'Add any monthly Taxable Allowances (such as mobile, representation, or performance bonuses).',
        'Enter any Non-Taxable Allowances (such as qualified transport up to 2,200 ETB under Reg. 410/2017 or hardship allowance).',
        'Enter any voluntary payroll deductions, such as credit union loans, saving associations, or insurance.',
        'Select the applicable legal schedule: Active (Proclamation No. 1395/2025) or Historical (Proclamation No. 979/2016).',
        'Review your monthly and annual take-home salary, Schedule A income tax, employee pension (7%), and employer pension (11%).'
    ],
    formula: 'Net Pay = Gross Salary − Income Tax (Proc. 1395/2025) − Employee Pension (7% Basic, Proc. 1268/2022) − Deductions',
    examples: [
        {
            title: 'Entry Level Salary (Br 8,000 Basic) — 2025/2026 Active Law',
            input: 'Basic: 8,000 ETB, Taxable Allowance: 1,000 ETB, Non-Taxable: 500 ETB',
            result: 'Net Pay: Br 7,540.00/mo | Tax: Br 1,400.00 | Pension: Br 560.00 (7%)',
            explanation: 'Taxable income is 9,000 ETB (in the 25% bracket under Proc. 1395/2025: 9,000 * 0.25 - 850 = 1,400 ETB). Employee pension is 7% of 8,000 = 560 ETB. Gross is 9,500 ETB, leaving 7,540 ETB net take-home pay (saving 345 ETB/mo vs old 2016 law).'
        },
        {
            title: 'Mid-Level Professional (Br 25,000 Basic) — 2025/2026 Active Law',
            input: 'Basic: 25,000 ETB, Taxable Allowance: 5,000 ETB, Non-Taxable: 1,500 ETB, Voluntary Deductions: 500 ETB',
            result: 'Net Pay: Br 20,800.00/mo | Tax: Br 8,450.00 | Pension: Br 1,750.00 (7%)',
            explanation: 'Taxable income is 30,000 ETB (in the 35% bracket: 30,000 * 0.35 - 2,050 = 8,450 ETB). Employee pension is 7% of 25,000 = 1,750 ETB. Gross is 31,500 ETB, resulting in 20,800 ETB net pay.'
        },
        {
            title: 'Senior Executive (Br 75,000 Basic) — 2025/2026 Active Law',
            input: 'Basic: 75,000 ETB, Taxable Allowance: 15,000 ETB, Non-Taxable: 3,000 ETB, Voluntary Deductions: 1,000 ETB',
            result: 'Net Pay: Br 57,300.00/mo | Tax: Br 29,450.00 | Pension: Br 5,250.00 (7%)',
            explanation: 'Taxable income is 90,000 ETB (35% bracket: 90,000 * 0.35 - 2,050 = 29,450 ETB). Employee pension is 7% of 75,000 = 5,250 ETB. Gross is 93,000 ETB, producing 57,300 ETB net pay.'
        }
    ],
    faqs: [
        {
            q: 'How is Ethiopian employment income tax calculated under Proclamation No. 1395/2025?',
            a: 'Under Income Tax (Amendment) Proclamation No. 1395/2025, employment income is calculated on progressive monthly tiers. The first 2,000 ETB is 0% tax-free. Subsequent income is taxed at 15% (2,001–4,000 ETB, deduction 300), 20% (4,001–7,000 ETB, deduction 500), 25% (7,001–10,000 ETB, deduction 850), 30% (10,001–14,000 ETB, deduction 1,350), and 35% over 14,000 ETB (deduction 2,050).'
        },
        {
            q: 'What is the statutory basis for employee and employer pension in Ethiopia?',
            a: 'Under Private Organisations Employees\' Pension Proclamation No. 1268/2022 (which replaced Proclamation No. 715/2011), the employee contributes 7% and the employer contributes 11% calculated strictly on Basic Salary only. Allowances are excluded from the pension base.'
        },
        {
            q: 'What is the maximum non-taxable transport allowance in Ethiopia?',
            a: 'Under Council of Ministers Regulation No. 410/2017 and Ministry of Revenues Directive No. 21/2001, transport allowances are tax-exempt up to 1/4 of an employee\'s monthly basic salary, capped at a maximum of 2,200 ETB per month. Any excess is treated as taxable employment income.'
        },
        {
            q: 'Can I still calculate tax under the old Proclamation No. 979/2016 schedule?',
            a: 'Yes. GetCalcu preserves full multi-year support. Simply select "Historical Schedule (Proclamation No. 979/2016)" from the Legal Schedule dropdown to calculate payroll for periods prior to September 2025.'
        },
        {
            q: 'How do the deduction constants work in Proclamation No. 1395/2025?',
            a: 'The deduction constant simplifies progressive tax calculation. Instead of computing each bracket tranche individually, multiply total taxable income by the top marginal rate and subtract the constant: 15% bracket (subtract 300), 20% (subtract 500), 25% (subtract 850), 30% (subtract 1,350), and 35% (subtract 2,050).'
        }
    ]
};
