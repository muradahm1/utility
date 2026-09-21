import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const toolsSource = readFileSync(resolve(process.cwd(), 'js/tools.js'), 'utf-8');

beforeAll(() => {
    // Execute tools.js in a function scope to populate window.TOOLS
    new Function(toolsSource)();
});

const TOOLS = () => window.TOOLS;

describe('Phase 3: Universal Unit Converter', () => {
    const calc = () => TOOLS()['unit-converter'];

    it('is registered with valid metadata', () => {
        expect(calc()).toBeDefined();
        expect(calc().name).toBe('Universal Unit Converter');
        expect(calc().category).toBe('Math');
    });

    it('converts Length units accurately (Meters to Feet)', () => {
        const res = calc().calculate({
            dimension: 'length',
            amount: 10,
            unit_length_from: 'meters',
            unit_length_to: 'feet'
        });

        expect(res.error).toBeFalsy();
        expect(res.stats).toBeDefined();
        const converted = res.stats.find(s => s.label.includes('Converted Value'));
        expect(converted).toBeDefined();
        expect(converted.value).toBe('32.808399');
        expect(res.table.length).toBeGreaterThan(5);
    });

    it('converts Weight units accurately (Kilograms to Pounds)', () => {
        const res = calc().calculate({
            dimension: 'weight',
            amount: 70,
            unit_weight_from: 'kilograms',
            unit_weight_to: 'pounds'
        });

        expect(res.error).toBeFalsy();
        const converted = res.stats.find(s => s.label.includes('Converted Value'));
        expect(converted.value).toBe('154.323584');
    });

    it('converts Temperature units accurately (Celsius to Fahrenheit and Kelvin)', () => {
        const resF = calc().calculate({
            dimension: 'temperature',
            amount: 100,
            unit_temp_from: 'celsius',
            unit_temp_to: 'fahrenheit'
        });

        expect(resF.error).toBeFalsy();
        const convF = resF.stats.find(s => s.label.includes('Converted Value'));
        expect(convF.value).toBe('212');

        const resK = calc().calculate({
            dimension: 'temperature',
            amount: 0,
            unit_temp_from: 'celsius',
            unit_temp_to: 'kelvin'
        });

        expect(resK.error).toBeFalsy();
        const convK = resK.stats.find(s => s.label.includes('Converted Value'));
        expect(convK.value).toBe('273.15');
    });

    it('converts Volume units accurately (Gallons US to Liters)', () => {
        const res = calc().calculate({
            dimension: 'volume',
            amount: 5,
            unit_vol_from: 'gallons_us',
            unit_vol_to: 'liters'
        });

        expect(res.error).toBeFalsy();
        const converted = res.stats.find(s => s.label.includes('Converted Value'));
        expect(converted.value).toBe('18.927059');
    });

    it('converts Speed units accurately (km/h to mph)', () => {
        const res = calc().calculate({
            dimension: 'speed',
            amount: 100,
            unit_speed_from: 'kmh',
            unit_speed_to: 'mph'
        });

        expect(res.error).toBeFalsy();
        const converted = res.stats.find(s => s.label.includes('Converted Value'));
        expect(converted.value).toBe('62.137119');
    });

    it('converts Digital Data units accurately (Gigabytes to Megabytes)', () => {
        const res = calc().calculate({
            dimension: 'data',
            amount: 2,
            unit_data_from: 'gigabytes',
            unit_data_to: 'megabytes'
        });

        expect(res.error).toBeFalsy();
        const converted = res.stats.find(s => s.label.includes('Converted Value'));
        expect(converted.value).toBe('2,048');
    });

    it('converts Area units accurately (Acres to Square Feet)', () => {
        const res = calc().calculate({
            dimension: 'area',
            amount: 1,
            unit_area_from: 'acres',
            unit_area_to: 'sq_feet'
        });

        expect(res.error).toBeFalsy();
        const converted = res.stats.find(s => s.label.includes('Converted Value'));
        expect(converted.value).toBe('43,560');
    });

    it('converts Pressure units accurately (psi to bar)', () => {
        const res = calc().calculate({
            dimension: 'pressure',
            amount: 14.69595,
            unit_pressure_from: 'psi',
            unit_pressure_to: 'bar'
        });

        expect(res.error).toBeFalsy();
        const converted = res.stats.find(s => s.label.includes('Converted Value'));
        expect(parseFloat(converted.value.replace(/,/g, ''))).toBeCloseTo(1.01325, 2);
    });

    it('converts Time units accurately (Days to Hours)', () => {
        const res = calc().calculate({
            dimension: 'time',
            amount: 7,
            unit_time_from: 'days',
            unit_time_to: 'hours'
        });

        expect(res.error).toBeFalsy();
        const converted = res.stats.find(s => s.label.includes('Converted Value'));
        expect(converted.value).toBe('168');
    });
});
