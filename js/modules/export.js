/**
 * Export Module
 * 
 * Comprehensive, publication-grade export engine for GetCalcu calculations.
 * Supports clean multi-section CSV, JSON, formatted text, and clipboard copy.
 * 
 * @module modules/export
 */

import { escapeHtml } from '../utils/index.js';

/**
 * Robustly unwraps any value into a clean, human-readable string without [object Object].
 * Handles numbers, booleans, nested objects, and arrays.
 * 
 * @param {*} val - Value to format
 * @returns {string} Clean string representation
 */
export function formatCsvValue(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') {
        return Number.isFinite(val) ? String(val) : '';
    }
    if (typeof val === 'boolean') {
        return val ? 'TRUE' : 'FALSE';
    }
    if (typeof val === 'object') {
        if (val.formatted !== undefined) return formatCsvValue(val.formatted);
        if (val.value !== undefined) return formatCsvValue(val.value);
        if (val.val !== undefined) return formatCsvValue(val.val);
        if (val.text !== undefined) return formatCsvValue(val.text);
        if (val.amount !== undefined) return formatCsvValue(val.amount);
        if (val.label !== undefined && val.value === undefined) return formatCsvValue(val.label);
        if (val.headline || val.detail) {
            return [val.headline, val.detail].filter(Boolean).join(' - ');
        }
        if (Array.isArray(val)) {
            return val.map(formatCsvValue).join('; ');
        }
        try {
            return JSON.stringify(val);
        } catch {
            return '';
        }
    }
    return String(val);
}

/**
 * Escapes a value for RFC-4180 compliant CSV output.
 * 
 * @param {*} val - Value to escape
 * @returns {string} Escaped CSV cell string
 */
