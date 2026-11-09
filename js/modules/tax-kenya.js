/**
 * Kenyan Employment Tax & Salary Calculation Engine
 *
 * Implements:
 * - KRA PAYE (Pay As You Earn) progressive brackets: Kenya Income Tax Act (Cap. 470)
 * - Statutory Personal Relief: KSh 2,400/month (KSh 28,800/year)
 * - NSSF (National Social Security Fund Act 2013, Third Schedule):
 *   - Year 4 (Active Feb 2026 – Jan 2027): Tier I KSh 9,000 (cap KSh 540), Tier II KSh 108,000 (cap KSh 5,940), Total cap KSh 6,480
 *   - Year 3 (Historical Feb 2025 – Jan 2026): Tier I KSh 8,000 (cap KSh 480), Tier II KSh 72,000 (cap KSh 3,840), Total cap KSh 4,320
 *   - Year 2 (Historical Feb 2024 – Jan 2025): Tier I KSh 7,000 (cap KSh 420), Tier II KSh 36,000 (cap KSh 1,740), Total cap KSh 2,160
 * - SHIF (Social Health Insurance Act 2023): 2.75% of gross income (minimum KSh 300)
 * - Affordable Housing Levy (Affordable Housing Act 2024): 1.5% of gross income
 * - Tax Laws (Amendment) Act 2024 Statutory Sequence: NSSF, SHIF, and Housing Levy are allowable pre-tax deductions against gross employment income to arrive at Taxable Pay before PAYE bands are applied.
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

/**
 * Multi-year NSSF statutory schedules under NSSF Act 2013 Third Schedule
 */
export const KENYA_NSSF_SCHEDULES = {
    year4: {
        id: 'year4',
        name: 'Year 4 (Effective Feb 2026 – Active)',
        tierILimit: 9000,
        tierIILimit: 108000,
        rate: 0.06,
        maxTierI: 540,
        maxTierII: 5940,
        maxTotal: 6480
    },
    year3: {
        id: 'year3',
        name: 'Year 3 (Feb 2025 – Jan 2026)',
        tierILimit: 8000,
        tierIILimit: 72000,
        rate: 0.06,
        maxTierI: 480,
        maxTierII: 3840,
        maxTotal: 4320
    },
    year2: {
        id: 'year2',
        name: 'Year 2 (Feb 2024 – Jan 2025)',
        tierILimit: 7000,
        tierIILimit: 36000,
        rate: 0.06,
        maxTierI: 420,
        maxTierII: 1740,
        maxTotal: 2160
    }
};

export const KENYA_STATUTORY_RATES = {
    PERSONAL_RELIEF_MONTHLY: 2400,
    PERSONAL_RELIEF_ANNUAL: 28800,
    SHIF_RATE: 0.0275,
    SHIF_MINIMUM: 300,
    HOUSING_LEVY_RATE: 0.015,
    INSURANCE_RELIEF_RATE: 0.15,
    INSURANCE_RELIEF_CAP: 5000,
    HOUSING_RELIEF_RATE: 0.15,
    HOUSING_RELIEF_CAP: 9000,
    PENSION_DEDUCTION_CAP: 20000,
    // Active default NSSF rates (Year 4)
    NSSF_TIER_I_LIMIT: KENYA_NSSF_SCHEDULES.year4.tierILimit,
    NSSF_TIER_II_LIMIT: KENYA_NSSF_SCHEDULES.year4.tierIILimit,
    NSSF_RATE: KENYA_NSSF_SCHEDULES.year4.rate,
    MAX_EMPLOYEE_NSSF: KENYA_NSSF_SCHEDULES.year4.maxTotal
};

/**
 * Calculate mandatory monthly NSSF contribution (Tier I & Tier II)
 *
 * @param {number} pensionableEarnings - Monthly pensionable earnings (Basic Salary)
 * @param {string} [scheduleKey='year4'] - NSSF schedule ('year4', 'year3', or 'year2')
 * @returns {Object} { tierI, tierII, totalEmployeeNssf, totalEmployerNssf, schedule }
 */
