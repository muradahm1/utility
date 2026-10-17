/**
 * Nigerian Employment Tax & Salary Calculation Engine
 *
 * Implements:
 * - Active: Nigeria Tax Act 2025 (gazetted & effective Jan 1, 2026):
 *   - Consolidated Relief Allowance (CRA) abolished
 *   - Tax-exempt band on first ₦800,000/year (₦66,666.67/month) at 0%
 *   - Rent Relief deduction (up to lower of ₦500,000/yr or 20% of rent)
 *   - Progressive brackets: 0%, 15%, 18%, 21%, 23%, 25%
 * - Historical: Personal Income Tax Act (PITA) Cap P8 LFN 2004 (amended by Finance Acts 2019–2023):
 *   - Consolidated Relief Allowance (CRA): Higher of ₦200,000/yr (₦16,666.67/mo) or 1% Gross + 20% Gross
 *   - 6 progressive tax brackets (7% to 24%)
 *   - Minimum Tax Rule (1% of Gross) & National Minimum Wage Exemption (₦70,000)
 * - Pension Reform Act (PRA) 2014: Mandatory 8% Employee and 10% Employer contribution
 * - National Housing Fund (NHF) Act: 2.5% of basic salary
 *
 * Pure financial computation engine. Zero DOM side effects.
 *
 * @module modules/tax-nigeria
 */

import { roundTo } from '../utils/math.js';

/**
 * Multi-framework tax bracket definitions
 */
export const NIGERIA_TAX_FRAMEWORKS = {
    '2026': {
        name: 'Nigeria Tax Act 2025 (Active)',
        effectiveDate: '2026-01-01',
        description: 'Enacted under Nigeria Tax Act 2025. CRA abolished; tax-free 0% threshold on first ₦800k; Rent Relief; top rate 25%.',
        brackets: [
            { min: 0, max: 66666.67, rate: 0.00, label: 'First ₦66,667 (0% Tax-Exempt)' },
            { min: 66666.67, max: 250000, rate: 0.15, label: 'Next ₦183,333 (15%)' },
            { min: 250000, max: 1000000, rate: 0.18, label: 'Next ₦750,000 (18%)' },
            { min: 1000000, max: 2083333.33, rate: 0.21, label: 'Next ₦1,083,333 (21%)' },
            { min: 2083333.33, max: 4166666.67, rate: 0.23, label: 'Next ₦2,083,333 (23%)' },
            { min: 4166666.67, max: Infinity, rate: 0.25, label: 'Above ₦4,166,667 (25%)' }
        ]
    },
    '2025_PITA': {
        name: 'PITA 2004 & Finance Acts (Historical)',
        effectiveDate: '2004-01-01',
        description: 'Personal Income Tax Act 2004 as amended by Finance Acts. CRA applies; 6 brackets (7% to 24%).',
        brackets: [
            { min: 0, max: 25000, rate: 0.07, label: 'First ₦25,000 (7%)' },
            { min: 25000, max: 50000, rate: 0.11, label: 'Next ₦25,000 (11%)' },
            { min: 50000, max: 91666.67, rate: 0.15, label: 'Next ₦41,667 (15%)' },
            { min: 91666.67, max: 133333.33, rate: 0.19, label: 'Next ₦41,667 (19%)' },
            { min: 133333.33, max: 266666.67, rate: 0.21, label: 'Next ₦133,333 (21%)' },
            { min: 266666.67, max: Infinity, rate: 0.24, label: 'Above ₦266,667 (24%)' }
        ]
    }
};

/** Default active brackets (Nigeria Tax Act 2025) */
export const NIGERIA_TAX_BRACKETS = NIGERIA_TAX_FRAMEWORKS['2026'].brackets;
export const NIGERIA_TAX_BRACKETS_2026 = NIGERIA_TAX_FRAMEWORKS['2026'].brackets;
export const NIGERIA_TAX_BRACKETS_PITA = NIGERIA_TAX_FRAMEWORKS['2025_PITA'].brackets;

