/**
 * Print Module
 * 
 * Print-friendly formatting and print handlers.
 * 
 * @module modules/print
 */

import { escapeHtml } from '../utils/index.js';

export function printResults(options = {}) {
    const { title = 'Calculator Results' } = options;
    prepareForPrint(options);
    window.print();
    cleanupAfterPrint();
}

export function createPrintContent(tool, result) {
    if (!tool || !result) return '';
    
    let html = `
        <div class="print-content">
            <h1>${escapeHtml(tool.name)}</h1>
            <p>${escapeHtml(tool.description || '')}</p>
            <hr>
    `;
    
    if (result.stats) {
        html += '<h2>Results</h2><ul>';
        result.stats.forEach(stat => {
            html += `<li><strong>${escapeHtml(stat.label)}:</strong> ${escapeHtml(stat.value)}</li>`;
        });
        html += '</ul>';
    }
    
    if (result.table) {
        html += '<h2>Amortization Schedule</h2><table>';
        html += '<thead><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>';
        result.table.forEach(row => {
            html += `<tr><td>${row.month}</td><td>${row.payment}</td><td>${row.principal}</td><td>${row.interest}</td><td>${row.balance}</td></tr>`;
        });
        html += '</tbody></table>';
    }
    
    html += '</div>';
    return html;
}

export function injectPrintStyles(styles) {
    if (typeof document === 'undefined') return;
    
    let styleEl = document.getElementById('print-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'print-styles';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = styles;
}

export function removePrintStyles() {
    const styleEl = document.getElementById('print-styles');
    if (styleEl) styleEl.remove();
}

export function prepareForPrint(options = {}) {
    const defaultStyles = `
        @media print {
            .sidebar, .site-footer, .top-header, .cookie-consent-banner, .sidebar-overlay,
            .hamburger-btn, .search-trigger, .header-actions, .modal-overlay,
            .tool-not-found, .save-result-bar, .back-to-top-btn, .home-nav-btn { display: none !important; }
            .app-container { display: block; }
            .main-wrapper { margin-left: 0 !important; }
            .content-body { padding: 0 !important; }
            .tool-runner-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
            body { background: #fff !important; }
            .chart-container { break-inside: avoid; }
            table { break-inside: auto; }
            tr { break-inside: avoid; }
            .result-table-container { break-inside: auto; }
        }
    `;
    
    injectPrintStyles(options.styles || defaultStyles);
}

export function cleanupAfterPrint() {
    removePrintStyles();
}

export function setupPrintEvents(beforePrint, afterPrint) {
    if (typeof window === 'undefined') return () => {};
    
    const handleBefore = () => { if (beforePrint) beforePrint(); };
    const handleAfter = () => { if (afterPrint) afterPrint(); cleanupAfterPrint(); };
    
    window.matchMedia('print').addEventListener('change', (e) => {
        if (e.matches) handleBefore();
        else handleAfter();
    });
    
    return () => {
        window.matchMedia('print').removeEventListener('change', () => {});
    };
}
