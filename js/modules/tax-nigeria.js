/**
 * Nigerian Employment Tax & Salary Calculation Engine
 *
 * Implements:
 * - Personal Income Tax Act (PITA) Cap P8 LFN 2004 (amended by Finance Acts 2019, 2020, 2021, 2023)
 * - Consolidated Relief Allowance (CRA): Higher of ₦200,000/yr (₦16,666.67/mo) or 1% of Gross, plus 20% of Gross
 * - Pension Reform Act (PRA) 2014: Mandatory 8% Employee and 10% Employer contribution
 * - National Housing Fund (NHF) Act: 2.5% of basic salary
 * - PITA Sixth Schedule 6 progressive tax brackets (7% to 24%)
 * - PITA Minimum Tax Rule (1% of Gross Income)
 *
 * Pure financial computation engine. Zero DOM side effects.
 *
 * @module modules/tax-nigeria
 */

import { roundTo } from '../utils/math.js';

/**
 * PITA Sixth Schedule Monthly Individual Tax Brackets
 * Annual equivalent:
 * First ₦300k @ 7%, Next ₦300k @ 11%, Next ₦500k @ 15%, Next ₦500k @ 19%, Next ₦1.6M @ 21%, Above ₦3.2M @ 24%
 */
export const NIGERIA_TAX_BRACKETS = [
    { min: 0, max: 25000, rate: 0.07, label: 'First ₦25,000 (7%)' },
    { min: 25000, max: 50000, rate: 0.11, label: 'Next ₦25,000 (11%)' },
    { min: 50000, max: 91666.67, rate: 0.15, label: 'Next ₦41,667 (15%)' },
    { min: 91666.67, max: 133333.33, rate: 0.19, label: 'Next ₦41,667 (19%)' },
    { min: 133333.33, max: 266666.67, rate: 0.21, label: 'Next ₦133,333 (21%)' },
    { min: 266666.67, max: Infinity, rate: 0.24, label: 'Above ₦266,667 (24%)' }
];

export const NIGERIA_STATUTORY_RATES = {
    PENSION_EMPLOYEE_RATE: 0.08, // 8% of emoluments
    PENSION_EMPLOYER_RATE: 0.10, // 10% of emoluments
    NHF_RATE: 0.025,             // 2.5% of basic salary
    CRA_FIXED_ANNUAL: 200000,
    CRA_FIXED_MONTHLY: 200000 / 12, // ₦16,666.67
    CRA_GROSS_PCT: 0.01,         // 1% of gross income
    CRA_VARIABLE_PCT: 0.20,      // 20% of gross income
    MINIMUM_TAX_RATE: 0.01,      // 1% of gross income
    MINIMUM_WAGE_MONTHLY: 70000  // National Minimum Wage (exempt from tax under Finance Act)
};

/**
 * Calculate Consolidated Relief Allowance (CRA) under PITA Section 33
 * Formula: Higher of ₦200,000 per annum (₦16,666.67/mo) or 1% of Gross, PLUS 20% of Gross
 *
 * @param {number} monthlyGross - Monthly gross income in NGN
 * @returns {number} Monthly CRA relief amount
 */
export function calculateNigeriaCRA(monthlyGross) {
    const gross = Math.max(0, Number(monthlyGross) || 0);
    if (gross <= 0) return 0;

    const baseRelief = Math.max(
        NIGERIA_STATUTORY_RATES.CRA_FIXED_MONTHLY,
        gross * NIGERIA_STATUTORY_RATES.CRA_GROSS_PCT
    );
    const variableRelief = gross * NIGERIA_STATUTORY_RATES.CRA_VARIABLE_PCT;

    return roundTo(baseRelief + variableRelief, 2);
}

/**
 * Calculate mandatory pension contributions under Pension Reform Act 2014
 * Minimum 8% employee contribution, 10% employer contribution
 *
 * @param {number} pensionableSalary - Monthly pensionable emoluments (Basic + Housing + Transport)
 * @returns {Object} { employeePension, employerPension, totalPension }
 */
