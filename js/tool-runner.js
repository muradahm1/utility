document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('tool-runner-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    const tool = TOOLS[slug];

    if (!tool) {
        container.innerHTML = `
            <div class="tool-not-found">
                <div class="not-found-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Tool Not Found</h2>
                <p>The calculator you're looking for doesn't exist or the link may be broken.</p>
                <a href="index.html" class="btn btn-primary"><i class="fa-solid fa-house"></i> Back to Home</a>
            </div>
        `;
        return;
    }

    // --- SEO & Metadata ---
    const pageUrl = `https://utilityhub.app/tool.html?slug=${slug}`;
    document.title = `${tool.name} | UtilityHub`;
    document.querySelector('meta[name="description"]').setAttribute('content', tool.metaDescription);

    // Canonical
    document.getElementById('canonical-tag').setAttribute('href', pageUrl);

    // Open Graph
    document.querySelector('meta[property="og:title"]').setAttribute('content', `${tool.name} | UtilityHub`);
    document.querySelector('meta[property="og:description"]').setAttribute('content', tool.metaDescription);
    document.querySelector('meta[property="og:url"]').setAttribute('content', pageUrl);

    // Twitter Card
    document.querySelector('meta[name="twitter:title"]').setAttribute('content', `${tool.name} | UtilityHub`);
    document.querySelector('meta[name="twitter:description"]').setAttribute('content', tool.metaDescription);

    // JSON-LD: SoftwareApplication schema per tool
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': tool.name,
        'applicationCategory': 'UtilityApplication',
        'operatingSystem': 'Web',
        'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
        'description': tool.metaDescription,
        'url': pageUrl
    };
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(schema);
    document.head.appendChild(schemaScript);

    // --- State Management ---
    let values = {};
    tool.fields.forEach(field => {
        values[field.id] = typeof field.default === 'function' ? field.default() : field.default;
    });

    // --- Build form HTML (called once on init) ---
    function buildFormHtml() {
        return tool.fields.map(field => {
            const fieldLabels = tool.fieldLabels ? tool.fieldLabels(values) : {};
            const label = fieldLabels[field.id] || field.label;
            const hidden = field.condition && !field.condition(values);
            switch (field.type) {
                case 'select':
                    return `
                        <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                            <label for="${field.id}">${label}</label>
                            <select id="${field.id}" data-id="${field.id}">
                                ${field.options.map(opt => `<option value="${opt.value}" ${values[field.id] == opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                            </select>
                        </div>`;
                case 'number':
                case 'date':
                    return `
                        <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                            <label for="${field.id}">${label}</label>
                            <input type="${field.type}" id="${field.id}" data-id="${field.id}" value="${values[field.id]}"
                                ${field.min !== undefined ? `min="${field.min}"` : ''}
                                ${field.max !== undefined ? `max="${field.max}"` : ''}
                                ${field.step !== undefined ? `step="${field.step}"` : ''}>
                        </div>`;
                default: return '';
            }
        }).join('');
    }

    // --- Update results only (called on every value change) ---
    function updateResults() {
        const result = tool.calculate(values);
        const resultsCard = document.querySelector('.calculator-results-card');
        if (!resultsCard) return;

        const resultsHtml = result.stats.map(stat => `
            <div class="result-stat-box">
                <span class="res-label">${stat.label}</span>
                <span class="res-val ${stat.highlight ? 'highlight' : ''}" style="${stat.color ? `color:${stat.color}` : ''}">${stat.value}</span>
            </div>
        `).join('');

        const chartHtml = result.chart ? '<div class="chart-container"><canvas id="result-chart"></canvas></div>' : '';

        const bmiGaugeHtml = result.bmiGauge ? `
            <div class="bmi-gauge-container">
                <div class="bmi-gauge">
                    <div class="bmi-gauge-fill" style="transform: rotate(${result.bmiGauge.bmi * 4.5}deg); background-color:${result.bmiGauge.color};"></div>
                    <div class="bmi-gauge-cover">
                        <div class="bmi-value">${result.bmiGauge.bmi.toFixed(1)}</div>
                        <div class="bmi-label" style="color:${result.bmiGauge.color};">${result.bmiGauge.label}</div>
                    </div>
                </div>
            </div>
        ` : '';

        resultsCard.innerHTML = bmiGaugeHtml + resultsHtml + chartHtml;

        // Update amortization table if present
        const tableContainer = document.querySelector('.result-table-container tbody');
        if (tableContainer && result.table) {
            tableContainer.innerHTML = result.table.map(row => `
                <tr>
                    <td>${row.month}</td>
                    <td>${fmt(row.payment)}</td>
                    <td>${fmt(row.principal)}</td>
                    <td>${fmt(row.interest)}</td>
                    <td>${fmt(row.balance)}</td>
                </tr>
            `).join('');
        }

        if (result.chart) renderChart(result.chart);

        // Show/hide conditional fields and update labels without destroying inputs
        tool.fields.forEach(field => {
            const group = document.querySelector(`.form-group[data-field="${field.id}"]`);
            if (!group) return;
            if (field.condition) {
                group.style.display = field.condition(values) ? '' : 'none';
            }
            if (tool.fieldLabels) {
                const newLabel = tool.fieldLabels(values)[field.id];
                if (newLabel) group.querySelector('label').textContent = newLabel;
            }
        });
    }

    // --- Initial full render (runs once) ---
    function render() {
        const result = tool.calculate(values);

        const chartHtml = result.chart ? '<div class="chart-container"><canvas id="result-chart"></canvas></div>' : '';
        const bmiGaugeHtml = result.bmiGauge ? `
            <div class="bmi-gauge-container">
                <div class="bmi-gauge">
                    <div class="bmi-gauge-fill" style="transform: rotate(${result.bmiGauge.bmi * 4.5}deg); background-color:${result.bmiGauge.color};"></div>
                    <div class="bmi-gauge-cover">
                        <div class="bmi-value">${result.bmiGauge.bmi.toFixed(1)}</div>
                        <div class="bmi-label" style="color:${result.bmiGauge.color};">${result.bmiGauge.label}</div>
                    </div>
                </div>
            </div>
        ` : '';
        const resultsHtml = result.stats.map(stat => `
            <div class="result-stat-box">
                <span class="res-label">${stat.label}</span>
                <span class="res-val ${stat.highlight ? 'highlight' : ''}" style="${stat.color ? `color:${stat.color}` : ''}">${stat.value}</span>
            </div>
        `).join('');
        const tableHtml = result.table ? `
            <div class="result-table-container">
                <h4>Amortization Schedule</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
                        <tbody>
                            ${result.table.map(row => `
                                <tr>
                                    <td>${row.month}</td>
                                    <td>${fmt(row.payment)}</td>
                                    <td>${fmt(row.principal)}</td>
                                    <td>${fmt(row.interest)}</td>
                                    <td>${fmt(row.balance)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="tool-runner-card">
                <div class="tool-header">
                    <h2>${tool.name}</h2>
                    <p>${tool.description}</p>
                </div>
                <div class="tool-grid-workspace">
                    <div class="calculator-form-inputs">${buildFormHtml()}</div>
                    <div class="calculator-results-card">${bmiGaugeHtml}${resultsHtml}${chartHtml}</div>
                </div>
                ${tableHtml}
            </div>
        `;

        if (result.chart) renderChart(result.chart);
    }

    // --- Event Handling ---
    function handleInputChange(e) {
        const id = e.target.dataset.id;
        if (!id) return;
        const field = tool.fields.find(f => f.id === id);
        if (!field) return;
        let value = e.target.value;
        if (field.type === 'number') {
            const parsed = parseFloat(value);
            if (isNaN(parsed)) return; // don't recalculate with empty/invalid input
            value = parsed;
        }
        values[id] = value;
        updateResults();
    }

    container.addEventListener('input', handleInputChange);
    container.addEventListener('change', handleInputChange);

    // --- Chart Rendering ---
    let chartInstance = null;
    function renderChart(chartData) {
        const ctx = document.getElementById('result-chart').getContext('2d');
        if (chartInstance) {
            chartInstance.destroy();
        }
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Total Interest'],
                datasets: [{
                    data: [chartData.principal, chartData.totalInterest],
                    backgroundColor: ['#6366F1', '#F59E0B'],
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Initial Render ---
    render();
});