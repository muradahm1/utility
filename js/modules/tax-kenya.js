/**
 * Kenyan Employment Tax & Salary Calculation Engine
 *
 * Implements:
 * - KRA PAYE (Pay As You Earn) progressive brackets: Kenya Finance Act
 * - Statutory Personal Relief: KSh 2,400/month (KSh 28,800/year)
 * - NSSF (National Social Security Fund Act 2013): Tier I & Tier II capped contributions
 * - SHIF (Social Health Insurance Fund): 2.75% of gross income (min KSh 300)
 * - Affordable Housing Levy (Affordable Housing Act 2024): 1.5% of gross income
 * - Insurance Relief (15% of SHIF) & Housing Relief (15% of AHL)
 *
 * Pure financial computation engine. Zero DOM side effects.
 *
 * @module modules/tax-kenya
 */

import { roundTo } from '../utils/math.js';

/**
 * KRA PAYE Monthly Individual Income Tax Brackets (Finance Act)
 */
export const KENYA_TAX_BRACKETS = [
    { min: 0, max: 24000, rate: 0.10, label: 'First KSh 24,000 (10%)' },
    { min: 24000, max: 32333.33, rate: 0.25, label: 'Next KSh 8,333 (25%)' },
    { min: 32333.33, max: 500000, rate: 0.30, label: 'Next KSh 467,667 (30%)' },
    { min: 500000, max: 800000, rate: 0.325, label: 'Next KSh 300,000 (32.5%)' },
    { min: 800000, max: Infinity, rate: 0.35, label: 'Above KSh 800,000 (35%)' }
];

export const KENYA_STATUTORY_RATES = {
    PERSONAL_RELIEF_MONTHLY: 2400,
    PERSONAL_RELIEF_ANNUAL: 28800,
    NSSF_TIER_I_LIMIT: 7000,
    NSSF_TIER_II_LIMIT: 36000,
    NSSF_RATE: 0.06,
    MAX_EMPLOYEE_NSSF: 2160,
    SHIF_RATE: 0.0275,
    SHIF_MINIMUM: 300,
    HOUSING_LEVY_RATE: 0.015,
    INSURANCE_RELIEF_RATE: 0.15,
    INSURANCE_RELIEF_CAP: 5000,
    HOUSING_RELIEF_RATE: 0.15,
    HOUSING_RELIEF_CAP: 9000
};

/**
 * Calculate mandatory monthly NSSF contribution (Tier I & Tier II)
 * Under NSSF Act 2013, employee contributes 6% of pensionable earnings.
 * Tier I: 6% of earnings up to KSh 7,000 (max KSh 420)
 * Tier II: 6% of earnings between KSh 7,001 and KSh 36,000 (max KSh 1,740)
 * Maximum combined employee contribution = KSh 2,160/month
 *
 * @param {number} pensionableEarnings - Monthly pensionable earnings (Basic Salary)
 * @returns {Object} { tierI, tierII, totalEmployeeNssf, totalEmployerNssf }
 */
export function calculateKenyaNSSF(pensionableEarnings) {
    const gross = Math.max(0, Number(pensionableEarnings) || 0);
    if (gross <= 0) {
        return { tierI: 0, tierII: 0, totalEmployeeNssf: 0, totalEmployerNssf: 0 };
    }

    const tierIEarnings = Math.min(gross, KENYA_STATUTORY_RATES.NSSF_TIER_I_LIMIT);
    const tierI = roundTo(tierIEarnings * KENYA_STATUTORY_RATES.NSSF_RATE, 2);

    let tierII = 0;
    if (gross > KENYA_STATUTORY_RATES.NSSF_TIER_I_LIMIT) {
        const tierIIEarnings = Math.min(
            gross - KENYA_STATUTORY_RATES.NSSF_TIER_I_LIMIT,
            KENYA_STATUTORY_RATES.NSSF_TIER_II_LIMIT - KENYA_STATUTORY_RATES.NSSF_TIER_I_LIMIT
        );
        tierII = roundTo(tierIIEarnings * KENYA_STATUTORY_RATES.NSSF_RATE, 2);
    }

    const totalEmployeeNssf = roundTo(tierI + tierII, 2);
    const totalEmployerNssf = totalEmployeeNssf; // Employer matches 100%

    return {
        tierI,
        tierII,
        totalEmployeeNssf,
        totalEmployerNssf
    };
}

