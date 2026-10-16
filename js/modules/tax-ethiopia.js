/**
 * Ethiopian Employment Tax & Salary Calculation Engine
 *
 * Implements:
 * - Schedule 'A' Employment Income Tax: Federal Income Tax Proclamation No. 979/2016
 * - Mandatory Employee Pension (7%): Private Organisations Employees' Pension Proclamation No. 715/2011
 * - Mandatory Employer Pension (11%): Private Organisations Employees' Pension Proclamation No. 715/2011
 *
 * Pure financial computation engine. Zero DOM side effects.
 *
 * @module modules/tax-ethiopia
 */

import { roundTo } from '../utils/math.js';

/**
 * Official progressive tax brackets under Proclamation No. 979/2016 (Schedule 'A')
 */
export const ETHIOPIA_TAX_BRACKETS = [
    { min: 0, max: 600, rate: 0.00, deduction: 0, label: '0 – 600 ETB (0%)' },
    { min: 600, max: 1650, rate: 0.10, deduction: 60, label: '601 – 1,650 ETB (10%)' },
    { min: 1650, max: 3200, rate: 0.15, deduction: 142.50, label: '1,651 – 3,200 ETB (15%)' },
    { min: 3200, max: 5250, rate: 0.20, deduction: 302.50, label: '3,201 – 5,250 ETB (20%)' },
    { min: 5250, max: 7800, rate: 0.25, deduction: 565, label: '5,251 – 7,800 ETB (25%)' },
    { min: 7800, max: 10900, rate: 0.30, deduction: 955, label: '7,801 – 10,900 ETB (30%)' },
    { min: 10900, max: Infinity, rate: 0.35, deduction: 1500, label: 'Over 10,900 ETB (35%)' }
];

export const PENSION_RATES = {
    EMPLOYEE: 0.07, // 7% of basic salary
    EMPLOYER: 0.11  // 11% of basic salary
};

/**
 * Calculate Ethiopian Monthly Income Tax using Proclamation 979/2016
 * @param {number} taxableIncome - Monthly taxable income in ETB
 * @returns {number} Tax amount in ETB rounded to 2 decimal places
 */
export function calculateEthiopianTax(taxableIncome) {
    const income = Math.max(0, Number(taxableIncome) || 0);
    if (income <= 600) return 0;

    const bracket = ETHIOPIA_TAX_BRACKETS.find(b => income > b.min && income <= b.max) 
        || ETHIOPIA_TAX_BRACKETS[ETHIOPIA_TAX_BRACKETS.length - 1];

    const tax = (income * bracket.rate) - bracket.deduction;
    return roundTo(Math.max(0, tax), 2);
}

/**
 * Generate bracket-by-bracket progressive tax breakdown
 * @param {number} taxableIncome - Monthly taxable income in ETB
 * @returns {Array<Object>} Breakdown of each bracket
 */
