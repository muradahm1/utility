/**
 * Tool Runner - Hybrid Architecture
 * 
 * Primary entry point for calculator rendering.
 * Uses new core architecture with legacy fallback.
 * 
 * @module tool-runner
 */
import { initializeMigration, legacyHelpers, initToolRunner, updateSeoMeta } from './core/migration.js';
import { escapeHtml, formatCurrency, safeNum, safeStr, roundTo } from './core/calculator-engine.js';
import { fmt } from './utils/index.js';
import { buildStatsHtml, buildInsightHtml, buildRecommendationHtml, buildSummaryHtml, buildBmiGaugeHtml, buildChartsHtml, buildTableHtml, buildBreakdownTablesHtml, buildBarsHtml, buildInsightsHtml, buildTableSpecHtml } from './core/calculator-engine.js';
import { ChartManager } from './modules/charts.js';
import { initErrorBoundary } from './modules/error-boundary.js';
import { exportToCSV, exportToJSON } from './modules/export.js';
import { generateResultsPDF } from './modules/pdf.js';
import { printResults } from './modules/print.js';
import { share } from './modules/sharing.js';
import { buildCalculatorFAQ } from './modules/faq.js';
import { getRelatedTools } from './modules/related-tools.js';
import { getPersonalizedRecommendations } from './modules/recommendations.js';

// Initialize global error boundary (Phase 5.4)
initErrorBoundary();

// Expose legacy globals for backward compatibility with calculators in tools.js
window.esc = escapeHtml;
window.fmt = formatCurrency;
window.fmtN = (n) => safeNum(n, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
window.pct = (n) => (safeNum(n, 0) * 100).toFixed(2) + '%';
window.safeNum = safeNum;
window.safeStr = safeStr;
window.roundTo = roundTo;
window.errorResult = legacyHelpers.errorResult;
window.bmiCategory = legacyHelpers.bmiCategory;
window.buildAmortization = legacyHelpers.buildAmortization;

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('tool-runner-container');
    if (!container) {
        console.warn('Tool runner container not found');
        return;
    }

    let core;
    let useNewArchitecture = false;

    try {
        core = await initializeMigration();
        useNewArchitecture = true;
    } catch (error) {
        console.warn('Core architecture initialization failed, using legacy mode:', error);
        useNewArchitecture = false;
    }

    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('slug');

    // Support pretty URL format: /tool/{slug} (Phase 4 SEO)
    if (!slug) {
        const pathMatch = window.location.pathname.match(/^\/tool\/([a-z0-9-]+)\/?$/);
        if (pathMatch) {
            slug = pathMatch[1];
        }
    }

    const TOOLS = window.TOOLS || {};
    const tool = TOOLS[slug];

    if (!tool) {
        if (!slug) {
            container.innerHTML = `
                <div class="tool-not-found">
                    <div class="not-found-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <h2>Welcome to GetCalcu</h2>
                    <p>Select a calculator from the home page to get started.</p>
                    <a href="/" class="btn btn-primary"><i class="fa-solid fa-house"></i> Go to Home</a>
                </div>`;
            return;
        }
        
        const suggestions = Object.keys(TOOLS).filter(s => s.includes(slug)).slice(0, 4);
        container.innerHTML = `
            <div class="tool-not-found">
                <div class="not-found-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Tool Not Found</h2>
                <p>The calculator "${escapeHtml(slug)}" doesn't exist or the link may be broken.</p>
                ${suggestions.length > 0 ? `
                    <div style="margin-top:20px;">
                        <p style="font-weight:600;margin-bottom:10px;">Did you mean:</p>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
                            ${suggestions.map(s => `<a href="/tool?slug=${encodeURIComponent(s)}" class="btn btn-outline">${escapeHtml(TOOLS[s]?.name || s)}</a>`).join('')}
                        </div>
                    </div>
                ` : ''}
                <a href="/" class="btn btn-primary" style="margin-top:20px;"><i class="fa-solid fa-house"></i> Back to Home</a>
            </div>`;
        return;
    }

    if (useNewArchitecture && core && core.updateSeoMeta) {
        core.updateSeoMeta(tool, slug);
    } else {
        updateSeoLegacy(tool, slug);
    }

    if (useNewArchitecture && core && core.initToolRunner) {
        const calculator = core.initToolRunner(container);
        if (calculator) {
            return;
        }
    }

    initLegacyRunner(tool, slug, container);
});