export function calculateKenyaNSSF(pensionableEarnings, scheduleKey = 'year4') {
    const gross = Math.max(0, Number(pensionableEarnings) || 0);
    const sched = KENYA_NSSF_SCHEDULES[scheduleKey] || KENYA_NSSF_SCHEDULES.year4;

    if (gross <= 0) {
        return { tierI: 0, tierII: 0, totalEmployeeNssf: 0, totalEmployerNssf: 0, schedule: sched.name };
    }

    const tierIEarnings = Math.min(gross, sched.tierILimit);
    const tierI = roundTo(tierIEarnings * sched.rate, 2);

    let tierII = 0;
    if (gross > sched.tierILimit) {
        const tierIIEarnings = Math.min(
            gross - sched.tierILimit,
            sched.tierIILimit - sched.tierILimit
        );
        tierII = roundTo(tierIIEarnings * sched.rate, 2);
    }

    const totalEmployeeNssf = roundTo(tierI + tierII, 2);
    const totalEmployerNssf = totalEmployeeNssf; // Employer matches 100%

    return {
        tierI,
        tierII,
        totalEmployeeNssf,
        totalEmployerNssf,
        schedule: sched.name
    };
}

/**
 * Calculate SHIF (Social Health Insurance Fund) contribution
 * 2.75% of gross monthly salary (minimum KSh 300)
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
 * Uses progressive brackets on Taxable Pay
 *
 * @param {number} taxablePay - Taxable pay in KES
 * @returns {Object} { grossPaye, breakdown }
 */
