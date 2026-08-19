/**
 * Health Calculators Module
 * 
 * Contains all health-related calculator definitions.
 * 
 * @module calculators/health
 */

import { safeNum, safeStr, roundTo } from '../utils/index.js';
import { escapeHtml } from '../utils/index.js';

const errorResult = (message) => ({ error: true, stats: [{ label: 'Error', value: message, warn: true }] });
const bmiCategory = (bmi) => {
    if (!isFinite(bmi)) return { label: '—', color: '#64748B' };
    if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (bmi < 25) return { label: 'Normal Weight', color: '#10B981' };
    if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
};

// ── BMI Calculator ─────────────────────────────────────────────

export const bmiCalculator = {
    id: 'bmi-calculator',
    name: 'BMI Calculator',
    category: 'Health',
    icon: 'fa-heart-pulse',
    iconClass: 'icon-health',
    tagClass: 'tag-health',
    description: 'Calculate your Body Mass Index (BMI) and see which weight category you fall into.',
    metaDescription: 'Free BMI calculator — instantly calculate your Body Mass Index and find out if you are underweight, normal, overweight, or obese.',
    fields: [
        { id: 'height', label: 'Height (cm)', type: 'number', default: 170, min: 50, max: 300, step: 1, hint: 'Your height in centimeters.' },
        { id: 'weight', label: 'Weight (kg)', type: 'number', default: 70, min: 10, max: 500, step: 0.1, hint: 'Your weight in kilograms.' },
    ],
    calculate(v) {
        const height = safeNum(v.height, 0) / 100; // Convert to meters
        const weight = safeNum(v.weight, 0);
        if (height <= 0 || weight <= 0) return errorResult('Please enter valid height and weight.');
        const bmi = roundTo(weight / (height * height), 1);
        const category = bmiCategory(bmi);
        return {
            stats: [
                { label: 'Your BMI', value: bmi.toFixed(1), highlight: true, color: category.color },
                { label: 'Category', value: category.label, color: category.color },
                { label: 'Healthy BMI Range', value: '18.5 – 24.9' },
            ],
            bmiGauge: { bmi, label: category.label, color: category.color },
            insight: {
                tone: bmi < 18.5 ? 'warning' : bmi < 25 ? 'positive' : bmi < 30 ? 'neutral' : 'warning',
                icon: 'fa-heart-pulse',
                headline: `Your BMI is ${bmi.toFixed(1)} — ${category.label}`,
                detail: bmi < 18.5 ? 'Consider consulting a healthcare provider about healthy weight gain strategies.' :
                        bmi < 25 ? 'Great! You are in the healthy weight range. Maintain your current lifestyle.' :
                        bmi < 30 ? 'Consider adopting healthier eating habits and increasing physical activity.' :
                        'Consult a healthcare provider for personalized advice on weight management.'
            }
        };
    },
    article: { heading: 'Understanding BMI and Healthy Weight', intro: 'Body Mass Index (BMI) is a widely used measure of body fat based on height and weight.', sections: [] },
    howTo: [], examples: [], formula: 'BMI = weight (kg) ÷ height (m)²', faqs: []
};

// ── Export all health calculators ───────────────────────────────

export const healthCalculators = [
    bmiCalculator,
    // Additional health calculators will be added here
];

/**
 * Register all health calculators with the tool registry
 * Only registers if the tool is not already registered (preserves richer legacy definitions)
 * @param {Function} registerTool - Tool registration function
 * @param {Function} toolExists - Tool existence check function
 */
export function registerHealthCalculators(registerTool, toolExists) {
    healthCalculators.forEach(calculator => {
        // Skip if already registered (legacy tools have richer content)
        if (toolExists && toolExists(calculator.id)) {
            return;
        }
        registerTool(calculator.id, calculator);
    });
}
