/**
 * Unit tests for js/calculators/construction.js
 * Golden-value tests for concrete, paint, and tile calculators.
 * These verify the ISSUE-101 fix: construction.js now exports real
 * construction calculators + registerConstructionCalculators.
 */
import {
    concreteCalculator,
    paintCalculator,
    tileCalculator,
    stairCalculator,
    constructionCalculators,
    registerConstructionCalculators
} from '../../js/calculators/construction.js';

describe('Construction module exports', () => {
    it('exports registerConstructionCalculators function', () => {
        expect(typeof registerConstructionCalculators).toBe('function');
    });
    it('exports 4 calculators', () => {
        expect(constructionCalculators).toHaveLength(4);
    });
    it('each calculator has required fields', () => {
        constructionCalculators.forEach(calc => {
            expect(calc.id).toBeDefined();
            expect(calc.name).toBeDefined();
            expect(calc.category).toBe('Construction');
            expect(calc.description).toBeDefined();
            expect(Array.isArray(calc.fields)).toBe(true);
            expect(typeof calc.calculate).toBe('function');
        });
    });
    it('registerConstructionCalculators registers all 4 tools', () => {
        const registered = [];
        const reg = {};
        const registerTool = (slug, def) => { reg[slug] = def; registered.push(slug); return true; };
        const toolExists = (slug) => slug in reg;
        registerConstructionCalculators(registerTool, toolExists);
        expect(registered).toEqual(['concrete-calculator', 'paint-calculator', 'tile-calculator', 'stair-calculator']);
    });
    it('registerConstructionCalculators skips already-registered tools', () => {
        const registered = [];
        const reg = { 'concrete-calculator': true };
        const registerTool = (slug) => { registered.push(slug); return true; };
        const toolExists = (slug) => slug in reg;
        registerConstructionCalculators(registerTool, toolExists);
        expect(registered).not.toContain('concrete-calculator');
        expect(registered).toContain('paint-calculator');
        expect(registered).toContain('tile-calculator');
    });
});

describe('Concrete Calculator', () => {
    it('10x10x4" slab = 1.36 yd³ (with 10% waste)', () => {
        const r = concreteCalculator.calculate({
            shape: 'slab', length: 10, width: 10, depth: 4, quantity: 1, waste: 10,
        });
        expect(r.error).toBeFalsy();
        const yd3 = r.stats.find(s => s.label === 'Concrete Needed (cu yd)');
        expect(yd3.value).toBe('1.36 yd³');
    });
    it('round column 1.5ft dia x 8ft = 0.58 yd³', () => {
        const r = concreteCalculator.calculate({
            shape: 'column', diameter: 1.5, depth: 96, quantity: 1, waste: 10,
        });
        expect(r.error).toBeFalsy();
        const yd3 = r.stats.find(s => s.label === 'Concrete Needed (cu yd)');
        expect(yd3.value).toBe('0.58 yd³');
    });
    it('returns error for zero dimensions', () => {
        const r = concreteCalculator.calculate({
            shape: 'slab', length: 0, width: 0, depth: 4, quantity: 1, waste: 10,
        });
        expect(r.error).toBe(true);
    });
    it('returns error for zero depth', () => {
        const r = concreteCalculator.calculate({
            shape: 'slab', length: 10, width: 10, depth: 0, quantity: 1, waste: 10,
        });
        expect(r.error).toBe(true);
    });
    it('quantity multiplies volume', () => {
        const single = concreteCalculator.calculate({
            shape: 'slab', length: 10, width: 10, depth: 4, quantity: 1, waste: 0,
        });
        const triple = concreteCalculator.calculate({
            shape: 'slab', length: 10, width: 10, depth: 4, quantity: 3, waste: 0,
        });
        const singleCF = parseFloat(single.stats.find(s => s.label === 'Concrete Needed (cu ft)').value);
        const tripleCF = parseFloat(triple.stats.find(s => s.label === 'Concrete Needed (cu ft)').value);
        expect(tripleCF).toBeCloseTo(singleCF * 3, 1);
    });
    it('includes bag estimates', () => {
        const r = concreteCalculator.calculate({
            shape: 'slab', length: 10, width: 10, depth: 4, quantity: 1, waste: 10,
        });
        const bags80 = r.stats.find(s => s.label === '80lb Bags');
        expect(bags80.value).toContain('bags');
        expect(parseInt(bags80.value)).toBeGreaterThan(0);
    });
});

describe('Paint Calculator', () => {
    it('14x12x8 room with 1 door, 2 windows, 2 coats = 3 gallons', () => {
        const r = paintCalculator.calculate({
            surface: 'walls', room_length: 14, room_width: 12, wall_height: 8,
            doors: 1, windows: 2, coats: 2, coverage: 350,
        });
        expect(r.error).toBeFalsy();
        const gallons = r.stats.find(s => s.label === 'Paint Needed');
        expect(gallons.value).toBe('3 gal');
    });
    it('ceiling-only calculation', () => {
        const r = paintCalculator.calculate({
            surface: 'ceilings', room_length: 14, room_width: 12, wall_height: 8,
            doors: 0, windows: 0, coats: 2, coverage: 350,
        });
        expect(r.error).toBeFalsy();
        const area = r.stats.find(s => s.label === 'Total Paintable Area');
        expect(area.value).toBe('168 sq ft');
    });
    it('returns error for zero dimensions', () => {
        const r = paintCalculator.calculate({
            surface: 'walls', room_length: 0, room_width: 0, wall_height: 8,
            doors: 0, windows: 0, coats: 1, coverage: 350,
        });
        expect(r.error).toBe(true);
    });
    it('more coats = more paint', () => {
        const oneCoat = paintCalculator.calculate({
            surface: 'walls', room_length: 14, room_width: 12, wall_height: 8,
            doors: 1, windows: 2, coats: 1, coverage: 350,
        });
        const twoCoats = paintCalculator.calculate({
            surface: 'walls', room_length: 14, room_width: 12, wall_height: 8,
            doors: 1, windows: 2, coats: 2, coverage: 350,
        });
        const g1 = parseInt(oneCoat.stats.find(s => s.label === 'Paint Needed').value);
        const g2 = parseInt(twoCoats.stats.find(s => s.label === 'Paint Needed').value);
        expect(g2).toBeGreaterThanOrEqual(g1);
    });
});

