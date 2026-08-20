/**
 * Engineering Calculators Module
 * 
 * Contains engineering-related calculator definitions.
 * 
 * @module calculators/engineering
 */

import { safeNum, roundTo } from '../utils/index.js';
import { escapeHtml } from '../utils/index.js';

const errorResult = (message) => ({ error: true, stats: [{ label: 'Error', value: message, warn: true }] });

// ── Ohm's Law Calculator ────────────────────────────────────────

export const ohmsLawCalculator = {
    id: 'ohms-law-calculator',
    name: "Ohm's Law Calculator",
    category: 'Engineering',
    icon: 'fa-bolt',
    iconClass: 'icon-engineering',
    tagClass: 'tag-engineering',
    description: 'Calculate voltage, current, resistance, or power using Ohm\'s Law and the power triangle.',
    metaDescription: "Free Ohm's Law calculator — instantly calculate voltage, current, resistance, or power for any electrical circuit.",
    fields: [
        { id: 'voltage', label: 'Voltage (V)', type: 'number', default: 0, min: 0, step: 0.1, hint: 'Leave at 0 to solve for voltage.' },
        { id: 'current', label: 'Current (A)', type: 'number', default: 2, min: 0, step: 0.1, hint: 'Current in amperes.' },
        { id: 'resistance', label: 'Resistance (Ω)', type: 'number', default: 0, min: 0, step: 0.1, hint: 'Resistance in ohms. Leave at 0 to solve for resistance.' },
        { id: 'power', label: 'Power (W)', type: 'number', default: 0, min: 0, step: 0.1, hint: 'Power in watts. Leave at 0 to solve for power.' },
    ],
    calculate(v) {
        const V = safeNum(v.voltage, 0);
        const I = safeNum(v.current, 0);
        const R = safeNum(v.resistance, 0);
        const P = safeNum(v.power, 0);
        let voltage = V, current = I, resistance = R, power = P;
        if (V > 0 && I > 0 && R === 0 && P === 0) {
            resistance = roundTo(V / I, 4);
            power = roundTo(V * I, 4);
        } else if (V > 0 && R > 0 && I === 0 && P === 0) {
            current = roundTo(V / R, 4);
            power = roundTo((V * V) / R, 4);
        } else if (I > 0 && R > 0 && V === 0 && P === 0) {
            voltage = roundTo(I * R, 4);
            power = roundTo(I * I * R, 4);
        } else if (P > 0 && I > 0 && V === 0 && R === 0) {
            voltage = roundTo(P / I, 4);
            resistance = roundTo(P / (I * I), 4);
        } else if (P > 0 && R > 0 && V === 0 && I === 0) {
            current = roundTo(Math.sqrt(P / R), 4);
            voltage = roundTo(current * R, 4);
        } else if (P > 0 && V > 0 && I === 0 && R === 0) {
            current = roundTo(P / V, 4);
            resistance = roundTo((V * V) / P, 4);
        } else {
            return errorResult('Provide exactly two values to solve for the others.');
        }
        return {
            stats: [
                { label: 'Voltage (V)', value: roundTo(voltage, 4) + ' V', highlight: true },
                { label: 'Current (A)', value: roundTo(current, 4) + ' A', highlight: true },
                { label: 'Resistance (Ω)', value: roundTo(resistance, 4) + ' Ω', highlight: true },
                { label: 'Power (W)', value: roundTo(power, 4) + ' W', highlight: true },
            ],
            formula: 'V = I × R | P = V × I | P = I² × R | P = V² ÷ R',
        };
    },
    article: { heading: "Understanding Ohm's Law and Electrical Power", intro: "Ohm's Law describes the relationship between voltage, current, and resistance in an electrical circuit.", sections: [
        { heading: 'The Ohm\'s Law Triangle', body: 'Voltage (V) equals current (I) multiplied by resistance (R). If you know any two values, you can solve for the third. Cover the unknown value and the remaining two give you the formula.' },
        { heading: 'Electrical Power', body: 'Power (P) in watts is voltage times current. It can also be calculated as I²R or V²/R. Power represents the rate at which electrical energy is consumed or produced.' },
        { heading: 'Practical Applications', body: 'Use Ohm\'s Law to size resistors, determine wire gauge, calculate battery life, and design power supplies. It is the foundation of all electrical engineering.' },
    ] },
    howTo: ['Enter any two known values (voltage, current, resistance, or power).', 'Leave the other two fields at zero.', 'The calculator solves for the unknown values.'],
    formula: 'V = I × R | P = V × I | P = I² × R | P = V² ÷ R',
    examples: [
        { title: 'Simple Circuit', input: 'I = 2 A, R = 10 Ω', result: 'V = 20 V, P = 40 W' },
        { title: 'LED Resistor', input: 'V = 12 V, I = 0.02 A', result: 'R = 600 Ω, P = 0.24 W' },
    ],
    faqs: [
        { q: 'What is Ohm\'s Law?', a: 'Ohm\'s Law states that the current through a conductor between two points is directly proportional to the voltage across the two points. The formula is V = I × R.' },
        { q: 'What are the units?', a: 'Voltage is measured in volts (V), current in amperes (A), resistance in ohms (Ω), and power in watts (W).' },
        { q: 'Does Ohm\'s Law apply to all circuits?', a: 'Ohm\'s Law applies to ohmic devices where resistance is constant. It does not apply to diodes, transistors, or other non-linear components without modification.' },
        { q: 'What is the power formula?', a: 'Power = Voltage × Current (P = V × I). It can also be expressed as P = I²R or P = V²/R depending on which values you know.' },
    ],
};

