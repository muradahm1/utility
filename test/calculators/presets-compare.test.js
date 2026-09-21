import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    // Execute tools.js in a function scope to populate window.TOOLS
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('Phase 4: Calculator Presets & Scenario Comparison', () => {
    it('contains presets for key high-intent calculators', () => {
        const topTools = [
            'mortgage-calculator',
            'auto-loan-calculator',
            'salary-calculator',
            'tdee-calculator',
            'compound-interest-calculator',
            'savings-calculator',
            'credit-card-payoff-calculator'
        ];

        topTools.forEach(slug => {
            const tool = TOOLS()[slug];
            expect(tool).toBeDefined();
            expect(tool.presets).toBeDefined();
            expect(Array.isArray(tool.presets)).toBe(true);
            expect(tool.presets.length).toBeGreaterThan(0);
        });
    });

    it('successfully executes calculation for all mortgage presets', () => {
        const tool = TOOLS()['mortgage-calculator'];
        tool.presets.forEach(preset => {
            const res = tool.calculate(preset.values);
            expect(res.error).toBeFalsy();
            expect(res.stats).toBeDefined();
            expect(res.stats.length).toBeGreaterThan(0);
        });
    });

    it('successfully executes calculation for all auto loan presets', () => {
        const tool = TOOLS()['auto-loan-calculator'];
        tool.presets.forEach(preset => {
            const res = tool.calculate(preset.values);
            expect(res.error).toBeFalsy();
            expect(res.stats).toBeDefined();
        });
    });

    it('successfully executes calculation for all salary presets', () => {
        const tool = TOOLS()['salary-calculator'];
        tool.presets.forEach(preset => {
            const res = tool.calculate(preset.values);
            expect(res.error).toBeFalsy();
            expect(res.stats).toBeDefined();
        });
    });

    it('successfully executes calculation for all TDEE presets', () => {
        const tool = TOOLS()['tdee-calculator'];
        tool.presets.forEach(preset => {
            const res = tool.calculate(preset.values);
            expect(res.error).toBeFalsy();
            expect(res.stats).toBeDefined();
        });
    });

    it('computes accurate comparison deltas between 30-year and 15-year mortgage', () => {
        const tool = TOOLS()['mortgage-calculator'];
        const preset30 = tool.presets.find(p => p.label.includes('30-Yr'));
        const preset15 = tool.presets.find(p => p.label.includes('15-Yr'));

        expect(preset30).toBeDefined();
        expect(preset15).toBeDefined();

        const res30 = tool.calculate(preset30.values);
        const res15 = tool.calculate(preset15.values);

        const int30 = parseFloat(res30.stats.find(s => s.label === 'Total Interest').value.replace(/[$,]/g, ''));
        const int15 = parseFloat(res15.stats.find(s => s.label === 'Total Interest').value.replace(/[$,]/g, ''));

        // 15-year loan total interest is significantly lower than 30-year
        expect(int15).toBeLessThan(int30);
        const interestSaved = int30 - int15;
        expect(interestSaved).toBeGreaterThan(100000);
    });
});
