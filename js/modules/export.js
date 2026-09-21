/**
 * Export Module
 * 
 * Export calculation results in various formats.
 * 
 * @module modules/export
 */

import { escapeHtml } from '../utils/index.js';

export function exportToCSV(data, options = {}) {
    const { filename = 'export.csv', headers = null } = options;
    
    let csv = '';
    
    if (headers) {
        csv += headers.join(',') + '\n';
    }
    
    if (Array.isArray(data) && data.length > 0) {
        const keys = Object.keys(data[0]);
        if (!headers) csv += keys.join(',') + '\n';
        
        data.forEach(row => {
            csv += keys.map(key => {
                const val = row[key];
                if (val === null || val === undefined) return '';
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            }).join(',') + '\n';
        });
    }
    
    downloadFile(csv, filename, 'text/csv');
    return csv;
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
        text += `${row.month},${row.payment},${row.principal},${row.interest},${row.balance}\n`;
    });
    return text;
}

export function exportResultsAsText(result, tool) {
    if (!result || !tool) return '';
    let text = `${tool.name} Results\n${'='.repeat(40)}\n\n`;
    if (result.stats) {
        result.stats.forEach(stat => {
            text += `${stat.label}: ${stat.value}\n`;
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
                    text += `  ${stat.label}: ${stat.value}\n`;
                });
            }
            text += '\n';
        });
    }
    return text;
}

export async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
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
