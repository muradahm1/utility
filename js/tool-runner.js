// XSS-safe text encoder — wraps all dynamic string output
function esc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('tool-runner-container');
    if (!container) return;

    const slug = new URLSearchParams(window.location.search).get('slug');
    const tool = TOOLS[slug];

    if (!tool) {
        container.innerHTML = `
            <div class="tool-not-found">
                <div class="not-found-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Tool Not Found</h2>
                <p>The calculator you're looking for doesn't exist or the link may be broken.</p>
                <a href="/" class="btn btn-primary"><i class="fa-solid fa-house"></i> Back to Home</a>
            </div>`;
        return;
    }

    // ── SEO ───────────────────────────────────────────────────
    const pageUrl = `https://www.getcalcu.com/tool?slug=${slug}`;
    document.title = tool.metaTitle
        ? tool.metaTitle
        : (`${tool.name} — Free Online Calculator | GetCalcu`.length > 60
            ? `${tool.name} | Free Calculator — GetCalcu`
            : `${tool.name} — Free Online Calculator | GetCalcu`);

    // Null-safe meta tag updates
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', tool.metaDescription);

    // Inject a keywords meta tag when a tool defines them (additive, SEO-friendly)
    if (tool.keywords && tool.keywords.length) {
        let kwMeta = document.querySelector('meta[name="keywords"]');
        if (!kwMeta) { kwMeta = document.createElement('meta'); kwMeta.setAttribute('name', 'keywords'); document.head.appendChild(kwMeta); }
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

    // SoftwareApplication schema
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

    // BreadcrumbList schema
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

    // FAQPage schema (if tool defines faqs)
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

    // TechArticle schema (if tool defines an article)
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

    // ── State ─────────────────────────────────────────────────
    let values = {};
    tool.fields.forEach(f => {
        values[f.id] = typeof f.default === 'function' ? f.default() : f.default;
    });

    // ── Shared HTML builders (single source — used by both render & updateResults) ──

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
                        <div class="bmi-label" style="color:${bmiGauge.color};">${bmiGauge.label}</div>
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

    function buildChartsHtml(result) {
        const charts = [];
        if (result.chart) charts.push('<div class="chart-container"><canvas id="result-chart"></canvas></div>');
        if (result.chart2) charts.push('<div class="chart-container"><canvas id="result-chart-2"></canvas></div>');
        if (result.compareChart) charts.push('<div class="chart-container"><canvas id="result-chart-3"></canvas></div>');
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
            // If the value is already a string, it's pre-formatted — escape it directly
            if (typeof raw === 'string') return esc(raw);
            // Only apply numeric formatting to actual numbers
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
        return tool.fields.map(field => {
            const labels = tool.fieldLabels ? tool.fieldLabels(values) : {};
            const label  = labels[field.id] || field.label;
            const hidden = field.condition && !field.condition(values);
            const attrs  = [
                field.min  !== undefined ? `min="${field.min}"`   : '',
                field.max  !== undefined ? `max="${field.max}"`   : '',
                field.step !== undefined ? `step="${field.step}"` : '',
            ].join(' ');

            // Form section header — groups related inputs with an icon + label
            if (field.type === 'section') return `
                <div class="form-section-header" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                    <i class="fa-solid ${field.icon || 'fa-circle'}"></i>
                    <span>${esc(label)}</span>
                </div>`;

            if (field.type === 'select') return `
                <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                    <label for="${field.id}">${label}</label>
                    ${field.hint ? `<span class="field-hint">${field.hint}</span>` : ''}
                    <select id="${field.id}" data-id="${field.id}">
                        ${field.options.map(o => `<option value="${o.value}" ${values[field.id] == o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                    </select>
                </div>`;

            return `
                <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                    <label for="${field.id}">${label}</label>
                    ${field.hint ? `<span class="field-hint">${field.hint}</span>` : ''}
                    <input type="${field.type}" id="${field.id}" data-id="${field.id}"
                           value="${values[field.id]}" ${attrs}>
                    <span class="field-error hidden" data-error="${field.id}"></span>
                </div>`;
        }).join('');
    }

    // ── Update results card only (no DOM rebuild) ─────────────
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
            buildBmiGaugeHtml(result.bmiGauge) +
            buildStatsHtml(result.stats) +
            (result.bars ? buildBarsHtml(result.bars) : '') +
            buildChartsHtml(result) +
            buildBreakdownTablesHtml(result) +
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

    // ── Copy button ───────────────────────────────────────────
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
                        ${buildBmiGaugeHtml(result.bmiGauge)}
                        ${buildStatsHtml(result.stats)}
                        ${result.bars ? buildBarsHtml(result.bars) : ''}
                        ${buildChartsHtml(result)}
                        ${buildBreakdownTablesHtml(result)}
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
            ${buildSeoContentHtml()}
            ${buildRelatedToolsHtml()}`;

        if (result.chart) renderChart(result.chart);
        if (result.chart2) renderChart(result.chart2, 'result-chart-2');
        if (result.compareChart) renderChart(result.compareChart, 'result-chart-3');
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

    container.addEventListener('input',  handleInputChange);
    container.addEventListener('change', handleInputChange);

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

        // ── SEO Article (intro + optional H3 sections) ─────────────
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
            // Custom multi-slice doughnut (labels/colors/data) or default principal/interest
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
                                label: ctx => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
                                    return `${ctx.label}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ctx.parsed)} (${pct}%)`;
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
        const DEFAULTS = {
            incomeSources: [
                { id: 'b_inc1', source: 'Salary', amount: 5000 },
                { id: 'b_inc2', source: 'Freelance', amount: 1000 },
            ],
            expenses: [
                { id: 'b_exp1',  category: 'Housing',      icon: 'fa-house',        amount: 1500, type: 'needs' },
                { id: 'b_exp2',  category: 'Food',         icon: 'fa-utensils',     amount: 600,  type: 'needs' },
                { id: 'b_exp3',  category: 'Transport',    icon: 'fa-car',          amount: 300,  type: 'needs' },
                { id: 'b_exp4',  category: 'Utilities',    icon: 'fa-bolt',         amount: 200,  type: 'needs' },
                { id: 'b_exp5',  category: 'Healthcare',   icon: 'fa-heart-pulse',  amount: 150,  type: 'needs' },
                { id: 'b_exp6',  category: 'Shopping',     icon: 'fa-bag-shopping', amount: 300,  type: 'wants' },
                { id: 'b_exp7',  category: 'Entertainment',icon: 'fa-film',         amount: 200,  type: 'wants' },
                { id: 'b_exp8',  category: 'Education',    icon: 'fa-graduation-cap',amount: 100, type: 'wants' },
                { id: 'b_exp9',  category: 'Savings',      icon: 'fa-piggy-bank',   amount: 500,  type: 'savings' },
                { id: 'b_exp10', category: 'Investments',  icon: 'fa-chart-line',   amount: 300,  type: 'savings' },
                { id: 'b_exp11', category: 'Debt',         icon: 'fa-credit-card',  amount: 400,  type: 'savings' },
                { id: 'b_exp12', category: 'Other',        icon: 'fa-ellipsis',     amount: 100,  type: 'wants' },
            ],
            currency: 'USD',
            currencies: [
                { code: 'USD', symbol: '$',  locale: 'en-US' },
                { code: 'EUR', symbol: '\u20ac',  locale: 'de-DE' },
                { code: 'GBP', symbol: '\u00a3',  locale: 'en-GB' },
                { code: 'JPY', symbol: '\u00a5',  locale: 'ja-JP' },
                { code: 'CAD', symbol: 'CA$',locale: 'en-CA' },
                { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
                { code: 'INR', symbol: '\u20b9',  locale: 'en-IN' },
                { code: 'BRL', symbol: 'R$', locale: 'pt-BR' },
            ],
        };

        function loadData() {
            try {
                const saved = localStorage.getItem('getcalcu_budget_data');
                if (saved) {
                    const d = JSON.parse(saved);
                    if (!d.incomeSources || !d.incomeSources.length) d.incomeSources = DEFAULTS.incomeSources.map(s => ({...s}));
                    if (!d.expenses || !d.expenses.length) d.expenses = DEFAULTS.expenses.map(e => ({...e}));
                    if (!d.currency) d.currency = 'USD';
                    return d;
                }
            } catch(e) {}
            return JSON.parse(JSON.stringify(DEFAULTS));
        }
        let data = loadData();
        function saveData(d) { try { localStorage.setItem('getcalcu_budget_data', JSON.stringify(d)); } catch(e) {} }
        function clearData() { try { localStorage.removeItem('getcalcu_budget_data'); } catch(e) {} }
        function getCur(code) { return DEFAULTS.currencies.find(c => c.code === code) || DEFAULTS.currencies[0]; }
        function fmtC(amount, code) {
            const cur = getCur(code);
            const num = safeNum(amount, 0);
            try { return new Intl.NumberFormat(cur.locale, { style: 'currency', currency: cur.code, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num); }
            catch(e) { return cur.symbol + num.toLocaleString(); }
        }

        let idCount = Date.now();
        function uid() { return 'b' + (idCount++); }

        function buildHtml() {
            const totalIncome = data.incomeSources.reduce((s, i) => s + safeNum(i.amount, 0), 0);
            const totalExpenses = data.expenses.reduce((s, e) => s + safeNum(e.amount, 0), 0);
            const remaining = totalIncome - totalExpenses;
            const savingsRate = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;

            let statusIcon, statusText, statusClass;
            if (totalIncome === 0) { statusIcon = 'fa-circle-info'; statusText = 'Enter your income to begin'; statusClass = 'bp-status-info'; }
            else if (remaining >= totalIncome * 0.2) { statusIcon = 'fa-circle-check'; statusText = 'Excellent! Strong savings rate'; statusClass = 'bp-status-excellent'; }
            else if (remaining >= 0) { statusIcon = 'fa-circle-check'; statusText = "Good: You're within budget"; statusClass = 'bp-status-good'; }
            else if (remaining >= -totalIncome * 0.1) { statusIcon = 'fa-triangle-exclamation'; statusText = 'Warning: Slight overspend'; statusClass = 'bp-status-warning'; }
            else { statusIcon = 'fa-circle-exclamation'; statusText = 'Overspending! Review expenses'; statusClass = 'bp-status-overspend'; }

            const needsTotal = data.expenses.filter(e => e.type === 'needs').reduce((s, e) => s + safeNum(e.amount, 0), 0);
            const wantsTotal = data.expenses.filter(e => e.type === 'wants').reduce((s, e) => s + safeNum(e.amount, 0), 0);
            const savingsTotal = data.expenses.filter(e => e.type === 'savings').reduce((s, e) => s + safeNum(e.amount, 0), 0);
            const needsPct = totalIncome > 0 ? (needsTotal/totalIncome)*100 : 0;
            const wantsPct = totalIncome > 0 ? (wantsTotal/totalIncome)*100 : 0;
            const savingsPct = totalIncome > 0 ? (savingsTotal/totalIncome)*100 : 0;

            function ruleBar(label, pct, limit, color) {
                const fill = Math.min(pct/limit*100, 100);
                const ok = pct <= limit;
                return `<div class="bp-rule-row"><div class="bp-rule-label"><span>${label}</span><span class="bp-rule-pct">${pct.toFixed(1)}% / ${limit}% ${ok ? '\u2713' : '\u26a0'}</span></div><div class="bp-progress-bar-container bp-rule-bar"><div class="bp-progress-bar-fill" style="width:${fill}%;background-color:${color};"></div></div></div>`;
            }

            const incomeRows = data.incomeSources.map((inc, idx) => `<div class="bp-income-row" data-idx="${idx}">
                <input type="text" class="bp-input bp-income-source" value="${esc(inc.source)}" placeholder="e.g. Salary" aria-label="Source" style="flex:1;">
                <input type="number" class="bp-input bp-income-amount" value="${safeNum(inc.amount, 0)}" placeholder="0" min="0" step="100" aria-label="Amount" style="flex:1;">
                <button class="bp-btn-icon bp-btn-remove-income" title="Remove" ${data.incomeSources.length<=1?'disabled':''}><i class="fa-solid fa-xmark"></i></button>
            </div>`).join('');

            const expenseRows = data.expenses.map(exp => {
                const pct = totalIncome > 0 ? (safeNum(exp.amount, 0)/totalIncome*100) : 0;
                const limit = exp.type === 'needs' ? 50 : exp.type === 'wants' ? 30 : 20;
                const ratio = limit > 0 ? pct/limit : 0;
                let barColor, label;
                if (pct === 0) { barColor = 'var(--border-color)'; label = '\u2014'; }
                else if (ratio <= 0.5) { barColor = '#10B981'; label = 'Great'; }
                else if (ratio <= 0.8) { barColor = '#3B82F6'; label = 'Good'; }
                else if (ratio <= 1.0) { barColor = '#F59E0B'; label = 'OK'; }
                else { barColor = '#EF4444'; label = 'Over'; }
                const barWidth = Math.min(pct/limit*100, 100);
                return `<div class="bp-expense-row" data-id="${exp.id}">
                    <div class="bp-expense-header">
                        <span><i class="fa-solid ${exp.icon}" style="width:18px;color:var(--primary-color);"></i> ${esc(exp.category)}</span>
                        <span><span class="bp-expense-type-badge bp-type-${exp.type}">${exp.type}</span> ${fmtC(exp.amount, data.currency)}
                        <button class="bp-btn-icon bp-btn-remove-expense" title="Remove"><i class="fa-solid fa-trash-can"></i></button></span>
                    </div>
                    <div class="bp-expense-input-row">
                        <input type="number" class="bp-input bp-expense-amount" value="${safeNum(exp.amount, 0)}" placeholder="0" min="0" step="50" aria-label="${esc(exp.category)}">
                        <span class="bp-expense-pct">${pct.toFixed(1)}%</span>
                    </div>
                    <div class="bp-progress-bar-container" role="progressbar" aria-valuenow="${pct.toFixed(1)}" aria-valuemin="0" aria-valuemax="${limit}">
                        <div class="bp-progress-bar-fill" style="width:${barWidth}%;background-color:${barColor};"></div>
                        <span class="bp-progress-label" style="color:${ratio>0.7?'#fff':'var(--text-secondary)'}">${label} ${pct.toFixed(1)}% / ${limit}%</span>
                    </div>
                </div>`;
            }).join('');

            return `<div class="budget-planner-root">
                <div class="tool-header"><h1>${esc(tool.name)}</h1><p>${esc(tool.description)}</p></div>
                <div class="bp-action-bar">
                    <label class="bp-currency-label"><i class="fa-solid fa-money-bill-transfer"></i> Currency:
                        <select class="bp-select bp-currency-select">
                            ${DEFAULTS.currencies.map(c => `<option value="${c.code}" ${data.currency===c.code?'selected':''}>${c.code} (${c.symbol})</option>`).join('')}
                        </select>
                    </label>
                    <div class="bp-action-right">
                        <button class="btn btn-outline btn-sm bp-btn-pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button>
                        <button class="btn btn-outline btn-sm bp-btn-print"><i class="fa-solid fa-print"></i> Print</button>
                        <button class="btn btn-outline btn-sm bp-btn-share"><i class="fa-solid fa-share-nodes"></i> Share</button>
                        <button class="btn btn-outline btn-sm bp-btn-reset" style="color:var(--danger-color);border-color:var(--danger-color);"><i class="fa-solid fa-trash-can"></i> Reset</button>
                    </div>
                </div>
                <div class="bp-main-grid">
                    <div class="bp-left-col">
                        <div class="bp-section">
                            <div class="bp-section-header">
                                <h2><i class="fa-solid fa-arrow-trend-up" style="color:var(--success-color);"></i> Income Sources</h2>
                                <button class="bp-btn-add bp-btn-add-income"><i class="fa-solid fa-plus"></i> Add Income</button>
                            </div>
                            <div class="bp-income-list">${incomeRows}</div>
                            <div class="bp-section-total"><span>Total Income</span><span class="bp-total-income-value">${fmtC(totalIncome, data.currency)}</span></div>
                        </div>
                        <div class="bp-section">
                            <div class="bp-section-header">
                                <h2><i class="fa-solid fa-cart-shopping" style="color:var(--danger-color);"></i> Expenses</h2>
                                <button class="bp-btn-add bp-btn-add-category"><i class="fa-solid fa-plus"></i> Add Category</button>
                            </div>
                            <div class="bp-expense-list">${expenseRows}</div>
                            <div class="bp-section-total bp-expense-total"><span>Total Expenses</span><span class="bp-total-expense-value">${fmtC(totalExpenses, data.currency)}</span></div>
                        </div>
                    </div>
                    <div class="bp-right-col">
                        <div class="bp-card bp-summary-card">
                            <h3 class="bp-card-title"><i class="fa-solid fa-chart-simple"></i> Budget Summary</h3>
                            <div class="bp-summary-stats">
                                <div class="bp-summary-item"><span>Total Income</span><span style="color:var(--success-color);font-weight:700;">${fmtC(totalIncome, data.currency)}</span></div>
                                <div class="bp-summary-item"><span>Total Expenses</span><span style="color:var(--danger-color);font-weight:700;">${fmtC(totalExpenses, data.currency)}</span></div>
                                <div class="bp-summary-divider"></div>
                                <div class="bp-summary-item"><span>Remaining Balance</span><span style="font-size:22px;font-weight:800;${remaining>=0?'color:var(--success-color)':'color:var(--danger-color)'}">${fmtC(remaining, data.currency)}</span></div>
                                <div class="bp-summary-item"><span>Savings Rate</span><span style="font-weight:700;${savingsRate>=20?'color:var(--success-color)':savingsRate>=0?'color:var(--warning-color)':'color:var(--danger-color)'}">${savingsRate.toFixed(1)}%</span></div>
                            </div>
                        </div>
                        <div class="bp-card bp-status-card ${statusClass}"><div class="bp-status-icon"><i class="fa-solid ${statusIcon}"></i></div><div class="bp-status-text">${statusText}</div></div>
                        <div class="bp-card bp-rule-card">
                            <h3 class="bp-card-title"><i class="fa-solid fa-scale-balanced"></i> 50/30/20 Rule <span class="bp-tooltip-wrap" tabindex="0"><i class="fa-regular fa-circle-question"></i><span class="bp-tooltip-text">50% Needs, 30% Wants, 20% Savings &amp; Debt.</span></span></h3>
                            ${ruleBar('Needs', needsPct, 50, '#3B82F6')}
                            ${ruleBar('Wants', wantsPct, 30, '#8B5CF6')}
                            ${ruleBar('Savings & Debt', savingsPct, 20, '#10B981')}
                        </div>
                        <div class="bp-card bp-chart-card">
                            <h3 class="bp-card-title"><i class="fa-solid fa-chart-pie"></i> Spending Breakdown</h3>
                            <div class="bp-charts-grid">
                                <div class="bp-chart-container"><canvas id="bp-pie-chart"></canvas></div>
                                <div class="bp-chart-container"><canvas id="bp-bar-chart"></canvas></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bp-card bp-table-card" style="margin-top:24px;">
                    <h3 class="bp-card-title"><i class="fa-solid fa-table"></i> Spending by Category</h3>
                    <div class="bp-table-wrapper"><table class="bp-table">
                        <thead><tr><th>Category</th><th>Type</th><th>Amount</th><th>% of Income</th><th>Status</th></tr></thead>
                        <tbody>${data.expenses.map(e => {
                            const p = totalIncome>0?(safeNum(e.amount,0)/totalIncome*100):0;
                            const l = e.type==='needs'?50:e.type==='wants'?30:20;
                            const r = l>0?p/l:0;
                            return `<tr><td><i class="fa-solid ${e.icon}" style="color:var(--primary-color);width:18px;"></i> ${esc(e.category)}</td><td><span class="bp-expense-type-badge bp-type-${e.type}">${e.type}</span></td><td>${fmtC(e.amount,data.currency)}</td><td>${p.toFixed(1)}%</td><td>${p===0?'\u2014':r<=0.8?'\u2713':'\u26a0'}</td></tr>`;
                        }).join('')}</tbody>
                    </table></div>
                </div>
                ${buildSeoContentHtml()}
                ${buildRelatedToolsHtml()}
            </div>`;
        }

        function attachEvents(budgetData) {
            container.querySelector('.bp-btn-add-income')?.addEventListener('click', function() {
                budgetData.incomeSources.push({ id: uid(), source: '', amount: 0 });
                saveData(budgetData); refresh(budgetData);
            });
            container.querySelector('.bp-btn-add-category')?.addEventListener('click', function() {
                const name = prompt('Enter new category name:');
                if (!name || !name.trim()) return;
                const lower = name.trim().toLowerCase();
                let type = 'wants';
                const needKW = ['housing','rent','mortgage','food','groceries','transport','gas','utilities','electric','water','health','medical','insurance'];
                const saveKW = ['savings','investment','debt','loan','emergency','retirement','401k'];
                if (needKW.some(k=>lower.includes(k))) type = 'needs';
                else if (saveKW.some(k=>lower.includes(k))) type = 'savings';
                budgetData.expenses.push({ id: uid(), category: name.trim(), icon: 'fa-receipt', amount: 0, type });
                saveData(budgetData); refresh(budgetData);
            });
            container.querySelector('.bp-currency-select')?.addEventListener('change', function() {
                budgetData.currency = this.value; saveData(budgetData); refresh(budgetData);
            });
            container.querySelectorAll('.bp-income-source, .bp-income-amount').forEach(el => {
                el.addEventListener('input', function() {
                    const row = this.closest('.bp-income-row');
                    const idx = parseInt(row.dataset.idx);
                    const source = row.querySelector('.bp-income-source').value.trim();
                    const amt = safeNum(row.querySelector('.bp-income-amount').value, 0);
                    if (budgetData.incomeSources[idx]) { budgetData.incomeSources[idx].source = source; budgetData.incomeSources[idx].amount = amt; }
                    saveData(budgetData); updateDynamicValues(budgetData);
                });
            });
            container.querySelectorAll('.bp-btn-remove-income').forEach(btn => {
                btn.addEventListener('click', function() {
                    const idx = parseInt(this.closest('.bp-income-row').dataset.idx);
                    if (budgetData.incomeSources.length <= 1) return;
                    budgetData.incomeSources.splice(idx, 1);
                    saveData(budgetData); updateDynamicValues(budgetData);
                });
            });
            container.querySelectorAll('.bp-expense-amount').forEach(el => {
                el.addEventListener('input', function() {
                    const id = this.closest('.bp-expense-row').dataset.id;
                    const exp = budgetData.expenses.find(e => e.id === id);
                    if (exp) exp.amount = safeNum(this.value, 0);
                    saveData(budgetData); updateDynamicValues(budgetData);
                });
            });
            container.querySelectorAll('.bp-btn-remove-expense').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.closest('.bp-expense-row').dataset.id;
                    if (budgetData.expenses.length <= 1) return;
                    budgetData.expenses = budgetData.expenses.filter(e => e.id !== id);
                    saveData(budgetData); updateDynamicValues(budgetData);
                });
            });
            container.querySelector('.bp-btn-pdf')?.addEventListener('click', function() { exportPDF(budgetData); });
            container.querySelector('.bp-btn-print')?.addEventListener('click', function() { window.print(); });
            container.querySelector('.bp-btn-share')?.addEventListener('click', function() { shareSummary(budgetData); });
            container.querySelector('.bp-btn-reset')?.addEventListener('click', function() {
                if (!confirm('Clear all budget data? This cannot be undone.')) return;
                clearData();
                const fresh = JSON.parse(JSON.stringify(DEFAULTS));
                Object.keys(fresh).forEach(k => budgetData[k] = fresh[k]);
                refresh(budgetData);
            });
        }

        function refresh(budgetData) {
            const scrollY = window.scrollY;
            data = budgetData;
            container.innerHTML = buildHtml();
            attachEvents(budgetData);
            renderCharts(budgetData);
            window.scrollTo(0, scrollY);
        }

        function updateDynamicValues(budgetData) {
            const totalIncome = budgetData.incomeSources.reduce((s, i) => s + safeNum(i.amount, 0), 0);
            const totalExpenses = budgetData.expenses.reduce((s, e) => s + safeNum(e.amount, 0), 0);
            const remaining = totalIncome - totalExpenses;
            const savingsRate = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;

            const totalIncomeEl = container.querySelector('.bp-total-income-value');
            const totalExpenseEl = container.querySelector('.bp-total-expense-value');
            if (totalIncomeEl) totalIncomeEl.textContent = fmtC(totalIncome, budgetData.currency);
            if (totalExpenseEl) totalExpenseEl.textContent = fmtC(totalExpenses, budgetData.currency);

            const summaryValues = container.querySelectorAll('.bp-summary-item span:last-child');
            if (summaryValues.length >= 4) {
                summaryValues[0].textContent = fmtC(totalIncome, budgetData.currency);
                summaryValues[1].textContent = fmtC(totalExpenses, budgetData.currency);
                summaryValues[2].textContent = fmtC(remaining, budgetData.currency);
                summaryValues[3].textContent = savingsRate.toFixed(1) + '%';
            }

            let statusIcon, statusText, statusClass;
            if (totalIncome === 0) { statusIcon = 'fa-circle-info'; statusText = 'Enter your income to begin'; statusClass = 'bp-status-info'; }
            else if (remaining >= totalIncome * 0.2) { statusIcon = 'fa-circle-check'; statusText = 'Excellent! Strong savings rate'; statusClass = 'bp-status-excellent'; }
            else if (remaining >= 0) { statusIcon = 'fa-circle-check'; statusText = "Good: You're within budget"; statusClass = 'bp-status-good'; }
            else if (remaining >= -totalIncome * 0.1) { statusIcon = 'fa-triangle-exclamation'; statusText = 'Warning: Slight overspend'; statusClass = 'bp-status-warning'; }
            else { statusIcon = 'fa-circle-exclamation'; statusText = 'Overspending! Review expenses'; statusClass = 'bp-status-overspend'; }

            const statusCard = container.querySelector('.bp-status-card');
            if (statusCard) {
                statusCard.className = 'bp-card bp-status-card ' + statusClass;
                const iconEl = statusCard.querySelector('.bp-status-icon i');
                const textEl = statusCard.querySelector('.bp-status-text');
                if (iconEl) iconEl.className = 'fa-solid ' + statusIcon;
                if (textEl) textEl.textContent = statusText;
            }

            budgetData.expenses.forEach(exp => {
                const row = container.querySelector('.bp-expense-row[data-id="' + exp.id + '"]');
                if (!row) return;
                const pct = totalIncome > 0 ? (safeNum(exp.amount, 0) / totalIncome * 100) : 0;
                const limit = exp.type === 'needs' ? 50 : exp.type === 'wants' ? 30 : 20;
                const ratio = limit > 0 ? pct / limit : 0;
                let barColor;
                if (pct === 0) barColor = 'var(--border-color)';
                else if (ratio <= 0.5) barColor = '#10B981';
                else if (ratio <= 0.8) barColor = '#3B82F6';
                else if (ratio <= 1.0) barColor = '#F59E0B';
                else barColor = '#EF4444';
                const barWidth = Math.min(pct / limit * 100, 100);
                const fill = row.querySelector('.bp-progress-bar-fill');
                const labelEl = row.querySelector('.bp-progress-label');
                const pctEl = row.querySelector('.bp-expense-pct');
                const amountDisplay = row.querySelector('.bp-expense-amount-display');
                if (fill) { fill.style.width = barWidth + '%'; fill.style.backgroundColor = barColor; }
                if (labelEl) labelEl.textContent = (pct === 0 ? '—' : ratio <= 0.5 ? 'Great' : ratio <= 0.8 ? 'Good' : ratio <= 1.0 ? 'OK' : 'Over') + ' ' + pct.toFixed(1) + '% / ' + limit + '%';
                if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
                if (amountDisplay) amountDisplay.textContent = fmtC(exp.amount, budgetData.currency);
            });

            const needsTotal = budgetData.expenses.filter(e => e.type === 'needs').reduce((s, e) => s + safeNum(e.amount, 0), 0);
            const wantsTotal = budgetData.expenses.filter(e => e.type === 'wants').reduce((s, e) => s + safeNum(e.amount, 0), 0);
            const savingsTotal = budgetData.expenses.filter(e => e.type === 'savings').reduce((s, e) => s + safeNum(e.amount, 0), 0);
            const needsPct = totalIncome > 0 ? (needsTotal / totalIncome) * 100 : 0;
            const wantsPct = totalIncome > 0 ? (wantsTotal / totalIncome) * 100 : 0;
            const savingsPct = totalIncome > 0 ? (savingsTotal / totalIncome) * 100 : 0;

            const ruleBars = container.querySelectorAll('.bp-rule-row');
            if (ruleBars.length >= 3) {
                const updateRuleBar = (bar, pct, limit) => {
                    const fill = bar.querySelector('.bp-progress-bar-fill');
                    const pctSpan = bar.querySelector('.bp-rule-pct');
                    if (fill) fill.style.width = Math.min(pct / limit * 100, 100) + '%';
                    if (pctSpan) pctSpan.textContent = pct.toFixed(1) + '% / ' + limit + '% ' + (pct <= limit ? '✓' : '⚠');
                };
                updateRuleBar(ruleBars[0], needsPct, 50);
                updateRuleBar(ruleBars[1], wantsPct, 30);
                updateRuleBar(ruleBars[2], savingsPct, 20);
            }

            renderCharts(budgetData);
        }

        let pieChart, barChart;

        function renderCharts(budgetData) {
            const expenses = budgetData.expenses;
            const labels = expenses.map(e => e.category);
            const vals = expenses.map(e => safeNum(e.amount, 0));
            const colors = expenses.map(e => e.type==='needs'?'#3B82F6':e.type==='savings'?'#10B981':'#8B5CF6');

            const pc = document.getElementById('bp-pie-chart');
            if (pc) {
                if (pieChart) {
                    pieChart.data.labels = labels;
                    pieChart.data.datasets[0].data = vals;
                    pieChart.data.datasets[0].backgroundColor = colors;
                    pieChart.update('none');
                } else {
                    pieChart = new Chart(pc.getContext('2d'), {
                        type: 'doughnut',
                        data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2, borderColor: 'var(--bg-card)' }] },
                        options: {
                            responsive: true, maintainAspectRatio: true,
                            plugins: {
                                legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, boxWidth: 8, font: { size: 11 }, color: 'var(--text-primary)' } },
                                tooltip: { callbacks: { label: ctx => {
                                    const t = vals.reduce((a,b)=>a+b,0);
                                    return ctx.label+': '+fmtC(ctx.parsed, budgetData.currency)+' ('+(t>0?(ctx.parsed/t*100).toFixed(1):'0')+'%)';
                                }}}
                            }
                        }
                    });
                }
            }

            const bc = document.getElementById('bp-bar-chart');
            if (bc) {
                if (barChart) {
                    barChart.data.labels = labels;
                    barChart.data.datasets[0].data = vals;
                    barChart.data.datasets[0].backgroundColor = colors;
                    barChart.update('none');
                } else {
                    barChart = new Chart(bc.getContext('2d'), {
                        type: 'bar',
                        data: { labels, datasets: [{ label: 'Amount', data: vals, backgroundColor: colors, borderRadius: 4, borderSkipped: false }] },
                        options: {
                            responsive: true, maintainAspectRatio: true, indexAxis: 'y',
                            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtC(ctx.parsed, budgetData.currency) } } },
                            scales: {
                                x: { ticks: { callback: v => fmtC(v, budgetData.currency), font: { size: 10 }, color: 'var(--text-secondary)' } },
                                y: { ticks: { font: { size: 10 }, color: 'var(--text-primary)' }, grid: { display: false } }
                            }
                        }
                    });
                }
            }
        }

        function exportPDF(budgetData) {
            const doPDF = () => {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
                    const tInc = budgetData.incomeSources.reduce((s,i) => s+safeNum(i.amount,0), 0);
                    const tExp = budgetData.expenses.reduce((s,e) => s+safeNum(e.amount,0), 0);
                    const rem = tInc - tExp;
                    let y = 20;
                    doc.setFontSize(20); doc.setTextColor(99,102,241); doc.text('Budget Summary', 20, y); y += 10;
                    doc.setFontSize(10); doc.setTextColor(100,116,139);
                    doc.text('Generated by GetCalcu Budget Planner', 20, y);
                    doc.text(new Date().toLocaleDateString(), 160, y, { align: 'right' }); y += 10;
                    doc.setFontSize(14); doc.setTextColor(16,185,129); doc.text('Income Sources', 20, y); y += 7;
                    doc.setFontSize(10); doc.setTextColor(15,23,42);
                    budgetData.incomeSources.forEach(inc => {
                        doc.text(inc.source||'Untitled', 25, y);
                        doc.text(fmtC(inc.amount,budgetData.currency), 160, y, { align: 'right' });
                        y += 6;
                    });
                    doc.setDrawColor(200); doc.line(20,y,190,y); y += 5;
                    doc.setFontSize(11); doc.setFont(undefined,'bold');
                    doc.text('Total Income', 25, y);
                    doc.text(fmtC(tInc,budgetData.currency), 160, y, { align: 'right' }); y += 10;
                    doc.setFontSize(14); doc.setFont(undefined,'normal'); doc.setTextColor(239,68,68);
                    doc.text('Expenses', 20, y); y += 7;
                    doc.setFontSize(10); doc.setTextColor(15,23,42);
                    budgetData.expenses.forEach(exp => {
                        doc.text(exp.category+' ('+exp.type+')', 25, y);
                        doc.text(fmtC(exp.amount,budgetData.currency), 160, y, { align: 'right' });
                        y += 6;
                        if (y > 270) { doc.addPage(); y = 20; }
                    });
                    doc.setDrawColor(200); doc.line(20,y,190,y); y += 5;
                    doc.setFontSize(11); doc.setFont(undefined,'bold');
                    doc.text('Total Expenses', 25, y);
                    doc.text(fmtC(tExp,budgetData.currency), 160, y, { align: 'right' }); y += 10;
                    doc.setFontSize(14); doc.setFont(undefined,'normal'); doc.setTextColor(99,102,241);
                    doc.text('Budget Summary', 20, y); y += 8;
                    doc.setFontSize(11); doc.setTextColor(15,23,42);
                    doc.setFont(undefined,'bold'); doc.text('Remaining:', 25, y);
                    doc.setFont(undefined,'normal'); doc.text(fmtC(rem,budgetData.currency)+(rem>=0?' (Surplus)':' (Deficit)'), 80, y); y += 7;
                    doc.setFont(undefined,'bold'); doc.text('Savings Rate:', 25, y);
                    doc.setFont(undefined,'normal'); doc.text((tInc>0?((rem/tInc)*100).toFixed(1):'0')+'%', 80, y); y += 10;
                    doc.setFontSize(8); doc.setTextColor(148,163,184);
                    doc.text('getcalcu.com/budget-planner', 20, y);
                    doc.save('budget-summary.pdf');
                } catch(e) { alert('PDF export failed. Try printing instead.'); }
            };
            if (window.jspdf && window.jspdf.jsPDF) { doPDF(); return; }
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.onload = doPDF;
            document.head.appendChild(s);
        }

        function shareSummary(budgetData) {
            const tInc = budgetData.incomeSources.reduce((s,i) => s+safeNum(i.amount,0), 0);
            const tExp = budgetData.expenses.reduce((s,e) => s+safeNum(e.amount,0), 0);
            const rem = tInc - tExp;
            const rate = tInc>0?((rem/tInc)*100).toFixed(1):'0';
            const text = `📊 My Budget Summary

💰 Income: ${fmtC(tInc,budgetData.currency)}
💸 Expenses: ${fmtC(tExp,budgetData.currency)}
💳 Balance: ${fmtC(rem,budgetData.currency)}
📈 Savings Rate: ${rate}%

Created with GetCalcu Budget Planner`;
            if (navigator.share) { navigator.share({ title: 'Budget Summary', text }).catch(()=>{}); }
            else if (navigator.clipboard) { navigator.clipboard.writeText(text).then(()=>alert('Copied!')).catch(()=>prompt('Copy:',text)); }
            else { prompt('Copy:', text); }
        }

        // Initial render
        container.innerHTML = buildHtml();
        attachEvents(data);
        renderCharts(data);
    }

    render();
});