export function getTaxBracketBreakdown(taxableIncome) {
    const income = Math.max(0, Number(taxableIncome) || 0);
    return ETHIOPIA_TAX_BRACKETS.map(bracket => {
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
 * @param {number} [inputs.taxableAllowance=0] - Additional taxable allowances (transport, mobile, performance)
 * @param {number} [inputs.nonTaxableAllowance=0] - Statutory exempt allowances (hardship, meal up to legal threshold)
 * @param {number} [inputs.voluntaryDeductions=0] - Other payroll deductions (credit union, insurance, loan repayments)
 * @param {boolean} [inputs.exemptFromPension=false] - If employee is exempt from statutory pension (rare)
 * @returns {Object} Comprehensive calculation result
 */
export function calculateEthiopianSalary(inputs = {}) {
    const basicSalary = Math.max(0, Number(inputs.basicSalary) || 0);
    const taxableAllowance = Math.max(0, Number(inputs.taxableAllowance) || 0);
    const nonTaxableAllowance = Math.max(0, Number(inputs.nonTaxableAllowance) || 0);
    const voluntaryDeductions = Math.max(0, Number(inputs.voluntaryDeductions) || 0);
    const exemptFromPension = Boolean(inputs.exemptFromPension);

    // 1. Gross Earnings
    const grossSalary = roundTo(basicSalary + taxableAllowance + nonTaxableAllowance, 2);

    // 2. Taxable Income (Basic Salary + Taxable Allowances)
    const taxableIncome = roundTo(basicSalary + taxableAllowance, 2);

    // 3. Statutory Deductions
    const incomeTax = calculateEthiopianTax(taxableIncome);
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
        breakdown: getTaxBracketBreakdown(taxableIncome),
        metadata: {
            legalFramework: 'Federal Income Tax Proclamation No. 979/2016',
            pensionFramework: 'Private Organisations Employees Pension Proclamation No. 715/2011',
            lastVerified: '2026-10-15',
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
    description: 'Calculate monthly net take-home salary, Schedule A income tax (Proclamation 979/2016), and 7% employee & 11% employer pension in Ethiopia.',
    metaTitle: 'Ethiopia Salary & Income Tax Calculator 2026 | Net Pay & Pension (Proc. 979/2016)',
    metaDescription: 'Free Ethiopian salary & income tax calculator. Calculate monthly net pay, Proclamation No. 979/2016 Schedule A income tax, and 7% pension contributions.',
    keywords: [
        'ethiopia salary calculator',
        'ethiopian tax calculator',
        'ethiopia net pay calculator',
        'ethiopian income tax proclamation 979/2016',
        'ethiopia pension calculator',
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
                exemptFromPension: 'no'
            }
        },
        {
            label: 'Mid-Level Professional (25,000 ETB)',
            values: {
                basicSalary: 25000,
                taxableAllowance: 5000,
                nonTaxableAllowance: 1500,
                voluntaryDeductions: 500,
                exemptFromPension: 'no'
            }
        },
        {
            label: 'Senior / Executive (75,000 ETB)',
            values: {
                basicSalary: 75000,
                taxableAllowance: 15000,
                nonTaxableAllowance: 3000,
                voluntaryDeductions: 1000,
                exemptFromPension: 'no'
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
            hint: 'Taxable allowances: transport, mobile, representation, or performance bonuses.'
        },
        {
            id: 'nonTaxableAllowance',
            label: 'Non-Taxable Allowances (Br/mo)',
            type: 'number',
            default: 1000,
            min: 0,
            step: 100,
            hint: 'Statutory non-taxable allowances (e.g. qualified hardship or exempt transport).'
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
            hint: 'Private Organisations Employees Pension Proclamation No. 715/2011 (7% employee, 11% employer).'
        }
    ],
    calculate(v) {
        const basicSalary = Math.max(0, Number(v.basicSalary) || 0);
        const taxableAllowance = Math.max(0, Number(v.taxableAllowance) || 0);
        const nonTaxableAllowance = Math.max(0, Number(v.nonTaxableAllowance) || 0);
        const voluntaryDeductions = Math.max(0, Number(v.voluntaryDeductions) || 0);
        const exemptFromPension = v.exemptFromPension === 'yes' || v.exemptFromPension === true;

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
            exemptFromPension
        });

        const m = res.monthly;
        const fmtBr = (n) => 'Br ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const pctStr = (n) => (Number(n) || 0).toFixed(1) + '%';

        return {
            stats: [
                { label: 'Take-Home Pay (Monthly)', value: fmtBr(m.netSalary), highlight: true },
                { label: 'Take-Home Pay (Annual)', value: fmtBr(res.annual.net) },
                { label: 'Income Tax (Schedule \'A\')', value: fmtBr(m.incomeTax) },
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
                detail: `From monthly gross earnings of ${fmtBr(m.grossSalary)}, total deductions equal ${fmtBr(m.totalDeductions)} (${fmtBr(m.incomeTax)} income tax + ${fmtBr(m.employeePension)} employee pension). Net take-home pay is ${fmtBr(m.netSalary)}.`
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
        standards: 'Federal Income Tax Proclamation No. 979/2016 (Schedule A) & Private Organisations Employees Pension Proclamation No. 715/2011.',
        sources: [
            'Ministry of Revenues (Ethiopia)',
            'Federal Income Tax Proclamation No. 979/2016',
            'Private Organisations Employees Pension Proclamation No. 715/2011'
        ],
        lastReviewed: 'October 2026',
        assumptions: [
            'Basic salary is the sole legal basis for mandatory 7% employee and 11% employer pension contributions.',
            'Schedule A progressive rates apply to total monthly taxable income (basic salary plus taxable allowances) with statutory deductibles.',
            'Non-taxable allowances conform to Ministry of Revenues thresholds and are exempt from income tax.'
        ]
    },
    article: {
        heading: 'How Ethiopian Employment Income Tax & Pension Contributions Are Calculated',
        intro: 'Ethiopian payroll calculations are governed primarily by two federal statutes: the Federal Income Tax Proclamation No. 979/2016 (which governs Schedule "A" employment income tax) and the Private Organisations Employees\' Pension Proclamation No. 715/2011 (which governs statutory pension withholdings). Understanding how taxable allowances, non-taxable allowances, and statutory deduction constants interact is essential for employees and employers alike.',
        sections: [
            {
                heading: 'Schedule \'A\' Progressive Income Tax Brackets (Proclamation No. 979/2016)',
                body: 'Employment income in Ethiopia is taxed on a progressive monthly schedule divided into seven distinct tiers. The first 600 ETB of monthly taxable income is completely tax-exempt (0%). Income between 601 and 1,650 ETB is taxed at 10% (minus a constant deduction of 60 ETB). As income increases, marginal rates rise to 15% (1,651–3,200 ETB, deduction 142.50 ETB), 20% (3,201–5,250 ETB, deduction 302.50 ETB), 25% (5,251–7,800 ETB, deduction 565 ETB), 30% (7,801–10,900 ETB, deduction 955 ETB), reaching a top marginal rate of 35% on income exceeding 10,900 ETB (deduction 1,500 ETB).'
            },
            {
                heading: 'Mandatory Pension Scheme (Proclamation No. 715/2011)',
                body: 'Private organization employees and civil servants participate in mandatory defined-benefit social pension schemes. Under Proclamation 715/2011, employees contribute 7% of their Basic Salary each month via payroll withholding. Simultaneously, employers contribute an additional 11% of the employee\'s Basic Salary from company funds. Crucially, statutory pension contributions are computed strictly on Basic Salary—allowances (such as transport, housing, or performance bonuses) are excluded from the pension base.'
            },
            {
                heading: 'Taxable vs. Non-Taxable Allowances',
                body: 'Gross compensation in Ethiopia often includes various allowances. Taxable allowances (such as representation allowances, communication/mobile allowances, and performance stipends) are added directly to basic salary to establish Monthly Taxable Income. Non-taxable allowances—including qualified transport allowances up to statutory limits, valid hardship/desert allowances, and legally exempt per diems—are paid out in gross compensation but excluded from taxable income, significantly increasing net take-home pay.'
            },
            {
                heading: 'Total Employer Cost of Employment (Cost-to-Company)',
                body: 'From an employer perspective, an employee\'s total monthly cost consists of their gross salary plus the mandatory 11% employer pension contribution. When budgeting for new hires in Addis Ababa and across Ethiopia, human resource departments and business owners calculate total Cost to Company (CTC = Gross Salary + 11% Employer Pension) to assess true payroll liabilities.'
            }
        ]
    },
    howTo: [
        'Enter your contractual Monthly Basic Salary in Ethiopian Birr (ETB).',
        'Add any monthly Taxable Allowances (such as transport, representation, or fuel stipends).',
        'Enter any Non-Taxable Allowances that qualify for statutory exemptions under Ministry of Revenues rules.',
        'Enter any voluntary payroll deductions, such as credit union loans, saving associations, or insurance.',
        'Review your monthly and annual take-home salary, income tax under Schedule A, employee pension (7%), and employer pension (11%).'
    ],
    formula: 'Net Pay = Gross Salary − Income Tax (Proc. 979/2016) − Employee Pension (7% Basic) − Deductions',
    examples: [
        {
            title: 'Entry Level Salary (Br 8,000 Basic)',
            input: 'Basic: 8,000 ETB, Taxable Allowance: 1,000 ETB, Non-Taxable: 500 ETB',
            result: 'Net Pay: Br 7,205.00/mo | Tax: Br 1,745.00 | Pension: Br 560.00 (7%)',
            explanation: 'Taxable income is 9,000 ETB (in the 30% bracket: 9,000 * 0.30 - 955 = 1,745 ETB). Employee pension is 7% of 8,000 = 560 ETB. Gross is 9,500 ETB, leaving 7,205 ETB net pay.'
        },
        {
            title: 'Mid-Level Professional (Br 25,000 Basic)',
            input: 'Basic: 25,000 ETB, Taxable Allowance: 5,000 ETB, Non-Taxable: 1,500 ETB',
            result: 'Net Pay: Br 22,250.00/mo | Tax: Br 9,000.00 | Pension: Br 1,750.00 (7%)',
            explanation: 'Taxable income is 30,000 ETB (in the 35% bracket: 30,000 * 0.35 - 1,500 = 9,000 ETB). Employee pension is 7% of 25,000 = 1,750 ETB. Gross is 31,500 ETB, resulting in 22,250 ETB net pay.'
        },
        {
            title: 'Senior Executive (Br 75,000 Basic)',
            input: 'Basic: 75,000 ETB, Taxable Allowance: 15,000 ETB, Non-Taxable: 3,000 ETB',
            result: 'Net Pay: Br 62,750.00/mo | Tax: Br 30,000.00 | Pension: Br 5,250.00 (7%)',
            explanation: 'Taxable income is 90,000 ETB (35% bracket: 90,000 * 0.35 - 1,500 = 30,000 ETB). Employee pension is 7% of 75,000 = 5,250 ETB. Gross is 93,000 ETB, producing 62,750 ETB net pay.'
        }
    ],
    faqs: [
        {
            q: 'How is Ethiopian employment income tax calculated?',
            a: 'Ethiopian employment income tax is calculated on Schedule A progressive monthly brackets under Federal Income Tax Proclamation No. 979/2016. Monthly taxable income up to 600 ETB is exempt (0%), while income above 10,900 ETB is taxed at 35% with statutory bracket deductions applied.'
        },
        {
            q: 'Is pension calculated on basic salary or gross salary in Ethiopia?',
            a: 'Under Private Organisations Employees Pension Proclamation No. 715/2011, both employee pension (7%) and employer pension (11%) are strictly calculated on Basic Salary only. Allowances such as transport, representation, and bonuses are excluded from the pension base.'
        },
        {
            q: 'What is the difference between taxable and non-taxable allowances in Ethiopia?',
            a: 'Taxable allowances (representation, phone, performance) are added to basic salary to determine taxable income. Non-taxable allowances (exempt transport allowances up to the legal cap, hardship allowances) are paid directly to the employee without income tax or pension deductions.'
        },
        {
            q: 'How much does an employer contribute to pension in Ethiopia?',
            a: 'The employer contributes 11% of the employee\'s basic salary to the Private Organisations Employees\' Pension Fund (POEPF) or Public Servants\' Pension Fund. This is an employer liability and is not deducted from the employee\'s salary.'
        },
        {
            q: 'What is the statutory deduction constant in Proclamation 979/2016?',
            a: 'The deduction constant simplifies bracket math. Instead of calculating each slice separately, you multiply total taxable income by the top marginal rate and subtract the constant: 10% bracket (subtract 60), 15% (subtract 142.50), 20% (subtract 302.50), 25% (subtract 565), 30% (subtract 955), and 35% (subtract 1,500).'
        }
    ]
};
