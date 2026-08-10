/**
 * Modules Index
 * 
 * Central export point for all feature modules
 * Provides tree-shakeable imports for charts, PDF, print, tables, etc.
 * 
 * @module modules
 */

// ── Feature Modules ────────────────────────────────────────────

// Charts
export {
    CHART_THEMES,
    CHART_COLORS,
    ChartManager,
    buildChartContainer,
    buildSideBySideCharts,
    createDoughnutConfig,
    createLineConfig,
    getChartManager,
    createDoughnutChart,
    createLineChart,
    createBarChart,
    destroyChart,
    destroyAllCharts
} from './charts.js';

// PDF
export {
    generatePDF,
    generateResultsPDF,
    isPDFSupported,
    loadPDFLibrary,
    buildPDFButton
} from './pdf.js';

// Print
export {
    printResults,
    createPrintContent,
    injectPrintStyles,
    removePrintStyles,
    isPrintSupported,
    prepareForPrint,
    cleanupAfterPrint,
    setupPrintEvents,
    buildPrintButton
} from './print.js';

// Export
export {
    exportToCSV,
    exportToJSON,
    exportToText,
    exportAmortizationSchedule,
    exportResultsAsText,
    exportComparison,
    copyToClipboard,
    formatForExport
} from './export.js';

// Related Tools
export {
    getRelatedTools,
    getRecommendations,
    buildRelatedToolsHtml,
    buildCategoryNavHtml
} from './related-tools.js';

// Recommendations
export {
    getPersonalizedRecommendations,
    generateInsights,
    buildRecommendationsHtml,
    buildInsightsHtml
} from './recommendations.js';

// FAQ
export {
    createFAQItem,
    searchFAQs,
    buildFAQHtml,
    buildCalculatorFAQ,
    initFAQSearch,
    generateFAQJsonLd,
    addFAQJsonLd,
    trackFAQInteraction,
    initFAQAccessibility
} from './faq.js';

// Tables
export {
    buildTable,
    sort,
    search,
    paginate,
    nextPage,
    prevPage,
    exportCSV,
    buildVirtualTable,
    initTablesGlobal
} from './tables.js';

// Validation
export {
    validateRequired,
    validateNumber,
    validateInteger,
    validatePercentage,
    validateEmail,
    validateUrl,
    validateDate,
    validateLength,
    validateSelection,
    sanitizeString,
    sanitizeNumber,
    escapeHtml,
    validateForm,
    showFieldError,
    clearFieldError,
    clearAllErrors,
    createValidationSchema,
    validateCalculatorInputs
} from './validation.js';

// Formatting
export {
    formatValue,
    formatLargeNumber,
    formatPercent,
    formatRate,
    formatMoney,
    formatMoneyNoCents,
    formatMoneyScale,
    capitalize,
    titleCase,
    truncate,
    formatPhone,
    formatSSN,
    formatList,
    formatBulletedList,
    formatDuration,
    formatTimeAgo,
    formatAddress,
    formatFileSize,
    formatCreditCard,
    formatCreditCardExpiry,
    maskCreditCard,
    FORMAT_PRESETS
} from './formatting.js';

// Sharing
export {
    createShareUrl,
    getCurrentUrl,
    updateUrl,
    share,
    shareCalculator,
    shareOnTwitter,
    shareOnFacebook,
    shareOnLinkedIn,
    shareViaEmail,
    shareViaWhatsApp,
    updateOpenGraphMetadata,
    generateShareText,
    getSharingSupport,
    buildShareButtons,
    initSharingGlobal
} from './sharing.js';

// ── Convenience Bundles ────────────────────────────────────────

/**
 * Charts utilities bundle
 */
export const charts = {
    createDoughnut: (canvas, config) => createDoughnutChart(canvas, config),
    createLine: (canvas, config) => createLineChart(canvas, config),
    createBar: (canvas, config) => createBarChart(canvas, config),
    destroy: (canvas) => destroyChart(canvas),
    destroyAll: () => destroyAllCharts(),
    manager: () => getChartManager()
};

/**
 * Export utilities bundle
 */
export const exportUtils = {
    toCSV: (data, options) => exportToCSV(data, options),
    toJSON: (data, options) => exportToJSON(data, options),
    toText: (text, options) => exportToText(text, options),
    amortization: (schedule, metadata) => exportAmortizationSchedule(schedule, metadata),
    results: (result, tool) => exportResultsAsText(result, tool),
    copy: (text) => copyToClipboard(text)
};

/**
 * Sharing utilities bundle
 */
export const sharing = {
    share: (data) => share(data),
    shareCalculator: (slug, tool) => shareCalculator(slug, tool),
    copyLink: (url) => copyToClipboard(url),
    createUrl: (slug, params) => createShareUrl(slug, params),
    twitter: (data) => shareOnTwitter(data),
    facebook: (url) => shareOnFacebook(url),
    email: (data) => shareViaEmail(data)
};

/**
 * Table utilities bundle
 */
export const tables = {
    build: (config) => buildTable(config),
    sort: (tableId, column) => sort(tableId, column),
    search: (tableId, query) => search(tableId, query),
    paginate: (tableId, page) => paginate(tableId, page),
    exportCSV: (tableId) => exportCSV(tableId)
};

/**
 * Validation utilities bundle
 */
export const validation = {
    required: (value, fieldName) => validateRequired(value, fieldName),
    number: (value, options) => validateNumber(value, options),
    email: (value, required) => validateEmail(value, required),
    url: (value, required) => validateUrl(value, required),
    date: (value, options) => validateDate(value, options),
    form: (values, rules) => validateForm(values, rules),
    sanitize: (value, options) => sanitizeString(value, options)
};

/**
 * Formatting utilities bundle
 */
export const formatting = {
    currency: (value, currency) => formatMoney(value, currency),
    number: (value, decimals) => formatValue(value, { decimals }),
    percentage: (value, decimals) => formatPercent(value, decimals),
    largeNumber: (value, decimals) => formatLargeNumber(value, decimals),
    phone: (phone) => formatPhone(phone),
    ssn: (ssn) => formatSSN(ssn)
};

// ── Module Initialization ──────────────────────────────────────

/**
 * Initialize all modules
 */
export function initAllModules() {
    // Initialize global APIs
    initTablesGlobal();
    initSharingGlobal();
    initPrintGlobal();
    initPDFGlobal();
    
    console.log('All modules initialized');
    console.log('  - Charts: Available');
    console.log('  - PDF: Available');
    console.log('  - Print: Available');
    console.log('  - Export: Available');
    console.log('  - Related Tools: Available');
    console.log('  - Recommendations: Available');
    console.log('  - FAQ: Available');
    console.log('  - Tables: Available');
    console.log('  - Validation: Available');
    console.log('  - Formatting: Available');
    console.log('  - Sharing: Available');
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllModules);
    } else {
        initAllModules();
    }
}

// Log module initialization
console.log('Modules index loaded');
console.log('  - 11 feature modules available');
console.log('  - Tree-shake friendly');
console.log('  - Global APIs initialized');