export function escapeCsvCell(val) {
    const str = formatCsvValue(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Exports a flat dataset array to CSV format.
 * 
 * @param {Array<Object>} data - Array of row objects
 * @param {Object} [options={}] - Options { filename, headers }
 * @returns {string} CSV text
 */
export function exportToCSV(data, options = {}) {
    const { filename = 'export.csv', headers = null } = options;
    
    let csv = '';
    
    if (headers) {
        csv += headers.map(escapeCsvCell).join(',') + '\n';
    }
    
    if (Array.isArray(data) && data.length > 0) {
        const keys = headers || Object.keys(data[0] || {});
        if (!headers) {
            csv += keys.map(escapeCsvCell).join(',') + '\n';
        }
        
        data.forEach(row => {
            csv += keys.map(key => escapeCsvCell(row[key])).join(',') + '\n';
        });
    }
    
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    return csv;
}

/**
 * Generates an executive, comprehensive multi-section CSV report for any calculator result.
 * Includes metadata, user inputs, results summary, recommendations, insights, and schedules.
 * Guarantees zero [object Object] output across all 48 tools.
 * 
 * @param {Object} tool - Tool configuration and metadata
 * @param {Object} result - Calculation output object
 * @param {Object} [inputs={}] - User input assumptions
 * @param {Object} [options={}] - Export options { filename }
 * @returns {string} Complete formatted CSV content
 */
export function exportComprehensiveCSV(tool, result, inputs = {}, options = {}) {
    if (!tool || !result) return '';
    const cleanSlug = tool.id || (tool.name ? tool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'calculator');
    const { filename = `${cleanSlug}-report.csv` } = options;

    const lines = [];

    // 1. Metadata Header
    lines.push(`# ==============================================================================`);
    lines.push(`# GetCalcu Official Calculation Report`);
    lines.push(`# Tool: ${tool.name || 'Calculator'}`);
    lines.push(`# Category: ${tool.category || 'General'}`);
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(`# Official URL: https://www.getcalcu.com`);
    lines.push(`# ==============================================================================`);
    lines.push('');

    // 2. Input Parameters Section
    const inputKeys = Object.keys(inputs || {});
    if (inputKeys.length > 0) {
        lines.push('# SECTION: INPUT PARAMETERS & ASSUMPTIONS');
        lines.push('Parameter,Value');
        const fieldsMap = {};
        if (tool && Array.isArray(tool.fields)) {
            tool.fields.forEach(f => {
                if (f && f.id) fieldsMap[f.id] = f;
            });
        }
        inputKeys.forEach(k => {
            const val = inputs[k];
            if (val === undefined || val === null || val === '') return;
            const field = fieldsMap[k] || {};
            const label = field.label || k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let displayVal = formatCsvValue(val);
            if (field.unit && typeof val === 'number') {
                displayVal = `${displayVal} ${field.unit}`;
            }
            lines.push(`${escapeCsvCell(label)},${escapeCsvCell(displayVal)}`);
        });
        lines.push('');
    }

    // 3. Results Summary (Primary & Secondary Stats)
    const stats = (result.stats && Array.isArray(result.stats) && result.stats.length > 0)
        ? result.stats
        : ((result.summary && Array.isArray(result.summary.kpis)) ? result.summary.kpis : []);

    if (stats.length > 0 || result.bmiGauge) {
        lines.push('# SECTION: KEY RESULTS SUMMARY');
        lines.push('Metric,Value');
        stats.forEach(s => {
            const label = s.label || 'Metric';
            const val = s.value !== undefined ? s.value : (s.val !== undefined ? s.val : '');
            lines.push(`${escapeCsvCell(label)},${escapeCsvCell(formatCsvValue(val))}`);
        });

        if (result.bmiGauge) {
            const bmiScore = typeof result.bmiGauge.bmi === 'number'
                ? result.bmiGauge.bmi.toFixed(2)
                : formatCsvValue(result.bmiGauge.bmi);
            lines.push(`Body Mass Index (BMI),${escapeCsvCell(bmiScore)}`);
            lines.push(`BMI Health Classification,${escapeCsvCell(formatCsvValue(result.bmiGauge.label))}`);
        }
        lines.push('');
    }

    // 4. Strategic Recommendation Section
    if (result.recommendation) {
        lines.push('# SECTION: STRATEGIC RECOMMENDATION');
        lines.push('Factor,Detail');
        const rec = typeof result.recommendation === 'string'
            ? { headline: result.recommendation }
            : result.recommendation;

        if (rec.winner) lines.push(`Recommended Choice,${escapeCsvCell(String(rec.winner).toUpperCase())}`);
        if (rec.savings) lines.push(`Projected Financial Advantage,${escapeCsvCell(formatCsvValue(rec.savings))}`);
        if (rec.confidence) lines.push(`Confidence Level,${escapeCsvCell(formatCsvValue(rec.confidence))}`);
        if (rec.breakEvenYear) lines.push(`Break-even Horizon,${escapeCsvCell(formatCsvValue(rec.breakEvenYear))}`);
        if (rec.headline) lines.push(`Summary Headline,${escapeCsvCell(formatCsvValue(rec.headline))}`);

        if (Array.isArray(rec.reasons) && rec.reasons.length > 0) {
            rec.reasons.forEach((r, idx) => {
                lines.push(`Supporting Factor ${idx + 1},${escapeCsvCell(formatCsvValue(r))}`);
            });
        }
        if (Array.isArray(rec.risks) && rec.risks.length > 0) {
            rec.risks.forEach((rk, idx) => {
                lines.push(`Risk/Consideration ${idx + 1},${escapeCsvCell(formatCsvValue(rk))}`);
            });
        }
        lines.push('');
    }

    // 5. Key Analytical Insights
    const hasInsight = Boolean(result.insight);
    const hasInsights = Array.isArray(result.insights) && result.insights.length > 0;
    if (hasInsight || hasInsights) {
        lines.push('# SECTION: ANALYTICAL INSIGHTS');
        lines.push('Category,Detail');
        if (result.insight) {
            if (typeof result.insight === 'string') {
                lines.push(`Key Insight,${escapeCsvCell(result.insight)}`);
            } else if (typeof result.insight === 'object') {
                const hl = result.insight.headline || 'Key Insight';
                const dt = result.insight.detail || '';
                lines.push(`${escapeCsvCell(hl)},${escapeCsvCell(dt)}`);
            }
        }
        if (hasInsights) {
            result.insights.forEach((ins, idx) => {
                if (typeof ins === 'string') {
                    lines.push(`Insight ${idx + 1},${escapeCsvCell(ins)}`);
                } else if (ins && typeof ins === 'object') {
                    const title = ins.title || ins.headline || `Insight ${idx + 1}`;
                    const text = ins.text || ins.detail || ins.message || '';
                    lines.push(`${escapeCsvCell(title)},${escapeCsvCell(text)}`);
                }
            });
        }
        lines.push('');
    }

    // 6. Applied Mathematical Formula
    if (result.formula) {
        lines.push('# SECTION: APPLIED FORMULA');
        lines.push(`Formula,${escapeCsvCell(formatCsvValue(result.formula))}`);
        lines.push('');
    }

    // 7. Breakdown Tables
    const appendTableSection = (title, data) => {
        if (!data) return;
        let rows = [];
        let headers = null;
        if (Array.isArray(data) && data.length > 0) {
            rows = data;
        } else if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
            rows = data.rows;
            headers = data.headers;
        }
        if (rows.length === 0) return;

        lines.push(`# SECTION: ${title.toUpperCase()}`);
        const keys = headers || Object.keys(rows[0] || {});
        lines.push(keys.map(k => escapeCsvCell(k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()).trim())).join(','));

        rows.forEach(row => {
            const rowValues = keys.map(k => escapeCsvCell(formatCsvValue(row[k])));
            lines.push(rowValues.join(','));
        });
        lines.push('');
    };

    if (result.table) {
        appendTableSection('Schedule / Breakdown Table', result.table);
    }
    if (result.assetTable) {
        appendTableSection('Assets Breakdown', result.assetTable);
    }
    if (result.liabilityTable) {
        appendTableSection('Liabilities Breakdown', result.liabilityTable);
    }

    const csvContent = lines.join('\n');
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    return csvContent;
}

