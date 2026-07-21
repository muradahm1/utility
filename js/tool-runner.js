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
                <a href="index.html" class="btn btn-primary"><i class="fa-solid fa-house"></i> Back to Home</a>
            </div>`;
        return;
    }

    // ── SEO ───────────────────────────────────────────────────
    const pageUrl = `https://utilityhub.app/tool.html?slug=${slug}`;
    document.title = `${tool.name} | UtilityHub`;
    document.querySelector('meta[name="description"]').setAttribute('content', tool.metaDescription);
    document.getElementById('canonical-tag').setAttribute('href', pageUrl);
    document.querySelector('meta[property="og:title"]').setAttribute('content', `${tool.name} | UtilityHub`);
    document.querySelector('meta[property="og:description"]').setAttribute('content', tool.metaDescription);
    document.querySelector('meta[property="og:url"]').setAttribute('content', pageUrl);
    document.querySelector('meta[name="twitter:title"]').setAttribute('content', `${tool.name} | UtilityHub`);
    document.querySelector('meta[name="twitter:description"]').setAttribute('content', tool.metaDescription);

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

    // ── State ─────────────────────────────────────────────────
    let values = {};
    tool.fields.forEach(f => {
        values[f.id] = typeof f.default === 'function' ? f.default() : f.default;
    });

    // ── Shared HTML builders (single source — used by both render & updateResults) ──

    function buildStatsHtml(stats) {
        return stats.map(stat => `
            <div class="result-stat-box">
                <span class="res-label">${stat.label}</span>
                <span class="res-val ${stat.highlight ? 'highlight' : ''}"
                      style="${stat.color ? `color:${stat.color}` : ''}">${stat.value}</span>
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
                <td>${row.month}</td>
                <td>${fmt(row.payment)}</td>
                <td>${fmt(row.principal)}</td>
                <td>${fmt(row.interest)}</td>
                <td>${fmt(row.balance)}</td>
            </tr>`).join('');
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

            if (field.type === 'select') return `
                <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                    <label for="${field.id}">${label}</label>
                    <select id="${field.id}" data-id="${field.id}">
                        ${field.options.map(o => `<option value="${o.value}" ${values[field.id] == o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                    </select>
                </div>`;

            return `
                <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                    <label for="${field.id}">${label}</label>
                    <input type="${field.type}" id="${field.id}" data-id="${field.id}"
                           value="${values[field.id]}" ${attrs}>
                    <span class="field-error hidden" data-error="${field.id}"></span>
                </div>`;
        }).join('');
    }

    // ── Update results card only (no DOM rebuild) ─────────────
    function updateResults() {
        const result = tool.calculate(values);
        const card   = document.querySelector('.calculator-results-card');
        if (!card) return;

        card.innerHTML =
            buildBmiGaugeHtml(result.bmiGauge) +
            buildStatsHtml(result.stats) +
            (result.chart ? '<div class="chart-container"><canvas id="result-chart"></canvas></div>' : '') +
            buildCopyBtn();

        const tbody = document.querySelector('.result-table-container tbody');
        if (tbody && result.table) tbody.innerHTML = buildTableRowsHtml(result.table);

        if (result.chart) renderChart(result.chart);
        bindCopyBtn(result.stats);

        // Conditional field visibility + label updates
        tool.fields.forEach(field => {
            const group = document.querySelector(`.form-group[data-field="${field.id}"]`);
            if (!group) return;
            if (field.condition) group.style.display = field.condition(values) ? '' : 'none';
            if (tool.fieldLabels) {
                const lbl = tool.fieldLabels(values)[field.id];
                if (lbl) group.querySelector('label').textContent = lbl;
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
        btn.addEventListener('click', () => {
            const text = stats.map(s => `${s.label}: ${s.value}`).join('\n');
            navigator.clipboard.writeText(text).then(() => {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                btn.style.color = '#10B981';
                btn.style.borderColor = '#10B981';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Results';
                    btn.style.color = '';
                    btn.style.borderColor = '';
                }, 2000);
            });
        });
    }

    // ── Initial full render ───────────────────────────────────
    function render() {
        const result = tool.calculate(values);

        const tableHtml = result.table ? `
            <div class="result-table-container">
                <h4>Amortization Schedule</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
                        <tbody>${buildTableRowsHtml(result.table)}</tbody>
                    </table>
                </div>
            </div>` : '';

        container.innerHTML = `
            <div class="tool-runner-card">
                <div class="tool-header">
                    <h2>${tool.name}</h2>
                    <p>${tool.description}</p>
                </div>
                <div class="tool-grid-workspace">
                    <div class="calculator-form-inputs">${buildFormHtml()}</div>
                    <div class="calculator-results-card">
                        ${buildBmiGaugeHtml(result.bmiGauge)}
                        ${buildStatsHtml(result.stats)}
                        ${result.chart ? '<div class="chart-container"><canvas id="result-chart"></canvas></div>' : ''}
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
            </div>`;

        if (result.chart) renderChart(result.chart);
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
            const result = tool.calculate(values);
            const flatResults = {};
            result.stats.forEach(s => { flatResults[s.label] = s.value; });
            const { error } = await saveCalculation(slug, tool.name, values, flatResults);
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Save Result';
            msg.classList.remove('hidden');
            msg.textContent = error ? 'Failed to save. Please try again.' : '✓ Saved to history!';
            msg.style.color  = error ? '#EF4444' : '#10B981';
            setTimeout(() => msg.classList.add('hidden'), 3000);
        });
    }

    // ── Chart ─────────────────────────────────────────────────
    let chartInstance = null;
    function renderChart(chartData) {
        const canvas = document.getElementById('result-chart');
        if (!canvas) return;
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Total Interest'],
                datasets: [{ data: [chartData.principal, chartData.totalInterest], backgroundColor: ['#6366F1', '#F59E0B'], borderWidth: 0 }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.label}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ctx.parsed)}`,
                        },
                    },
                },
            },
        });
    }

    render();
});