export function calculateKenyaGrossPAYE(taxablePay) {
    const pay = Math.max(0, Number(taxablePay) || 0);
    let grossPaye = 0;
    const breakdown = [];

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
 * @param {number} [inputs.nonTaxableAllowance=0] - Statutory exempt allowances
 * @param {number} [inputs.voluntaryPension=0] - Voluntary pension contributions (tax-deductible up to KSh 20,000/mo)
 * @param {number} [inputs.voluntaryDeductions=0] - Other deductions (SACCO, bank loan)
 * @param {string} [inputs.nssfSchedule='year4'] - NSSF schedule ('year4', 'year3', or 'year2')
 * @param {string} [inputs.framework='2025_2026'] - Legal framework: '2025_2026' (Tax Laws Amendment Act 2024: NSSF, SHIF, AHL allowable pre-tax deductions) or '2024_PRE_AMENDMENT' (historical reliefs)
 * @returns {Object} Comprehensive calculation breakdown
 */
export function calculateKenyaSalary(inputs = {}) {
    const basicSalary = Math.max(0, Number(inputs.basicSalary) || 0);
    const taxableAllowance = Math.max(0, Number(inputs.taxableAllowance) || 0);
    const nonTaxableAllowance = Math.max(0, Number(inputs.nonTaxableAllowance) || 0);
    const voluntaryPension = Math.max(0, Number(inputs.voluntaryPension) || 0);
    const voluntaryDeductions = Math.max(0, Number(inputs.voluntaryDeductions) || 0);
    const nssfSchedule = inputs.nssfSchedule || 'year4';
    const isPreAmendment2024 = inputs.framework === '2024_PRE_AMENDMENT';

    // 1. Gross Earnings
    const grossSalary = roundTo(basicSalary + taxableAllowance + nonTaxableAllowance, 2);
    const totalTaxableEarnings = roundTo(basicSalary + taxableAllowance, 2);

    // 2. Statutory NSSF (calculated on pensionable earnings: basic salary)
    const nssf = calculateKenyaNSSF(basicSalary, nssfSchedule);
    const employeeNssf = nssf.totalEmployeeNssf;
    const employerNssf = nssf.totalEmployerNssf;

    // 3. Tax Allowable Pension Deductions (capped at KSh 20,000/mo combined)
    const allowablePensionDeduction = Math.min(
        KENYA_STATUTORY_RATES.PENSION_DEDUCTION_CAP,
        roundTo(employeeNssf + voluntaryPension, 2)
    );

    // 4. Statutory Health (SHIF) & Affordable Housing Levy (AHL)
    const shif = calculateKenyaSHIF(grossSalary);
    const { employeeAhl, employerAhl } = calculateKenyaHousingLevy(grossSalary);

    let taxablePay = 0;
    let personalRelief = KENYA_STATUTORY_RATES.PERSONAL_RELIEF_MONTHLY;
    let insuranceRelief = 0;
    let housingRelief = 0;
    let totalReliefs = personalRelief;

    if (!isPreAmendment2024) {
        // Active framework (Tax Laws Amendment Act 2024):
        // NSSF, SHIF, and Housing Levy are allowable pre-tax deductions reducing taxable employment income.
        const totalAllowablePreTaxDeductions = roundTo(allowablePensionDeduction + shif + employeeAhl, 2);
        taxablePay = Math.max(0, roundTo(totalTaxableEarnings - totalAllowablePreTaxDeductions, 2));

        // Personal relief of KSh 2,400 applies against gross PAYE.
        // SHIF and AHL no longer generate double tax credits since they are deducted pre-tax.
        totalReliefs = personalRelief;
    } else {
        // Historical 2024 pre-amendment framework:
        // Only allowable pension is deducted pre-tax; SHIF and AHL provide 15% tax reliefs.
        taxablePay = Math.max(0, roundTo(totalTaxableEarnings - allowablePensionDeduction, 2));
        insuranceRelief = Math.min(
            KENYA_STATUTORY_RATES.INSURANCE_RELIEF_CAP,
            roundTo(shif * KENYA_STATUTORY_RATES.INSURANCE_RELIEF_RATE, 2)
        );
        housingRelief = Math.min(
            KENYA_STATUTORY_RATES.HOUSING_RELIEF_CAP,
            roundTo(employeeAhl * KENYA_STATUTORY_RATES.HOUSING_RELIEF_RATE, 2)
        );
        totalReliefs = roundTo(personalRelief + insuranceRelief + housingRelief, 2);
    }

    // 5. Gross PAYE
    const { grossPaye, breakdown } = calculateKenyaGrossPAYE(taxablePay);

    // 6. Net PAYE (Tax Payable after reliefs, min 0)
    const netPaye = Math.max(0, roundTo(grossPaye - totalReliefs, 2));

    // 7. Total Employee Deductions & Net Salary
    const totalDeductions = roundTo(
        netPaye + employeeNssf + shif + employeeAhl + voluntaryPension + voluntaryDeductions,
        2
    );
    const netSalary = roundTo(grossSalary - totalDeductions, 2);

    // 8. Employer Total Liability (Cost to Company - CTC)
    const costToEmployer = roundTo(grossSalary + employerNssf + employerAhl, 2);

    // 9. Rates & Percentages
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
            nssfSchedule: nssf.schedule,
            statutorySequence: isPreAmendment2024
                ? 'Historical Pre-Amendment: Pension pre-tax; SHIF & AHL 15% reliefs'
                : 'Tax Laws (Amendment) Act 2024: NSSF, SHIF & AHL allowable pre-tax deductions',
            legalFramework: 'Kenya Income Tax Act (Cap. 470) & Tax Laws (Amendment) Act 2024',
            pensionFramework: 'NSSF Act No. 45 of 2013 (Third Schedule)',
            healthFramework: 'Social Health Insurance Act (SHIF) 2023',
            housingFramework: 'Affordable Housing Act 2024',
            taxAuthority: 'Kenya Revenue Authority (KRA)',
            lastVerified: '2026-10-16',
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
    description: 'Calculate monthly take-home pay, KRA PAYE tax, NSSF Tier I & II (Year 4 rate), SHIF (2.75%), and Affordable Housing Levy under the Tax Laws (Amendment) Act 2024 in Kenya.',
    metaTitle: 'Kenya Salary & PAYE Calculator 2026 | KRA Net Pay, NSSF Year 4 & SHIF',
    metaDescription: 'Free Kenya salary calculator — calculate monthly net pay, KRA PAYE tax, NSSF Year 4 rates (max KSh 6,480), SHIF (2.75%), and Affordable Housing Levy (1.5%) with pre-tax allowable deductions.',
    keywords: [
        'kenya salary calculator',
        'kra paye calculator',
        'kenya net salary calculator',
        'paye calculator kenya 2026',
        'shif calculator kenya',
        'nssf tier 1 and tier 2 calculator year 4',
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
                voluntaryDeductions: 0,
                nssfSchedule: 'year4'
            }
        },
        {
            label: 'Mid-Level Professional (KSh 80,000)',
            values: {
                basicSalary: 70000,
                taxableAllowance: 10000,
                nonTaxableAllowance: 5000,
                voluntaryPension: 3000,
                voluntaryDeductions: 2000,
                nssfSchedule: 'year4'
            }
        },
        {
            label: 'Senior Management (KSh 250,000)',
            values: {
                basicSalary: 200000,
                taxableAllowance: 50000,
                nonTaxableAllowance: 15000,
                voluntaryPension: 10000,
                voluntaryDeductions: 5000,
                nssfSchedule: 'year4'
            }
        }
    ],
    fields: [
        {
            id: 'basicSalary',
            label: 'Monthly Basic Salary (KSh)',
            type: 'number',
            default: 70000,
            min: 0,
            step: 1000,
            hint: 'Contractual monthly base salary in Kenya Shillings (KES).'
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
            hint: 'Tax-deductible registered pension or provident fund contributions (up to KSh 20,000/mo combined).'
        },
        {
            id: 'voluntaryDeductions',
            label: 'Other Voluntary Deductions (KSh/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 500,
            hint: 'Personal payroll deductions such as SACCO contributions, staff loans, or welfare.'
        },
        {
            id: 'nssfSchedule',
            label: 'NSSF Contribution Year',
            type: 'select',
            default: 'year4',
            options: [
                { value: 'year4', label: 'Year 4 (2026/2027: LEL KSh 9k, UEL KSh 108k, Max KSh 6,480)' },
                { value: 'year3', label: 'Year 3 (2025: LEL KSh 8k, UEL KSh 72k, Max KSh 4,320)' },
                { value: 'year2', label: 'Year 2 (2024: LEL KSh 7k, UEL KSh 36k, Max KSh 2,160)' }
            ],
            hint: 'NSSF Act 2013 Third Schedule progressive implementation years.'
        }
    ],
    calculate(v) {
        const basicSalary = Math.max(0, Number(v.basicSalary) || 0);
        const taxableAllowance = Math.max(0, Number(v.taxableAllowance) || 0);
        const nonTaxableAllowance = Math.max(0, Number(v.nonTaxableAllowance) || 0);
        const voluntaryPension = Math.max(0, Number(v.voluntaryPension) || 0);
        const voluntaryDeductions = Math.max(0, Number(v.voluntaryDeductions) || 0);
        const nssfSchedule = v.nssfSchedule || 'year4';

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
            voluntaryDeductions,
            nssfSchedule
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
                { label: 'Statutory Personal Relief', value: fmtKsh(m.totalReliefs) },
                { label: 'Taxable Employment Pay', value: fmtKsh(m.taxablePay) },
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
        standards: 'Kenya Revenue Authority (KRA) Income Tax Act (Cap. 470), Finance Act, Tax Laws (Amendment) Act 2024, NSSF Act 2013 (Third Schedule), SHIF Act 2023 & Affordable Housing Act 2024.',
        sources: [
            'Kenya Revenue Authority (KRA) PAYE Regulations & Guidelines',
            'National Social Security Fund (NSSF Act 2013 Third Schedule)',
            'Social Health Authority (SHIF Guidelines & Contribution Schedule)',
            'Affordable Housing Act 2024 & Tax Laws (Amendment) Act 2024'
        ],
        lastReviewed: 'October 2026',
        assumptions: [
            'Employee receives standard statutory personal relief of KSh 2,400 per month (KSh 28,800 per year).',
            'Under the Tax Laws (Amendment) Act 2024, NSSF, SHIF (2.75%), and the Affordable Housing Levy (1.5%) are allowable pre-tax deductions that reduce gross earnings to calculate Taxable Pay before progressive PAYE bands are applied.',
            'NSSF contributions default to Year 4 rates under the NSSF Act 2013 Third Schedule (Tier I cap KSh 540 on 9,000; Tier II cap KSh 5,940 on 108,000; combined maximum KSh 6,480/month).'
        ]
    },
    article: {
        heading: 'Complete Guide to Kenya PAYE, NSSF Year 4, SHIF, and Housing Levy Deductions',
        intro: 'In Kenya, payroll calculations are governed by the Income Tax Act (Cap. 470) administered by the Kenya Revenue Authority (KRA), alongside statutory contributions under the NSSF Act 2013, the Social Health Insurance Act (SHIF) 2023, and the Affordable Housing Act 2024 as amended by the Tax Laws (Amendment) Act 2024. This guide explains how gross earnings are converted into net take-home pay under the latest statutory sequence.',
        sections: [
            {
                heading: 'KRA PAYE Tax Brackets & Allowable Deductions Sequence',
                body: 'Under the Tax Laws (Amendment) Act 2024, statutory contributions to NSSF, SHIF (2.75%), and the Affordable Housing Levy (1.5%) are classified as allowable deductions from gross taxable income before applying progressive PAYE bands. The progressive bands apply to the resulting Taxable Pay: first KSh 24,000 at 10%; next KSh 8,333 at 25%; next KSh 467,667 at 30%; next KSh 300,000 at 32.5%; and any amount over KSh 800,000 at 35%.'
            },
            {
                heading: 'Personal Relief and Net PAYE Computation',
                body: 'Every Kenyan resident employee is entitled to a statutory Personal Relief of KSh 2,400 per month (KSh 28,800 per year). Because NSSF, SHIF, and Housing Levy are now deducted pre-tax from income, personal relief is subtracted directly from gross PAYE to determine final net PAYE liability payable to the KRA.'
            },
            {
                heading: 'NSSF Pension Contributions: Year 4 Implementation',
                body: 'Under the Third Schedule of the NSSF Act No. 45 of 2013, contribution ceilings increase annually. For Year 4 (effective February 2026), the Lower Earnings Limit (Tier I) is KSh 9,000, resulting in a maximum employee contribution of KSh 540 (6%). The Upper Earnings Limit (Tier II) is KSh 108,000, yielding a maximum Tier II contribution of KSh 5,940 (6% on KSh 9,001 to KSh 108,000). Total combined employee NSSF is capped at KSh 6,480 per month, matched equally by the employer.'
            },
            {
                heading: 'SHIF Health Insurance and Affordable Housing Levy',
                body: 'The Social Health Insurance Fund (SHIF) replaced the former NHIF flat schedule with a proportional contribution of 2.75% of gross monthly salary (minimum KSh 300/mo) with no upper cap. The Affordable Housing Levy (AHL) requires an employee contribution of 1.5% of gross salary matched by a 1.5% employer contribution.'
            }
        ]
    },
    howTo: [
        'Enter your Monthly Basic Salary in Kenya Shillings (KES).',
        'Add any monthly Taxable Cash Allowances (such as overtime or performance bonuses).',
        'Add any Non-Taxable Allowances that qualify for statutory exemptions under KRA rules.',
        'Enter voluntary contributions to registered pension schemes (tax-deductible up to KSh 20,000/mo combined with NSSF).',
        'Select the NSSF implementation schedule (Year 4 active, Year 3, or Year 2 historical).',
        'Review your net take-home salary, PAYE tax, NSSF, SHIF, Housing Levy, and employer liabilities.'
    ],
    formula: 'Taxable Pay = Gross − Allowable Deductions (NSSF + Pension + SHIF + Housing Levy); Net Pay = Gross − PAYE (Gross Tax − KSh 2,400 Relief) − NSSF − SHIF − Housing Levy − Other Deductions',
    examples: [
        {
            title: 'Entry-Level Worker (KSh 24,000 Gross) — Year 4 Active Law',
            input: 'Basic Salary: KSh 24,000, Zero Allowances',
            result: 'Net Pay: KSh 21,540.00/mo | PAYE: KSh 0.00 | NSSF: KSh 1,440.00 | SHIF: KSh 660.00 | AHL: KSh 360.00',
            explanation: 'Under Year 4, NSSF is KSh 1,440 (Tier I: 540 + Tier II: 900). SHIF is KSh 660 (2.75%) and AHL is KSh 360 (1.5%). Allowable deductions total KSh 2,460, leaving taxable pay of KSh 21,540. Gross PAYE is KSh 2,154, fully covered by KSh 2,400 personal relief. Net PAYE is KSh 0.'
        },
        {
            title: 'Mid-Level Professional (KSh 80,000 Gross: 70k Basic + 10k Allowance)',
            input: 'Basic Salary: KSh 70,000, Taxable Allowance: KSh 10,000',
            result: 'Net Pay: KSh 58,296.67/mo | PAYE: KSh 14,103.33 | NSSF: KSh 4,200.00 | SHIF: KSh 2,200.00 | AHL: KSh 1,200.00',
            explanation: 'Basic salary 70,000 yields NSSF of KSh 4,200. SHIF on 80k is KSh 2,200; AHL is KSh 1,200. Pre-tax allowable deductions total KSh 7,600, giving Taxable Pay of KSh 72,400. Gross PAYE is KSh 16,503.33 minus KSh 2,400 personal relief = KSh 14,103.33 Net PAYE. Take-home pay is KSh 58,296.67.'
        },
        {
            title: 'Executive Salary (KSh 250,000 Gross: 200k Basic + 50k Allowance)',
            input: 'Basic Salary: KSh 200,000, Taxable Allowance: KSh 50,000',
            result: 'Net Pay: KSh 170,643.17/mo | PAYE: KSh 62,251.83 | NSSF: KSh 6,480.00 | SHIF: KSh 6,875.00 | AHL: KSh 3,750.00',
            explanation: 'NSSF is capped at Year 4 max KSh 6,480. SHIF is KSh 6,875 and AHL is KSh 3,750. Allowable deductions of KSh 17,105 reduce taxable pay to KSh 232,895. Net PAYE is KSh 62,251.83. Employer CTC is KSh 260,230.'
        }
    ],
    faqs: [
        {
            q: 'How is PAYE calculated in Kenya under the Tax Laws (Amendment) Act 2024?',
            a: 'PAYE is calculated on Taxable Pay after subtracting allowable statutory deductions: NSSF, SHIF (2.75%), and the Affordable Housing Levy (1.5%). Progressive tax rates (10% to 35%) are applied to this net figure, and statutory personal relief (KSh 2,400/mo) is deducted to determine final PAYE payable.'
        },
        {
            q: 'What are the NSSF contribution limits for Year 4 (2026)?',
            a: 'Under the NSSF Act 2013 Third Schedule, Year 4 increases the Lower Earnings Limit (LEL) to KSh 9,000 (max Tier I contribution KSh 540) and the Upper Earnings Limit (UEL) to KSh 108,000 (max Tier II contribution KSh 5,940). The total maximum employee contribution is KSh 6,480 per month, matched equally by the employer.'
        },
        {
            q: 'Are SHIF and Affordable Housing Levy pre-tax deductions in Kenya?',
            a: 'Yes. Under the Tax Laws (Amendment) Act 2024, employee contributions to SHIF (2.75%) and the Affordable Housing Levy (1.5%) are deductible from gross employment income before calculating PAYE income tax, reducing overall taxable income.'
        },
        {
            q: 'Can I still calculate Kenya payroll using historical 2024 rates?',
            a: 'Yes. GetCalcu allows you to select historical NSSF schedules (Year 2 or Year 3) and calculation frameworks to reconcile previous payroll periods.'
        },
        {
            q: 'What is the standard personal relief in Kenya?',
            a: 'Every resident employee is entitled to standard statutory personal relief of KSh 2,400 per month (KSh 28,800 per year), which directly offsets gross PAYE tax liability.'
        }
    ]
};
