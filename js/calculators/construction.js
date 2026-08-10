/**
 * Construction Calculators Module
 * 
 * Contains all construction-related calculator definitions.
 * 
 * @module calculators/construction
 */

import { safeNum, safeStr, roundTo } from '../utils/index.js';
import { escapeHtml } from '../utils/index.js';

const errorResult = (message) => ({ error: true, stats: [{ label: 'Error', value: message, warn: true }] });

// ── Placeholder for Construction Calculators ────────────────────
// No construction-specific calculators currently exist in the codebase
// This module is ready for future construction calculators

export const constructionCalculators = [];

/**
 * Register all construction calculators with the tool registry
 * @param {Function} registerTool - Tool registration function
 */
export function registerConstructionCalculators(registerTool) {
    // No calculators to register yet
    console.log('Construction calculators: No calculators available yet');
}

console.log('Construction calculators module loaded');
console.log(`  - ${constructionCalculators.length} calculators available`);