export function calculateNigeriaPension(pensionableSalary) {
    const salary = Math.max(0, Number(pensionableSalary) || 0);
    const employeePension = roundTo(salary * NIGERIA_STATUTORY_RATES.PENSION_EMPLOYEE_RATE, 2);
    const employerPension = roundTo(salary * NIGERIA_STATUTORY_RATES.PENSION_EMPLOYER_RATE, 2);
    return {
        employeePension,
        employerPension,
        totalPension: roundTo(employeePension + employerPension, 2)
    };
}

/**
 * Calculate National Housing Fund (NHF) deduction
 * Statutory 2.5% of monthly basic salary
 *
 * @param {number} basicSalary - Monthly basic salary
 * @returns {number} NHF contribution in NGN
 */
export function calculateNigeriaNHF(basicSalary) {
    const basic = Math.max(0, Number(basicSalary) || 0);
    return roundTo(basic * NIGERIA_STATUTORY_RATES.NHF_RATE, 2);
}

/**
 * Calculate monthly PAYE progressive tax on Chargeable Income
 *
 * @param {number} chargeableIncome - Monthly chargeable income
 * @returns {Object} { tax, breakdown }
 */
export function calculateNigeriaPAYE(chargeableIncome) {
    const income = Math.max(0, Number(chargeableIncome) || 0);
    let tax = 0;
    const breakdown = [];

    for (const bracket of NIGERIA_TAX_BRACKETS) {
        if (income > bracket.min) {
            const sliceMax = bracket.max === Infinity ? income : Math.min(income, bracket.max);
            const taxableInBracket = roundTo(sliceMax - bracket.min, 2);
            const taxPaid = roundTo(taxableInBracket * bracket.rate, 2);

            tax += taxPaid;
            breakdown.push({
                bracket: bracket.label,
                rate: bracket.rate,
                taxableInBracket,
                taxPaid
            });
        } else {
            break;
        }
    }

    return {
        tax: roundTo(tax, 2),
        breakdown
    };
}

/**
 * Comprehensive Nigerian salary and take-home pay calculation
 *
 * @param {Object} inputs
 * @param {number} inputs.basicSalary - Monthly basic salary in NGN
 * @param {number} [inputs.housingAllowance=0] - Monthly housing allowance
 * @param {number} [inputs.transportAllowance=0] - Monthly transport allowance
 * @param {number} [inputs.otherAllowances=0] - Other cash allowances
 * @param {boolean} [inputs.deductNhf=true] - Whether to deduct 2.5% NHF
 * @param {number} [inputs.voluntaryPension=0] - Additional voluntary pension contribution (AVP)
 * @param {number} [inputs.voluntaryDeductions=0] - Other deductions (cooperative savings, staff loan)
 * @returns {Object} Comprehensive calculation result
 */