function updateSeoLegacy(tool, slug) {
    const pageUrl = `https://www.getcalcu.com/tool/${slug}`;
    document.title = tool.metaTitle
        ? tool.metaTitle
        : (`${tool.name} — Free Online Calculator | GetCalcu`.length > 60
            ? `${tool.name} | Free Calculator — GetCalcu`
            : `${tool.name} — Free Online Calculator | GetCalcu`);

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', tool.metaDescription);

    if (tool.keywords && tool.keywords.length) {
        let kwMeta = document.querySelector('meta[name="keywords"]');
        if (!kwMeta) {
            kwMeta = document.createElement('meta');
            kwMeta.setAttribute('name', 'keywords');
            document.head.appendChild(kwMeta);
        }
        kwMeta.setAttribute('content', tool.keywords.join(', '));
    }

    const canonicalTag = document.getElementById('canonical-tag');
    if (canonicalTag) canonicalTag.setAttribute('href', pageUrl);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${tool.name} | GetCalcu`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', tool.metaDescription);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', pageUrl);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', `${tool.name} | GetCalcu`);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', tool.metaDescription);

    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: tool.name,
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: tool.metaDescription,
        url: pageUrl,
    });
    document.head.appendChild(schemaScript);

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.getcalcu.com/' },
            { '@type': 'ListItem', position: 2, name: tool.category, item: `https://www.getcalcu.com/?category=${tool.category.toLowerCase()}` },
            { '@type': 'ListItem', position: 3, name: tool.name, item: pageUrl },
        ]
    });
    document.head.appendChild(breadcrumbScript);

    if (tool.faqs && tool.faqs.length) {
        const faqScript = document.createElement('script');
        faqScript.type = 'application/ld+json';
        faqScript.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: tool.faqs.map(f => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a }
            }))
        });
        document.head.appendChild(faqScript);
    }

    if (tool.article) {
        const articleScript = document.createElement('script');
        articleScript.type = 'application/ld+json';
        articleScript.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: tool.article.heading,
            description: tool.article.intro,
            author: { '@type': 'Organization', name: 'GetCalcu' },
            publisher: { '@type': 'Organization', name: 'GetCalcu', url: 'https://www.getcalcu.com/' },
            about: tool.name,
            url: pageUrl,
        });
        document.head.appendChild(articleScript);
    }
}

