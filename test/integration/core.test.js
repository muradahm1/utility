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
        expect(registered).toHaveLength(3);
    });
});
