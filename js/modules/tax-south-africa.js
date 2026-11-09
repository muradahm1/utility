/**
 * South African Employment Tax & Salary Calculation Engine
 *
 * Implements:
 * - South African Revenue Service (SARS) Income Tax Act No. 58 of 1962:
 *   - Active: 2027 Tax Year (1 March 2026 – 28 February 2027)
 *   - Historical: 2026 Tax Year (1 March 2025 – 28 February 2026)
 * - 7 Progressive PAYE Tax Brackets (18% to 45%)
 * - Age-based Tax Rebates:
 *   - 2027: Primary (R17,820), Secondary 65–74 (R9,765), Tertiary 75+ (R3,249)
 *   - 2026: Primary (R17,235), Secondary 65–74 (R9,444), Tertiary 75+ (R3,145)
 * - Section 11F Retirement Fund Deductions: Up to 27.5% of remuneration, capped at R350,000/yr (R29,166.67/mo)
 * - Section 6A Medical Scheme Fees Tax Credit (MTC):
 *   - 2027: R376/mo main, R376/mo 1st dependent, R254/mo additional
 *   - 2026: R364/mo main, R364/mo 1st dependent, R246/mo additional
 * - Unemployment Insurance Fund (UIF) Contributions Act No. 4 of 2002: 1% employee, 1% employer, capped at R177.12/mo
 * - Skills Development Levy (SDL): 1% employer contribution
 *
 * Pure financial computation engine. Zero DOM side effects.
 *
 * @module modules/tax-south-africa
 */

import { roundTo } from '../utils/math.js';

/**
 * Multi-year SARS Annual Individual Tax Schedules
 */
export const SA_TAX_YEARS = {
    '2027': {
        name: '2027 Tax Year (1 Mar 2026 – 28 Feb 2027: Active)',
        brackets: [
            { min: 0, max: 245100, baseTax: 0, rate: 0.18, label: 'R0 – R245,100 (18%)' },
            { min: 245100, max: 383100, baseTax: 44118, rate: 0.26, label: 'R245,101 – R383,100 (26%)' },
            { min: 383100, max: 530200, baseTax: 79998, rate: 0.31, label: 'R383,101 – R530,200 (31%)' },
            { min: 530200, max: 695800, baseTax: 125599, rate: 0.36, label: 'R530,201 – R695,800 (36%)' },
            { min: 695800, max: 887000, baseTax: 185215, rate: 0.39, label: 'R695,801 – R887,000 (39%)' },
            { min: 887000, max: 1878600, baseTax: 259783, rate: 0.41, label: 'R887,001 – R1,878,600 (41%)' },
            { min: 1878600, max: Infinity, baseTax: 666339, rate: 0.45, label: 'Above R1,878,600 (45%)' }
        ],
        rebates: {
            primary: 17820,
            secondary: 9765,
            tertiary: 3249
        },
        medicalCredits: {
            mainMonthly: 376,
            firstDepMonthly: 376,
            addlDepMonthly: 254
        },
        thresholds: {
            under65: 99000,
            age65to74: 153250,
            age75plus: 171300
        }
    },
    '2026': {
        name: '2026 Tax Year (1 Mar 2025 – 28 Feb 2026: Historical)',
        brackets: [
            { min: 0, max: 237100, baseTax: 0, rate: 0.18, label: 'R0 – R237,100 (18%)' },
            { min: 237100, max: 370500, baseTax: 42678, rate: 0.26, label: 'R237,101 – R370,500 (26%)' },
            { min: 370500, max: 512800, baseTax: 77362, rate: 0.31, label: 'R370,501 – R512,800 (31%)' },
            { min: 512800, max: 673000, baseTax: 121475, rate: 0.36, label: 'R512,801 – R673,000 (36%)' },
            { min: 673000, max: 857900, baseTax: 179147, rate: 0.39, label: 'R673,001 – R857,900 (39%)' },
            { min: 857900, max: 1817000, baseTax: 251258, rate: 0.41, label: 'R857,901 – R1,817,000 (41%)' },
            { min: 1817000, max: Infinity, baseTax: 644489, rate: 0.45, label: 'Above R1,817,000 (45%)' }
        ],
        rebates: {
            primary: 17235,
            secondary: 9444,
            tertiary: 3145
        },
        medicalCredits: {
            mainMonthly: 364,
            firstDepMonthly: 364,
            addlDepMonthly: 246
        },
        thresholds: {
            under65: 95750,
            age65to74: 148217,
            age75plus: 165689
        }
    }
};

/** Active default brackets (2027 Tax Year) */
export const SA_ANNUAL_TAX_BRACKETS = SA_TAX_YEARS['2027'].brackets;
export const SA_ANNUAL_TAX_BRACKETS_2027 = SA_TAX_YEARS['2027'].brackets;
export const SA_ANNUAL_TAX_BRACKETS_2026 = SA_TAX_YEARS['2026'].brackets;