// ── Pressure Calculator ─────────────────────────────────────────

export const pressureCalculator = {
    id: 'pressure-calculator',
    name: 'Pressure Calculator',
    category: 'Engineering',
    icon: 'fa-gauge-high',
    iconClass: 'icon-engineering',
    tagClass: 'tag-engineering',
    description: 'Convert between pressure units and calculate pressure from force and area.',
    metaDescription: 'Free pressure calculator — convert between psi, kPa, bar, atm, and calculate pressure from force over area.',
    fields: [
        { id: 'pressure', label: 'Pressure', type: 'number', default: 14.7, min: 0, step: 0.1, hint: 'Enter a pressure value to convert.' },
        { id: 'unit', label: 'Input Unit', type: 'select', default: 'psi', options: [
            { value: 'psi', label: 'PSI (lbf/in²)' },
            { value: 'kPa', label: 'kPa' },
            { value: 'bar', label: 'Bar' },
            { value: 'atm', label: 'Atmosphere' },
            { value: 'Pa', label: 'Pascal (Pa)' },
            { value: 'MPa', label: 'Megapascal (MPa)' },
        ], hint: 'Select the unit of your input.' },
    ],
    calculate(v) {
        const pressure = safeNum(v.pressure, 0);
        const unit = v.unit || 'psi';
        if (pressure < 0) return errorResult('Pressure cannot be negative.');
        const toPascal = (val, u) => {
            switch (u) {
                case 'psi': return val * 6894.757;
                case 'kPa': return val * 1000;
                case 'bar': return val * 100000;
                case 'atm': return val * 101325;
                case 'Pa': return val;
                case 'MPa': return val * 1000000;
                default: return val;
            }
        };
        const fromPascal = (val, u) => {
            switch (u) {
                case 'psi': return val / 6894.757;
                case 'kPa': return val / 1000;
                case 'bar': return val / 100000;
                case 'atm': return val / 101325;
                case 'Pa': return val;
                case 'MPa': return val / 1000000;
                default: return val;
            }
        };
        const pascals = toPascal(pressure, unit);
        return {
            stats: [
                { label: 'PSI', value: roundTo(fromPascal(pascals, 'psi'), 4) + ' psi' },
                { label: 'kPa', value: roundTo(fromPascal(pascals, 'kPa'), 4) + ' kPa' },
                { label: 'Bar', value: roundTo(fromPascal(pascals, 'bar'), 4) + ' bar' },
                { label: 'Atmosphere', value: roundTo(fromPascal(pascals, 'atm'), 4) + ' atm' },
                { label: 'Pascal', value: roundTo(fromPascal(pascals, 'Pa'), 0) + ' Pa' },
                { label: 'MPa', value: roundTo(fromPascal(pascals, 'MPa'), 4) + ' MPa' },
            ],
            formula: '1 psi = 6.895 kPa = 0.0689 bar = 0.068 atm = 6895 Pa',
        };
    },
    article: { heading: 'Pressure Unit Conversions for Engineering', intro: 'Pressure is force per unit area. Common units include PSI, kPa, bar, and atmosphere.', sections: [
        { heading: 'Common Pressure Units', body: 'PSI (pounds per square inch) is common in the US. kPa (kilopascals) and bar are common in Europe. 1 bar is approximately atmospheric pressure at sea level. 1 atm = 101.325 kPa = 14.696 psi.' },
        { heading: 'When to Use Each Unit', body: 'Use PSI for tire pressure and hydraulics. Use kPa for weather and gas pressures. Use MPa for high-pressure engineering systems. Use bar for scuba diving and automotive.' },
        { heading: 'Gauge vs. Absolute Pressure', body: 'Gauge pressure measures relative to atmospheric pressure. Absolute pressure includes atmospheric pressure. A tire at 30 psi gauge is about 44.7 psi absolute.' },
    ] },
    howTo: ['Enter a pressure value.', 'Select the input unit.', 'View conversions in all common units.'],
    formula: '1 psi = 6.895 kPa = 0.0689 bar = 0.068 atm = 6895 Pa',
    examples: [
        { title: 'Tire Pressure', input: '32 psi', result: '220.6 kPa, 2.21 bar, 2.18 atm' },
        { title: 'Atmospheric Pressure', input: '101.325 kPa', result: '14.696 psi, 1.013 bar, 1 atm' },
    ],
    faqs: [
        { q: 'What is the difference between bar and psi?', a: '1 bar ≈ 14.5 psi. Bar is a metric unit, psi is imperial. Both are commonly used for pressure measurement.' },
        { q: 'What is standard atmospheric pressure?', a: 'Standard atmospheric pressure at sea level is 101.325 kPa, 1.01325 bar, 14.696 psi, or 1 atmosphere.' },
        { q: 'What is gauge pressure?', a: 'Gauge pressure measures pressure relative to atmospheric pressure. A gauge reading of 0 means the pressure inside equals atmospheric pressure.' },
        { q: 'What is the difference between kPa and kPa (gauge)?', a: 'kPa without qualification is usually absolute. kPa (gauge) or kPa (g) is relative to atmospheric pressure. Always verify which type is being used.' },
    ],
};

