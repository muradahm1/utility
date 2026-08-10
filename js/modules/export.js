/**
 * Export Module
 * 
 * Handles exporting calculation results in various formats (CSV, JSON, etc.)
 * Provides consistent export functionality across all calculators.
 * 
 * @module modules/export
 */

import { formatCurrency, formatNumber, formatPercentage } from '../utils/index.js';

// ── Export Formats ─────────────────────────────────────────────

/**
 * Export data as CSV
 * @param {Array<Object>} data - Data to export
 * @param {Object} options - Export options
 * @param {string} options.filename - Filename (default: 'export.csv')
 * @param {string} options.delimiter - CSV delimiter (default: ',')
 * @param {boolean} options.includeHeaders - Include column headers (default: true)
 * @returns {string} CSV string
 */
export function exportToCSV(data, options = {}) {
    const {
        filename = 'export.csv',
        delimiter = ',',
        includeHeaders = true
    } = options;

    if (!data || data.length === 0) {
        return '';
    }

    // Get all unique keys from data
    const keys = Object.keys(data[0]);
    
    let csv = '';
    
    // Add headers
    if (includeHeaders) {
        csv += keys.map(key => `"${key}"`).join(delimiter) + '\n';
    }
    
    // Add data rows
    data.forEach(row => {
        const values = keys.map(key => {
            let value = row[key];
            
            // Format numbers
            if (typeof value === 'number') {
                value = value.toFixed(2);
            }
            
            // Escape quotes and wrap in quotes
            const stringValue = String(value || '');
            const escaped = stringValue.replace(/"/g, '""');
            return `"${escaped}"`;
        });
        
        csv += values.join(delimiter) + '\n';
    });
    
    // Download file
    downloadFile(csv, filename, 'text/csv');
    
    return csv;
}

/**
 * Export data as JSON
 * @param {Object|Array} data - Data to export
 * @param {Object} options - Export options
 * @param {string} options.filename - Filename (default: 'export.json')
 * @param {boolean} options.pretty - Pretty print JSON (default: true)
 * @returns {string} JSON string
 */
export function exportToJSON(data, options = {}) {
    const {
        filename = 'export.json',
        pretty = true
    } = options;

    const json = pretty 
        ? JSON.stringify(data, null, 2) 
        : JSON.stringify(data);
    
    downloadFile(json, filename, 'application/json');
    
    return json;
}

/**
 * Export data as plain text
 * @param {string} text - Text to export
 * @param {Object} options - Export options
 * @param {string} options.filename - Filename (default: 'export.txt')
 * @returns {void}
 */
export function exportToText(text, options = {}) {
    const {
        filename = 'export.txt'
    } = options;

    downloadFile(text, filename, 'text/plain');
}

// ── Specialized Exporters ──────────────────────────────────────

/**
 * Export amortization schedule as CSV
 * @param {Array<Object>} schedule - Amortization schedule
 * @param {Object} metadata - Schedule metadata
 * @returns {string} CSV string
 */
export function exportAmortizationSchedule(schedule, metadata = {}) {
    const headers = ['Payment #', 'Date', 'Payment', 'Principal', 'Interest', 'Balance'];
    const rows = schedule.map(row => [
        row.month,
        row.date || '',
        row.payment.toFixed(2),
        row.principal.toFixed(2),
        row.interest.toFixed(2),
        row.balance.toFixed(2)
    ]);
    
    let csv = '';
    
    // Add metadata as comments
    if (metadata.loanAmount) {
        csv += `# Loan Amount: ${formatCurrency(metadata.loanAmount)}\n`;
    }
    if (metadata.interestRate) {
        csv += `# Interest Rate: ${(metadata.interestRate * 100).toFixed(2)}%\n`;
    }
    if (metadata.loanTerm) {
        csv += `# Loan Term: ${metadata.loanTerm} years\n`;
    }
    csv += '\n';
    
    // Add headers and data
    csv += headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(val => `"${val}"`).join(',') + '\n';
    });
    
    downloadFile(csv, 'amortization-schedule.csv', 'text/csv');
    
    return csv;
}

/**
 * Export calculation results as formatted text
 * @param {Object} result - Calculation result
 * @param {Object} tool - Tool definition
 * @returns {string} Formatted text
 */
export function exportResultsAsText(result, tool) {
    let text = `${tool.name}\n`;
    text += '='.repeat(tool.name.length) + '\n\n';
    
    if (result.stats) {
        text += 'RESULTS\n';
        text += '-'.repeat(50) + '\n';
        result.stats.forEach(stat => {
            text += `${stat.label}: ${stat.value}\n`;
        });
        text += '\n';
    }
    
    if (result.insight) {
        text += 'INSIGHT\n';
        text += '-'.repeat(50) + '\n';
        text += `${result.insight.headline}\n`;
        text += `${result.insight.detail}\n\n`;
    }
    
    if (result.table && result.table.rows) {
        text += `${result.table.title || 'DETAILS'}\n`;
        text += '-'.repeat(50) + '\n';
        result.table.rows.forEach(row => {
            text += JSON.stringify(row) + '\n';
        });
        text += '\n';
    }
    
    text += `\nGenerated by GetCalcu - ${new Date().toLocaleDateString()}\n`;
    
    downloadFile(text, `${tool.id}-results.txt`, 'text/plain');
    
    return text;
}

/**
 * Export comparison results as CSV
 * @param {Object} comparison - Comparison result
 * @returns {string} CSV string
 */
export function exportComparison(comparison) {
    if (!comparison || !comparison.table) {
        return '';
    }
    
    const { table } = comparison;
    const headers = table.columns.map(col => col.label);
    const rows = table.rows.map(row => 
        table.columns.map(col => row[col.key])
    );
    
    let csv = `${table.title}\n`;
    csv += headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(val => `"${val}"`).join(',') + '\n';
    });
    
    downloadFile(csv, 'comparison-results.csv', 'text/csv');
    
    return csv;
}

// ── Helper Functions ───────────────────────────────────────────

/**
 * Download file in browser
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        return success;
    } catch (error) {
        console.error('Copy to clipboard failed:', error);
        return false;
    }
}

/**
 * Format data for export
 * @param {Object} result - Calculation result
 * @param {string} format - Export format ('csv', 'json', 'text')
 * @returns {string} Formatted data
 */
export function formatForExport(result, format = 'csv') {
    if (!result) return '';
    
    switch (format.toLowerCase()) {
        case 'json':
            return JSON.stringify(result, null, 2);
        
        case 'text':
            return exportResultsAsText(result, { name: 'Results' });
        
        case 'csv':
        default:
            if (result.stats) {
                const data = result.stats.map(stat => ({
                    Label: stat.label,
                    Value: stat.value
                }));
                return exportToCSV(data, { includeHeaders: true });
            }
            return '';
    }
}

// Log module initialization
console.log('Export module loaded');