export const SA_STATUTORY_RATES = {
    // UIF Statutory Rates & Cap
    UIF_RATE: 0.01,                 // 1% employee, 1% employer
    UIF_MONTHLY_CEILING: 17712,      // Monthly remuneration earnings cap
    UIF_MAX_CONTRIBUTION: 177.12,    // Maximum monthly contribution (1% of 17,712)
    UIF_ANNUAL_CEILING: 212544,

    // Skills Development Levy
    SDL_RATE: 0.01,                 // 1% employer contribution

    // Section 11F Retirement Fund Deductions
    RETIREMENT_MAX_PCT: 0.275,       // 27.5% of remuneration/taxable income
    RETIREMENT_ANNUAL_CAP: 350000,   // Annual maximum cap
    RETIREMENT_MONTHLY_CAP: 350000 / 12, // R29,166.67 / mo

    // Section 6 Rebates (Active 2027 Annual)
    REBATE_PRIMARY_ANNUAL: SA_TAX_YEARS['2027'].rebates.primary,
    REBATE_SECONDARY_ANNUAL: SA_TAX_YEARS['2027'].rebates.secondary,
    REBATE_TERTIARY_ANNUAL: SA_TAX_YEARS['2027'].rebates.tertiary,

    // Section 6A Medical Scheme Fees Tax Credits (Active 2027 Monthly)
    MEDICAL_CREDIT_MAIN_MONTHLY: SA_TAX_YEARS['2027'].medicalCredits.mainMonthly,
    MEDICAL_CREDIT_FIRST_DEP_MONTHLY: SA_TAX_YEARS['2027'].medicalCredits.firstDepMonthly,
    MEDICAL_CREDIT_ADDL_DEP_MONTHLY: SA_TAX_YEARS['2027'].medicalCredits.addlDepMonthly,

    // Tax Thresholds (Active 2027 Annual)
    THRESHOLD_UNDER_65: SA_TAX_YEARS['2027'].thresholds.under65,
    THRESHOLD_65_TO_74: SA_TAX_YEARS['2027'].thresholds.age65to74,
    THRESHOLD_75_PLUS: SA_TAX_YEARS['2027'].thresholds.age75plus
};

/**
 * Calculate SARS Age-Based Annual and Monthly Tax Rebates (Section 6)
 *
 * @param {string} [ageCategory='under65'] - 'under65', '65to74', or '75plus'
 * @param {string} [taxYear='2027'] - '2027' or '2026'
 * @returns {Object} { annualRebate, monthlyRebate, primaryRebate, secondaryRebate, tertiaryRebate }
 */
export function calculateSouthAfricaRebate(ageCategory = 'under65', taxYear = '2027') {
    const yearData = SA_TAX_YEARS[taxYear] || SA_TAX_YEARS['2027'];
    const primary = yearData.rebates.primary;
    let secondary = 0;
    let tertiary = 0;

    if (ageCategory === '65to74') {
        secondary = yearData.rebates.secondary;
    } else if (ageCategory === '75plus') {
        secondary = yearData.rebates.secondary;
        tertiary = yearData.rebates.tertiary;
    }

    const annualRebate = primary + secondary + tertiary;
    const monthlyRebate = roundTo(annualRebate / 12, 2);

    return {
        annualRebate,
        monthlyRebate,
        primaryRebate: primary,
        secondaryRebate: secondary,
        tertiaryRebate: tertiary
    };
}

/**
 * Calculate Unemployment Insurance Fund (UIF) contributions
 * 1% of remuneration, capped at R177.12 per month (R17,712 monthly ceiling)
 *
 * @param {number} monthlyRemuneration - Gross monthly remuneration in ZAR
 * @returns {Object} { employeeUif, employerUif, totalUif, isCapped }
 */
export function calculateSouthAfricaUIF(monthlyRemuneration) {
    const remuneration = Math.max(0, Number(monthlyRemuneration) || 0);
    const insurableEarnings = Math.min(remuneration, SA_STATUTORY_RATES.UIF_MONTHLY_CEILING);
    const employeeUif = roundTo(insurableEarnings * SA_STATUTORY_RATES.UIF_RATE, 2);
    const employerUif = roundTo(insurableEarnings * SA_STATUTORY_RATES.UIF_RATE, 2);

    return {
        employeeUif,
        employerUif,
        totalUif: roundTo(employeeUif + employerUif, 2),
        isCapped: remuneration > SA_STATUTORY_RATES.UIF_MONTHLY_CEILING
    };
}