export function calculateNigeriaSalary(inputs = {}) {
    const basicSalary = Math.max(0, Number(inputs.basicSalary) || 0);
    const housingAllowance = Math.max(0, Number(inputs.housingAllowance) || 0);
    const transportAllowance = Math.max(0, Number(inputs.transportAllowance) || 0);
    const otherAllowances = Math.max(0, Number(inputs.otherAllowances) || 0);
    const deductNhf = inputs.deductNhf !== false && inputs.deductNhf !== 'no';
    const voluntaryPension = Math.max(0, Number(inputs.voluntaryPension) || 0);
    const voluntaryDeductions = Math.max(0, Number(inputs.voluntaryDeductions) || 0);

    // 1. Gross Earnings
    const grossSalary = roundTo(basicSalary + housingAllowance + transportAllowance + otherAllowances, 2);

    // 2. Pensionable Emoluments (Basic + Housing + Transport)
    const pensionableEmoluments = roundTo(basicSalary + housingAllowance + transportAllowance, 2);

    // 3. Statutory Pension (8% employee, 10% employer)
    const { employeePension: statutoryPension, employerPension } = calculateNigeriaPension(pensionableEmoluments);
    const totalEmployeePension = roundTo(statutoryPension + voluntaryPension, 2);

    // 4. National Housing Fund (2.5% of Basic)
    const nhf = deductNhf ? calculateNigeriaNHF(basicSalary) : 0;

    // 5. Consolidated Relief Allowance (CRA)
    const cra = calculateNigeriaCRA(grossSalary);

    // 6. Chargeable Income = Gross - CRA - Employee Pension - NHF
    const allowableDeductions = roundTo(totalEmployeePension + nhf, 2);
    const chargeableIncome = Math.max(0, roundTo(grossSalary - cra - allowableDeductions, 2));

    // 7. PAYE Tax Calculation with Minimum Tax Rule (1% of Gross)
    let { tax: calculatedPaye, breakdown } = calculateNigeriaPAYE(chargeableIncome);

    // Under Finance Act, workers earning national minimum wage (₦70,000) or less are exempt
    let netPaye = calculatedPaye;
    const isExemptMinimumWage = grossSalary <= NIGERIA_STATUTORY_RATES.MINIMUM_WAGE_MONTHLY;

    if (isExemptMinimumWage) {
        netPaye = 0;
    } else {
        const minimumTax = roundTo(grossSalary * NIGERIA_STATUTORY_RATES.MINIMUM_TAX_RATE, 2);
        if (netPaye < minimumTax) {
            netPaye = minimumTax;
        }
    }

    // 8. Total Employee Deductions & Net Salary
    const totalDeductions = roundTo(netPaye + totalEmployeePension + nhf + voluntaryDeductions, 2);
    const netSalary = roundTo(grossSalary - totalDeductions, 2);

    // 9. Employer Cost to Company (CTC)
    const costToEmployer = roundTo(grossSalary + employerPension, 2);

    // 10. Rates
    const effectiveTaxRate = grossSalary > 0 ? roundTo((netPaye / grossSalary) * 100, 2) : 0;
    const totalDeductionRate = grossSalary > 0 ? roundTo((totalDeductions / grossSalary) * 100, 2) : 0;

    return {
        currency: 'NGN',
        currencySymbol: '₦',
        monthly: {
            basicSalary,
            housingAllowance,
            transportAllowance,
            otherAllowances,
            grossSalary,
            pensionableEmoluments,
            cra,
            employeePension: totalEmployeePension,
            statutoryPension,
            voluntaryPension,
            employerPension,
            nhf,
            allowableDeductions,
            chargeableIncome,
            netPaye,
            voluntaryDeductions,
            totalDeductions,
            netSalary,
            costToEmployer
        },
        annual: {
            gross: roundTo(grossSalary * 12, 2),
            cra: roundTo(cra * 12, 2),
            chargeableIncome: roundTo(chargeableIncome * 12, 2),
            paye: roundTo(netPaye * 12, 2),
            employeePension: roundTo(totalEmployeePension * 12, 2),
            employerPension: roundTo(employerPension * 12, 2),
            nhf: roundTo(nhf * 12, 2),
            totalDeductions: roundTo(totalDeductions * 12, 2),
            net: roundTo(netSalary * 12, 2),
            costToEmployer: roundTo(costToEmployer * 12, 2)
        },
        rates: {
            effectiveTaxRate,
            totalDeductionRate,
            employeePensionRate: NIGERIA_STATUTORY_RATES.PENSION_EMPLOYEE_RATE * 100,
            employerPensionRate: NIGERIA_STATUTORY_RATES.PENSION_EMPLOYER_RATE * 100,
            nhfRate: NIGERIA_STATUTORY_RATES.NHF_RATE * 100
        },
        breakdown,
        metadata: {
            legalFramework: 'Personal Income Tax Act (PITA) Cap P8 LFN 2004 & Finance Acts',
            pensionFramework: 'Pension Reform Act (PRA) 2014',
            housingFramework: 'National Housing Fund (NHF) Act',
            taxAuthority: 'State Internal Revenue Service (SIRS) / FIRS',
            jurisdiction: 'NG'
        }
    };
}

