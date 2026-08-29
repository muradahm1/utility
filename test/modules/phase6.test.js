import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportToCSV, exportToJSON, exportAmortizationSchedule } from '../../js/modules/export.js';
import { buildFAQHtml, createFAQItem, searchFAQs } from '../../js/modules/faq.js';
import { getRelatedTools } from '../../js/modules/related-tools.js';
import { getPersonalizedRecommendations } from '../../js/modules/recommendations.js';

describe('Phase 6 Modules', () => {
    describe('Export Module', () => {
        it('exports data array to CSV format correctly', () => {
            const data = [
                { Metric: 'Monthly Payment', Value: '$1,200.00' },
                { Metric: 'Total Interest', Value: '$45,000.00' }
            ];
            const csv = exportToCSV(data, { filename: 'test.csv' });
            expect(csv).toContain('Metric,Value');
            expect(csv).toContain('Monthly Payment,"$1,200.00"');
        });

        it('exports data to JSON correctly', () => {
            const data = { principal: 100000, rate: 5 };
            const json = exportToJSON(data);
            expect(JSON.parse(json)).toEqual(data);
        });

        it('exports amortization schedule correctly', () => {
            const schedule = [
                { month: 1, payment: '$536.82', principal: '$120.15', interest: '$416.67', balance: '$99,879.85' }
            ];
            const text = exportAmortizationSchedule(schedule);
            expect(text).toContain('Month,Payment,Principal,Interest,Balance');
            expect(text).toContain('1,$536.82,$120.15,$416.67,$99,879.85');
        });
    });

    describe('FAQ Module', () => {
        it('creates FAQ items and builds HTML markup', () => {
            const item = createFAQItem('What is APR?', 'Annual Percentage Rate', ['rate', 'loan']);
            expect(item.q).toBe('What is APR?');
            const html = buildFAQHtml([item], { searchable: false });
            expect(html).toContain('What is APR?');
            expect(html).toContain('Annual Percentage Rate');
        });

        it('searches FAQs by query keyword', () => {
            const faqs = [
                createFAQItem('What is BMI?', 'Body Mass Index', ['health']),
                createFAQItem('What is Loan Term?', 'Duration of loan', ['finance'])
            ];
            const results = searchFAQs(faqs, 'health');
            expect(results.length).toBe(1);
            expect(results[0].q).toBe('What is BMI?');
        });
    });

    describe('Recommendations Module', () => {
        it('generates contextual recommendations based on user results', () => {
            const context = {
                tool: { id: 'mortgage-calculator', category: 'Finance' },
                result: { stats: [{ label: 'Monthly Payment', value: '$3,500.00' }] },
                inputs: { homePrice: 500000 }
            };
            const recs = getPersonalizedRecommendations(context);
            expect(recs.length).toBeGreaterThan(0);
        });
    });
});