/**
 * Calculate Section 11F allowable retirement fund contribution deduction
 * Lesser of:
 * - Actual contribution
 * - 27.5% of remuneration
 * - R350,000 per annum (R29,166.67 per month)
 *
 * @param {number} monthlyContribution - Actual monthly pension/provident/RA contribution
 * @param {number} monthlyRemuneration - Monthly gross remuneration
 * @returns {Object} { allowableDeduction, excessContribution }
 */
export function calculateSouthAfricaRetirementDeduction(monthlyContribution, monthlyRemuneration) {
    const contribution = Math.max(0, Number(monthlyContribution) || 0);
    const remuneration = Math.max(0, Number(monthlyRemuneration) || 0);

    const percentageCap = remuneration * SA_STATUTORY_RATES.RETIREMENT_MAX_PCT;
    const ceilingCap = SA_STATUTORY_RATES.RETIREMENT_MONTHLY_CAP;
    const maxAllowable = Math.min(percentageCap, ceilingCap);

    const allowableDeduction = roundTo(Math.min(contribution, maxAllowable), 2);
    const excessContribution = roundTo(Math.max(0, contribution - allowableDeduction), 2);

    return {
        allowableDeduction,
        excessContribution,
        percentageCap: roundTo(percentageCap, 2),
        ceilingCap: roundTo(ceilingCap, 2)
    };
}

/**
 * Calculate Section 6A Medical Scheme Fees Tax Credit (MTC)
 * Non-refundable monthly tax credit:
 * - Main member: R376 (2027) / R364 (2026)
 * - First dependent: R376 (2027) / R364 (2026)
 * - Each additional dependent: R254 (2027) / R246 (2026)
 *
 * @param {boolean|string} hasMedicalAid - Whether taxpayer belongs to a registered medical scheme
 * @param {number} numberOfDependents - Number of registered dependents
 * @param {string} [taxYear='2027'] - '2027' or '2026'
 * @returns {Object} { monthlyCredit, annualCredit }
 */
export function calculateSouthAfricaMedicalCredit(hasMedicalAid, numberOfDependents = 0, taxYear = '2027') {
    const active = hasMedicalAid === true || hasMedicalAid === 'yes';
    if (!active) {
        return { monthlyCredit: 0, annualCredit: 0 };
    }

    const yearData = SA_TAX_YEARS[taxYear] || SA_TAX_YEARS['2027'];
    const { mainMonthly, firstDepMonthly, addlDepMonthly } = yearData.medicalCredits;

    const dependents = Math.max(0, Math.floor(Number(numberOfDependents) || 0));
    let monthlyCredit = mainMonthly;

    if (dependents >= 1) {
        monthlyCredit += firstDepMonthly;
    }
    if (dependents > 1) {
        monthlyCredit += (dependents - 1) * addlDepMonthly;
    }

    monthlyCredit = roundTo(monthlyCredit, 2);
    const annualCredit = roundTo(monthlyCredit * 12, 2);

    return { monthlyCredit, annualCredit };
}

/**
 * Calculate SARS Annual Gross PAYE Tax from Annual Taxable Income
 *
 * @param {number} annualTaxableIncome - Annual taxable income in ZAR
 * @param {string} [taxYear='2027'] - '2027' or '2026'
 * @returns {Object} { annualGrossTax, bracketBreakdown }
 */
export function calculateSouthAfricaGrossPAYE(annualTaxableIncome, taxYear = '2027') {
    const income = Math.max(0, Number(annualTaxableIncome) || 0);
    const yearData = SA_TAX_YEARS[taxYear] || SA_TAX_YEARS['2027'];
    const brackets = yearData.brackets;

    let grossTax = 0;
    const bracketBreakdown = [];

    for (const b of brackets) {
        if (income > b.min) {
            const sliceMax = b.max === Infinity ? income : Math.min(income, b.max);
            const taxableSlice = roundTo(sliceMax - b.min, 2);
            const taxInBracket = roundTo(taxableSlice * b.rate, 2);

            grossTax += taxInBracket;
            bracketBreakdown.push({
                label: b.label,
                rate: b.rate,
                taxableInBracket: taxableSlice,
                taxPaid: taxInBracket
            });
        } else {
            break;
        }
    }

    return {
        annualGrossTax: roundTo(grossTax, 2),
        bracketBreakdown
    };
}

/**
 * Comprehensive South African Salary and Take-Home Pay Calculation
 *
 * @param {Object} inputs
 * @param {number} inputs.basicSalary - Monthly basic salary in ZAR
 * @param {number} [inputs.cashAllowances=0] - Monthly cash allowances (travel, cell, entertainment)
 * @param {number} [inputs.bonusMonthly=0] - Monthly prorated performance bonus
 * @param {string} [inputs.ageCategory='under65'] - 'under65', '65to74', or '75plus'
 * @param {number} [inputs.retirementContribution=0] - Monthly employee pension/provident/RA contribution
 * @param {number} [inputs.employerRetirement=0] - Monthly employer retirement fund contribution
 * @param {boolean|string} [inputs.hasMedicalAid=false] - Whether taxpayer is on registered medical aid
 * @param {number} [inputs.medicalDependents=0] - Number of registered medical aid dependents
 * @param {number} [inputs.voluntaryDeductions=0] - Other personal deductions (staff loan, union dues)
 * @param {string} [inputs.taxYear='2027'] - '2027' (Active) or '2026' (Historical)
 * @returns {Object} Comprehensive payroll result
 */
