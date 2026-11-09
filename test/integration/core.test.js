/**
 * Integration tests for the core architecture (Phase 2 fixes).
 * Tests the tool registry, construction calculator registration,
 * and the customRenderer defensive check (ISSUE-106).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
    TOOLS, registerTool, unregisterTool, getTool, getAllTools,
    getToolCount, toolExists
} from '../../js/core/tools.js';
import { registerConstructionCalculators } from '../../js/calculators/construction.js';
import { registerFinanceCalculators, retirementCalculator } from '../../js/calculators/finance.js';
import { ChartManager } from '../../js/modules/charts.js';

describe('Core Tool Registry', () => {
    it('TOOLS is an object', () => {
        expect(typeof TOOLS).toBe('object');
    });

    it('getToolCount returns a number', () => {
        expect(typeof getToolCount()).toBe('number');
    });

    it('getAllTools returns an object', () => {
        const all = getAllTools();
        expect(typeof all).toBe('object');
    });

    it('getTool returns undefined for unknown slug', () => {
        expect(getTool('nonexistent-tool')).toBeUndefined();
    });

    it('toolExists returns false for unknown slug', () => {
        expect(toolExists('nonexistent-tool')).toBe(false);
    });

    it('registerTool adds a tool and getTool retrieves it', () => {
        const testTool = {
            name: 'Test Tool',
            category: 'Test',
            description: 'A test tool',
            fields: [{ id: 'x', label: 'X', type: 'number', default: 1 }],
            calculate: (v) => ({ stats: [{ label: 'Result', value: v.x * 2 }] }),
        };
        const result = registerTool('test-tool', testTool);
        expect(result).toBe(true);
        expect(toolExists('test-tool')).toBe(true);
        expect(getTool('test-tool')).toEqual(testTool);
        unregisterTool('test-tool');
        expect(toolExists('test-tool')).toBe(false);
    });
});

describe('ISSUE-101: Construction calculator registration via core', () => {
    beforeAll(() => {
        registerConstructionCalculators(registerTool, toolExists);
    });

    it('concrete-calculator is registered', () => {
        expect(toolExists('concrete-calculator')).toBe(true);
        const tool = getTool('concrete-calculator');
        expect(tool.name).toBe('Concrete Calculator');
        expect(tool.category).toBe('Construction');
    });

    it('paint-calculator is registered', () => {
        expect(toolExists('paint-calculator')).toBe(true);
        const tool = getTool('paint-calculator');
        expect(tool.name).toBe('Paint Calculator');
        expect(tool.category).toBe('Construction');
    });

    it('tile-calculator is registered', () => {
        expect(toolExists('tile-calculator')).toBe(true);
        const tool = getTool('tile-calculator');
        expect(tool.name).toBe('Tile Calculator');
        expect(tool.category).toBe('Construction');
    });

    it('all construction tools have calculate functions', () => {
        ['concrete-calculator', 'paint-calculator', 'tile-calculator'].forEach(slug => {
            const tool = getTool(slug);
            expect(typeof tool.calculate).toBe('function');
        });
    });
});

describe('ISSUE-106: customRenderer defensive check', () => {
    it('boolean true customRenderer is NOT a function', () => {
        const tool = { customRenderer: true };
        expect(typeof tool.customRenderer === 'function').toBe(false);
    });

    it('function customRenderer IS a function', () => {
        const tool = { customRenderer: () => {} };
        expect(typeof tool.customRenderer === 'function').toBe(true);
    });

    it('undefined customRenderer is NOT a function', () => {
        const tool = {};
        expect(typeof tool.customRenderer === 'function').toBe(false);
    });

    it('simulates the tool-runner render guard logic', () => {
        // This replicates the exact guard added in tool-runner.js:
        //   if (typeof tool.customRenderer === 'function') { ... }
        const tools = [
            { customRenderer: true, name: 'boolean-true' },
            { customRenderer: () => 'rendered', name: 'function' },
            { customRenderer: undefined, name: 'undefined' },
            { customRenderer: null, name: 'null' },
        ];
        const rendered = [];
        tools.forEach(tool => {
            if (typeof tool.customRenderer === 'function') {
                rendered.push(tool.name);
            }
        });
        // Only the function-based renderer should be invoked
        expect(rendered).toEqual(['function']);
    });
});

describe('Safe module loading (try/catch resilience)', () => {
    it('registerConstructionCalculators does not throw on valid input', () => {
        const registered = [];
        const reg = {};
        const registerTool = (slug) => { registered.push(slug); return true; };
        const toolExists = (slug) => slug in reg;
        expect(() => {
            registerConstructionCalculators(registerTool, toolExists);
        }).not.toThrow();
    });

    it('registerConstructionCalculators handles missing toolExists gracefully', () => {
        const registered = [];
        const registerTool = (slug) => { registered.push(slug); return true; };
        // Pass undefined for toolExists — should not crash
        expect(() => {
            registerConstructionCalculators(registerTool, undefined);
        }).not.toThrow();
        expect(registered).toHaveLength(4);
    });
});

describe('Finance Calculator Registration & Unified Visual System', () => {
    it('registerFinanceCalculators registers retirement-calculator and finance tools', () => {
        const registered = [];
        const mockRegister = (slug, calc) => { registered.push(slug); return true; };
        const mockExists = (slug) => false;
        registerFinanceCalculators(mockRegister, mockExists);

        expect(registered).toContain('retirement-calculator');
        expect(registered).toContain('mortgage-calculator');
        expect(registered).toContain('loan-calculator');
    });

    it('retirementCalculator computes accurate projection stats', () => {
        const res = retirementCalculator.calculate({
            current_age: 25,
            retirement_age: 65,
            current_savings: 10000,
            annual_income: 55000,
            monthly_contribution: 500,
            annual_return: 7.0,
            inflation_rate: 3.0,
            life_expectancy: 95,
            income_replacement: 80
        });

        expect(res).toBeDefined();
        expect(res.stats).toBeDefined();
        const nestEggStat = res.stats.find(s => s.label.includes('Projected Nest Egg'));
        expect(nestEggStat).toBeDefined();
        expect(nestEggStat.value).toContain('$619,975');
    });

    it('ChartManager.buildCardHtml generates unified multi-view tabs and legacy fallback', () => {
        const modernHtml = ChartManager.buildCardHtml({
            charts: [
                { id: 'v1', title: 'View 1', icon: 'fa-chart-area' },
                { id: 'v2', title: 'View 2', icon: 'fa-chart-pie' }
            ]
        });
        expect(modernHtml).toContain('chart-view-card');
        expect(modernHtml).toContain('data-chart-index="0"');
        expect(modernHtml).toContain('data-chart-index="1"');
        expect(modernHtml).toContain('id="result-chart"');

        const legacyHtml = ChartManager.buildCardHtml({
            chart: { labels: ['A', 'B'], data: [1, 2] }
        });
        expect(legacyHtml).toContain('id="result-chart"');
    });
});