/**
 * Calculate SHIF (Social Health Insurance Fund) contribution
 * Replaced NHIF: statutory 2.75% of gross monthly salary (minimum KSh 300)
 *
 * @param {number} grossSalary - Monthly gross salary
 * @returns {number} Monthly SHIF contribution in KES
 */
export function calculateKenyaSHIF(grossSalary) {
    const gross = Math.max(0, Number(grossSalary) || 0);
    if (gross <= 0) return 0;
    const calc = gross * KENYA_STATUTORY_RATES.SHIF_RATE;
    return roundTo(Math.max(KENYA_STATUTORY_RATES.SHIF_MINIMUM, calc), 2);
}

/**
 * Calculate Affordable Housing Levy (Affordable Housing Act 2024)
 * Employee contributes 1.5% of monthly gross income (employer matches 1.5%)
 *
 * @param {number} grossSalary - Monthly gross salary
 * @returns {Object} { employeeAhl, employerAhl }
 */
export function calculateKenyaHousingLevy(grossSalary) {
    const gross = Math.max(0, Number(grossSalary) || 0);
    if (gross <= 0) return { employeeAhl: 0, employerAhl: 0 };
    const employeeAhl = roundTo(gross * KENYA_STATUTORY_RATES.HOUSING_LEVY_RATE, 2);
    const employerAhl = employeeAhl;
    return { employeeAhl, employerAhl };
}

/**
 * Calculate Gross PAYE before tax reliefs
 * Uses progressive brackets on Taxable Pay (Gross minus allowable NSSF/pension)
 *
 * @param {number} taxablePay - Taxable pay in KES
 * @returns {Object} { grossPaye, breakdown }
 */
export function calculateKenyaGrossPAYE(taxablePay) {
    const pay = Math.max(0, Number(taxablePay) || 0);
    let grossPaye = 0;
    const breakdown = [];

    let previousMax = 0;
    for (const bracket of KENYA_TAX_BRACKETS) {
        if (pay > bracket.min) {
            const sliceMax = bracket.max === Infinity ? pay : Math.min(pay, bracket.max);
            const taxableInBracket = roundTo(sliceMax - bracket.min, 2);
            const taxInBracket = roundTo(taxableInBracket * bracket.rate, 2);

            grossPaye += taxInBracket;
            breakdown.push({
                bracket: bracket.label,
                rate: bracket.rate,
                taxableInBracket,
                taxPaid: taxInBracket
            });
            previousMax = bracket.max;
        } else {
            break;
        }
    }

    return {
        grossPaye: roundTo(grossPaye, 2),
        breakdown
    };
}

/**
 * Calculate comprehensive Kenyan salary package and net take-home pay
 *
 * @param {Object} inputs
 * @param {number} inputs.basicSalary - Monthly basic salary in KES
 * @param {number} [inputs.taxableAllowance=0] - Additional taxable cash allowances
 * @param {number} [inputs.nonTaxableAllowance=0] - Statutory exempt allowances (valid per diem, medical)
 * @param {number} [inputs.voluntaryPension=0] - Voluntary pension fund contributions (tax-deductible up to KSh 20,000/mo)
 * @param {number} [inputs.voluntaryDeductions=0] - Other deductions (SACCO, bank loan repayment)
 * @returns {Object} Comprehensive calculation breakdown
 */