export function calculateSouthAfricaSalary(inputs = {}) {
    const basicSalary = Math.max(0, Number(inputs.basicSalary) || 0);
    const cashAllowances = Math.max(0, Number(inputs.cashAllowances) || 0);
    const bonusMonthly = Math.max(0, Number(inputs.bonusMonthly) || 0);
    const ageCategory = inputs.ageCategory || 'under65';
    const retirementContribution = Math.max(0, Number(inputs.retirementContribution) || 0);
    const employerRetirement = Math.max(0, Number(inputs.employerRetirement) || 0);
    const hasMedicalAid = inputs.hasMedicalAid === true || inputs.hasMedicalAid === 'yes';
    const medicalDependents = Math.max(0, Math.floor(Number(inputs.medicalDependents) || 0));
    const voluntaryDeductions = Math.max(0, Number(inputs.voluntaryDeductions) || 0);
    const taxYear = inputs.taxYear === '2026' ? '2026' : '2027';

    // 1. Monthly Gross Remuneration
    const grossSalary = roundTo(basicSalary + cashAllowances + bonusMonthly, 2);

    // 2. Section 11F Retirement Allowable Deduction
    const retirement = calculateSouthAfricaRetirementDeduction(retirementContribution, grossSalary);
    const allowableRetirement = retirement.allowableDeduction;

    // 3. Taxable Income (Monthly & Annual)
    const monthlyTaxableIncome = Math.max(0, roundTo(grossSalary - allowableRetirement, 2));
    const annualTaxableIncome = roundTo(monthlyTaxableIncome * 12, 2);

    // 4. Annual Gross PAYE Tax (Before Rebates & Credits)
    const { annualGrossTax, bracketBreakdown } = calculateSouthAfricaGrossPAYE(annualTaxableIncome, taxYear);

    // 5. Section 6 Rebates
    const rebate = calculateSouthAfricaRebate(ageCategory, taxYear);
    const annualRebate = rebate.annualRebate;

    // 6. Tax After Rebates (Cannot be negative)
    const annualTaxAfterRebate = Math.max(0, roundTo(annualGrossTax - annualRebate, 2));

    // 7. Section 6A Medical Scheme Fees Tax Credit (MTC)
    const medicalCredit = calculateSouthAfricaMedicalCredit(hasMedicalAid, medicalDependents, taxYear);
    const annualMedicalCredit = medicalCredit.annualCredit;

    // 8. Final Annual & Monthly Net PAYE Tax (Cannot be less than 0)
    const annualNetTax = Math.max(0, roundTo(annualTaxAfterRebate - annualMedicalCredit, 2));
    const monthlyNetTax = roundTo(annualNetTax / 12, 2);

    // 9. Statutory Unemployment Insurance Fund (UIF)
    const uif = calculateSouthAfricaUIF(grossSalary);
    const employeeUif = uif.employeeUif;
    const employerUif = uif.employerUif;

    // 10. Employer Skills Development Levy (SDL: 1% of gross)
    const employerSdl = roundTo(grossSalary * SA_STATUTORY_RATES.SDL_RATE, 2);

    // 11. Total Employee Deductions & Net Take-Home Pay
    const totalDeductions = roundTo(monthlyNetTax + employeeUif + retirementContribution + voluntaryDeductions, 2);
    const netSalary = roundTo(grossSalary - totalDeductions, 2);

    // 12. Total Cost to Employer (CTC)
    const costToEmployer = roundTo(grossSalary + employerUif + employerSdl + employerRetirement, 2);

    // 13. Rates
    const effectiveTaxRate = grossSalary > 0 ? roundTo((monthlyNetTax / grossSalary) * 100, 2) : 0;
    const totalDeductionRate = grossSalary > 0 ? roundTo((totalDeductions / grossSalary) * 100, 2) : 0;

    const activeBrackets = (SA_TAX_YEARS[taxYear] || SA_TAX_YEARS['2027']).brackets;
    const topBracket = activeBrackets.slice().reverse().find(b => annualTaxableIncome > b.min) || activeBrackets[0];
    const marginalRate = roundTo(topBracket.rate * 100, 1);

    return {
        currency: 'ZAR',
        currencySymbol: 'R',
        monthly: {
            basicSalary,
            cashAllowances,
            bonusMonthly,
            grossSalary,
            allowableRetirement,
            retirementContribution,
            monthlyTaxableIncome,
            grossPaye: roundTo(annualGrossTax / 12, 2),
            rebate: rebate.monthlyRebate,
            medicalCredit: medicalCredit.monthlyCredit,
            netPaye: monthlyNetTax,
            uif: employeeUif,
            employerUif,
            employerSdl,
            voluntaryDeductions,
            totalDeductions,
            netSalary,
            costToEmployer
        },
        annual: {
            gross: roundTo(grossSalary * 12, 2),
            taxableIncome: annualTaxableIncome,
            grossPaye: annualGrossTax,
            rebate: annualRebate,
            medicalCredit: annualMedicalCredit,
            netPaye: annualNetTax,
            uif: roundTo(employeeUif * 12, 2),
            totalDeductions: roundTo(totalDeductions * 12, 2),
            net: roundTo(netSalary * 12, 2),
            costToEmployer: roundTo(costToEmployer * 12, 2)
        },
        rates: {
            effectiveTaxRate,
            totalDeductionRate,
            marginalRate,
            uifRate: SA_STATUTORY_RATES.UIF_RATE * 100,
            sdlRate: SA_STATUTORY_RATES.SDL_RATE * 100
        },
        breakdown: bracketBreakdown,
        metadata: {
            taxYear: (SA_TAX_YEARS[taxYear] || SA_TAX_YEARS['2027']).name,
            legalFramework: 'South African Revenue Service (SARS) Income Tax Act No. 58 of 1962',
            uifFramework: 'Unemployment Insurance Contributions Act No. 4 of 2002',
            retirementSection: 'Section 11F (Max 27.5%, capped at R350,000/yr)',
            medicalSection: 'Section 6A Medical Scheme Fees Tax Credit',
            lastVerified: '2026-10-16',
            jurisdiction: 'ZA'
        }
    };
}