export const NIGERIA_STATUTORY_RATES = {
    PENSION_EMPLOYEE_RATE: 0.08, // 8% of emoluments
    PENSION_EMPLOYER_RATE: 0.10, // 10% of emoluments
    NHF_RATE: 0.025,             // 2.5% of basic salary
    RENT_RELIEF_ANNUAL_CAP: 500000,
    RENT_RELIEF_MONTHLY_CAP: 500000 / 12, // ₦41,666.67
    RENT_RELIEF_RATE: 0.20,      // Lower of ₦500k or 20% of rent
    // Historical PITA constants
    CRA_FIXED_ANNUAL: 200000,
    CRA_FIXED_MONTHLY: 200000 / 12, // ₦16,666.67
    CRA_GROSS_PCT: 0.01,         // 1% of gross income
    CRA_VARIABLE_PCT: 0.20,      // 20% of gross income
    MINIMUM_TAX_RATE: 0.01,      // 1% of gross income
    MINIMUM_WAGE_MONTHLY: 70000  // National Minimum Wage
};

/**
 * Calculate Consolidated Relief Allowance (CRA) under PITA Section 33 (Historical framework)
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
 * @param {string} [framework='2026'] - Tax framework ('2026' or '2025_PITA')
 * @returns {Object} { tax, breakdown }
 */