export function calculateKenyaSalary(inputs = {}) {
    const basicSalary = Math.max(0, Number(inputs.basicSalary) || 0);
    const taxableAllowance = Math.max(0, Number(inputs.taxableAllowance) || 0);
    const nonTaxableAllowance = Math.max(0, Number(inputs.nonTaxableAllowance) || 0);
    const voluntaryPension = Math.max(0, Number(inputs.voluntaryPension) || 0);
    const voluntaryDeductions = Math.max(0, Number(inputs.voluntaryDeductions) || 0);

    // 1. Gross Earnings
    const grossSalary = roundTo(basicSalary + taxableAllowance + nonTaxableAllowance, 2);

    // 2. Statutory NSSF (calculated on pensionable earnings: basic salary)
    const nssf = calculateKenyaNSSF(basicSalary);
    const employeeNssf = nssf.totalEmployeeNssf;
    const employerNssf = nssf.totalEmployerNssf;

    // 3. Tax Allowable Deductions: NSSF + Voluntary Pension (capped at KSh 20,000/mo combined)
    const allowablePensionDeduction = Math.min(20000, roundTo(employeeNssf + voluntaryPension, 2));

    // 4. Taxable Pay = Basic + Taxable Allowances - Allowable Pension Deductions
    const totalTaxableEarnings = roundTo(basicSalary + taxableAllowance, 2);
    const taxablePay = Math.max(0, roundTo(totalTaxableEarnings - allowablePensionDeduction, 2));

    // 5. Gross PAYE
    const { grossPaye, breakdown } = calculateKenyaGrossPAYE(taxablePay);

    // 6. Statutory Health (SHIF) & Affordable Housing Levy (AHL)
    const shif = calculateKenyaSHIF(grossSalary);
    const { employeeAhl, employerAhl } = calculateKenyaHousingLevy(grossSalary);

    // 7. Tax Reliefs
    const personalRelief = KENYA_STATUTORY_RATES.PERSONAL_RELIEF_MONTHLY;
    const insuranceRelief = Math.min(
        KENYA_STATUTORY_RATES.INSURANCE_RELIEF_CAP,
        roundTo(shif * KENYA_STATUTORY_RATES.INSURANCE_RELIEF_RATE, 2)
    );
    const housingRelief = Math.min(
        KENYA_STATUTORY_RATES.HOUSING_RELIEF_CAP,
        roundTo(employeeAhl * KENYA_STATUTORY_RATES.HOUSING_RELIEF_RATE, 2)
    );
    const totalReliefs = roundTo(personalRelief + insuranceRelief + housingRelief, 2);

    // 8. Net PAYE (Tax Payable after reliefs, min 0)
    const netPaye = Math.max(0, roundTo(grossPaye - totalReliefs, 2));

    // 9. Total Employee Deductions & Net Salary
    const totalDeductions = roundTo(
        netPaye + employeeNssf + shif + employeeAhl + voluntaryPension + voluntaryDeductions,
        2
    );
    const netSalary = roundTo(grossSalary - totalDeductions, 2);

    // 10. Employer Total Liability (Cost to Company - CTC)
    const costToEmployer = roundTo(grossSalary + employerNssf + employerAhl, 2);

    // 11. Rates & Percentages
    const effectiveTaxRate = grossSalary > 0 ? roundTo((netPaye / grossSalary) * 100, 2) : 0;
    const totalDeductionRate = grossSalary > 0 ? roundTo((totalDeductions / grossSalary) * 100, 2) : 0;

    return {
        currency: 'KES',
        currencySymbol: 'KSh',
        monthly: {
            basicSalary,
            taxableAllowance,
            nonTaxableAllowance,
            grossSalary,
            taxablePay,
            grossPaye,
            personalRelief,
            insuranceRelief,
            housingRelief,
            totalReliefs,
            netPaye,
            employeeNssf,
            employerNssf,
            shif,
            employeeAhl,
            employerAhl,
            voluntaryPension,
            voluntaryDeductions,
            totalDeductions,
            netSalary,
            costToEmployer
        },
        annual: {
            gross: roundTo(grossSalary * 12, 2),
            taxablePay: roundTo(taxablePay * 12, 2),
            netPaye: roundTo(netPaye * 12, 2),
            nssf: roundTo(employeeNssf * 12, 2),
            shif: roundTo(shif * 12, 2),
            housingLevy: roundTo(employeeAhl * 12, 2),
            totalDeductions: roundTo(totalDeductions * 12, 2),
            net: roundTo(netSalary * 12, 2),
            costToEmployer: roundTo(costToEmployer * 12, 2)
        },
        rates: {
            effectiveTaxRate,
            totalDeductionRate,
            shifRate: KENYA_STATUTORY_RATES.SHIF_RATE * 100,
            housingLevyRate: KENYA_STATUTORY_RATES.HOUSING_LEVY_RATE * 100,
            nssfRate: KENYA_STATUTORY_RATES.NSSF_RATE * 100
        },
        breakdown,
        metadata: {
            legalFramework: 'Kenya Finance Act & Income Tax Act (Cap. 470)',
            pensionFramework: 'NSSF Act No. 45 of 2013 (Tier I & Tier II)',
            healthFramework: 'Social Health Insurance Act (SHIF) 2023',
            housingFramework: 'Affordable Housing Act 2024',
            taxAuthority: 'Kenya Revenue Authority (KRA)',
            jurisdiction: 'KE'
        }
    };
}