// ── Beam Deflection Calculator ──────────────────────────────────

export const beamDeflectionCalculator = {
    id: 'beam-deflection-calculator',
    name: 'Beam Deflection Calculator',
    category: 'Engineering',
    icon: 'fa-ruler-combined',
    iconClass: 'icon-engineering',
    tagClass: 'tag-engineering',
    description: 'Calculate maximum deflection for simply supported and cantilever beams under uniform load.',
    metaDescription: 'Free beam deflection calculator — estimate maximum deflection for simply supported and cantilever beams.',
    fields: [
        { id: 'beamType', label: 'Beam Type', type: 'select', default: 'simply', options: [
            { value: 'simply', label: 'Simply Supported (center load)' },
            { value: 'cantilever', label: 'Cantilever (end load)' },
        ], hint: 'Select the beam support condition.' },
        { id: 'length', label: 'Beam Length (ft)', type: 'number', default: 10, min: 1, step: 0.5, hint: 'Span length in feet.' },
        { id: 'load', label: 'Load (lbs)', type: 'number', default: 1000, min: 0, step: 100, hint: 'Total load in pounds.' },
        { id: 'moi', label: 'Moment of Inertia (in⁴)', type: 'number', default: 100, min: 0.1, step: 1, hint: 'Section property from beam tables.' },
    ],
    calculate(v) {
        const beamType = v.beamType || 'simply';
        const L = safeNum(v.length, 0) * 12;
        const P = safeNum(v.load, 0);
        const I = safeNum(v.moi, 0);
        const E = 29000000;
        if (L <= 0 || P <= 0 || I <= 0) return errorResult('Enter positive values for all fields.');
        let deflection;
        if (beamType === 'simply') {
            deflection = (P * L * L * L) / (48 * E * I);
        } else {
            deflection = (P * L * L * L) / (3 * E * I);
        }
        return {
            stats: [
                { label: 'Beam Type', value: beamType === 'simply' ? 'Simply Supported' : 'Cantilever' },
                { label: 'Max Deflection', value: roundTo(deflection, 4) + ' in', highlight: true },
                { label: 'Deflection (in)', value: roundTo(deflection, 4) },
                { label: 'L/Δ Ratio', value: 'L/' + roundTo(L / deflection, 1) },
            ],
            formula: 'δ = (P × L³) / (48 × E × I) [simply] | δ = (P × L³) / (3 × E × I) [cantilever]',
        };
    },
    article: { heading: 'Understanding Beam Deflection in Structural Engineering', intro: 'Beam deflection is the degree to which a beam bends under load. Excessive deflection can damage finishes and affect structural integrity.', sections: [
        { heading: 'The Deflection Formula', body: 'Deflection depends on load, span length, material stiffness (E), and cross-section shape (I). The formulas differ for simply supported and cantilever beams.' },
        { heading: 'Allowable Deflection Limits', body: 'Building codes typically limit deflection to L/360 for live loads and L/240 for dead loads. For a 10 ft beam, that is about 0.33 inches for live load.' },
        { heading: 'Increasing Stiffness', body: 'To reduce deflection, increase the moment of inertia (deeper beam), use a stiffer material (steel vs wood), add supports, or reduce the span.' },
    ] },
    howTo: ['Select beam type.', 'Enter beam length, load, and moment of inertia.', 'Review maximum deflection and L/Δ ratio.'],
    formula: 'δ = (P × L³) / (48 × E × I) [simply] | δ = (P × L³) / (3 × E × I) [cantilever]',
    examples: [
        { title: 'Wood Beam', input: 'Simply supported, 10 ft, 1000 lbs, I = 100 in⁴', result: 'δ ≈ 0.0106 in, L/δ ≈ 11320' },
        { title: 'Steel Cantilever', input: 'Cantilever, 8 ft, 500 lbs, I = 200 in⁴', result: 'δ ≈ 0.0030 in, L/δ ≈ 31900' },
    ],
    faqs: [
        { q: 'What is moment of inertia?', a: 'Moment of inertia (I) measures a beam\'s resistance to bending. It depends on the cross-section shape. Deeper beams have much higher I than wider beams of the same area.' },
        { q: 'What is the modulus of elasticity?', a: 'E (modulus of elasticity) measures material stiffness. Steel is about 29,000,000 psi. Wood is about 1,500,000–1,800,000 psi depending on grade.' },
        { q: 'What is L/360?', a: 'L/360 is a common deflection limit. It means the maximum deflection should not exceed the span length divided by 360. For a 10 ft span, that is 0.33 inches.' },
        { q: 'Can I use this for steel beams?', a: 'Yes, but ensure you use the correct moment of inertia for the steel section. This calculator uses E = 29,000,000 psi, which is standard for steel.' },
    ],
};

// ── Export all engineering calculators ───────────────────────────

export const engineeringCalculators = [
    ohmsLawCalculator,
    pressureCalculator,
    beamDeflectionCalculator,
];

/**
 * Register all engineering calculators with the tool registry
 * @param {Function} registerTool - Tool registration function
 * @param {Function} toolExists - Tool existence check function
 */
export function registerEngineeringCalculators(registerTool, toolExists) {
    engineeringCalculators.forEach(calculator => {
        if (toolExists && toolExists(calculator.id)) {
            return;
        }
        registerTool(calculator.id, calculator);
    });
}
