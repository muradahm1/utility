/**
 * Modules Barrel Export
 * 
 * Central export point for all feature modules.
 * Provides convenient imports and tree-shakeable named exports.
 * 
 * @module modules
 */

// ── Feature Modules ──────────────────────────────────────────────

export {
    createDoughnutChart,
    createLineChart,
    createBarChart,
    destroyChart,
    destroyAllCharts,
    getChartManager,
    createDoughnutConfig,
    createLineConfig,
    buildChartContainer
} from './charts.js';

export {
    generatePDF,
    generateResultsPDF,
    isPDFSupported,
    loadPDFLibrary,
    buildPDFButton
} from './pdf.js';

export {
    printResults,
    createPrintContent,
    injectPrintStyles,
    removePrintStyles,
    prepareForPrint,
    cleanupAfterPrint,
    setupPrintEvents
} from './print.js';

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

export {
    createShareUrl,
    getCurrentUrl,
    updateUrl,
    share,
    shareCalculator,
    copyToClipboard,
    shareOnTwitter,
    shareOnFacebook,
    shareOnLinkedIn,
    shareViaEmail,
    shareViaWhatsApp,
    updateOpenGraphMetadata,
    generateShareText,
    buildShareButtons
} from './sharing.js';

export {
    getRelatedTools,
    getRecommendations,
    buildRelatedToolsHtml,
    buildCategoryNavHtml
} from './related-tools.js';

export {
    getPersonalizedRecommendations,
    generateInsights,
    buildRecommendationsHtml as buildRecommendationsHtmlFromRec,
    buildInsightsHtml
} from './recommendations.js';

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

export {
    buildTable,
    buildVirtualTable,
    sort,
    search,
    paginate,
    nextPage,
    prevPage,
    exportCSV
} from './tables.js';

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
    validateForm,
    showFieldError,
    clearFieldError,
    clearAllErrors,
    createValidationSchema,
    validateCalculatorInputs
} from './validation.js';

export { escapeHtml } from '../utils/index.js';

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
    formatAddress,
    formatFileSize,
    formatCreditCard,
    maskCreditCard,
    formatList,
    formatBulletedList,
    formatDuration,
    formatTimeAgo
} from './formatting.js';

// ── Convenience Bundles ──────────────────────────────────────────

export const charts = {
    createDoughnut: (canvas, config) => createDoughnutChart(canvas, config),
    createLine: (canvas, config) => createLineChart(canvas, config),
    createBar: (canvas, config) => createBarChart(canvas, config),
    destroy: (canvas) => destroyChart(canvas),
    destroyAll: () => destroyAllCharts()
};

export const exportUtils = {
    toCSV: (data, options) => exportToCSV(data, options),
    toJSON: (data, options) => exportToJSON(data, options),
    toText: (text, options) => exportToText(text, options)
};

export const sharing = {
    shareCalculator,
    shareOnTwitter,
    shareOnFacebook,
    shareOnLinkedIn,
    shareViaEmail,
    shareViaWhatsApp
};

export const tables = {
    build: buildTable,
    sort,
    search,
    paginate
};

console.log('Modules barrel export loaded');