/**
 * Standard tool definition for the Kenyan Salary & PAYE Tax Calculator
 * Compatible with GetCalcu tool-runner and build-seo pre-rendering pipelines.
 */
export const kenyaSalaryCalculator = {
    id: 'salary-calculator',
    slug: 'salary-calculator/ke',
    baseSlug: 'salary-calculator',
    country: 'ke',
    countryName: 'Kenya',
    countryFlag: '🇰🇪',
    currency: 'KES',
    currencySymbol: 'KSh',
    name: 'Kenya Salary & PAYE Tax Calculator',
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
    description: 'Calculate monthly take-home pay, KRA PAYE tax, NSSF Tier I & II, SHIF health insurance, and Affordable Housing Levy in Kenya.',
    metaTitle: 'Kenya Salary & PAYE Calculator 2026 | KRA Net Pay, NSSF & SHIF',
    metaDescription: 'Free Kenya salary calculator — calculate monthly net take-home pay, KRA PAYE tax brackets, NSSF Tier I & II, SHIF (2.75%), and Housing Levy (1.5%). Accurate & instant.',
    keywords: [
        'kenya salary calculator',
        'kra paye calculator',
        'kenya net salary calculator',
        'paye calculator kenya 2026',
        'shif calculator kenya',
        'nssf tier 1 and tier 2 calculator',
        'housing levy calculator kenya',
        'nairobi payroll calculator'
    ],
    presets: [
        {
            label: 'Minimum Wage / Entry (KSh 24,000)',
            values: {
                basicSalary: 24000,
                taxableAllowance: 0,
                nonTaxableAllowance: 0,
                voluntaryPension: 0,
                voluntaryDeductions: 0
            }
        },
        {
            label: 'Mid-Level Professional (KSh 80,000)',
            values: {
                basicSalary: 70000,
                taxableAllowance: 10000,
                nonTaxableAllowance: 5000,
                voluntaryPension: 3000,
                voluntaryDeductions: 2000
            }
        },
        {
            label: 'Senior Management (KSh 250,000)',
            values: {
                basicSalary: 200000,
                taxableAllowance: 50000,
                nonTaxableAllowance: 15000,
                voluntaryPension: 10000,
                voluntaryDeductions: 5000
            }
        }
    ],
    fields: [
        {
            id: 'basicSalary',
            label: 'Monthly Basic Salary (KSh)',
            type: 'number',
            default: 80000,
            min: 0,
            step: 1000,
            hint: 'Your contractual monthly base salary in Kenya Shillings (KES).'
        },
        {
            id: 'taxableAllowance',
            label: 'Taxable Allowances (KSh/mo)',
            type: 'number',
            default: 10000,
            min: 0,
            step: 500,
            hint: 'Taxable cash allowances such as overtime, performance bonus, and telephone stipend.'
        },
        {
            id: 'nonTaxableAllowance',
            label: 'Non-Taxable Allowances (KSh/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 500,
            hint: 'Statutory exempt allowances (e.g. valid per diems or exempt travel reimbursement).'
        },
        {
            id: 'voluntaryPension',
            label: 'Voluntary Pension Contribution (KSh/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 500,
            hint: 'Tax-deductible registered pension or provident fund contributions (up to KSh 20,000/mo).'
        },
        {
            id: 'voluntaryDeductions',
            label: 'Other Voluntary Deductions (KSh/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 500,
            hint: 'Personal payroll deductions such as SACCO contributions, staff loans, or insurance.'
        }
    ],
    calculate(v) {
        const basicSalary = Math.max(0, Number(v.basicSalary) || 0);
        const taxableAllowance = Math.max(0, Number(v.taxableAllowance) || 0);
        const nonTaxableAllowance = Math.max(0, Number(v.nonTaxableAllowance) || 0);
        const voluntaryPension = Math.max(0, Number(v.voluntaryPension) || 0);
        const voluntaryDeductions = Math.max(0, Number(v.voluntaryDeductions) || 0);

        if (basicSalary <= 0 && taxableAllowance <= 0) {
            return {
                stats: [
                    { label: 'Net Take-Home Pay', value: 'KSh 0.00', highlight: true }
                ],
                insight: {
                    tone: 'warning',
                    icon: 'fa-triangle-exclamation',
                    headline: 'Salary Input Required',
                    detail: 'Please enter your monthly basic salary to calculate Kenyan PAYE tax, NSSF, SHIF, and net pay.'
                }
            };
        }

        const res = calculateKenyaSalary({
            basicSalary,
            taxableAllowance,
            nonTaxableAllowance,
            voluntaryPension,
            voluntaryDeductions
        });

        const m = res.monthly;
        const fmtKsh = (n) => 'KSh ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const pctStr = (n) => (Number(n) || 0).toFixed(1) + '%';

        return {
            stats: [
                { label: 'Net Take-Home Pay (Monthly)', value: fmtKsh(m.netSalary), highlight: true },
                { label: 'Net Take-Home Pay (Annual)', value: fmtKsh(res.annual.net) },
                { label: 'PAYE Tax (Net Tax Payable)', value: fmtKsh(m.netPaye) },
                { label: 'NSSF Employee Contribution', value: fmtKsh(m.employeeNssf) },
                { label: 'SHIF (Health 2.75%)', value: fmtKsh(m.shif) },
                { label: 'Affordable Housing Levy (1.5%)', value: fmtKsh(m.employeeAhl) },
                { label: 'Total Statutory Reliefs', value: fmtKsh(m.totalReliefs) },
                { label: 'Gross Monthly Earnings', value: fmtKsh(m.grossSalary) },
                { label: 'Employer Total Cost (CTC)', value: fmtKsh(m.costToEmployer) },
                { label: 'Effective PAYE Tax Rate', value: pctStr(res.rates.effectiveTaxRate), warn: res.rates.effectiveTaxRate > 25 }
            ],
            insight: {
                tone: 'positive',
                icon: 'fa-shield-halved',
                headline: `Net Take-Home Pay: ${pctStr((m.netSalary / m.grossSalary) * 100)} of Gross Salary`,
                detail: `From monthly gross earnings of ${fmtKsh(m.grossSalary)}, total deductions equal ${fmtKsh(m.totalDeductions)} (${fmtKsh(m.netPaye)} PAYE + ${fmtKsh(m.employeeNssf)} NSSF + ${fmtKsh(m.shif)} SHIF + ${fmtKsh(m.employeeAhl)} Housing Levy). Net take-home pay is ${fmtKsh(m.netSalary)}.`
            },
            chart: {
                type: 'doughnut',
                labels: ['Net Take-Home Pay', 'KRA PAYE Tax', 'NSSF Pension', 'SHIF Health', 'Housing Levy', 'Other Deductions'],
                data: [m.netSalary, m.netPaye, m.employeeNssf, m.shif, m.employeeAhl, m.voluntaryDeductions + m.voluntaryPension],
                colors: ['#10B981', '#6366F1', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6']
            },
            bars: [
                { label: 'Net Take-Home Pay', percent: roundTo((m.netSalary / m.grossSalary) * 100, 1), color: '#10B981' },
                { label: 'PAYE Tax', percent: roundTo((m.netPaye / m.grossSalary) * 100, 1), color: '#6366F1' },
                { label: 'Statutory Health (SHIF)', percent: roundTo((m.shif / m.grossSalary) * 100, 1), color: '#EC4899' },
                { label: 'NSSF Pension', percent: roundTo((m.employeeNssf / m.grossSalary) * 100, 1), color: '#3B82F6' },
                { label: 'Housing Levy (AHL)', percent: roundTo((m.employeeAhl / m.grossSalary) * 100, 1), color: '#F59E0B' }
            ]
        };
    },
    methodology: {
        standards: 'Kenya Revenue Authority (KRA) Income Tax Act (Cap. 470), Finance Act, NSSF Act 2013, SHIF Act 2023 & Affordable Housing Act 2024.',
        sources: [
            'Kenya Revenue Authority (KRA) PAYE Regulations',
            'National Social Security Fund (NSSF Act 2013)',
            'Social Health Authority (SHIF Guidelines)',
            'Affordable Housing Act 2024'
        ],
        lastReviewed: 'October 2026',
        assumptions: [
            'Employee receives standard personal relief of KSh 2,400 per month.',
            'NSSF Tier I and Tier II contributions are deducted from gross earnings before calculating taxable pay.',
            'SHIF (2.75%) qualifies for 15% Insurance Relief; Affordable Housing Levy (1.5%) qualifies for 15% Housing Relief.'
        ]
    },
    article: {
        heading: 'Complete Guide to Kenya PAYE, NSSF, SHIF, and Housing Levy Deductions',
        intro: 'In Kenya, payroll calculations are governed by the Income Tax Act (Cap. 470) administered by the Kenya Revenue Authority (KRA), alongside statutory contributions under the NSSF Act 2013, the Social Health Insurance Act (SHIF) 2023, and the Affordable Housing Act 2024. This comprehensive guide explains how gross earnings are converted into net take-home pay, how tax relief offsets liability, and what employers must contribute.',
        sections: [
            {
                heading: 'KRA PAYE Tax Brackets (Finance Act)',
                body: 'Kenya utilizes a progressive individual income tax schedule. Monthly taxable pay up to KSh 24,000 is taxed at 10%. The next KSh 8,333 (between KSh 24,001 and KSh 32,333) is taxed at 25%. Earnings between KSh 32,334 and KSh 500,000 are taxed at 30%, while earnings between KSh 500,001 and KSh 800,000 attract a 32.5% rate. Any taxable income exceeding KSh 800,000 per month is taxed at the top marginal rate of 35%.'
            },
            {
                heading: 'Personal Relief and Tax Reliefs Explained',
                body: 'Every Kenyan resident employee is entitled to a statutory Personal Relief of KSh 2,400 per month (KSh 28,800 per year). As a result, individuals earning KSh 24,000 or less pay zero PAYE tax, as their gross tax (10% of KSh 24,000 = KSh 2,400) is fully wiped out by the relief. Additionally, employees receive an Insurance Relief equal to 15% of their monthly SHIF contribution (capped at KSh 5,000/mo) and an Affordable Housing Relief equal to 15% of their Housing Levy contribution (capped at KSh 9,000/mo).'
            },
            {
                heading: 'NSSF Pension Contributions (Tier I and Tier II)',
                body: 'Under the NSSF Act No. 45 of 2013, statutory pension contributions are split into two tiers based on pensionable earnings. Tier I applies to earnings up to the Lower Earnings Limit (LEL) of KSh 7,000, resulting in a 6% employee contribution of KSh 420. Tier II applies to earnings between KSh 7,001 and the Upper Earnings Limit (UEL) of KSh 36,000, resulting in a maximum contribution of KSh 1,740. Total employee NSSF contribution is capped at KSh 2,160 per month, which the employer matches shilling for shilling. Crucially, employee NSSF contributions are fully tax-allowable, reducing your taxable pay.'
            },
            {
                heading: 'SHIF Health Insurance and Affordable Housing Levy',
                body: 'The Social Health Insurance Fund (SHIF) replaced the former NHIF flat-rate schedule with a universal proportional contribution of 2.75% of gross monthly salary, with a statutory minimum contribution of KSh 300. The Affordable Housing Levy (AHL) requires employees to contribute 1.5% of gross monthly salary, matched by an equal 1.5% employer contribution. Both contributions generate 15% tax reliefs that directly reduce monthly PAYE tax liability.'
            }
        ]
    },
    howTo: [
        'Enter your Monthly Basic Salary in Kenya Shillings (KES).',
        'Add any monthly Taxable Cash Allowances (such as transport, communication, or bonus).',
        'Add any Non-Taxable Allowances that qualify for statutory exemptions under KRA rules.',
        'Enter voluntary contributions to registered pension schemes (tax-deductible up to KSh 20,000/mo).',
        'Enter personal deductions such as SACCO shares, bank loans, or benevolent funds.',
        'Instantly review your net take-home salary, PAYE tax, NSSF, SHIF, Housing Levy, and employer liabilities.'
    ],
    formula: 'Net Pay = Gross Salary − Net PAYE (Gross Tax − Reliefs) − NSSF − SHIF − Housing Levy − Voluntary Deductions',
    examples: [
        {
            title: 'Entry-Level Worker (KSh 24,000 Gross)',
            input: 'Basic Salary: KSh 24,000, Zero Allowances',
            result: 'Net Pay: KSh 20,950.00/mo | PAYE: KSh 0.00 | NSSF: KSh 1,440.00 | SHIF: KSh 660.00 | AHL: KSh 360.00',
            explanation: 'Taxable pay is KSh 22,560 after NSSF. Gross PAYE is KSh 2,256, which is completely erased by the KSh 2,400 personal relief. PAYE payable is KSh 0.'
        },
        {
            title: 'Middle-Income Professional (KSh 80,000 Gross)',
            input: 'Basic Salary: KSh 70,000, Taxable Allowance: KSh 10,000',
            result: 'Net Pay: KSh 62,378.42/mo | PAYE: KSh 12,061.58 | NSSF: KSh 2,160.00 | SHIF: KSh 2,200.00 | AHL: KSh 1,200.00',
            explanation: 'Gross salary is KSh 80,000. Employee NSSF reaches the KSh 2,160 cap. SHIF is KSh 2,200 (2.75%) and Housing Levy is KSh 1,200 (1.5%). Reliefs total KSh 2,910, reducing gross PAYE to KSh 12,061.58.'
        },
        {
            title: 'Executive Salary (KSh 250,000 Gross)',
            input: 'Basic Salary: KSh 200,000, Taxable Allowance: KSh 50,000',
            result: 'Net Pay: KSh 176,143.42/mo | PAYE: KSh 60,331.58 | NSSF: KSh 2,160.00 | SHIF: KSh 6,875.00 | AHL: KSh 3,750.00',
            explanation: 'Taxable pay is KSh 247,840. Marginal tax is 30%. With SHIF (KSh 6,875) and Housing Levy (KSh 3,750) providing reliefs, total take-home pay is KSh 176,143.42.'
        }
    ],
    faqs: [
        {
            q: 'How is PAYE calculated in Kenya in 2026?',
            a: 'KRA PAYE is calculated on monthly taxable pay (Gross earnings minus allowable NSSF and pension deductions). Progressive rates of 10%, 25%, 30%, 32.5%, and 35% are applied across brackets. Personal relief (KSh 2,400/mo), insurance relief (15% of SHIF), and housing relief (15% of Housing Levy) are subtracted to determine final tax payable.'
        },
        {
            q: 'What is the minimum taxable salary in Kenya?',
            a: 'Employees earning KSh 24,000 or less per month pay zero PAYE tax because the tax generated in the 10% bracket (KSh 2,400) is completely offset by the statutory KSh 2,400 personal relief.'
        },
        {
            q: 'How much is deducted for SHIF in Kenya?',
            a: 'Under the Social Health Insurance Act 2023, SHIF deduction is 2.75% of your gross monthly salary, with a statutory minimum contribution of KSh 300 per month. There is no upper salary cap.'
        },
        {
            q: 'How much is the Affordable Housing Levy in Kenya?',
            a: 'Under the Affordable Housing Act 2024, employees contribute 1.5% of their gross monthly salary, and employers match an additional 1.5%. Employees receive a 15% Affordable Housing Relief that offsets their PAYE tax.'
        },
        {
            q: 'What is the maximum NSSF contribution in Kenya in 2026?',
            a: 'Under NSSF Act 2013, Tier I is 6% of earnings up to KSh 7,000 (KSh 420), and Tier II is 6% of earnings between KSh 7,001 and KSh 36,000 (KSh 1,740). The maximum combined employee NSSF contribution is KSh 2,160 per month, matched equally by the employer.'
        }
    ]
};