/**
 * Standard tool definition for the South African Salary & Tax Calculator
 * Compatible with GetCalcu tool-runner and build-seo pre-rendering pipelines.
 */
export const southAfricaSalaryCalculator = {
    id: 'salary-calculator',
    slug: 'salary-calculator/za',
    baseSlug: 'salary-calculator',
    country: 'za',
    countryName: 'South Africa',
    countryFlag: '🇿🇦',
    currency: 'ZAR',
    currencySymbol: 'R',
    name: 'South Africa Salary & PAYE Tax Calculator',
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
    description: 'Calculate monthly take-home pay, SARS PAYE tax (2026/2027 tax tables), Section 6 rebates, Section 6A medical tax credits, and 1% UIF in South Africa.',
    metaTitle: 'South Africa Salary & PAYE Calculator 2026/2027 | Net Pay, SARS & UIF',
    metaDescription: 'Free South African salary calculator updated for 2026/2027 SARS tax brackets. Calculate monthly take-home pay, PAYE tax, age rebates, medical aid credits, and UIF.',
    keywords: [
        'south africa salary calculator',
        'sars tax calculator',
        'paye calculator south africa 2026 2027',
        'south africa net pay calculator',
        'uif calculator',
        'medical tax credits south africa',
        'cape town salary calculator',
        'johannesburg payroll calculator'
    ],
    presets: [
        {
            label: 'Tax Threshold Earner (R8,250/mo)',
            values: {
                basicSalary: 8250,
                cashAllowances: 0,
                ageCategory: 'under65',
                retirementContribution: 0,
                hasMedicalAid: 'no',
                medicalDependents: 0,
                voluntaryDeductions: 0,
                taxYear: '2027'
            }
        },
        {
            label: 'Mid-Level Professional (R35,000/mo)',
            values: {
                basicSalary: 30000,
                cashAllowances: 5000,
                ageCategory: 'under65',
                retirementContribution: 2500,
                hasMedicalAid: 'yes',
                medicalDependents: 1,
                voluntaryDeductions: 0,
                taxYear: '2027'
            }
        },
        {
            label: 'Senior Executive (R85,000/mo)',
            values: {
                basicSalary: 75000,
                cashAllowances: 10000,
                ageCategory: 'under65',
                retirementContribution: 7500,
                hasMedicalAid: 'yes',
                medicalDependents: 3,
                voluntaryDeductions: 0,
                taxYear: '2027'
            }
        }
    ],
    fields: [
        {
            id: 'basicSalary',
            label: 'Monthly Basic Salary (R)',
            type: 'number',
            default: 30000,
            min: 0,
            step: 1000,
            hint: 'Your contractual monthly base salary in South African Rand (ZAR).'
        },
        {
            id: 'cashAllowances',
            label: 'Cash Allowances & Bonus (R/mo)',
            type: 'number',
            default: 5000,
            min: 0,
            step: 500,
            hint: 'Monthly taxable cash allowances (travel, cell, entertainment, or bonus).'
        },
        {
            id: 'ageCategory',
            label: 'Taxpayer Age Category',
            type: 'select',
            default: 'under65',
            options: [
                { value: 'under65', label: 'Under 65 (Primary Rebate R17,820)' },
                { value: '65to74', label: '65 to 74 (Secondary Rebate R27,585)' },
                { value: '75plus', label: '75 and Older (Tertiary Rebate R30,834)' }
            ],
            hint: 'SARS grants higher statutory tax rebates for older taxpayers under Section 6.'
        },
        {
            id: 'retirementContribution',
            label: 'Pension / Provident / RA Contribution (R/mo)',
            type: 'number',
            default: 2500,
            min: 0,
            step: 500,
            hint: 'Monthly employee contribution to pension, provident, or retirement annuity fund (tax-deductible up to 27.5%).'
        },
        {
            id: 'hasMedicalAid',
            label: 'Medical Aid Scheme Member',
            type: 'select',
            default: 'yes',
            options: [
                { value: 'yes', label: 'Yes — Registered Medical Scheme' },
                { value: 'no', label: 'No Medical Aid' }
            ],
            hint: 'Qualifies for Section 6A Medical Scheme Fees Tax Credit (R376/mo main member).'
        },
        {
            id: 'medicalDependents',
            label: 'Medical Aid Dependents',
            type: 'number',
            default: 1,
            min: 0,
            max: 10,
            step: 1,
            hint: 'Number of registered dependents on your medical scheme (excluding yourself).'
        },
        {
            id: 'voluntaryDeductions',
            label: 'Other Voluntary Deductions (R/mo)',
            type: 'number',
            default: 0,
            min: 0,
            step: 250,
            hint: 'Personal payroll deductions such as trade union fees, staff loans, or insurance.'
        },
        {
            id: 'taxYear',
            label: 'SARS Tax Year',
            type: 'select',
            default: '2027',
            options: [
                { value: '2027', label: '2026 / 2027 Tax Year (1 Mar 2026 – 28 Feb 2027: Active)' },
                { value: '2026', label: '2025 / 2026 Tax Year (1 Mar 2025 – 28 Feb 2026: Historical)' }
            ],
            hint: 'Select the SARS tax assessment year.'
        }
    ],
    calculate(v) {
        const basicSalary = Math.max(0, Number(v.basicSalary) || 0);
        const cashAllowances = Math.max(0, Number(v.cashAllowances) || 0);
        const ageCategory = v.ageCategory || 'under65';
        const retirementContribution = Math.max(0, Number(v.retirementContribution) || 0);
        const hasMedicalAid = v.hasMedicalAid === 'yes' || v.hasMedicalAid === true;
        const medicalDependents = Math.max(0, Math.floor(Number(v.medicalDependents) || 0));
        const voluntaryDeductions = Math.max(0, Number(v.voluntaryDeductions) || 0);
        const taxYear = v.taxYear === '2026' ? '2026' : '2027';

        if (basicSalary <= 0 && cashAllowances <= 0) {
            return {
                stats: [
                    { label: 'Net Take-Home Pay', value: 'R0.00', highlight: true }
                ],
                insight: {
                    tone: 'warning',
                    icon: 'fa-triangle-exclamation',
                    headline: 'Salary Input Required',
                    detail: 'Please enter your monthly basic salary to calculate South African PAYE tax, UIF, and net take-home pay.'
                }
            };
        }

        const res = calculateSouthAfricaSalary({
            basicSalary,
            cashAllowances,
            ageCategory,
            retirementContribution,
            hasMedicalAid,
            medicalDependents,
            voluntaryDeductions,
            taxYear
        });

        const m = res.monthly;
        const fmtRand = (n) => 'R ' + Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const pctStr = (n) => (Number(n) || 0).toFixed(1) + '%';

        return {
            stats: [
                { label: 'Net Take-Home Pay (Monthly)', value: fmtRand(m.netSalary), highlight: true },
                { label: 'Net Take-Home Pay (Annual)', value: fmtRand(res.annual.net) },
                { label: `SARS PAYE Tax (${taxYear})`, value: fmtRand(m.netPaye) },
                { label: 'UIF Contribution (1%)', value: fmtRand(m.uif) },
                { label: 'Pension/RA Deduction (Sec 11F)', value: fmtRand(m.allowableRetirement) },
                { label: 'Medical Tax Credit (Sec 6A)', value: fmtRand(m.medicalCredit) },
                { label: 'Gross Monthly Earnings', value: fmtRand(m.grossSalary) },
                { label: 'Annual Taxable Income', value: fmtRand(res.annual.taxableIncome) },
                { label: 'Effective Tax Rate', value: pctStr(res.rates.effectiveTaxRate), warn: res.rates.effectiveTaxRate > 25 },
                { label: 'Marginal Tax Bracket', value: pctStr(res.rates.marginalRate) }
            ],
            insight: {
                tone: 'positive',
                icon: 'fa-shield-halved',
                headline: `Net Take-Home Pay: ${pctStr((m.netSalary / m.grossSalary) * 100)} of Gross Salary`,
                detail: `From monthly gross income of ${fmtRand(m.grossSalary)}, total deductions equal ${fmtRand(m.totalDeductions)} (${fmtRand(m.netPaye)} PAYE tax + ${fmtRand(m.uif)} UIF + ${fmtRand(m.retirementContribution)} retirement fund). Net take-home pay is ${fmtRand(m.netSalary)}.`
            },
            chart: {
                type: 'doughnut',
                labels: ['Net Take-Home Pay', 'SARS PAYE Tax', 'UIF (1%)', 'Retirement Fund', 'Other Deductions'],
                data: [m.netSalary, m.netPaye, m.uif, m.retirementContribution, m.voluntaryDeductions],
                colors: ['#10B981', '#6366F1', '#3B82F6', '#F59E0B', '#8B5CF6']
            },
            bars: [
                { label: 'Net Take-Home Pay', percent: roundTo((m.netSalary / m.grossSalary) * 100, 1), color: '#10B981' },
                { label: 'SARS PAYE Tax', percent: roundTo((m.netPaye / m.grossSalary) * 100, 1), color: '#6366F1' },
                { label: 'Retirement Fund (Sec 11F)', percent: roundTo((m.retirementContribution / m.grossSalary) * 100, 1), color: '#F59E0B' },
                { label: 'UIF (1%)', percent: roundTo((m.uif / m.grossSalary) * 100, 1), color: '#3B82F6' }
            ]
        };
    },
    methodology: {
        standards: 'South African Revenue Service (SARS) Income Tax Act No. 58 of 1962 & Unemployment Insurance Contributions Act No. 4 of 2002.',
        sources: [
            'SARS PAYE Monthly Deduction Tables (2026/2027 & 2025/2026)',
            'National Treasury Budget Review & Income Tax Tables',
            'Department of Employment and Labour UIF Regulations',
            'South African Medical Scheme Fees Tax Credit (MTC) Schedule'
        ],
        lastReviewed: 'October 2026',
        assumptions: [
            '2027 tax year covers 1 March 2026 to 28 February 2027, incorporating revised brackets (R245,100 initial bracket), Section 6 primary rebate of R17,820, and medical scheme credit of R376/mo.',
            'Retirement fund contributions are deductible up to 27.5% of remuneration, capped at R350,000 per annum under Section 11F.',
            'UIF contribution is 1% of remuneration, subject to the statutory monthly earnings ceiling of R17,712 (maximum R177.12/mo).'
        ]
    },
    article: {
        heading: 'Understanding South African PAYE Tax, UIF, Rebates, and Take-Home Pay',
        intro: 'In South Africa, individual employment earnings are subject to Pay-As-You-Earn (PAYE) income tax withholding administered by the South African Revenue Service (SARS) under the Income Tax Act No. 58 of 1962. Net take-home salary is calculated by deducting allowable retirement contributions from gross income, applying progressive tax tables, and offsetting the resulting tax liability with statutory age-based rebates and medical aid tax credits.',
        sections: [
            {
                heading: 'SARS Progressive Tax Brackets (2026/2027 Tax Year)',
                body: 'For the 2026/2027 tax assessment year (1 March 2026 – 28 February 2027), South Africa operates 7 progressive brackets: R0 to R245,100 at 18%; R245,101 to R383,100 at 26%; R383,101 to R530,200 at 31%; R530,201 to R695,800 at 36%; R695,801 to R887,000 at 39%; R887,001 to R1,878,600 at 41%; and earnings exceeding R1,878,600 at 45%.'
            },
            {
                heading: 'Section 6 Statutory Tax Rebates & Thresholds',
                body: 'For the 2027 tax year, the Primary Tax Rebate is R17,820 per annum (R1,485.00 per month). Taxpayers aged 65 to 74 receive an additional Secondary Rebate of R9,765 per annum (total rebate R27,585). Taxpayers aged 75 and older receive an additional Tertiary Rebate of R3,249 per annum (total rebate R30,834). Because of these rebates, taxpayers under 65 earning under the tax threshold of R99,000 per year (R8,250 per month) pay zero income tax.'
            },
            {
                heading: 'Section 11F Retirement Deductions (Pension, Provident & RA)',
                body: 'Contributions made to pension funds, provident funds, and retirement annuity (RA) funds are tax-deductible under Section 11F of the Income Tax Act. The allowable deduction is capped at the lesser of actual contributions, 27.5% of remuneration, or R350,000 per annum (R29,166.67 per month).'
            },
            {
                heading: 'Section 6A Medical Scheme Fees Tax Credit (MTC)',
                body: 'Under Section 6A for the 2027 tax year, the monthly non-refundable tax credit is R376 for the primary member, R376 for the first dependent, and R254 for each additional dependent, directly offsetting PAYE tax payable.'
            },
            {
                heading: 'Unemployment Insurance Fund (UIF) Contributions',
                body: 'Both employee and employer contribute 1% of gross remuneration to the UIF each month, subject to the statutory monthly earnings ceiling of R17,712 per month (maximum employee deduction of R177.12 per month).'
            }
        ]
    },
    howTo: [
        'Enter your Monthly Basic Salary in South African Rand (ZAR).',
        'Enter any taxable cash allowances, travel allowances, or regular bonuses.',
        'Select your age category to apply the correct SARS Primary, Secondary, or Tertiary rebate.',
        'Input your monthly pension, provident, or retirement annuity (RA) contribution.',
        'Indicate whether you belong to a medical aid scheme and the number of registered dependents.',
        'Choose the SARS tax year (2026/2027 active or 2025/2026 historical).',
        'Review your calculated net take-home salary, SARS PAYE tax, UIF, and medical credits.'
    ],
    formula: 'Net Salary = Gross Remuneration − SARS Net PAYE − UIF (1% up to R177.12) − Retirement Contribution − Voluntary Deductions',
    examples: [
        {
            title: 'Tax Threshold Earner (R8,250/mo Gross) — 2026/2027 Active Year',
            input: 'Basic: R8,250, Age: Under 65, No Medical Aid',
            result: 'Net Pay: R8,167.50/mo | PAYE: R0.00 | UIF: R82.50',
            explanation: 'Annual earnings of R99,000 generate R17,820 in gross tax. After the 2027 primary rebate of R17,820, PAYE tax is exactly R0.00. Deductions consist only of 1% UIF (R82.50).'
        },
        {
            title: 'Mid-Level Professional (R35,000/mo Gross) — 2026/2027 Active Year',
            input: 'Basic: R30,000, Allowances: R5,000, RA: R2,500, Medical Aid: 1 Dependent',
            result: 'Net Pay: R27,715.13/mo | PAYE: R4,607.75 | UIF: R177.12 | Pension: R2,500.00',
            explanation: 'Taxable pay is R32,500/mo (R390,000/yr). Annual gross tax is R82,137. Less primary rebate (R17,820) and medical credits for 2 members (R9,024/yr), net annual tax is R55,293 (R4,607.75/mo). UIF is capped at R177.12.'
        },
        {
            title: 'Senior Executive (R85,000/mo Gross) — 2026/2027 Active Year',
            input: 'Basic: R75,000, Allowances: R10,000, RA: R7,500, Medical Aid: 3 Dependents',
            result: 'Net Pay: R61,130.63/mo | PAYE: R16,192.25 | UIF: R177.12 | Pension: R7,500.00',
            explanation: 'Taxable pay is R77,500/mo (R930,000/yr). Medical credit for 4 members equals R1,260/mo (R15,120/yr). Net PAYE is R16,192.25/mo.'
        }
    ],
    faqs: [
        {
            q: 'How is PAYE tax calculated in South Africa for the 2026/2027 tax year?',
            a: 'PAYE is calculated on annual taxable remuneration (gross income minus Section 11F retirement deductions) using the 7 progressive SARS tax brackets (18% to 45%). The gross tax is reduced by Section 6 statutory rebates (Primary R17,820) and Section 6A medical aid tax credits (R376/mo for main member and first dependent).'
        },
        {
            q: 'What is the maximum UIF deduction in South Africa?',
            a: 'The employee UIF deduction is 1% of gross remuneration, capped at the statutory ceiling of R17,712 per month, resulting in a maximum monthly employee deduction of R177.12.'
        },
        {
            q: 'How much of my pension or RA contribution is tax deductible?',
            a: 'Under Section 11F of the Income Tax Act, contributions to pension, provident, and retirement annuity funds are deductible up to 27.5% of remuneration, subject to an overall statutory maximum of R350,000 per year (R29,166.67 per month).'
        },
        {
            q: 'How do medical aid tax credits (Section 6A) work in 2026/2027?',
            a: 'Medical Scheme Fees Tax Credits are fixed non-refundable monthly credits that reduce your PAYE tax: R376 for the main member, R376 for the first dependent, and R254 for each additional dependent.'
        },
        {
            q: 'Can I still calculate tax under the 2025/2026 SARS tax tables?',
            a: 'Yes. GetCalcu allows you to select the "2025 / 2026 Tax Year" from the dropdown to calculate historical payroll.'
        }
    ]
};
