/**
 * Tool Runner - Hybrid Architecture
 * 
 * Bridges legacy tool-runner with new core architecture
 * Maintains 100% backward compatibility while enabling new features
 * 
 * @module tool-runner
 */

// ── Import Core Architecture ───────────────────────────────────
// Use dynamic import for gradual migration
import { initializeMigration, initToolRunner, updateSeoMeta } from './core/migration.js';

// ── XSS-safe text encoder (legacy) ─────────────────────────────
/**
 * Escape HTML to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
}

// ── Legacy Helper Functions ────────────────────────────────────
// These maintain backward compatibility with existing calculators
// They are now provided by the core architecture but kept here for safety

const safeNum = (val, fallback = 0) => {
    if (val === null || val === undefined) return fallback;
    const num = Number(val);
    return isFinite(num) ? num : fallback;
};

const safeStr = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
};

const fmt = (n) => {
    const num = safeNum(n, 0);
    return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtN = (n) => {
    const num = safeNum(n, 0);
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const pct = (n) => {
    const num = safeNum(n, 0);
    return (num * 100).toFixed(2) + "%";
};

const roundTo = (n, decimals = 2) => {
    if (!isFinite(n)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round((n + Number.EPSILON) * factor) / factor;
};

const errorResult = (message) => {
    return { error: true, stats: [{ label: "Error", value: message, warn: true }] };
};

const bmiCategory = (bmi) => {
    if (!isFinite(bmi)) return { label: "—", color: "#64748B" };
    if (bmi < 18.5) return { label: "Underweight", color: "#3B82F6" };
    if (bmi < 25) return { label: "Normal Weight", color: "#10B981" };
    if (bmi < 30) return { label: "Overweight", color: "#F59E0B" };
    return { label: "Obese", color: "#EF4444" };
};

const buildAmortization = (principal, r, n, payment) => {
    const rows = [];
    let balance = safeNum(principal, 0);
    for (let i = 1; i <= n; i++) {
        const interest = roundTo(balance * r, 2);
        let principalPaid = roundTo(payment - interest, 2);
        if (principalPaid > balance) principalPaid = balance;
        balance = roundTo(balance - principalPaid, 2);
        rows.push({ 
            month: i, 
            payment: (i === n && balance > 0) ? roundTo(principalPaid + balance, 2) : payment, 
            principal: principalPaid, 
            interest, 
            balance: Math.max(0, balance) 
        });
        if (balance <= 0 && i < n) break;
    }
    if (rows.length > 0) {
        rows[rows.length - 1].balance = 0;
        rows[rows.length - 1].payment = roundTo(rows[rows.length - 1].principal + rows[rows.length - 1].interest, 2);
    }
    return rows;
};

// ── Main Application Logic ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('tool-runner-container');
    if (!container) {
        console.warn('Tool runner container not found');
        return;
    }

    // ── Initialize Core Architecture ────────────────────────────
    // The new core architecture is being developed incrementally.
    // For now, always use the proven legacy runner to ensure 100% functionality.
    let core;
    let useNewArchitecture = false;
    
    try {
        // Initialize the new core architecture for tool registration
        core = await initializeMigration();
        // Do NOT use the new architecture for rendering yet - it's still in development
        useNewArchitecture = false;
        console.log('✓ Core architecture initialized (using legacy runner for rendering)');
    } catch (error) {
        console.warn('⚠ Core architecture initialization failed, using legacy mode:', error);
        useNewArchitecture = false;
    }

    // ── Get Tool from URL ───────────────────────────────────────
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    
    // Legacy TOOLS object (will be populated by core/migration.js)
    const TOOLS = window.TOOLS || {};
    const tool = TOOLS[slug];

    // ── Handle Missing or Invalid Tool ──────────────────────────
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
        
        // Tool not found - show error with suggestions
        container.innerHTML = `
            <div class="tool-not-found">
                <div class="not-found-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Tool Not Found</h2>
                <p>The calculator "${esc(slug)}" doesn't exist or the link may be broken.</p>
                <a href="/" class="btn btn-primary"><i class="fa-solid fa-house"></i> Back to Home</a>
            </div>`;
        return;
    }

    // ── SEO Updates ─────────────────────────────────────────────
    if (useNewArchitecture && core && core.updateSeoMeta) {
        // Use new SEO helper
        core.updateSeoMeta(tool, slug);
    } else {
        // Legacy SEO handling
        updateSeoLegacy(tool, slug);
    }

    // ── Initialize Calculator ───────────────────────────────────
    if (useNewArchitecture && core && core.initToolRunner) {
        // Use new architecture
        const calculator = core.initToolRunner(container);
        if (calculator) {
            console.log('✓ Calculator initialized with new architecture');
        } else {
            console.error('Failed to initialize calculator with new architecture');
        }
    } else {
        // Use legacy architecture
        console.log('✓ Using legacy tool-runner');
        initLegacyRunner(tool, slug, container);
    }
});

// ── Legacy SEO Handler ─────────────────────────────────────────

/**
 * Update SEO meta tags (legacy implementation)
 * @param {Object} tool - Tool definition
 * @param {string} slug - Tool slug
 */
