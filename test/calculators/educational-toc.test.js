/**
 * Educational Layout & On This Page (TOC) Tests
 * 
 * Verifies:
 * 1. Dynamic On This Page generation with native <details><summary><nav>
 * 2. Deterministic, stable IDs and 100% working anchor links (no broken links)
 * 3. Methodology & Editorial Standards rendering
 * 4. Mathematical accuracy of worked examples against calculate()
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { 
    buildMethodologyHtml, 
    buildOnThisPageHtml, 
    buildEducationalLayoutHtml 
} from '../../js/core/calculator-engine.js';

// Load legacy tools.js into global scope
const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    // eslint-disable-next-line no-new-func
    new Function(toolsSource)();
});

const getTool = (slug) => window.TOOLS[slug];

describe('Phase 1: On This Page & Educational Layout Component', () => {
    it('buildOnThisPageHtml generates native details/summary and nav with aria-label', () => {
        const tocItems = [
            { id: 'methodology', label: 'Methodology & Standards' },
            { id: 'how-to-calculate', label: 'How to Calculate Your Mortgage Payment' },
            { id: 'how-to-use', label: 'How to Use the Mortgage Calculator' },
            { id: 'formula', label: 'Mortgage Formula' },
            { id: 'worked-examples', label: 'Worked Examples' },
            { id: 'faqs', label: 'Frequently Asked Questions' },
        ];
        const html = buildOnThisPageHtml(tocItems);
        expect(html).toContain('<details class="on-this-page-details"');
        expect(html).toContain('<summary class="on-this-page-summary">');
        expect(html).toContain('On this page');
        expect(html).toContain('<nav class="on-this-page-nav" aria-label="On this page">');
        expect(html).toContain('<a href="#methodology" class="on-this-page-link">Methodology &amp; Standards</a>');
        expect(html).toContain('<a href="#formula" class="on-this-page-link">Mortgage Formula</a>');
    });

    it('buildMethodologyHtml renders id="methodology" and editorial badge', () => {
        const tool = getTool('mortgage-calculator');
        const html = buildMethodologyHtml(tool);
        expect(html).toContain('id="methodology"');
        expect(html).toContain('GetCalcu Methodology & Editorial Standards');
        expect(html).toContain('Editorial Standard');
        expect(html).toContain('Consumer Financial Protection Bureau');
        expect(html).toContain('Key Modeling Assumptions:');
    });

    it('buildEducationalLayoutHtml derives all TOC anchors matching actual section IDs (no broken anchors)', () => {
        const tool = getTool('mortgage-calculator');
        const html = buildEducationalLayoutHtml(tool, 'mortgage-calculator');

        // Verify two-column layout wrapper and sidebar
        expect(html).toContain('class="educational-layout"');
        expect(html).toContain('class="educational-main-content"');
        expect(html).toContain('class="educational-sidebar"');

        // Extract all href="#..." from On This Page
        const hrefMatches = Array.from(html.matchAll(/href="#([a-zA-Z0-9-_]+)"/g)).map(m => m[1]);
        expect(hrefMatches.length).toBeGreaterThan(3);

        // Verify that every single href anchor exists as an id="..." in the rendered HTML
        hrefMatches.forEach(targetId => {
            const idPattern = new RegExp(`id="${targetId}"`);
            expect(html).toMatch(idPattern);
        });
    });
});

describe('Phase 1: Mortgage Calculator Content & Math Verification', () => {
    it('mortgage-calculator has complete methodology, formula, article, and examples', () => {
        const tool = getTool('mortgage-calculator');
        expect(tool.methodology).toBeDefined();
        expect(tool.methodology.standards).toBeDefined();
        expect(tool.article).toBeDefined();
        expect(tool.article.sections.length).toBeGreaterThanOrEqual(4);
        expect(tool.formula).toBeDefined();
        expect(tool.formulaVariables).toBeDefined();
        expect(tool.examples.length).toBe(3);
        expect(tool.additionalSections.length).toBeGreaterThanOrEqual(1);
        expect(tool.faqs.length).toBeGreaterThanOrEqual(8);
    });

    it('Example 1 (30-Yr Fixed $400k, 20% down, 7%) matches calculate() exact values', () => {
        const tool = getTool('mortgage-calculator');
        const res = tool.calculate({
            home_price: 400000,
            down_payment: 80000,
            interest_rate: 7.0,
            loan_term: 30,
            property_tax: 4800,
            insurance: 1200,
        });

        // M = 2,128.97, PITI = 2,628.97, Total Interest = 446,429.20, Total Cost = 1,026,429.20
        const statMap = Object.fromEntries(res.stats.map(s => [s.label, s.value]));
        expect(statMap['Monthly Payment']).toBe('$2,628.97');
        expect(statMap['Principal & Interest']).toBe('$2,128.97');
        expect(statMap['Total Interest']).toBe('$446,429.20');
        expect(statMap['Total Cost']).toBe('$1,026,429.20');
        expect(statMap['Loan Amount']).toBe('$320,000.00');
    });

    it('Example 2 (15-Yr Fixed $400k, 20% down, 6.25%) matches calculate() exact values', () => {
        const tool = getTool('mortgage-calculator');
        const res = tool.calculate({
            home_price: 400000,
            down_payment: 80000,
            interest_rate: 6.25,
            loan_term: 15,
            property_tax: 4800,
            insurance: 1200,
        });

        const statMap = Object.fromEntries(res.stats.map(s => [s.label, s.value]));
        expect(statMap['Monthly Payment']).toBe('$3,243.75');
        expect(statMap['Principal & Interest']).toBe('$2,743.75');
        expect(statMap['Total Interest']).toBe('$173,875.00');
        expect(statMap['Total Cost']).toBe('$663,875.00');
    });

    it('Example 3 (Starter Home $300k, 5% down, 7%) matches calculate() exact values', () => {
        const tool = getTool('mortgage-calculator');
        const res = tool.calculate({
            home_price: 300000,
            down_payment: 15000,
            interest_rate: 7.0,
            loan_term: 30,
            property_tax: 3600,
            insurance: 1080,
        });

        const statMap = Object.fromEntries(res.stats.map(s => [s.label, s.value]));
        expect(statMap['Monthly Payment']).toBe('$2,286.11');
        expect(statMap['Principal & Interest']).toBe('$1,896.11');
        expect(statMap['Total Interest']).toBe('$397,599.60');
    });
});

describe('Phase 2: Representative Calculators Content & Math Verification', () => {
    const representativeSlugs = [
        'mortgage-calculator',
        'bmi-calculator',
        'percentage-calculator',
        'compound-interest-calculator',
        'rent-vs-buy-calculator',
        'fire-calculator',
        'loan-calculator',
        'house-affordability-calculator',
    ];

    it.each(representativeSlugs)('%s has valid methodology, article sections, and 100% anchor link integrity', (slug) => {
        const tool = getTool(slug);
        expect(tool).toBeDefined();
        expect(tool.methodology).toBeDefined();
        expect(tool.methodology.standards).toBeDefined();
        expect(tool.article).toBeDefined();

        const html = buildEducationalLayoutHtml(tool, slug);
        const hrefMatches = Array.from(html.matchAll(/href="#([a-zA-Z0-9-_]+)"/g)).map(m => m[1]);
        expect(hrefMatches.length).toBeGreaterThan(2);

        hrefMatches.forEach(targetId => {
            const idPattern = new RegExp(`id="${targetId}"`);
            expect(html).toMatch(idPattern);
        });
    });

    it('compound-interest-calculator math matches exact engine calculation', () => {
        const tool = getTool('compound-interest-calculator');
        const res = tool.calculate({
            principal: 10000,
            annual_rate: 8.0,
            compounding_freq: 'monthly',
            monthly_contribution: 500,
            time_years: 30,
        });
        const statMap = Object.fromEntries(res.stats.map(s => [s.label, s.value]));
        expect(statMap['Future Balance']).toBe('$854,537.02');
        expect(statMap['Total Contributions']).toBe('$190,000.00');
        expect(statMap['Total Interest Earned']).toBe('$664,537.02');
    });

    it('loan-calculator math matches exact engine calculation', () => {
        const tool = getTool('loan-calculator');
        const res = tool.calculate({
            loan_amount: 30000,
            interest_rate: 6.5,
            loan_term: 5,
        });
        const statMap = Object.fromEntries(res.stats.map(s => [s.label, s.value]));
        expect(statMap['Monthly Payment']).toBe('$586.98');
        expect(statMap['Total Interest']).toBe('$5,218.80');
        expect(statMap['Total Paid']).toBe('$35,218.80');
    });

    it('bmi-calculator math matches exact metric/imperial categories', () => {
        const tool = getTool('bmi-calculator');
        const metricRes = tool.calculate({ unit: 'metric', weight: 70, height: 175, age: 30 });
        const metricStats = Object.fromEntries(metricRes.stats.map(s => [s.label, s.value]));
        expect(metricStats['Your BMI']).toBe('22.86');
        expect(metricStats['Category']).toBe('Normal Weight');

        const impRes = tool.calculate({ unit: 'imperial', weight: 154, height: 69, age: 30 });
        const impStats = Object.fromEntries(impRes.stats.map(s => [s.label, s.value]));
        expect(impStats['Your BMI']).toBe('22.74');
        expect(impStats['Category']).toBe('Normal Weight');
    });
});