/**
 * Standard tool definition for the Nigerian Salary & PAYE Tax Calculator
 * Compatible with GetCalcu tool-runner and build-seo pre-rendering pipelines.
 */
export const nigeriaSalaryCalculator = {
    id: 'salary-calculator',
    slug: 'salary-calculator/ng',
    baseSlug: 'salary-calculator',
    country: 'ng',
    countryName: 'Nigeria',
    countryFlag: '🇳🇬',
    currency: 'NGN',
    currencySymbol: '₦',
    name: 'Nigeria Salary & PAYE Tax Calculator',
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
    description: 'Calculate monthly take-home salary, PITA PAYE tax, 8% employee pension (PRA 2014), Consolidated Relief Allowance (CRA), and NHF in Nigeria.',
    metaTitle: 'Nigeria Salary & PAYE Tax Calculator 2026 | Net Pay, Pension & CRA',
    metaDescription: 'Free Nigeria salary calculator — calculate monthly net take-home pay, PITA PAYE income tax, 8% employee pension (PRA 2014), CRA relief, and NHF. Free & private.',
    keywords: [
        'nigeria salary calculator',
        'paye calculator nigeria',
        'nigeria net salary calculator',
        'pita tax calculator nigeria 2026',
        'consolidated relief allowance calculator',
        'pension calculator nigeria pra 2014',
        'lagos paye calculator',
        'nigerian payroll calculator'
    ],
    presets: [
        {
            label: 'National Minimum Wage (₦70,000)',
            values: {
                basicSalary: 45000,
                housingAllowance: 15000,
                transportAllowance: 10000,
                otherAllowances: 0,
                deductNhf: 'yes',
                voluntaryPension: 0,
                voluntaryDeductions: 0
            }
        },
        {
            label: 'Mid-Level Professional (₦350,000)',
            values: {
                basicSalary: 200000,
                housingAllowance: 90000,
                transportAllowance: 50000,
                otherAllowances: 10000,
                deductNhf: 'yes',
                voluntaryPension: 10000,
                voluntaryDeductions: 5000
            }
        },
        {
            label: 'Senior Management (₦1,200,000)',
            values: {
                basicSalary: 650000,
                housingAllowance: 350000,
                transportAllowance: 150000,
                otherAllowances: 50000,
                deductNhf: 'yes',
                voluntaryPension: 50000,
                voluntaryDeductions: 20000
            }
        }
    ],
    fields: [
        {
            id: 'basicSalary',
            label: 'Monthly Basic Salary (₦)',
            type: 'number',
            default: 200000,
            min: 0,
            step: 5000,
            hint: 'Your contractual base monthly salary in Nigerian Naira (NGN).'
        },
        {
            id: 'housingAllowance',
            label: 'Housing Allowance (₦/mo)',
            type: 'number',
            default: 90000,
            min: 0,
            step: 5000,
            hint: 'Monthly housing or rent allowance (pensionable under PRA 2014).'
        },
        {
            id: 'transportAllowance',
            label: 'Transport Allowance (₦/mo)',
            type: 'number',
            default: 50000,
            min: 0,
            step: 5000,
            hint: 'Monthly transport allowance (pensionable under PRA 2014).'
        },
        {
            id: 'otherAllowances',
            label: 'Other Allowances & Bonuses (₦/mo)',
            type: 'number',
            default: 10000,
            min: 0,
            step: 2500,
            hint: 'Additional cash allowances such as meal, utility, or performance bonuses.'
        },
        {
            id: 'deductNhf',
            label: 'National Housing Fund (NHF 2.5%)',
            type: 'select',
            default: 'yes',
            options: [
                { value: 'yes', label: 'Deduct 2.5% NHF (Standard)' },
                { value: 'no', label: 'No NHF Deduction' }
            ],
            hint: 'Statutory 2.5% deduction of basic salary for public/formal private employees.'
        },
        {
            id: 'voluntaryPension',
            label: 'Additional Voluntary Pension (₦/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 5000,
            hint: 'Voluntary tax-deductible pension contributions to your Retirement Savings Account (RSA).'
        },
        {
            id: 'voluntaryDeductions',
            label: 'Other Voluntary Deductions (₦/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 2500,
            hint: 'Personal payroll deductions such as cooperative society savings or staff loans.'
        }
    ],
    calculate(v) {
        const basicSalary = Math.max(0, Number(v.basicSalary) || 0);
        const housingAllowance = Math.max(0, Number(v.housingAllowance) || 0);
        const transportAllowance = Math.max(0, Number(v.transportAllowance) || 0);
        const otherAllowances = Math.max(0, Number(v.otherAllowances) || 0);
        const deductNhf = v.deductNhf !== 'no' && v.deductNhf !== false;
        const voluntaryPension = Math.max(0, Number(v.voluntaryPension) || 0);
        const voluntaryDeductions = Math.max(0, Number(v.voluntaryDeductions) || 0);

        if (basicSalary <= 0 && housingAllowance <= 0) {
            return {
                stats: [
                    { label: 'Net Take-Home Pay', value: '₦0.00', highlight: true }
                ],
                insight: {
                    tone: 'warning',
                    icon: 'fa-triangle-exclamation',
                    headline: 'Salary Input Required',
                    detail: 'Please enter your monthly basic salary and allowances to calculate Nigerian PAYE tax and take-home pay.'
                }
            };
        }

        const res = calculateNigeriaSalary({
            basicSalary,
            housingAllowance,
            transportAllowance,
            otherAllowances,
            deductNhf,
            voluntaryPension,
            voluntaryDeductions
        });

        const m = res.monthly;
        const fmtNaira = (n) => '₦' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const pctStr = (n) => (Number(n) || 0).toFixed(1) + '%';

        return {
            stats: [
                { label: 'Net Take-Home Pay (Monthly)', value: fmtNaira(m.netSalary), highlight: true },
                { label: 'Net Take-Home Pay (Annual)', value: fmtNaira(res.annual.net) },
                { label: 'PAYE Tax (Monthly)', value: fmtNaira(m.netPaye) },
                { label: 'Employee Pension (8%)', value: fmtNaira(m.employeePension) },
                { label: 'Employer Pension (10%)', value: fmtNaira(m.employerPension) },
                { label: 'Consolidated Relief (CRA)', value: fmtNaira(m.cra) },
                { label: 'NHF Deduction (2.5%)', value: fmtNaira(m.nhf) },
                { label: 'Gross Monthly Earnings', value: fmtNaira(m.grossSalary) },
                { label: 'Employer Total Cost (CTC)', value: fmtNaira(m.costToEmployer) },
                { label: 'Effective PAYE Tax Rate', value: pctStr(res.rates.effectiveTaxRate), warn: res.rates.effectiveTaxRate > 20 }
            ],
            insight: {
                tone: 'positive',
                icon: 'fa-shield-halved',
                headline: `Net Take-Home Pay: ${pctStr((m.netSalary / m.grossSalary) * 100)} of Gross Salary`,
                detail: `From monthly gross earnings of ${fmtNaira(m.grossSalary)}, total deductions equal ${fmtNaira(m.totalDeductions)} (${fmtNaira(m.netPaye)} PAYE tax + ${fmtNaira(m.employeePension)} pension + ${fmtNaira(m.nhf)} NHF). Net take-home pay is ${fmtNaira(m.netSalary)}.`
            },
            chart: {
                type: 'doughnut',
                labels: ['Net Take-Home Pay', 'PAYE Income Tax', 'Employee Pension (8%)', 'NHF Housing', 'Other Deductions'],
                data: [m.netSalary, m.netPaye, m.employeePension, m.nhf, m.voluntaryDeductions],
                colors: ['#10B981', '#6366F1', '#3B82F6', '#F59E0B', '#8B5CF6']
            },
            bars: [
                { label: 'Net Take-Home Pay', percent: roundTo((m.netSalary / m.grossSalary) * 100, 1), color: '#10B981' },
                { label: 'PAYE Tax', percent: roundTo((m.netPaye / m.grossSalary) * 100, 1), color: '#6366F1' },
                { label: 'Employee Pension (8%)', percent: roundTo((m.employeePension / m.grossSalary) * 100, 1), color: '#3B82F6' },
                { label: 'National Housing Fund', percent: roundTo((m.nhf / m.grossSalary) * 100, 1), color: '#F59E0B' }
            ]
        };
    },
    methodology: {
        standards: 'Personal Income Tax Act (PITA) Cap P8 LFN 2004 (as amended by Finance Acts), Pension Reform Act (PRA) 2014 & National Housing Fund (NHF) Act.',
        sources: [
            'Federal Inland Revenue Service (FIRS) PAYE Guidelines',
            'Joint Tax Board (JTB) Personal Income Tax Regulations',
            'National Pension Commission (PenCom) PRA 2014 Framework',
            'Federal Mortgage Bank of Nigeria (FMBN) NHF Guidelines'
        ],
        lastReviewed: 'October 2026',
        assumptions: [
            'Consolidated Relief Allowance (CRA) is calculated as higher of ₦200,000/yr (₦16,666.67/mo) or 1% of gross, plus 20% of gross.',
            'Pensionable emoluments consist of Basic Salary, Housing Allowance, and Transport Allowance under PRA 2014 Section 4.',
            'Minimum tax rule applies at 1% of gross income if calculated PAYE is lower, unless exempt under national minimum wage.'
        ]
    },
    article: {
        heading: 'Understanding Nigerian PAYE Tax, Pension, CRA, and Take-Home Pay',
        intro: 'In Nigeria, employment income tax is deducted at source under the Pay-As-You-Earn (PAYE) system governed by the Personal Income Tax Act (PITA) Cap P8 LFN 2004, amended by recent Finance Acts. Administered by State Internal Revenue Services (such as LIRS in Lagos, FCT-IRS in Abuja, and others), PAYE withholding is calculated after applying statutory reliefs including the Consolidated Relief Allowance (CRA) and pension contributions.',
        sections: [
            {
                heading: 'Consolidated Relief Allowance (CRA) Explained',
                body: 'Under PITA Section 33, every employee in Nigeria is entitled to a Consolidated Relief Allowance (CRA). The CRA is calculated as the higher of ₦200,000 per annum (₦16,666.67 per month) or 1% of Gross Income, plus an additional 20% of Gross Income. The CRA significantly reduces taxable income before progressive tax brackets are applied, protecting lower and middle-income earners from excessive taxation.'
            },
            {
                heading: 'Mandatory Pension Contributions (Pension Reform Act 2014)',
                body: 'The Pension Reform Act (PRA) 2014 mandates that formal sector employers with 3 or more employees contribute to a contributory pension scheme. The employee contributes a minimum of 8% of monthly pensionable emoluments (defined as Basic Salary, Housing Allowance, and Transport Allowance), while the employer contributes at least 10%. Crucially, employee pension contributions are completely tax-exempt, deducted directly from gross income before calculating chargeable pay.'
            },
            {
                heading: 'PITA Sixth Schedule Tax Brackets & Rates',
                body: 'After deducting CRA, pension contributions, and NHF from gross income, the remaining Chargeable Income is taxed across six progressive monthly brackets: the first ₦25,000 (₦300k/yr) at 7%; the next ₦25,000 (₦300k/yr) at 11%; the next ₦41,667 (₦500k/yr) at 15%; the next ₦41,667 (₦500k/yr) at 19%; the next ₦133,333 (₦1.6M/yr) at 21%; and any amount above ₦266,667 per month (₦3.2M/yr) at the top rate of 24%.'
            },
            {
                heading: 'Minimum Wage Exemption & Minimum Tax Rule',
                body: 'Under the Finance Act, employees earning the National Minimum Wage (₦70,000 per month) or less are fully exempt from personal income tax. For employees earning above the minimum wage, if the computed PAYE tax is less than 1% of gross income, a statutory Minimum Tax equal to 1% of gross income applies.'
            }
        ]
    },
    howTo: [
        'Enter your Monthly Basic Salary in Nigerian Naira (NGN).',
        'Enter your monthly Housing Allowance and Transport Allowance.',
        'Add any other regular cash allowances, bonuses, or commissions.',
        'Choose whether National Housing Fund (2.5% NHF) applies to your organization.',
        'Add optional Additional Voluntary Pension (AVP) or SACCO cooperative deductions.',
        'Review your net take-home salary, PAYE tax, 8% employee pension, and employer liabilities.'
    ],
    formula: 'Net Pay = Gross Salary − PAYE Tax − Employee Pension (8%) − NHF (2.5% Basic) − Voluntary Deductions',
    examples: [
        {
            title: 'National Minimum Wage (₦70,000 Gross)',
            input: 'Basic: ₦45k, Housing: ₦15k, Transport: ₦10k',
            result: 'Net Pay: ₦63,275.00/mo | PAYE: ₦0.00 | Pension: ₦5,600.00 | NHF: ₦1,125.00',
            explanation: 'Under the Finance Act, employees earning ₦70,000 or less are fully exempt from personal income tax. Deductions consist only of 8% pension (₦5,600) and NHF (₦1,125).'
        },
        {
            title: 'Mid-Level Professional (₦250,000 Gross)',
            input: 'Basic: ₦150k, Housing: ₦60k, Transport: ₦40k',
            result: 'Net Pay: ₦202,070.83/mo | PAYE: ₦24,179.17 | Pension: ₦20,000.00 | NHF: ₦3,750.00',
            explanation: 'CRA is ₦66,666.67. Allowable deductions total ₦23,750. Chargeable income is ₦159,583.33, producing ₦24,179.17 PAYE tax.'
        },
        {
            title: 'Senior Executive (₦800,000 Gross)',
            input: 'Basic: ₦450k, Housing: ₦220k, Transport: ₦130k',
            result: 'Net Pay: ₦615,645.83/mo | PAYE: ₦109,104.17 | Pension: ₦64,000.00 | NHF: ₦11,250.00',
            explanation: 'CRA is ₦176,666.67. Chargeable income is ₦548,083.33. Top marginal tax bracket of 24% applies to earnings above ₦266,667/mo.'
        }
    ],
    faqs: [
        {
            q: 'How is PAYE tax calculated in Nigeria in 2026?',
            a: 'PAYE in Nigeria is calculated by subtracting Consolidated Relief Allowance (CRA), 8% employee pension, and 2.5% NHF from Gross Emoluments to arrive at Chargeable Income. Progressive tax rates ranging from 7% to 24% are then applied across brackets.'
        },
        {
            q: 'What is the Consolidated Relief Allowance (CRA) in Nigeria?',
            a: 'CRA is a statutory tax relief under PITA Section 33 equal to the higher of ₦200,000 per year (₦16,666.67/mo) or 1% of Gross Income, PLUS 20% of Gross Income.'
        },
        {
            q: 'Are workers on minimum wage exempt from tax in Nigeria?',
            a: 'Yes. Under the Finance Act, individuals earning the national minimum wage (₦70,000 per month) or less are completely exempt from personal income tax and minimum tax provisions.'
        },
        {
            q: 'How is pension calculated under PRA 2014?',
            a: 'The employee contributes a minimum of 8% of monthly pensionable emoluments (Basic Salary + Housing Allowance + Transport Allowance), and the employer contributes a minimum of 10%. Employee pension contributions are 100% tax-free.'
        },
        {
            q: 'What is the National Housing Fund (NHF) in Nigeria?',
            a: 'The NHF requires employees earning above minimum wage to contribute 2.5% of their basic monthly salary to the Federal Mortgage Bank of Nigeria to qualify for low-interest residential mortgage loans.'
        }
    ]
};