describe('Tile Calculator', () => {
    it('10x8 floor with 12x12 tile = 87 tiles, 9 boxes', () => {
        const r = tileCalculator.calculate({
            area_length: 10, area_width: 8, tile_size: '12x12',
            grout: 0.125, waste: 10, per_box: 10,
        });
        expect(r.error).toBeFalsy();
        const total = r.stats.find(s => s.label === 'Total Tiles to Buy');
        expect(total.value).toBe('87 tiles');
        const boxes = r.stats.find(s => s.label === 'Boxes to Buy');
        expect(boxes.value).toBe('9 boxes');
    });
    it('returns error for zero dimensions', () => {
        const r = tileCalculator.calculate({
            area_length: 0, area_width: 0, tile_size: '12x12',
            grout: 0.125, waste: 10, per_box: 10,
        });
        expect(r.error).toBe(true);
    });
    it('larger waste factor = more tiles', () => {
        const low = tileCalculator.calculate({
            area_length: 10, area_width: 8, tile_size: '12x12',
            grout: 0.125, waste: 5, per_box: 10,
        });
        const high = tileCalculator.calculate({
            area_length: 10, area_width: 8, tile_size: '12x12',
            grout: 0.125, waste: 20, per_box: 10,
        });
        const tLow = parseInt(low.stats.find(s => s.label === 'Total Tiles to Buy').value);
        const tHigh = parseInt(high.stats.find(s => s.label === 'Total Tiles to Buy').value);
        expect(tHigh).toBeGreaterThan(tLow);
    });
    it('24x24 tile needs fewer tiles than 12x12', () => {
        const small = tileCalculator.calculate({
            area_length: 10, area_width: 8, tile_size: '12x12',
            grout: 0.125, waste: 10, per_box: 10,
        });
        const large = tileCalculator.calculate({
            area_length: 10, area_width: 8, tile_size: '24x24',
            grout: 0.125, waste: 10, per_box: 4,
        });
        const tSmall = parseInt(small.stats.find(s => s.label === 'Tiles Needed (excl. waste)').value);
        const tLarge = parseInt(large.stats.find(s => s.label === 'Tiles Needed (excl. waste)').value);
        expect(tLarge).toBeLessThan(tSmall);
    });
});

describe('Stair Calculator', () => {
    const base = {
        total_height: 108, preferred_riser: 7, stair_width: 36,
        tread_mode: 'comfort', target_tread: 10, building_code: 'irc',
        landing: 'none', headroom: 84, material_waste: 10,
    };
    it('9ft rise / 7in riser = 15 risers, 14 treads, comfort tread 10.6in, 3 stringers', () => {
        const r = stairCalculator.calculate(base);
        expect(r.error).toBeFalsy();
        expect(r.stats.find(s => s.label === 'Risers Needed').value).toBe('15 risers');
        expect(r.stats.find(s => s.label === 'Treads Needed').value).toBe('14 treads');
        expect(r.stats.find(s => s.label === 'Riser Height').value).toBe('7.2 in');
        expect(r.stats.find(s => s.label === 'Tread Depth').value).toBe('10.6 in');
        expect(r.stats.find(s => s.label === 'Stringers Needed').value).toBe('3 stringers');
    });
    it('produces a step-by-step detail table sized to the tread count', () => {
        const r = stairCalculator.calculate(base);
        expect(r.table).toBeDefined();
        expect(r.table.mode).toBe(true);
        expect(r.table.rows).toHaveLength(14);
        expect(r.table.footer.riser).toBe(108);
    });
    it('custom tread depth overrides the comfort rule', () => {
        const r = stairCalculator.calculate({ ...base, tread_mode: 'custom', target_tread: 12 });
        expect(r.error).toBeFalsy();
        expect(r.stats.find(s => s.label === 'Tread Depth').value).toBe('12 in');
    });
    it('includes a chart for riser and tread per step', () => {
        const r = stairCalculator.calculate(base);
        expect(r.chart).toBeDefined();
        expect(r.chart.type).toBe('bar');
        expect(r.chart.labels).toHaveLength(14);
        expect(r.chart.datasets).toHaveLength(2);
    });
    it('flags a non-compliant deep riser when IRC code is selected', () => {
        const r = stairCalculator.calculate({ ...base, preferred_riser: 10 });
        expect(r.error).toBeFalsy();
        expect(r.insight.tone).toBe('warning');
        expect(r.insights.length).toBeGreaterThan(0);
    });
    it('returns an error for an undersized rise', () => {
        const r = stairCalculator.calculate({ ...base, total_height: 6 });
        expect(r.error).toBe(true);
    });
    it('returns an error for non-positive inputs', () => {
        const r = stairCalculator.calculate({ ...base, stair_width: 0 });
        expect(r.error).toBe(true);
    });
});