export function exportToJSON(data, options = {}) {
    const { filename = 'export.json', pretty = true } = options;
    const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    downloadFile(json, filename, 'application/json');
    return json;
}

export function exportToText(text, options = {}) {
    const { filename = 'export.txt' } = options;
    downloadFile(text, filename, 'text/plain');
    return text;
}

export function exportAmortizationSchedule(schedule) {
    if (!schedule || !schedule.length) return '';
    let text = 'Month,Payment,Principal,Interest,Balance\n';
    schedule.forEach(row => {
        text += `${escapeCsvCell(row.month)},${escapeCsvCell(row.payment)},${escapeCsvCell(row.principal)},${escapeCsvCell(row.interest)},${escapeCsvCell(row.balance)}\n`;
    });
    return text;
}

export function exportResultsAsText(result, tool) {
    if (!result || !tool) return '';
    let text = `${tool.name} Results\n${'='.repeat(40)}\n\n`;
    if (result.stats) {
        result.stats.forEach(stat => {
            text += `${stat.label}: ${formatCsvValue(stat.value)}\n`;
        });
    }
    if (result.table) {
        text += '\nAmortization Schedule\n' + '-'.repeat(40) + '\n';
        text += exportAmortizationSchedule(result.table);
    }
    return text;
}

export function exportComparison(comparison) {
    if (!comparison) return '';
    let text = 'Comparison Results\n' + '='.repeat(40) + '\n\n';
    if (comparison.scenarios) {
        comparison.scenarios.forEach((scenario, i) => {
            text += `Scenario ${i + 1}: ${scenario.name}\n`;
            if (scenario.stats) {
                scenario.stats.forEach(stat => {
                    text += `  ${stat.label}: ${formatCsvValue(stat.value)}\n`;
                });
            }
            text += '\n';
        });
    }
    return text;
}

export async function copyToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        if (typeof document === 'undefined') {
            resolve(false);
            return;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            resolve(true);
        } catch {
            document.body.removeChild(textarea);
            reject(false);
        }
    });
}

export function formatForExport(result, format = 'text') {
    switch (format) {
        case 'csv': return exportAmortizationSchedule(result.table);
        case 'json': return JSON.stringify(result, null, 2);
        case 'text':
        default: return exportResultsAsText(result, { name: 'Calculator Results' });
    }
}

function downloadFile(content, filename, mimeType) {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body || typeof URL.createObjectURL !== 'function') {
        return;
    }
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.warn('File download failed:', e);
    }
}