function initLegacyRunner(tool, slug, container) {
    let values = {};
    tool.fields.forEach(f => {
        values[f.id] = typeof f.default === 'function' ? f.default() : f.default;
    });

    // ── Phase 5.3: Debounce recalculation (~200ms) ─────────────
    let debounceTimer = null;
    function debouncedUpdate() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updateResults();
            updateShareUrl();
        }, 200);
    }

    // ── Phase 5.5: Hide loading skeleton once tool renders ────
    const skeleton = document.getElementById('tool-loading-skeleton');
    if (skeleton) skeleton.style.display = 'none';

    // ── Phase 5.9: Load values from shareable URL (?input=...) ─
    const urlInput = new URLSearchParams(window.location.search).get('input');
    if (urlInput) {
        try {
            const inputParams = new URLSearchParams(decodeURIComponent(urlInput));
            tool.fields.forEach(f => {
                if (inputParams.has(f.id)) {
                    const raw = inputParams.get(f.id);
                    if (f.type === 'number' || f.type === 'range') {
                        const n = parseFloat(raw);
                        if (!isNaN(n)) values[f.id] = n;
                    } else if (f.type === 'select') {
                        values[f.id] = raw;
                    }
                }
            });
        } catch (e) {
            console.warn('Failed to parse input URL params:', e);
        }
    }

    // ── Phase 5.9: Shareable result URLs (#input=...) ──────────
    function updateShareUrl() {
        const params = new URLSearchParams();
        tool.fields.forEach(f => {
            if (f.type === 'number' || f.type === 'range' || f.type === 'select') {
                params.set(f.id, values[f.id]);
            }
        });
        const hash = params.toString();
        const url = window.location.pathname + (hash ? '?input=' + encodeURIComponent(hash) : '');
        if (window.location.search !== url) {
            history.replaceState(null, '', url);
        }
    }

    function buildFormHtml() {
        let html = '';
        let inCollapsible = false;
        for (const field of tool.fields) {
            const labels = tool.fieldLabels ? tool.fieldLabels(values) : {};
            const label = labels[field.id] || field.label;
            const hidden = field.condition && !field.condition(values);
            const attrs = [
                field.min !== undefined ? `min="${field.min}"` : '',
                field.max !== undefined ? `max="${field.max}"` : '',
                field.step !== undefined ? `step="${field.step}"` : '',
            ].join(' ');

            if (field.type === 'section') {
                if (inCollapsible) { html += '</div></details>'; inCollapsible = false; }
                if (field.collapsible) {
                    html += `<details class="advanced-section" ${field.open ? 'open' : ''} data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}><summary class="form-section-header advanced-section-summary"><i class="fa-solid ${field.icon || 'fa-circle'}"></i><span>${escapeHtml(label)}</span><i class="fa-solid fa-chevron-down advanced-chevron"></i></summary><div class="advanced-section-body">`;
                    inCollapsible = true;
                } else {
                    html += `<div class="form-section-header" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}><i class="fa-solid ${field.icon || 'fa-circle'}"></i><span>${escapeHtml(label)}</span></div>`;
                }
                continue;
            }
            if (field.type === 'select') {
                html += `<div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}><label for="${field.id}">${escapeHtml(label)}</label>${field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : ''}<select id="${field.id}" data-id="${field.id}" aria-describedby="error-${field.id}">${field.options.map(o => `<option value="${o.value}" ${values[field.id] == o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select></div>`;
                continue;
            }
            if (field.type === 'range') {
                html += `<div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}><label for="${field.id}">${escapeHtml(label)}</label>${field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : ''}<div class="range-input-wrap"><input type="number" id="${field.id}" data-id="${field.id}" value="${values[field.id]}" ${attrs} aria-describedby="error-${field.id}"><input type="range" id="${field.id}-range" data-range-for="${field.id}" value="${values[field.id]}" ${attrs} aria-label="${escapeHtml(label)} slider"></div><span class="field-error hidden" id="error-${field.id}" data-error="${field.id}" role="alert"></span></div>`;
                continue;
            }
            html += `<div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}><label for="${field.id}">${escapeHtml(label)}</label>${field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : ''}<input type="${field.type}" id="${field.id}" data-id="${field.id}" value="${values[field.id]}" ${attrs} aria-describedby="error-${field.id}"><span class="field-error hidden" id="error-${field.id}" data-error="${field.id}" role="alert"></span></div>`;
        }
        if (inCollapsible) html += '</div></details>';
        return html;
    }

    function updateResults() {
        let result;
        try { result = tool.calculate(values); } 
        catch (err) { console.error('Calculation error:', err); return; }
        const card = document.querySelector('.calculator-results-card');
        if (!card) return;

        card.innerHTML =
            (result.error ? '' : buildInsightHtml(result.insight)) +
            buildRecommendationHtml(result.recommendation) +
            buildSummaryHtml(result.summary) +
            buildBmiGaugeHtml(result.bmiGauge) +
            buildStatsHtml(result.stats) +
            (result.bars ? buildBarsHtml(result.bars) : '') +
            buildChartsHtml(result) +
            buildBreakdownTablesHtml(result) +
            buildInsightsHtml(result.insights) +
            buildResultsToolbarHtml(result);

        if (result.table) {
            const tableContainer = document.querySelector('.calc-data-table');
            if (tableContainer) {
                if (result.table.mode) {
                    tableContainer.outerHTML = buildTableSpecHtml(result.table);
                } else {
                    const tbody = tableContainer.querySelector('tbody');
                    if (tbody) tbody.innerHTML = buildTableRowsHtml(result.table);
                }
            }
        }

        if (result.chart) renderChart(result.chart);
        if (result.chart2) renderChart(result.chart2, 'result-chart-2');
        if (result.compareChart) renderChart(result.compareChart, 'result-chart-3');
        if (result.chart3) renderChart(result.chart3, 'result-chart-4');
        bindResultsToolbar(result);

        tool.fields.forEach(field => {
            const group = document.querySelector(`.form-group[data-field="${field.id}"]`);
            if (group) {
                if (field.condition) group.style.display = field.condition(values) ? '' : 'none';
                if (tool.fieldLabels) {
                    const lbl = tool.fieldLabels(values)[field.id];
                    if (lbl) group.querySelector('label').textContent = lbl;
                }
                return;
            }
            if (field.type === 'section') {
                const section = document.querySelector(`.form-section-header[data-field="${field.id}"]`);
                if (section && field.condition) section.style.display = field.condition(values) ? '' : 'none';
            }
        });
    }

    function buildResultsToolbarHtml(result) {
        return `
            <div class="results-action-toolbar" id="results-action-toolbar" role="toolbar" aria-label="Calculation actions">
                <button class="btn btn-outline btn-sm action-btn" id="action-share-btn" title="Share calculation with current inputs"><i class="fa-solid fa-share-nodes"></i> <span>Share</span></button>
                <button class="btn btn-outline btn-sm action-btn" id="action-pdf-btn" title="Download PDF Report"><i class="fa-solid fa-file-pdf"></i> <span>PDF</span></button>
                <button class="btn btn-outline btn-sm action-btn" id="action-csv-btn" title="Export CSV Data"><i class="fa-solid fa-file-csv"></i> <span>CSV</span></button>
                <button class="btn btn-outline btn-sm action-btn" id="action-print-btn" title="Print results"><i class="fa-solid fa-print"></i> <span>Print</span></button>
                <button class="btn btn-outline btn-sm action-btn copy-results-btn" id="copy-results-btn" title="Copy results text"><i class="fa-regular fa-copy"></i> <span>Copy</span></button>
            </div>
        `;
    }

    function showActionToast(message, isError = false) {
        const existing = document.querySelector('.action-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'action-toast';
        if (isError) toast.style.background = '#EF4444';
        toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-check'}"></i> <span>${escapeHtml(message)}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    function bindResultsToolbar(result) {
        const shareBtn = document.getElementById('action-share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                const currentUrl = window.location.href;
                const shareData = {
                    title: `${tool.name} — GetCalcu`,
                    text: `Check out this ${tool.name} calculation on GetCalcu`,
                    url: currentUrl
                };
                if (navigator.share) {
                    try {
                        await navigator.share(shareData);
                        trackEvent('calculator_action', { action_type: 'share' });
                        return;
                    } catch (e) {
                        // User dismissed or unsupported
                    }
                }
                try {
                    await navigator.clipboard.writeText(currentUrl);
                    showActionToast('Scenario link copied to clipboard!');
                    trackEvent('calculator_action', { action_type: 'share' });
                } catch {
                    showActionToast('Link copied!');
                }
            });
        }

        const pdfBtn = document.getElementById('action-pdf-btn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', async () => {
                pdfBtn.disabled = true;
                pdfBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Generating...</span>';
                try {
                    await generateResultsPDF(tool, result, values);
                    showActionToast('PDF report downloaded!');
                    trackEvent('calculator_action', { action_type: 'pdf_download' });
                } catch (e) {
                    console.error('PDF error:', e);
                    showActionToast('PDF generation failed. You can use Print.', true);
                } finally {
                    pdfBtn.disabled = false;
                    pdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> <span>PDF</span>';
                }
            });
        }

        const csvBtn = document.getElementById('action-csv-btn');
        if (csvBtn) {
            csvBtn.addEventListener('click', () => {
                if (result.table && Array.isArray(result.table) && result.table.length > 0) {
                    exportToCSV(result.table, { filename: `${slug}-schedule.csv` });
                    showActionToast('Schedule exported as CSV!');
                    trackEvent('calculator_action', { action_type: 'csv_export' });
                } else if (result.table && result.table.rows && Array.isArray(result.table.rows)) {
                    exportToCSV(result.table.rows, { filename: `${slug}-data.csv` });
                    showActionToast('Data exported as CSV!');
                    trackEvent('calculator_action', { action_type: 'csv_export' });
                } else if (result.stats && Array.isArray(result.stats)) {
                    const exportRows = result.stats.map(s => ({ Metric: s.label, Value: s.value }));
                    exportToCSV(exportRows, { filename: `${slug}-summary.csv` });
                    showActionToast('Summary exported as CSV!');
                    trackEvent('calculator_action', { action_type: 'csv_export' });
                } else {
                    showActionToast('No exportable data available.', true);
                }
            });
        }

        const printBtn = document.getElementById('action-print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                printResults({ title: `${tool.name} Results` });
                trackEvent('calculator_action', { action_type: 'print' });
            });
        }

        const copyBtn = document.getElementById('copy-results-btn');
        if (copyBtn && result && result.stats) {
            copyBtn.addEventListener('click', async () => {
                const text = result.stats.map(s => `${s.label}: ${s.value}`).join('\n');
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
                    copyBtn.style.color = '#10B981';
                    copyBtn.style.borderColor = '#10B981';
                    trackEvent('calculator_action', { action_type: 'copy' });
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>';
                        copyBtn.style.color = '';
                        copyBtn.style.borderColor = '';
                    }, 2000);
                } catch {
                    copyBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> <span>Failed</span>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>';
                    }, 2000);
                }
            });
        }
    }

    function trackEvent(eventName, eventParams = {}) {
        if (typeof window !== 'undefined' && window.dataLayer && Array.isArray(window.dataLayer)) {
            window.dataLayer.push({
                event: eventName,
                calculator_slug: slug,
                calculator_name: tool?.name,
                ...eventParams
            });
        }
    }

    function render() {
        // Defensive check (ISSUE-106): only invoke customRenderer if it is
        // actually a function. A boolean `true` (legacy budget-planner) would
        // throw "TypeError: tool.customRenderer is not a function".
        if (typeof tool.customRenderer === 'function') {
            tool.customRenderer(container);
            return;
        }

        let result;
        try { result = tool.calculate(values); } 
        catch (err) {
            console.error('Initial render calculation error:', err);
            container.innerHTML = `<div class="tool-runner-card"><div class="tool-header"><h1>${escapeHtml(tool.name)}</h1><p>${escapeHtml(tool.description)}</p></div><div class="calculator-results-card"><p style="color:#EF4444;">An error occurred while calculating. Please check your inputs.</p></div></div>`;
            return;
        }

        const periodLabel = (slug === 'compound-interest-calculator' || slug === 'investment-calculator' || slug === 'retirement-calculator') ? 'Year' : 'Month';
        const scheduleTitle = (slug === 'compound-interest-calculator' || slug === 'investment-calculator' || slug === 'retirement-calculator') ? 'Year-by-Year Schedule' : 'Amortization Schedule';
        let tableHtml = '';
        if (result.table) {
            if (result.table.mode) {
                tableHtml = buildTableSpecHtml(result.table);
            } else {
                tableHtml = `<div class="result-table-container calc-data-table amortization-result-table"><h4>${scheduleTitle}</h4><div class="table-wrapper"><table><thead><tr><th>${periodLabel}</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>${buildTableRowsHtml(result.table)}</tbody></table></div></div>`;
            }
        }

        container.innerHTML = `
            <div class="tool-runner-card">
                <div class="tool-header"><h1>${escapeHtml(tool.name)}</h1><p>${escapeHtml(tool.description)}</p></div>
                <div class="tool-grid-workspace">
                    <div class="calculator-form-inputs">${buildFormHtml()}</div>
                    <div class="calculator-results-card" aria-live="polite" aria-atomic="true">
                        ${result.error ? '' : buildInsightHtml(result.insight)}
                        ${buildRecommendationHtml(result.recommendation)}
                        ${buildSummaryHtml(result.summary)}
                        ${buildBmiGaugeHtml(result.bmiGauge)}
                        ${buildStatsHtml(result.stats)}
                        ${result.bars ? buildBarsHtml(result.bars) : ''}
                        ${buildChartsHtml(result)}
                        ${buildBreakdownTablesHtml(result)}
                        ${buildInsightsHtml(result.insights)}
                        ${buildResultsToolbarHtml(result)}
                    </div>
                </div>
                ${tableHtml}
                <div class="save-result-bar" id="save-result-bar">
                    <button class="btn btn-primary" id="save-result-btn"><i class="fa-solid fa-bookmark"></i> Save Result</button>
                    <button class="btn btn-outline btn-sm" id="reset-btn"><i class="fa-solid fa-rotate-left"></i> Reset</button>
                    <span class="save-result-msg hidden" id="save-result-msg"></span>
                </div>
            </div>
            ${buildJourneyHtml(result.journey)}
            ${buildSeoContentHtml()}
            ${buildRelatedToolsHtml()}`;

        if (result.chart) renderChart(result.chart);
        if (result.chart2) renderChart(result.chart2, 'result-chart-2');
        if (result.compareChart) renderChart(result.compareChart, 'result-chart-3');
        if (result.chart3) renderChart(result.chart3, 'result-chart-4');
        bindResultsToolbar(result);
        initSaveButton();
        initResetButton();
        trackEvent('calculator_viewed');
    }

    function validateField(field, rawValue) {
        if (field.type !== 'number') return null;
        if (rawValue === '' || rawValue === null) return 'This field is required.';
        const n = parseFloat(rawValue);
        if (isNaN(n)) return 'Please enter a valid number.';
        if (field.min !== undefined && n < field.min) return `Minimum value is ${field.min}.`;
        if (field.max !== undefined && n > field.max) return `Maximum value is ${field.max}.`;
        return null;
    }

    function showFieldError(fieldId, message) {
        const input = document.getElementById(fieldId);
        const errEl = document.getElementById(`error-${fieldId}`) || document.querySelector(`[data-error="${fieldId}"]`);
        if (input) {
            input.classList.toggle('input-error', !!message);
            if (message) {
                input.setAttribute('aria-invalid', 'true');
            } else {
                input.removeAttribute('aria-invalid');
            }
        }
        if (errEl) {
            errEl.textContent = message || '';
            errEl.classList.toggle('hidden', !message);
        }
    }

    function handleInputChange(e) {
        const id = e.target.dataset.id;
        if (!id) return;
        const field = tool.fields.find(f => f.id === id);
        if (!field) return;
        let value = e.target.value;
        if (field.type === 'number') {
            const err = validateField(field, value);
            showFieldError(id, err);
            if (err) return;
            value = parseFloat(value);
        }
        values[id] = value;
        debouncedUpdate();
    }

    function handleRangeInput(e) {
        const rangeFor = e.target.dataset.rangeFor;
        if (!rangeFor) return;
        const numInput = document.getElementById(rangeFor);
        if (numInput) numInput.value = e.target.value;
        values[rangeFor] = parseFloat(e.target.value);
        debouncedUpdate();
    }

    // ── Phase 5.8: Enter-to-recalculate on number inputs ──────
    function handleKeyDown(e) {
        if (e.key === 'Enter' && e.target.dataset.id) {
            e.preventDefault();
            debouncedUpdate();
        }
    }

    container.addEventListener('input', handleInputChange);
    container.addEventListener('change', handleInputChange);
    container.addEventListener('input', handleRangeInput);
    container.addEventListener('change', handleRangeInput);
    container.addEventListener('keydown', handleKeyDown);

    function initSaveButton() {
        const bar = document.getElementById('save-result-bar');
        const btn = document.getElementById('save-result-btn');
        const msg = document.getElementById('save-result-msg');
        if (!bar || !btn) return;
        if (typeof onAuthChange === 'function') {
            onAuthChange(session => { bar.style.display = session ? '' : 'none'; });
        } else {
            bar.style.display = 'none';
        }
        btn.addEventListener('click', async () => {
            if (typeof saveCalculation !== 'function') return;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
            try {
                const result = tool.calculate(values);
                const { error } = await saveCalculation(slug, tool.name, values, { stats: result.stats });
                msg.classList.remove('hidden');
                msg.textContent = error ? 'Failed to save. Please try again.' : 'Saved to history!';
                msg.style.color = error ? '#EF4444' : '#10B981';
            } catch (err) {
                msg.classList.remove('hidden');
                msg.textContent = 'Failed to save. Please try again.';
                msg.style.color = '#EF4444';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Save Result';
                setTimeout(() => msg.classList.add('hidden'), 3000);
            }
        });
    }

    // ── Phase 5.8: Reset button — restore defaults ────────────
    function initResetButton() {
        const resetBtn = document.getElementById('reset-btn');
        if (!resetBtn) return;
        resetBtn.addEventListener('click', () => {
            tool.fields.forEach(f => {
                values[f.id] = typeof f.default === 'function' ? f.default() : f.default;
            });
            // Clear any field errors
            tool.fields.forEach(f => {
                const input = document.getElementById(f.id);
                const errEl = document.querySelector(`[data-error="${f.id}"]`);
                if (input) input.classList.remove('input-error');
                if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
            });
            // Re-render form with default values
            const formContainer = document.querySelector('.calculator-form-inputs');
            if (formContainer) formContainer.innerHTML = buildFormHtml();
            // Recalculate and update URL
            updateResults();
            updateShareUrl();
        });
    }

    function buildSeoContentHtml() {
        let html = '';
        if (tool.article) {
            const a = tool.article;
            const sectionsHtml = (a.sections && a.sections.length)
                ? a.sections.map(s => `<h3 style="font-size:15px;font-weight:700;margin:18px 0 8px;color:var(--text-primary);">${escapeHtml(s.heading)}</h3><p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${escapeHtml(s.body)}</p>`).join('')
                : '';
            html += `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:20px;font-weight:700;margin-bottom:14px;color:var(--text-primary);">${escapeHtml(a.heading)}</h2><p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${escapeHtml(a.intro)}</p>${sectionsHtml}</div>`;
        }
        if (tool.howTo && tool.howTo.length) {
            const steps = tool.howTo.map((step, i) => `<li style="margin-bottom:10px;"><strong>Step ${i + 1}:</strong> ${escapeHtml(step)}</li>`).join('');
            html += `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">How to Use the ${escapeHtml(tool.name)}</h2><ol style="padding-left:20px;color:var(--text-secondary);font-size:14px;line-height:1.8;">${steps}</ol>${tool.formula ? `<div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px 18px;margin-top:16px;font-size:13px;color:var(--text-secondary);"><strong style="color:var(--text-primary);">Formula:</strong> ${escapeHtml(tool.formula)}</div>` : ''}</div>`;
        }
        if (tool.examples && tool.examples.length) {
            const exHtml = tool.examples.map(ex => `<div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px;"><p style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text-primary);">${escapeHtml(ex.title)}</p><p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;"><strong>Input:</strong> ${escapeHtml(ex.input)}</p><p style="font-size:13px;color:var(--text-secondary);"><strong>Result:</strong> <span style="color:var(--primary-color);font-weight:700;">${escapeHtml(ex.result)}</span></p></div>`).join('');
            html += `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Real-World Examples</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">${exHtml}</div></div>`;
        }
        if (tool.faqs && tool.faqs.length) {
            html += `<div class="tool-runner-card" style="margin-top:24px;">${buildCalculatorFAQ(tool, { searchable: false })}</div>`;
        }
        return html;
    }

    function buildRelatedToolsHtml() {
        const related = getRelatedTools(slug, { limit: 4 });
        if (!related.length) return '';
        const cards = related.map(t => `<a href="/tool/${encodeURIComponent(t.slug)}" class="tool-card"><div class="tool-icon ${escapeHtml(t.iconClass || 'icon-finance')}"><i class="fa-solid ${escapeHtml(t.icon || 'fa-calculator')}"></i></div><h3 style="font-size:14px;margin-bottom:4px;">${escapeHtml(t.name)}</h3><p style="font-size:12px;color:var(--text-secondary);">${escapeHtml(t.description || '')}</p><span class="tag ${escapeHtml(t.tagClass || 'tag-finance')}">${escapeHtml(t.category || '')}</span></a>`).join('');
        return `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Related Calculators</h2><div class="tools-grid">${cards}</div></div>`;
    }

    function buildJourneyHtml(journey) {
        if (!journey || !journey.length) return '';
        const items = journey.map(j => `<a href="/tool/${encodeURIComponent(j.slug)}" class="tool-card"><div class="tool-icon ${escapeHtml(j.iconClass || 'icon-finance')}"><i class="fa-solid ${escapeHtml(j.icon || 'fa-calculator')}"></i></div><h3 style="font-size:14px;margin-bottom:4px;">${escapeHtml(j.name)}</h3><p style="font-size:12px;color:var(--text-secondary);">${escapeHtml(j.why || '')}</p></a>`).join('');
        return `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Your Next Step</h2><div class="tools-grid">${items}</div></div>`;
    }

    function renderChart(chartData, canvasId) {
        const id = canvasId || 'result-chart';
        const canvas = document.getElementById(id);
        if (!canvas) return;
        
        // Map legacy chart data to ChartManager format
        const type = chartData.type || 'doughnut';
        const isHBar = type === 'horizontalBar';
        const normalizedType = isHBar ? 'bar' : type;
        
        // Build datasets for ChartManager
        let datasets;
        if (type === 'doughnut' || !type) {
            datasets = [{
                data: chartData.data || [chartData.principal, chartData.totalInterest],
                colors: chartData.colors || ['#6366F1', '#F59E0B'],
                backgroundColor: chartData.colors || ['#6366F1', '#F59E0B']
            }];
        } else {
            datasets = (chartData.datasets || []).map(ds => ({
                label: ds.label,
                data: ds.data,
                color: ds.color || '#6366F1',
                backgroundColor: ds.backgroundColor,
                fill: ds.fill,
                format: ds.format
            }));
        }
        
        // Create chart via ChartManager
        ChartManager.create({
            id,
            type: normalizedType,
            container: canvas.parentElement || canvas,
            data: {
                labels: chartData.labels || [],
                datasets
            },
            format: chartData.format || 'currency',
            cutout: chartData.cutout,
            options: isHBar ? { indexAxis: 'y' } : undefined
        });
    }

    function buildTableRowsHtml(table) {
        return table.map(row => `<tr><td>${escapeHtml(row.month)}</td><td>${escapeHtml(fmt(row.payment))}</td><td>${escapeHtml(fmt(row.principal))}</td><td>${escapeHtml(fmt(row.interest))}</td><td>${escapeHtml(fmt(row.balance))}</td></tr>`).join('');
    }

    function buildTableSpecHtml(tbl) {
        if (!tbl || !tbl.columns) return '';
        function fmtCell(raw, format) {
            if (raw === null || raw === undefined || raw === '') return '';
            if (typeof raw === 'string') return escapeHtml(raw);
            if (format === 'currency') return fmt(raw);
            if (format === 'percent') return pct(raw / 100);
            if (format === 'number') return fmtN(raw);
            return escapeHtml(raw);
        }
        const headerCells = tbl.columns.map(c => `<th${c.emphasis ? ' style="font-weight:700;color:var(--text-primary);"' : ''}>${escapeHtml(c.label)}</th>`).join('');
        const dataRows = (tbl.rows || []).map(r => {
            const cells = tbl.columns.map(c => `<td${c.emphasis ? ' style="font-weight:600;color:var(--text-primary);"' : ''}>${fmtCell(r[c.key], c.format)}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        const footerRow = tbl.footer ? `<tr style="font-weight:700;border-top:2px solid var(--border-color);">${tbl.columns.map(c => { const formatted = fmtCell(tbl.footer[c.key], c.format); return `<td${c.emphasis ? ' style="font-weight:700;color:var(--text-primary);"' : ''}>${formatted}</td>`; }).join('')}</tr>` : '';
        return `<div class="result-table-container calc-data-table"><h4>${escapeHtml(tbl.title)}</h4><div class="table-wrapper"><table><thead><tr>${headerCells}</tr></thead><tbody>${dataRows}${footerRow}</tbody></table></div></div>`;
    }

    render();
}
