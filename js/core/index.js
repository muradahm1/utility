/**
 * Core Module Index
 * 
 * Central export point for all core modules
 * Provides backward compatibility with legacy architecture
 * 
 * @module core
 */

// ── Core Modules ───────────────────────────────────────────────

export { TOOLS, registerTool, unregisterTool, getTool, getAllTools, getToolCount } from './tools.js';
export { 
    parseCurrentUrl, 
    getSlugFromUrl, 
    getQueryParams, 
    resolveToolFromUrl,
    navigateToTool, 
    navigateToHome, 
    navigateBack, 
    navigateForward,
    initBrowserHistory,
    createDeepLink,
    shareTool,
    copyToolUrl,
    handleRoute,
    initRouter 
} from './router.js';
export {
    initializeCalculator,
    destroyCalculator,
    renderCalculator,
    performCalculation,
    validateFields,
    resetCalculator,
    renderResults,
    renderError,
    buildSeoContentHtml,
    buildRelatedToolsHtml,
    buildCopyBtnHtml,
    bindCopyBtn,
    renderJourneyHtml,
    formatCell,
    buildTableSpecHtml,
    escapeHtml,
    formatCurrency,
    formatNumber,
    safeNum,
    safeStr,
    roundTo
} from './calculator-engine.js';

// ── Backward Compatibility Layer ───────────────────────────────

import { TOOLS as coreTOOLS, getTool, toolExists, getAllTools } from './tools.js';
import { parseCurrentUrl, resolveToolFromUrl, handleRoute } from './router.js';
import { initializeCalculator, escapeHtml, safeNum, safeStr, roundTo, formatCurrency } from './calculator-engine.js';

/**
 * Legacy TOOLS object - maintains backward compatibility
 * @type {Object<string, Object>}
 */
export const TOOLS_LEGACY = coreTOOLS;

/**
 * Initialize core system with legacy support
 * This function registers all tools and sets up the legacy global
 */
export function initializeCore() {
    const categories = new Set();
    Object.values(coreTOOLS).forEach(tool => {
        if (tool.category) categories.add(tool.category);
    });
    
    return {
        tools: coreTOOLS,
        getTool,
        toolExists,
        getAllTools,
        router: {
            parseUrl: parseCurrentUrl,
            resolveTool: resolveToolFromUrl,
            handleRoute
        },
        engine: {
            initialize: initializeCalculator,
            escapeHtml,
            safeNum,
            safeStr,
            roundTo,
            formatCurrency
        }
    };
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    window.CORE = initializeCore();
    
    // Maintain legacy global TOOLS object
    if (!window.TOOLS) {
        window.TOOLS = coreTOOLS;
    }
}