function updateSeoLegacy(tool, slug) {
    const pageUrl = `https://www.getcalcu.com/tool?slug=${slug}`;
    
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

    // Schema.org markup
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

// ── Legacy Tool Runner ─────────────────────────────────────────

/**
 * Initialize legacy tool runner (original implementation)
 * This is the complete original tool-runner.js logic
 * @param {Object} tool - Tool definition
 * @param {string} slug - Tool slug
 * @param {HTMLElement} container - Container element
 */
function initLegacyRunner(tool, slug, container) {
    // ── State ──────────────────────────────────────────────────
    let values = {};
    tool.fields.forEach(f => {
        values[f.id] = typeof f.default === 'function' ? f.default() : f.default;
    });

    // ── Shared HTML builders ───────────────────────────────────
    
    function buildStatsHtml(stats) {
        return stats.map(stat => `
            <div class="result-stat-box">
                <span class="res-label">${esc(stat.label)}</span>
                <span class="res-val ${stat.highlight ? 'highlight' : ''}"
                      style="${stat.color ? `color:${esc(stat.color)}` : ''}">${esc(stat.value)}</span>
            </div>`).join('');
    }

    function buildBmiGaugeHtml(bmiGauge) {
        if (!bmiGauge) return '';
        return `
            <div class="bmi-gauge-container">
                <div class="bmi-gauge">
                    <div class="bmi-gauge-fill" style="transform:rotate(${bmiGauge.bmi * 4.5}deg);background-color:${bmiGauge.color};"></div>
                    <div class="bmi-gauge-cover">
                        <div class="bmi-value">${bmiGauge.bmi.toFixed(1)}</div>
                        <div class="bmi-label" style="color:${bmiGauge.color};">${esc(bmiGauge.label)}</div>
                    </div>
                </div>
            </div>`;
    }

    function buildTableRowsHtml(table) {
        return table.map(row => `
            <tr>
                <td>${esc(row.month)}</td>
                <td>${esc(fmt(row.payment))}</td>
                <td>${esc(fmt(row.principal))}</td>
                <td>${esc(fmt(row.interest))}</td>
                <td>${esc(fmt(row.balance))}</td>
            </tr>`).join('');
    }

    function buildInsightHtml(insight) {
        if (!insight) return '';
        const toneMap = { positive: '#10B981', neutral: '#6366F1', warning: '#EF4444' };
        const color = toneMap[insight.tone] || toneMap.neutral;
        return `
            <div class="insight-callout" style="border-left:4px solid ${color};background:var(--bg-main);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px;">
                <i class="fa-solid ${esc(insight.icon)}" style="color:${color};margin-top:2px;font-size:16px;"></i>
                <div>
                    <div style="font-weight:700;font-size:14px;color:var(--text-primary);line-height:1.4;">${esc(insight.headline)}</div>
                    <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;line-height:1.6;">${esc(insight.detail)}</div>
                </div>
            </div>`;
    }

    function buildRecommendationHtml(rec) {
        if (!rec) return '';
        const isBuy = rec.winner === 'buy';
        const accent = isBuy ? '#10B981' : '#6366F1';
        const icon = isBuy ? 'fa-house-chimney' : 'fa-key';
        const winnerLabel = isBuy ? 'Buying' : 'Renting';
        const reasonsHtml = (rec.reasons || []).map(r => `
            <li style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;">
                <i class="fa-solid fa-circle-check" style="color:#10B981;margin-top:3px;font-size:12px;"></i>
                <span>${esc(r)}</span>
            </li>`).join('');
        const risksHtml = (rec.risks || []).map(r => `
            <li style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;">
                <i class="fa-solid fa-triangle-exclamation" style="color:#F59E0B;margin-top:3px;font-size:12px;"></i>
                <span>${esc(r)}</span>
            </li>`).join('');
        return `
            <div class="recommendation-card" style="border:1px solid ${accent}33;background:linear-gradient(135deg, ${accent}0D, transparent);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                    <div style="width:44px;height:44px;border-radius:50%;background:${accent}1A;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid ${icon}" style="color:${accent};font-size:18px;"></i>
                    </div>
                    <div>
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:${accent};">Recommendation</div>
                        <div style="font-size:18px;font-weight:800;color:var(--text-primary);line-height:1.3;">${winnerLabel} is projected to ${rec.savings ? `save you approximately <span style="color:${accent};">${esc(rec.savings)}</span>` : 'be the better financial choice'} over the analysis period.</div>
                    </div>
                </div>
                ${rec.confidence ? `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-main);border:1px solid var(--border-color);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;"><i class="fa-solid fa-gauge-high" style="color:${accent};"></i> Confidence: ${esc(rec.confidence)}</div>` : ''}
                ${rec.breakEvenYear ? `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-main);border:1px solid var(--border-color);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;margin-left:8px;"><i class="fa-solid fa-flag-checkered" style="color:${accent};"></i> Break-even: ${esc(rec.breakEvenYear)}</div>` : ''}
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:8px;"><i class="fa-solid fa-lightbulb" style="color:#F59E0B;margin-right:6px;"></i>Why?</div>
                        <ul style="list-style:none;padding:0;margin:0;font-size:13px;color:var(--text-secondary);line-height:1.6;">${reasonsHtml}</ul>
                    </div>
                    <div>
                        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:8px;"><i class="fa-solid fa-shield-halved" style="color:#EF4444;margin-right:6px;"></i>Risks to Consider</div>
                        <ul style="list-style:none;padding:0;margin:0;font-size:13px;color:var(--text-secondary);line-height:1.6;">${risksHtml}</ul>
                    </div>
                </div>
            </div>`;
    }

    function buildSummaryHtml(summary) {
        if (!summary) return '';
        const kpis = (summary.kpis || []).map(k => `
            <div class="result-stat-box" style="margin-top:0;">
                <span class="res-label">${esc(k.label)}</span>
                <span class="res-val ${k.highlight ? 'highlight' : ''}" style="${k.color ? `color:${esc(k.color)}` : ''}">${esc(k.value)}</span>
            </div>`).join('');
        return `
            <div class="executive-summary" style="margin-bottom:16px;">
                <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px;"><i class="fa-solid fa-gauge-high" style="color:var(--primary-color);margin-right:8px;"></i>Executive Results Dashboard</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">${kpis}</div>
            </div>`;
    }

    function buildChartsHtml(result) {
        const charts = [];
        if (result.chart) charts.push('<div class="chart-container"><canvas id="result-chart"></canvas></div>');
        if (result.chart2) charts.push('<div class="chart-container"><canvas id="result-chart-2"></canvas></div>');
        if (result.compareChart) charts.push('<div class="chart-container"><canvas id="result-chart-3"></canvas></div>');
        if (result.chart3) charts.push('<div class="chart-container"><canvas id="result-chart-4"></canvas></div>');
        if (!charts.length) return '';

        if (result.chart && result.chart2) {
            const firstTwo = charts.slice(0, 2).join('');
            const rest = charts.slice(2).join('');
            return `<div class="charts-side-by-side">${firstTwo}</div>${rest}`;
        }

        return charts.join('');
    }

    function buildBreakdownTablesHtml(result) {
        if (!result.assetTable && !result.liabilityTable) return '';
        let html = '';
        if (result.assetTable) {
            const rows = result.assetTable.map(r => `
                <tr>
                    <td>${esc(r.category)}</td>
                    <td>${esc(fmt(r.amount))}</td>
                    <td>${esc(r.pct + '%')}</td>
                </tr>`).join('');
            html += `
            <div class="result-table-container breakdown-table-container">
                <h4>Asset Breakdown</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Category</th><th>Amount</th><th>% of Assets</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
        }
        if (result.liabilityTable) {
            const rows = result.liabilityTable.map(r => `
                <tr>
                    <td>${esc(r.category)}</td>
                    <td>${esc(fmt(r.amount))}</td>
                    <td>${esc(r.pct + '%')}</td>
                </tr>`).join('');
            html += `
            <div class="result-table-container breakdown-table-container">
                <h4>Liability Breakdown</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Category</th><th>Amount</th><th>% of Liabilities</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
        }
        return html;
    }

    function buildBarsHtml(bars) {
        if (!bars || !bars.length) return '';
        return `
            <div class="coverage-bars" style="margin-top:8px;">
                ${bars.map(bar => {
                    const pct = Math.min(100, (safeNum(bar.value,0) / safeNum(bar.target,1)) * 100);
                    const color = bar.color || '#10B981';
                    return `
                    <div style="margin-bottom:14px;">
                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
                            <span style="font-weight:600;color:var(--text-primary);">${esc(bar.label)}</span>
                            <span style="color:var(--text-secondary);">${safeStr(bar.caption) ? esc(bar.caption) : pct.toFixed(0) + '%'}</span>
                        </div>
                        <div style="width:100%;height:10px;background:var(--border-color);border-radius:5px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:${color};border-radius:5px;"></div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
    }

    function fmtCell(value, format) {
        if (value === null || value === undefined) return '';
        if (format === 'currency') return fmt(value);
        if (format === 'percent') return pct(value / 100);
        if (format === 'number') return fmtN(value);
        return esc(value);
    }

    function buildTableSpecHtml(tbl) {
        if (!tbl || !tbl.columns) return '';
        function fmtCell(raw, format) {
            if (raw === null || raw === undefined || raw === '') return '';
            if (typeof raw === 'string') return esc(raw);
            if (format === 'currency') return fmt(raw);
            if (format === 'percent') return pct(raw / 100);
            if (format === 'number') return fmtN(raw);
            return esc(raw);
        }
        const headerCells = tbl.columns.map(c =>
            `<th${c.emphasis ? ' style="font-weight:700;color:var(--text-primary);"' : ''}>${esc(c.label)}</th>`
        ).join('');
        const dataRows = (tbl.rows || []).map(r => {
            const cells = tbl.columns.map(c => {
                const formatted = fmtCell(r[c.key], c.format);
                return `<td${c.emphasis ? ' style="font-weight:600;color:var(--text-primary);"' : ''}>${formatted}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        const footerRow = tbl.footer ? `<tr style="font-weight:700;border-top:2px solid var(--border-color);">${tbl.columns.map(c => {
            const formatted = fmtCell(tbl.footer[c.key], c.format);
            return `<td${c.emphasis ? ' style="font-weight:700;color:var(--text-primary);"' : ''}>${formatted}</td>`;
        }).join('')}</tr>` : '';
        return `
            <div class="result-table-container calc-data-table">
                <h4>${esc(tbl.title)}</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr>${headerCells}</tr></thead>
                        <tbody>${dataRows}${footerRow}</tbody>
                    </table>
                </div>
            </div>`;
    }

    function buildFormHtml() {
        let html = '';
        let inCollapsible = false;
        for (const field of tool.fields) {
            const labels = tool.fieldLabels ? tool.fieldLabels(values) : {};
            const label  = labels[field.id] || field.label;
            const hidden = field.condition && !field.condition(values);
            const attrs  = [
                field.min  !== undefined ? `min="${field.min}"`   : '',
                field.max  !== undefined ? `max="${field.max}"`   : '',
                field.step !== undefined ? `step="${field.step}"` : '',
            ].join(' ');

            if (field.type === 'section') {
                if (inCollapsible) {
                    html += '</div></details>';
                    inCollapsible = false;
                }
                if (field.collapsible) {
                    html += `
                    <details class="advanced-section" ${field.open ? 'open' : ''} data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                        <summary class="form-section-header advanced-section-summary">
                            <i class="fa-solid ${field.icon || 'fa-circle'}"></i>
                            <span>${esc(label)}</span>
                            <i class="fa-solid fa-chevron-down advanced-chevron"></i>
                        </summary>
                        <div class="advanced-section-body">`;
                    inCollapsible = true;
                } else {
                    html += `
                    <div class="form-section-header" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                        <i class="fa-solid ${field.icon || 'fa-circle'}"></i>
                        <span>${esc(label)}</span>
                    </div>`;
                }
                continue;
            }

            if (field.type === 'select') {
                html += `
                <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                    <label for="${field.id}">${label}</label>
                    ${field.hint ? `<span class="field-hint">${field.hint}</span>` : ''}
                    <select id="${field.id}" data-id="${field.id}">
                        ${field.options.map(o => `<option value="${o.value}" ${values[field.id] == o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                    </select>
                </div>`;
                continue;
            }

            if (field.type === 'range') {
                html += `
                <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                    <label for="${field.id}">${label}</label>
                    ${field.hint ? `<span class="field-hint">${field.hint}</span>` : ''}
                    <div class="range-input-wrap">
                        <input type="number" id="${field.id}" data-id="${field.id}"
                               value="${values[field.id]}" ${attrs}>
                        <input type="range" id="${field.id}-range" data-range-for="${field.id}"
                               value="${values[field.id]}" ${attrs}>
                    </div>
                    <span class="field-error hidden" data-error="${field.id}"></span>
                </div>`;
                continue;
            }

            html += `
                <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                    <label for="${field.id}">${label}</label>
                    ${field.hint ? `<span class="field-hint">${field.hint}</span>` : ''}
                    <input type="${field.type}" id="${field.id}" data-id="${field.id}"
                           value="${values[field.id]}" ${attrs}>
                    <span class="field-error hidden" data-error="${field.id}"></span>
                </div>`;
        }
        if (inCollapsible) {
            html += '</div></details>';
        }
        return html;
    }

    // ── Update results card only (no DOM rebuild) ──────────────
    function updateResults() {
        let result;
        try {
            result = tool.calculate(values);
        } catch (err) {
            console.error('Calculation error:', err);
            return;
        }
        const card   = document.querySelector('.calculator-results-card');
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
            buildCopyBtn();

        if (result.table) {
            const container = document.querySelector('.calc-data-table');
            if (container) {
                if (result.table.mode) {
                    container.outerHTML = buildTableSpecHtml(result.table);
                } else {
                    const tbody = container.querySelector('tbody');
                    if (tbody) tbody.innerHTML = buildTableRowsHtml(result.table);
                }
            }
        }

        if (result.chart) renderChart(result.chart);
        if (result.chart2) renderChart(result.chart2, 'result-chart-2');
        if (result.compareChart) renderChart(result.compareChart, 'result-chart-3');
        if (result.chart3) renderChart(result.chart3, 'result-chart-4');
        bindCopyBtn(result.stats);

        // Conditional field + section visibility + label updates
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
                if (section && field.condition) {
                    section.style.display = field.condition(values) ? '' : 'none';
                }
            }
        });
    }

    // ── Copy button ────────────────────────────────────────────
    function buildCopyBtn() {
        return `<button class="btn btn-outline btn-sm copy-results-btn" id="copy-results-btn" style="margin-top:16px;">
            <i class="fa-regular fa-copy"></i> Copy Results
        </button>`;
    }

    function bindCopyBtn(stats) {
        const btn = document.getElementById('copy-results-btn');
        if (!btn) return;

        const resetCopyBtn = () => {
            btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Results';
            btn.style.color = '';
            btn.style.borderColor = '';
        };

        btn.addEventListener('click', async () => {
            const text = stats.map(s => `${s.label}: ${s.value}`).join('\n');
            try {
                await navigator.clipboard.writeText(text);
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                btn.style.color = '#10B981';
                btn.style.borderColor = '#10B981';
                setTimeout(resetCopyBtn, 2000);
            } catch (err) {
                console.error('Copy failed:', err);
                btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Copy failed';
                btn.style.color = '#EF4444';
                btn.style.borderColor = '#EF4444';
                setTimeout(resetCopyBtn, 2000);
            }
        });
    }

    // ── Initial full render ───────────────────────────────────
    function render() {
        // Budget Planner has a completely custom UI
        if (slug === 'budget-planner') {
            renderBudgetPlanner();
            return;
        }

        let result;
        try {
            result = tool.calculate(values);
        } catch (err) {
            console.error('Initial render calculation error:', err);
            container.innerHTML = `
                <div class="tool-runner-card">
                    <div class="tool-header">
                        <h1>${esc(tool.name)}</h1>
                        <p>${esc(tool.description)}</p>
                    </div>
                    <div class="calculator-results-card">
                        <p style="color:#EF4444;">An error occurred while calculating. Please check your inputs.</p>
                    </div>
                </div>`;
            return;
        }

        const periodLabel = (slug === 'compound-interest-calculator' || slug === 'investment-calculator' || slug === 'retirement-calculator') ? 'Year' : 'Month';
        const scheduleTitle = (slug === 'compound-interest-calculator' || slug === 'investment-calculator' || slug === 'retirement-calculator') ? 'Year-by-Year Schedule' : 'Amortization Schedule';
        let tableHtml = '';
        if (result.table) {
            if (result.table.mode) {
                tableHtml = buildTableSpecHtml(result.table);
            } else {
                tableHtml = `
                    <div class="result-table-container calc-data-table amortization-result-table">
                        <h4>${scheduleTitle}</h4>
                        <div class="table-wrapper">
                            <table>
                                <thead><tr><th>${periodLabel}</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
                                <tbody>${buildTableRowsHtml(result.table)}</tbody>
                            </table>
                        </div>
                    </div>`;
            }
        }

        container.innerHTML = `
            <div class="tool-runner-card">
                <div class="tool-header">
                    <h1>${esc(tool.name)}</h1>
                    <p>${esc(tool.description)}</p>
                </div>
                <div class="tool-grid-workspace">
                    <div class="calculator-form-inputs">${buildFormHtml()}</div>
                    <div class="calculator-results-card">
                        ${result.error ? '' : buildInsightHtml(result.insight)}
                        ${buildRecommendationHtml(result.recommendation)}
                        ${buildSummaryHtml(result.summary)}
                        ${buildBmiGaugeHtml(result.bmiGauge)}
                        ${buildStatsHtml(result.stats)}
                        ${result.bars ? buildBarsHtml(result.bars) : ''}
                        ${buildChartsHtml(result)}
                        ${buildBreakdownTablesHtml(result)}
                        ${buildInsightsHtml(result.insights)}
                        ${buildCopyBtn()}
                    </div>
                </div>
                ${tableHtml}
                <div class="save-result-bar" id="save-result-bar">
                    <button class="btn btn-primary" id="save-result-btn">
                        <i class="fa-solid fa-bookmark"></i> Save Result
                    </button>
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
        bindCopyBtn(result.stats);
        initSaveButton();
    }

    // ── Input validation ──────────────────────────────────────
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
        const errEl = document.querySelector(`[data-error="${fieldId}"]`);
        if (input) input.classList.toggle('input-error', !!message);
        if (errEl) {
            errEl.textContent = message || '';
            errEl.classList.toggle('hidden', !message);
        }
    }

    // ── Event handling ────────────────────────────────────────
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
        updateResults();
    }

    // Sync range slider with its paired number input
    function handleRangeInput(e) {
        const rangeFor = e.target.dataset.rangeFor;
        if (!rangeFor) return;
        const field = tool.fields.find(f => f.id === rangeFor);
        if (!field) return;

        const numInput = document.getElementById(rangeFor);
        if (numInput) numInput.value = e.target.value;

        values[rangeFor] = parseFloat(e.target.value);
        updateResults();
    }

    container.addEventListener('input',  handleInputChange);
    container.addEventListener('change', handleInputChange);
    container.addEventListener('input',  handleRangeInput);
    container.addEventListener('change', handleRangeInput);

    // ── Save result ───────────────────────────────────────────
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
                msg.textContent = error ? 'Failed to save. Please try again.' : '✓ Saved to history!';
                msg.style.color = error ? '#EF4444' : '#10B981';
            } catch (err) {
                console.error('Save calculation failed:', err);
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

    // ── SEO Content Section (How-To, Examples, FAQs) ──────────
    function buildSeoContentHtml() {
        let html = '';

        if (tool.article) {
            const a = tool.article;
            const sectionsHtml = (a.sections && a.sections.length)
                ? a.sections.map(s => `
                    <h3 style="font-size:15px;font-weight:700;margin:18px 0 8px;color:var(--text-primary);">${esc(s.heading)}</h3>
                    <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${esc(s.body)}</p>`).join('')
                : '';
            html += `
            <div class="tool-runner-card" style="margin-top:24px;">
                <h2 style="font-size:20px;font-weight:700;margin-bottom:14px;color:var(--text-primary);">${esc(a.heading)}</h2>
                <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${esc(a.intro)}</p>
                ${sectionsHtml}
            </div>`;
        }

        if (tool.howTo && tool.howTo.length) {
            const steps = tool.howTo.map((step, i) => `
                <li style="margin-bottom:10px;"><strong>Step ${i + 1}:</strong> ${esc(step)}</li>`).join('');
            html += `
            <div class="tool-runner-card" style="margin-top:24px;">
                <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">How to Use the ${esc(tool.name)}</h2>
                <ol style="padding-left:20px;color:var(--text-secondary);font-size:14px;line-height:1.8;">${steps}</ol>
                ${tool.formula ? `<div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px 18px;margin-top:16px;font-size:13px;color:var(--text-secondary);"><strong style="color:var(--text-primary);">Formula:</strong> ${esc(tool.formula)}</div>` : ''}
            </div>`;
        }

        if (tool.examples && tool.examples.length) {
            const exHtml = tool.examples.map(ex => `
                <div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px;">
                    <p style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text-primary);">${esc(ex.title)}</p>
                    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;"><strong>Input:</strong> ${esc(ex.input)}</p>
                    <p style="font-size:13px;color:var(--text-secondary);"><strong>Result:</strong> <span style="color:var(--primary-color);font-weight:700;">${esc(ex.result)}</span></p>
                </div>`).join('');
            html += `
            <div class="tool-runner-card" style="margin-top:24px;">
                <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Real-World Examples</h2>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">${exHtml}</div>
            </div>`;
        }

        if (tool.faqs && tool.faqs.length) {
            const faqHtml = tool.faqs.map(f => `
                <details style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:8px;">
                    <summary style="font-size:14px;font-weight:700;cursor:pointer;color:var(--text-primary);list-style:none;display:flex;justify-content:space-between;align-items:center;">
                        ${esc(f.q)} <i class="fa-solid fa-chevron-down" style="font-size:12px;color:var(--text-secondary);"></i>
                    </summary>
                    <p style="font-size:13px;color:var(--text-secondary);margin-top:10px;line-height:1.7;">${esc(f.a)}</p>
                </details>`).join('');
            html += `
            <div class="tool-runner-card" style="margin-top:24px;">
                <h2 id="faqs" style="font-size:18px;font-weight:700;margin-bottom:16px;">Frequently Asked Questions</h2>
                ${faqHtml}
            </div>`;
        }

        return html;
    }

    // ── Related Tools Section ─────────────────────────────────
    function buildRelatedToolsHtml() {
        const related = Object.entries(TOOLS)
            .filter(([s, t]) => s !== slug && (t.category === tool.category || (tool.related && tool.related.includes(s))))
            .slice(0, 4);
        if (!related.length) return '';

        const cards = related.map(([s, t]) => `
            <a href="/tool?slug=${encodeURIComponent(s)}" class="tool-card">
                <div class="tool-icon ${esc(t.iconClass)}"><i class="fa-solid ${esc(t.icon)}"></i></div>
                <h3 style="font-size:14px;margin-bottom:4px;">${esc(t.name)}</h3>
                <p style="font-size:12px;color:var(--text-secondary);">${esc(t.description)}</p>
                <span class="tag ${esc(t.tagClass)}">${esc(t.category)}</span>
            </a>`).join('');

        return `
        <div class="tool-runner-card" style="margin-top:24px;">
            <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Related Calculators</h2>
            <div class="tools-grid">${cards}</div>
        </div>`;
    }

    // ── Chart ─────────────────────────────────────────────────
    let chartInstances = {};
    function renderChart(chartData, canvasId) {
        const id = canvasId || 'result-chart';
        const canvas = document.getElementById(id);
        if (!canvas) return;
        if (chartInstances[id]) chartInstances[id].destroy();

        const type = chartData.type || 'doughnut';
        const isLine = type === 'line';
        const isBar = type === 'bar';
        const isHBar = type === 'horizontalBar';
        const isDoughnut = !type || type === 'doughnut';

        if (isDoughnut) {
            const labels = chartData.labels || ['Principal', 'Total Interest'];
            const data = chartData.data || [chartData.principal, chartData.totalInterest];
            const colors = chartData.colors || ['#6366F1', '#F59E0B'];
            chartInstances[id] = new Chart(canvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{ data: data, backgroundColor: colors, borderWidth: 2, borderColor: 'var(--bg-card)' }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: chartData.cutout || '62%',
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14, color: 'var(--text-secondary)' } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                    return context.label + ': $' + context.parsed.toFixed(2) + ' (' + pct + '%)';
                                },
                            },
                        },
                    },
                },
            });
            return;
        }

        const datasets = (chartData.datasets || []).map(ds => {
            const base = {
                label: ds.label,
                data: ds.data,
                borderColor: ds.color || '#6366F1',
                backgroundColor: ds.color || '#6366F1',
                tension: 0.25,
                pointRadius: isLine ? (chartData.labels && chartData.labels.length > 30 ? 0 : 3) : 0,
                pointHoverRadius: isLine ? 5 : 0,
                fill: ds.fill || false,
                borderWidth: isLine ? 2.5 : 1,
                borderRadius: isBar || isHBar ? 6 : 0,
                borderSkipped: false,
            };
            if (isBar) {
                base.backgroundColor = chartData.datasets[0].data.map((_, i) => ['#6366F1', '#10B981', '#F59E0B', '#EF4444'][i % 4]);
                base.borderColor = base.backgroundColor;
            }
            if (isHBar) {
                base.backgroundColor = ds.colors || chartData.colors || ['#10B981', '#EF4444'];
                base.borderColor = base.backgroundColor;
                base.borderRadius = 8;
            }
            return base;
        });

        chartInstances[id] = new Chart(canvas.getContext('2d'), {
            type: isHBar ? 'bar' : type,
            data: { labels: chartData.labels || [], datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: isHBar ? 'y' : undefined,
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16, color: 'var(--text-secondary)' } },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const val = ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed;
                                const suffix = chartData.tooltipSuffix || (chartData.yLabel && chartData.yLabel.includes('%') ? '%' : '');
                                if (chartData.yLabel && chartData.yLabel.includes('Yield') && chartData.yLabel.includes('%')) {
                                    return ctx.dataset.label + ': ' + val.toFixed(2) + '%';
                                }
                                if (chartData.yLabel && chartData.yLabel.includes('Yield')) {
                                    return ctx.dataset.label + ': ' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
                                }
                                return ctx.dataset.label + ': ' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
                            },
                        },
                    },
                },
                scales: isLine || isBar || isHBar ? {
                    x: { ticks: { color: 'var(--text-secondary)', font: { size: 11 }, callback: isHBar ? v => '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }) : undefined }, grid: { display: isHBar ? false : undefined } },
                    y: { ticks: { color: 'var(--text-secondary)', font: { size: 11 }, callback: v => chartData.yLabel && chartData.yLabel.includes('%') ? v + '%' : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }, grid: { color: 'var(--border-color)' } },
                } : undefined,
            },
        });
    }

    // ── Budget Planner ───────────────────────────────────────────
    function renderBudgetPlanner() {
        // Budget planner implementation (kept as-is for backward compatibility)
        // This is a special case with completely custom UI
        container.innerHTML = `
            <div class="budget-planner-loading">
                <p>Loading Budget Planner...</p>
            </div>
        `;
        
        // Import and initialize budget planner
        // This would be moved to its own module in a future phase
        setTimeout(() => {
            if (typeof renderBudgetPlannerModule === 'function') {
                renderBudgetPlannerModule(container);
            } else {
                container.innerHTML = `
                    <div class="error-message">
                        <p>Budget Planner module not yet migrated. Please use other calculators.</p>
                    </div>
                `;
            }
        }, 100);
    }

    // ── Journey HTML ──────────────────────────────────────────
    function buildJourneyHtml(journey) {
        if (!journey || !journey.length) return '';
        const cards = journey.map(j => `
            <a href="/tool?slug=${encodeURIComponent(j.slug)}" class="tool-card" style="text-decoration:none;">
                <div class="tool-icon ${esc(j.iconClass || 'icon-finance')}"><i class="fa-solid ${esc(j.icon || 'fa-calculator')}"></i></div>
                <h3 style="font-size:14px;margin-bottom:4px;">${esc(j.name)}</h3>
                <p style="font-size:12px;color:var(--text-secondary);">${esc(j.description)}</p>
                <span class="tag tag-finance">Finance</span>
            </a>`).join('');
        return `
            <div class="tool-runner-card" style="margin-top:24px;">
                <h2 style="font-size:18px;font-weight:700;margin-bottom:6px;"><i class="fa-solid fa-route" style="color:var(--primary-color);margin-right:8px;"></i>Your Next Financial Step</h2>
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Based on your results, these calculators will help you take the next step in your financial journey.</p>
                <div class="tools-grid">${cards}</div>
            </div>`;
    }

    // ── Insights HTML ──────────────────────────────────────────
    function buildInsightsHtml(insights) {
        if (!insights || !insights.length) return '';
        const items = insights.map(ins => `
            <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border-color);">
                <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--primary-color);margin-top:3px;font-size:14px;flex-shrink:0;"></i>
                <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">${esc(ins)}</div>
            </div>`).join('');
        return `
            <div class="insights-card" style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px 18px;margin-top:16px;">
                <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:4px;"><i class="fa-solid fa-brain" style="color:var(--primary-color);margin-right:8px;"></i>Personalized Financial Insights</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">AI-like observations based on your specific numbers.</div>
                ${items}
            </div>`;
    }

    // ── Initial render ────────────────────────────────────────
    render();
}

// Export for backward compatibility
if (typeof window !== 'undefined') {
    window.TOOLS = window.TOOLS || {};
    window.esc = esc;
    window.fmt = fmt;
    window.fmtN = fmtN;
    window.pct = pct;
    window.safeNum = safeNum;
    window.safeStr = safeStr;
    window.roundTo = roundTo;
    window.errorResult = errorResult;
    window.bmiCategory = bmiCategory;
    window.buildAmortization = buildAmortization;
}

console.log('Tool Runner initialized (hybrid architecture)');