export function calculateNigeriaPAYE(chargeableIncome, framework = '2026') {
    const income = Math.max(0, Number(chargeableIncome) || 0);
    const activeFramework = NIGERIA_TAX_FRAMEWORKS[framework] || NIGERIA_TAX_FRAMEWORKS['2026'];
    const brackets = activeFramework.brackets;
    let tax = 0;
    const breakdown = [];

    for (const bracket of brackets) {
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
 * @param {number} [inputs.monthlyRent=0] - Actual monthly rent paid (for Rent Relief under 2026 Act)
 * @param {number} [inputs.voluntaryDeductions=0] - Other deductions (cooperative savings, staff loan)
 * @param {string} [inputs.framework='2026'] - Framework: '2026' (Nigeria Tax Act 2025) or '2025_PITA' (Historical)
 * @returns {Object} Comprehensive calculation result
 */
export function calculateNigeriaSalary(inputs = {}) {
    const basicSalary = Math.max(0, Number(inputs.basicSalary) || 0);
    const housingAllowance = Math.max(0, Number(inputs.housingAllowance) || 0);
    const transportAllowance = Math.max(0, Number(inputs.transportAllowance) || 0);
    const otherAllowances = Math.max(0, Number(inputs.otherAllowances) || 0);
    const deductNhf = inputs.deductNhf !== false && inputs.deductNhf !== 'no';
    const voluntaryPension = Math.max(0, Number(inputs.voluntaryPension) || 0);
    const monthlyRent = Math.max(0, Number(inputs.monthlyRent) || 0);
    const voluntaryDeductions = Math.max(0, Number(inputs.voluntaryDeductions) || 0);
    const framework = inputs.framework === '2025_PITA' ? '2025_PITA' : '2026';

    // 1. Gross Earnings
    const grossSalary = roundTo(basicSalary + housingAllowance + transportAllowance + otherAllowances, 2);

    // 2. Pensionable Emoluments (Basic + Housing + Transport)
    const pensionableEmoluments = roundTo(basicSalary + housingAllowance + transportAllowance, 2);

    // 3. Statutory Pension (8% employee, 10% employer)
    const { employeePension: statutoryPension, employerPension } = calculateNigeriaPension(pensionableEmoluments);
    const totalEmployeePension = roundTo(statutoryPension + voluntaryPension, 2);

    // 4. National Housing Fund (2.5% of Basic)
    const nhf = deductNhf ? calculateNigeriaNHF(basicSalary) : 0;
    const allowableDeductions = roundTo(totalEmployeePension + nhf, 2);

    let cra = 0;
    let rentRelief = 0;
    let chargeableIncome = 0;
    let netPaye = 0;
    let breakdown = [];

    if (framework === '2026') {
        // Active framework (Nigeria Tax Act 2025):
        // CRA is abolished.
        // Rent relief: lower of ₦500,000/yr (₦41,666.67/mo) or 20% of actual rent paid.
        rentRelief = roundTo(
            Math.min(NIGERIA_STATUTORY_RATES.RENT_RELIEF_MONTHLY_CAP, monthlyRent * NIGERIA_STATUTORY_RATES.RENT_RELIEF_RATE),
            2
        );
        chargeableIncome = Math.max(0, roundTo(grossSalary - allowableDeductions - rentRelief, 2));

        const payeResult = calculateNigeriaPAYE(chargeableIncome, '2026');
        netPaye = payeResult.tax;
        breakdown = payeResult.breakdown;
    } else {
        // Historical PITA 2004 framework:
        cra = calculateNigeriaCRA(grossSalary);
        chargeableIncome = Math.max(0, roundTo(grossSalary - cra - allowableDeductions, 2));

        const payeResult = calculateNigeriaPAYE(chargeableIncome, '2025_PITA');
        breakdown = payeResult.breakdown;

        // Minimum wage exemption & minimum tax rule
        const isExemptMinimumWage = grossSalary <= NIGERIA_STATUTORY_RATES.MINIMUM_WAGE_MONTHLY;
        if (isExemptMinimumWage) {
            netPaye = 0;
        } else {
            const minimumTax = roundTo(grossSalary * NIGERIA_STATUTORY_RATES.MINIMUM_TAX_RATE, 2);
            netPaye = Math.max(payeResult.tax, minimumTax);
        }
    }

    // 5. Total Employee Deductions & Net Salary
    const totalDeductions = roundTo(netPaye + totalEmployeePension + nhf + voluntaryDeductions, 2);
    const netSalary = roundTo(grossSalary - totalDeductions, 2);

    // 6. Employer Cost to Company (CTC)
    const costToEmployer = roundTo(grossSalary + employerPension, 2);

    // 7. Rates
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
            rentRelief,
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
            rentRelief: roundTo(rentRelief * 12, 2),
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
            framework: NIGERIA_TAX_FRAMEWORKS[framework].name,
            effectiveDate: NIGERIA_TAX_FRAMEWORKS[framework].effectiveDate,
            legalFramework: framework === '2026'
                ? 'Nigeria Tax Act 2025 (Effective Jan 1, 2026)'
                : 'Personal Income Tax Act (PITA) Cap P8 LFN 2004 & Finance Acts',
            pensionFramework: 'Pension Reform Act (PRA) 2014',
            housingFramework: 'National Housing Fund (NHF) Act',
            taxAuthority: 'State Internal Revenue Service (SIRS) / FIRS',
            lastVerified: '2026-10-16',
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
    description: 'Calculate monthly take-home salary, PAYE tax under Nigeria Tax Act 2025 (tax-free up to ₦800k), 8% pension (PRA 2014), and NHF in Nigeria.',
    metaTitle: 'Nigeria Salary & PAYE Tax Calculator 2026 | Net Pay, Pension & Tax Act 2025',
    metaDescription: 'Free Nigeria salary calculator updated for Nigeria Tax Act 2025. Calculate monthly net pay, 0% tax-exempt band up to ₦800k, Rent Relief, 8% pension (PRA 2014), and NHF.',
    keywords: [
        'nigeria salary calculator',
        'paye calculator nigeria',
        'nigeria net salary calculator',
        'nigeria tax act 2025 calculator',
        'pita tax calculator nigeria 2026',
        'rent relief nigeria tax',
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
                monthlyRent: 0,
                voluntaryDeductions: 0,
                framework: '2026'
            }
        },
        {
            label: 'Mid-Level Professional (₦300,000)',
            values: {
                basicSalary: 150000,
                housingAllowance: 75000,
                transportAllowance: 45000,
                otherAllowances: 30000,
                deductNhf: 'yes',
                voluntaryPension: 0,
                monthlyRent: 50000,
                voluntaryDeductions: 0,
                framework: '2026'
            }
        },
        {
            label: 'Senior Executive (₦1,500,000)',
            values: {
                basicSalary: 750000,
                housingAllowance: 375000,
                transportAllowance: 225000,
                otherAllowances: 150000,
                deductNhf: 'yes',
                voluntaryPension: 50000,
                monthlyRent: 200000,
                voluntaryDeductions: 0,
                framework: '2026'
            }
        }
    ],
    fields: [
        {
            id: 'basicSalary',
            label: 'Monthly Basic Salary (₦)',
            type: 'number',
            default: 150000,
            min: 0,
            step: 5000,
            hint: 'Your contractual monthly base salary in Nigerian Naira (NGN).'
        },
        {
            id: 'housingAllowance',
            label: 'Housing Allowance (₦/mo)',
            type: 'number',
            default: 75000,
            min: 0,
            step: 2500,
            hint: 'Monthly housing allowance (included in pensionable emoluments under PRA 2014).'
        },
        {
            id: 'transportAllowance',
            label: 'Transport Allowance (₦/mo)',
            type: 'number',
            default: 45000,
            min: 0,
            step: 2500,
            hint: 'Monthly transport allowance (included in pensionable emoluments under PRA 2014).'
        },
        {
            id: 'otherAllowances',
            label: 'Other Cash Allowances (₦/mo)',
            type: 'number',
            default: 30000,
            min: 0,
            step: 2500,
            hint: 'Additional cash allowances (utility, meal, representation, bonus).'
        },
        {
            id: 'monthlyRent',
            label: 'Monthly Rent Paid (₦/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 5000,
            hint: 'Actual rent paid for accommodation. Qualifies for Rent Relief (up to ₦500k/yr or 20% of rent) under Nigeria Tax Act 2025.'
        },
        {
            id: 'deductNhf',
            label: 'National Housing Fund (NHF)',
            type: 'select',
            default: 'yes',
            options: [
                { value: 'yes', label: 'Deduct 2.5% NHF (Standard)' },
                { value: 'no', label: 'Exempt from NHF' }
            ],
            hint: 'National Housing Fund Act: 2.5% statutory contribution from basic salary.'
        },
        {
            id: 'voluntaryPension',
            label: 'Additional Voluntary Pension (₦/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 2500,
            hint: 'Tax-exempt voluntary pension contribution under PRA 2014 Section 10.'
        },
        {
            id: 'voluntaryDeductions',
            label: 'Other Voluntary Deductions (₦/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 2500,
            hint: 'Personal payroll deductions: cooperative society savings, staff loans, or insurance.'
        },
        {
            id: 'framework',
            label: 'Tax Law Framework',
            type: 'select',
            default: '2026',
            options: [
                { value: '2026', label: 'Nigeria Tax Act 2025 (Active — ₦800k Tax-Free, Rent Relief, CRA Abolished)' },
                { value: '2025_PITA', label: 'PITA 2004 & Finance Acts (Historical — CRA & 7%–24% Brackets)' }
            ],
            hint: 'Select the 2026 active schedule under Nigeria Tax Act 2025 or historical PITA for prior periods.'
        }
    ],
    calculate(v) {
        const basicSalary = Math.max(0, Number(v.basicSalary) || 0);
        const housingAllowance = Math.max(0, Number(v.housingAllowance) || 0);
        const transportAllowance = Math.max(0, Number(v.transportAllowance) || 0);
        const otherAllowances = Math.max(0, Number(v.otherAllowances) || 0);
        const deductNhf = v.deductNhf !== 'no' && v.deductNhf !== false;
        const voluntaryPension = Math.max(0, Number(v.voluntaryPension) || 0);
        const monthlyRent = Math.max(0, Number(v.monthlyRent) || 0);
        const voluntaryDeductions = Math.max(0, Number(v.voluntaryDeductions) || 0);
        const framework = v.framework === '2025_PITA' ? '2025_PITA' : '2026';

        if (basicSalary <= 0 && (housingAllowance + transportAllowance + otherAllowances) <= 0) {
            return {
                stats: [
                    { label: 'Net Take-Home Pay', value: '₦0.00', highlight: true }
                ],
                insight: {
                    tone: 'warning',
                    icon: 'fa-triangle-exclamation',
                    headline: 'Salary Input Required',
                    detail: 'Please enter your monthly basic salary and allowances to calculate Nigerian PAYE, pension, and net take-home pay.'
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
            monthlyRent,
            voluntaryDeductions,
            framework
        });

        const m = res.monthly;
        const fmtNaira = (n) => '₦' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const pctStr = (n) => (Number(n) || 0).toFixed(1) + '%';

        const scheduleTag = framework === '2026' ? 'Tax Act 2025' : 'PITA 2004';

        return {
            stats: [
                { label: 'Net Take-Home Pay (Monthly)', value: fmtNaira(m.netSalary), highlight: true },
                { label: 'Net Take-Home Pay (Annual)', value: fmtNaira(res.annual.net) },
                { label: `PAYE Tax (${scheduleTag})`, value: fmtNaira(m.netPaye) },
                { label: 'Employee Pension (8%)', value: fmtNaira(m.employeePension) },
                { label: 'Employer Pension (10%)', value: fmtNaira(m.employerPension) },
                { label: 'National Housing Fund (2.5%)', value: fmtNaira(m.nhf) },
                { label: framework === '2026' ? 'Rent Relief Deducted' : 'CRA Relief Deducted', value: fmtNaira(framework === '2026' ? m.rentRelief : m.cra) },
                { label: 'Chargeable Income', value: fmtNaira(m.chargeableIncome) },
                { label: 'Gross Monthly Earnings', value: fmtNaira(m.grossSalary) },
                { label: 'Effective PAYE Rate', value: pctStr(res.rates.effectiveTaxRate), warn: res.rates.effectiveTaxRate > 20 }
            ],
            insight: {
                tone: 'positive',
                icon: 'fa-shield-halved',
                headline: `Net Take-Home Pay: ${pctStr((m.netSalary / m.grossSalary) * 100)} of Gross Salary`,
                detail: `From monthly gross earnings of ${fmtNaira(m.grossSalary)}, total deductions equal ${fmtNaira(m.totalDeductions)} (${fmtNaira(m.netPaye)} PAYE + ${fmtNaira(m.employeePension)} pension + ${fmtNaira(m.nhf)} NHF). Net take-home pay is ${fmtNaira(m.netSalary)}.`
            },
            chart: {
                type: 'doughnut',
                labels: ['Net Take-Home Pay', 'PAYE Tax', 'Employee Pension (8%)', 'National Housing Fund (2.5%)', 'Other Deductions'],
                data: [m.netSalary, m.netPaye, m.employeePension, m.nhf, m.voluntaryDeductions],
                colors: ['#10B981', '#6366F1', '#3B82F6', '#EC4899', '#F59E0B']
            },
            bars: [
                { label: 'Net Take-Home Pay', percent: roundTo((m.netSalary / m.grossSalary) * 100, 1), color: '#10B981' },
                { label: 'PAYE Tax', percent: roundTo((m.netPaye / m.grossSalary) * 100, 1), color: '#6366F1' },
                { label: 'Pension Contribution (8%)', percent: roundTo((m.employeePension / m.grossSalary) * 100, 1), color: '#3B82F6' },
                { label: 'National Housing Fund', percent: roundTo((m.nhf / m.grossSalary) * 100, 1), color: '#EC4899' }
            ]
        };
    },
    methodology: {
        standards: 'Nigeria Tax Act 2025, Personal Income Tax Act (PITA) Cap P8 LFN 2004 (as amended), Pension Reform Act (PRA) 2014, and National Housing Fund (NHF) Act.',
        sources: [
            'Federal Inland Revenue Service (FIRS) & Joint Tax Board (JTB)',
            'Nigeria Tax Act 2025 Gazette & Implementation Guidelines',
            'Personal Income Tax Act (PITA) Cap P8 LFN 2004',
            'National Pension Commission (PenCom) PRA 2014 Regulations'
        ],
        lastReviewed: 'October 2026',
        assumptions: [
            'Under Nigeria Tax Act 2025, the Consolidated Relief Allowance (CRA) is abolished and replaced by an initial ₦800,000 annual (₦66,666.67/mo) 0% tax-free band, with optional Rent Relief up to the lower of ₦500,000/yr or 20% of rent paid.',
            'Pensionable emoluments consist of Basic Salary + Housing Allowance + Transport Allowance under PRA 2014 Section 89.',
            'NHF applies at 2.5% on basic salary unless opted out.'
        ]
    },
    article: {
        heading: 'Complete Guide to Nigerian PAYE, Pension, and Tax Act 2025 Reform',
        intro: 'In Nigeria, employee payroll is governed by federal legislation administered by State Internal Revenue Services (such as LIRS in Lagos) and the Federal Inland Revenue Service (FIRS). The landmark Nigeria Tax Act 2025 overhauled personal taxation, abolishing the Consolidated Relief Allowance (CRA) in favor of a ₦800,000 tax-free personal band and revised progressive brackets, while maintaining mandatory retirement savings under the Pension Reform Act (PRA) 2014.',
        sections: [
            {
                heading: 'Nigeria Tax Act 2025 vs. PITA CRA Reform',
                body: 'Prior to the 2025 reform, Nigerian employees deducted a Consolidated Relief Allowance (CRA) equal to the higher of ₦200,000 or 1% of gross, plus 20% of gross income. Under the Nigeria Tax Act 2025 (effective January 1, 2026), the CRA is eliminated. In its place, the tax schedule introduces a 0% tax-exempt band on the first ₦800,000 of annual taxable earnings (₦66,666.67/month), protecting low earners from tax liability without complex relief calculations.'
            },
            {
                heading: 'Progressive Tax Rates Under Nigeria Tax Act 2025',
                body: 'Annual taxable income above ₦800,000 is taxed in progressive brackets: ₦800,001 to ₦3,000,000 at 15%; ₦3,000,001 to ₦12,000,000 at 18%; ₦12,000,001 to ₦25,000,000 at 21%; ₦25,000,001 to ₦50,000,000 at 23%; and taxable income exceeding ₦50,000,000 at 25%. Historical calculations under the PITA 6-bracket schedule (7% to 24%) remain fully accessible for past tax periods.'
            },
            {
                heading: 'Rent Relief Deduction',
                body: 'The Nigeria Tax Act 2025 introduced an allowable deduction for personal rent paid. Employees who submit valid tenancy documentation can deduct actual rent paid, capped at the lower of ₦500,000 per annum (₦41,666.67 per month) or 20% of their actual annual rent, directly reducing chargeable income.'
            },
            {
                heading: 'Mandatory Pension Reform Act (PRA) 2014',
                body: 'Under the Pension Reform Act 2014, employers and employees must contribute to a Retirement Savings Account (RSA). The employee contributes a mandatory minimum of 8%, while the employer contributes at least 10%. Contributions are calculated on pensionable emoluments, defined as the sum of Basic Salary, Housing Allowance, and Transport Allowance.'
            }
        ]
    },
    howTo: [
        'Enter your Monthly Basic Salary in Nigerian Naira (NGN).',
        'Add your monthly Housing Allowance and Transport Allowance (used to calculate pensionable emoluments).',
        'Add any Other Cash Allowances (meal, utility, performance bonuses).',
        'Enter monthly Rent Paid if claiming the Rent Relief deduction under the 2026 framework.',
        'Choose whether 2.5% National Housing Fund (NHF) should be deducted.',
        'Select the active Nigeria Tax Act 2025 schedule or historical PITA 2004 schedule.',
        'Review your monthly and annual take-home salary, PAYE tax, pension, and employer liabilities.'
    ],
    formula: 'Chargeable Income = Gross Salary − Employee Pension (8%) − NHF (2.5% Basic) − Rent Relief (or CRA under PITA); Net Pay = Gross Salary − PAYE Tax − Pension − NHF − Deductions',
    examples: [
        {
            title: 'Minimum Wage Earner (₦70,000 Gross) — Tax Act 2025 Active Law',
            input: 'Basic: ₦45,000, Housing: ₦15,000, Transport: ₦10,000',
            result: 'Net Pay: ₦63,275.00/mo | PAYE: ₦0.00 | Pension: ₦5,600.00 | NHF: ₦1,125.00',
            explanation: 'Pension is ₦5,600 (8% of 70k). NHF is ₦1,125 (2.5% of 45k). Chargeable income is ₦63,275, which is fully within the ₦66,666.67 monthly tax-exempt 0% band. PAYE tax is ₦0.00.'
        },
        {
            title: 'Mid-Level Professional (₦300,000 Gross) — Tax Act 2025 Active Law',
            input: 'Basic: ₦150,000, Housing: ₦75,000, Transport: ₦45,000, Other: ₦30,000, Rent: ₦50,000',
            result: 'Net Pay: ₦244,513.00/mo | PAYE: ₦30,137.00 | Pension: ₦21,600.00 | NHF: ₦3,750.00',
            explanation: 'Pensionable emoluments are ₦270,000 (8% pension = ₦21,600). NHF is ₦3,750. Rent relief is 20% of ₦50,000 = ₦10,000. Chargeable income is ₦264,650. In the 15% band (₦66,667–₦250,000): ₦27,500. In the 18% band (₦14,650 @ 18%): ₦2,637. Total PAYE is ₦30,137.00.'
        },
        {
            title: 'Executive Salary (₦1,500,000 Gross) — Tax Act 2025 Active Law',
            input: 'Basic: ₦750,000, Housing: ₦375,000, Transport: ₦225,000, Other: ₦150,000, Rent: ₦200,000',
            result: 'Net Pay: ₦1,140,700.83/mo | PAYE: ₦232,549.17 | Pension: ₦108,000.00 | NHF: ₦18,750.00',
            explanation: 'Pension is ₦108,000 (8% of ₦1.35M). NHF is ₦18,750. Max rent relief cap applies (₦41,666.67/mo). Chargeable income is ₦1,331,583.33. PAYE across bands totals ₦232,549.17.'
        }
    ],
    faqs: [
        {
            q: 'How does the Nigeria Tax Act 2025 change PAYE calculations?',
            a: 'The Nigeria Tax Act 2025 abolished the Consolidated Relief Allowance (CRA). In its place, the first ₦800,000 per year (₦66,666.67/month) is completely tax-exempt at 0%. Income above ₦800k is taxed in progressive brackets of 15%, 18%, 21%, 23%, and 25%.'
        },
        {
            q: 'What is Rent Relief under the Nigeria Tax Act 2025?',
            a: 'Rent Relief allows employees to deduct rent paid for accommodation from their gross income before tax, up to the lesser of ₦500,000 per year (₦41,666.67/month) or 20% of their actual annual rent.'
        },
        {
            q: 'Can I still calculate tax under the historical PITA CRA framework?',
            a: 'Yes. GetCalcu allows you to toggle to "PITA 2004 & Finance Acts" from the Tax Law Framework dropdown to calculate past payroll periods with the Consolidated Relief Allowance and 7%–24% brackets.'
        },
        {
            q: 'How is pension calculated in Nigeria?',
            a: 'Under the Pension Reform Act 2014, the employee contributes a minimum of 8% and the employer contributes 10% calculated on pensionable emoluments: Basic Salary + Housing Allowance + Transport Allowance.'
        },
        {
            q: 'What is the National Housing Fund (NHF) deduction?',
            a: 'The NHF Act stipulates a 2.5% deduction from an employee\'s monthly basic salary, remitted to the Federal Mortgage Bank of Nigeria.'
        }
    ]
};
