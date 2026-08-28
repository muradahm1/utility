/**
 * Tests for the icon build pipeline (scripts/build-icons.js).
 *
 * Verifies that the generated css/icons.css:
 *   1. Uses font-display: swap (not block)
 *   2. Uses the correct .fa-{prefix}.{cls} class selector format
 *   3. Includes @font-face rules for all needed font styles
 *   4. Contains icons actually used in the project
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const CSS_PATH = path.resolve('css/icons.css');
const BUILD_SCRIPT_PATH = path.resolve('scripts/build-icons.js');

let cssContent = '';

beforeAll(() => {
    if (fs.existsSync(CSS_PATH)) {
        cssContent = fs.readFileSync(CSS_PATH, 'utf8');
    }
});

describe('Build script exists', () => {
    it('scripts/build-icons.js exists', () => {
        expect(fs.existsSync(BUILD_SCRIPT_PATH)).toBe(true);
    });
});

describe('Generated icons.css', () => {
    it('icons.css file exists', () => {
        expect(fs.existsSync(CSS_PATH)).toBe(true);
    });

    it('contains a header comment with icon count', () => {
        expect(cssContent).toMatch(/GetCalcu minimal icon subset/);
        expect(cssContent).toMatch(/Contains only the \d+ icons used by this site/);
    });

    it('uses font-display: swap (not block)', () => {
        expect(cssContent).toContain('font-display: swap');
        expect(cssContent).not.toContain('font-display: block');
    });

    it('includes @font-face for solid style', () => {
        expect(cssContent).toContain('font-family: "Font Awesome 6 Free"');
        expect(cssContent).toContain('fa-solid-900.woff2');
    });

    it('includes @font-face for regular style', () => {
        expect(cssContent).toContain('fa-regular-400.woff2');
    });

    it('includes @font-face for brands style', () => {
        expect(cssContent).toContain('font-family: "Font Awesome 6 Brands"');
        expect(cssContent).toContain('fa-brands-400.woff2');
    });

    it('uses .fa-solid prefix format (not .solid)', () => {
        // The new format uses .fa-solid.fa-xxx, not .solid.fa-xxx
        expect(cssContent).not.toMatch(/\.solid\.fa-/);
        expect(cssContent).toMatch(/\.fa-solid\.fa-/);
    });

    it('uses .fa-brands prefix format (not .brands)', () => {
        expect(cssContent).not.toMatch(/\.brands\.fa-/);
        expect(cssContent).toMatch(/\.fa-brands\.fa-/);
    });

    it('uses .fa-regular prefix format (not .regular)', () => {
        expect(cssContent).not.toMatch(/\.regular\.fa-/);
        expect(cssContent).toMatch(/\.fa-regular\.fa-/);
    });

    it('generates at least 50 icon entries', () => {
        const iconLines = cssContent.split('\n').filter(l => l.includes('::before'));
        expect(iconLines.length).toBeGreaterThanOrEqual(50);
    });

    it('all icon entries use backslash-escaped content format', () => {
        const iconLines = cssContent.split('\n').filter(l => l.includes('::before') && l.trim());
        iconLines.forEach(line => {
            expect(line).toMatch(/\.fa-(solid|regular|brands)\.fa-[a-z0-9-]+::before\s*\{\s*content:/);
        });
    });
});

describe('Icon coverage', () => {
    // Verify key icons used across the project are present in the generated CSS
    const KEY_ICONS = [
        'fa-house',           // mortgage, home nav
        'fa-calculator',      // finance nav
        'fa-heart-pulse',     // health nav, BMI
        'fa-briefcase',       // business nav
        'fa-bolt',            // engineering, amortization
        'fa-gauge-high',      // pressure calculator
        'fa-chart-line',      // compound interest
        'fa-sack-dollar',     // loan calculator
        'fa-fire',            // FIRE calculator
        'fa-percent',         // math nav, tip
        'fa-paint-roller',    // paint calculator
        'fa-table-cells-large', // tile calculator
        'fa-truck-ramp-box',  // concrete calculator
        'fa-graduation-cap',  // education nav
        'fa-sun',             // theme toggle
        'fa-moon',            // theme toggle
        'fa-magnifying-glass', // search
        'fa-bars',            // menu
        'fa-xmark',           // close
        'fa-check',           // check
    ];

    KEY_ICONS.forEach(icon => {
        it(`includes icon "${icon}"`, () => {
            // Icons in CSS appear as .fa-solid.fa-house::before
            expect(cssContent).toMatch(new RegExp(`\\.fa-(solid|regular|brands)\\.${icon}\\b`));
        });
    });
});
