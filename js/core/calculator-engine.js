/**
 * Calculator Engine
 * 
 * Shared calculator lifecycle and common functionality
 * Provides base implementation for all calculator operations
 * 
 * @module core/calculator-engine
 */

import { getTool, toolExists } from './tools.js';
import { escapeHtml, formatCurrency, formatNumber, safeNum, safeStr, roundTo } from '../utils/index.js';

export { escapeHtml, formatCurrency, formatNumber, safeNum, safeStr, roundTo };

// ── Engine State ───────────────────────────────────────────────

const engineState = {
    activeCalculators: new Map(),
    globalSettings: {
        currency: 'USD',
        locale: 'en-US',
        dateFormat: 'MM/DD/YYYY',
        precision: 2
    }
};

// ── Calculator Lifecycle ───────────────────────────────────────

/**
 * Initialize a calculator instance
 * @param {string} slug - Calculator slug
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Initialization options
 * @returns {Object} Calculator instance with lifecycle methods
 */
export function initializeCalculator(slug, container, options = {}) {
    if (!toolExists(slug)) {
        throw new Error(`Calculator "${slug}" not found`);
    }
    
    const tool = getTool(slug);
    const instanceId = `${slug}-${Date.now()}`;
    
    // Initialize state
    const state = {
        slug,
        tool,
        container,
        values: {},
        errors: {},
        isCalculating: false,
        lastResult: null,
        instanceId
    };
    
    // Initialize default values
    tool.fields.forEach(field => {
        state.values[field.id] = typeof field.default === 'function' 
            ? field.default() 
            : field.default;
    });
    
    // Store instance
    engineState.activeCalculators.set(instanceId, state);
    
    // Create calculator API
    const calculator = {
        id: instanceId,
        slug,
        tool,
        container,
        state,
        values: state.values,
        
        // Lifecycle methods
        render: () => renderCalculator(calculator),
        calculate: () => performCalculation(calculator),
        update: (fieldId, value) => updateField(calculator, fieldId, value),
        validate: () => validateFields(calculator),
        reset: () => resetCalculator(calculator),
        destroy: () => destroyCalculator(instanceId),
        
        // Getters
        getValues: () => ({ ...state.values }),
        getResult: () => state.lastResult,
        getErrors: () => ({ ...state.errors }),
        getState: () => ({ ...state }),
        
        // Setters
        setValues: (newValues) => setCalculatorValues(calculator, newValues),
        setOption: (key, value) => setGlobalOption(key, value)
    };
    
    // Initial render
    calculator.render();
    
    return calculator;
}

/**
 * Destroy calculator instance
 * @param {string} instanceId - Instance identifier
 */
export function destroyCalculator(instanceId) {
    const instance = engineState.activeCalculators.get(instanceId);
    if (instance) {
        // Cleanup
        if (instance.container) {
            instance.container.innerHTML = '';
        }
        engineState.activeCalculators.delete(instanceId);
    }
}

// ── Rendering ──────────────────────────────────────────────────

/**
 * Render calculator UI
 * @param {Object} calculator - Calculator instance
 */
export function renderCalculator(calculator) {
    const { tool, container, values } = calculator;
    
    // Build form HTML
    const formHtml = buildFormHtml(tool, values);
    
    // Build results container
    const resultsHtml = '<div class="calculator-results-card"></div>';
    
    // Render to container
    container.innerHTML = `
        <div class="calculator-wrapper">
            <div class="calculator-form-inputs">
                ${formHtml}
            </div>
            <div class="calculator-results-container">
                ${resultsHtml}
            </div>
        </div>
    `;
    
    // Bind events
    bindCalculatorEvents(calculator);
    
    // Perform initial calculation
    setTimeout(() => calculator.calculate(), 0);
}

/**
 * Build form HTML for calculator
 * @param {Object} tool - Tool definition
 * @param {Object} values - Current values
 * @returns {string} HTML string
 */
export function buildFormHtml(tool, values) {
    let html = '';
    let inCollapsible = false;
    
    tool.fields.forEach(field => {
        const labels = tool.fieldLabels ? tool.fieldLabels(values) : {};
        const label = labels[field.id] || field.label;
        const hidden = field.condition && !field.condition(values);
        
        // Section header
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
                        <span>${escapeHtml(label)}</span>
                        <i class="fa-solid fa-chevron-down advanced-chevron"></i>
                    </summary>
                    <div class="advanced-section-body">`;
                inCollapsible = true;
            } else {
                html += `
                <div class="form-section-header" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
                    <i class="fa-solid ${field.icon || 'fa-circle'}"></i>
                    <span>${escapeHtml(label)}</span>
                </div>`;
            }
            return;
        }
        
        // Select field
        if (field.type === 'select') {
            html += buildSelectField(field, label, values, hidden);
            return;
        }
        
        // Range field
        if (field.type === 'range') {
            html += buildRangeField(field, label, values, hidden);
            return;
        }
        
        // Standard input field
        html += buildInputField(field, label, values, hidden);
    });
    
    // Close any open collapsible section
    if (inCollapsible) {
        html += '</div></details>';
    }
    
    return html;
}

/**
 * Build select field HTML
 * @param {Object} field - Field definition
 * @param {string} label - Field label
 * @param {Object} values - Current values
 * @param {boolean} hidden - Whether field is hidden
 * @returns {string} HTML string
 */
export function buildSelectField(field, label, values, hidden) {
    const attrs = [
        field.min !== undefined ? `min="${field.min}"` : '',
        field.max !== undefined ? `max="${field.max}"` : '',
        field.step !== undefined ? `step="${field.step}"` : ''
    ].join(' ');
    
    return `
        <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
            <label for="${field.id}">${escapeHtml(label)}</label>
            ${field.hint ? `<span class="field-hint">${field.hint}</span>` : ''}
            <select id="${field.id}" data-id="${field.id}">
                ${field.options.map(opt => `
                    <option value="${opt.value}" ${values[field.id] == opt.value ? 'selected' : ''}>
                        ${escapeHtml(opt.label)}
                    </option>
                `).join('')}
            </select>
        </div>
    `;
}

/**
 * Build range field HTML
 * @param {Object} field - Field definition
 * @param {string} label - Field label
 * @param {Object} values - Current values
 * @param {boolean} hidden - Whether field is hidden
 * @returns {string} HTML string
 */
export function buildRangeField(field, label, values, hidden) {
    const attrs = [
        field.min !== undefined ? `min="${field.min}"` : '',
        field.max !== undefined ? `max="${field.max}"` : '',
        field.step !== undefined ? `step="${field.step}"` : ''
    ].join(' ');
    
    return `
        <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
            <label for="${field.id}">${escapeHtml(label)}</label>
            ${field.hint ? `<span class="field-hint">${field.hint}</span>` : ''}
            <div class="range-input-wrap">
                <input type="number" id="${field.id}" data-id="${field.id}"
                       value="${values[field.id]}" ${attrs}>
                <input type="range" id="${field.id}-range" data-range-for="${field.id}"
                       value="${values[field.id]}" ${attrs}>
            </div>
            <span class="field-error hidden" data-error="${field.id}"></span>
        </div>
    `;
}

/**
 * Build standard input field HTML
 * @param {Object} field - Field definition
 * @param {string} label - Field label
 * @param {Object} values - Current values
 * @param {boolean} hidden - Whether field is hidden
 * @returns {string} HTML string
 */
export function buildInputField(field, label, values, hidden) {
    const attrs = [
        field.min !== undefined ? `min="${field.min}"` : '',
        field.max !== undefined ? `max="${field.max}"` : '',
        field.step !== undefined ? `step="${field.step}"` : '',
        field.maxLength ? `maxlength="${field.maxLength}"` : ''
    ].join(' ');
    
    return `
        <div class="form-group" data-field="${field.id}" ${hidden ? 'style="display:none"' : ''}>
            <label for="${field.id}">${escapeHtml(label)}</label>
            ${field.hint ? `<span class="field-hint">${field.hint}</span>` : ''}
            <input type="${field.type}" id="${field.id}" data-id="${field.id}"
                   value="${values[field.id]}" ${attrs}>
            <span class="field-error hidden" data-error="${field.id}"></span>
        </div>
    `;
}

// ── Event Handling ─────────────────────────────────────────────

/**
 * Bind event listeners to calculator
 * @param {Object} calculator - Calculator instance
 */
export function bindCalculatorEvents(calculator) {
    const { container, tool } = calculator;
    
    // Input change handler
    const handleInputChange = (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        
        const field = tool.fields.find(f => f.id === id);
        if (!field) return;
        
        let value = e.target.value;
        
        if (field.type === 'number') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return;
            value = numValue;
        }
        
        calculator.update(id, value);
    };
    
    // Range input handler
    const handleRangeInput = (e) => {
        const rangeFor = e.target.dataset.rangeFor;
        if (!rangeFor) return;
        
        const numInput = document.getElementById(rangeFor);
        if (numInput) {
            numInput.value = e.target.value;
            calculator.update(rangeFor, parseFloat(e.target.value));
        }
    };
    
    // Attach listeners
    container.addEventListener('input', handleInputChange);
    container.addEventListener('change', handleInputChange);
    container.addEventListener('input', handleRangeInput);
    container.addEventListener('change', handleRangeInput);
}

/**
 * Update field value and recalculate
 * @param {Object} calculator - Calculator instance
 * @param {string} fieldId - Field identifier
 * @param {*} value - New value
 */
export function updateField(calculator, fieldId, value) {
    calculator.state.values[fieldId] = value;
    calculator.calculate();
}

/**
 * Set multiple calculator values
 * @param {Object} calculator - Calculator instance
 * @param {Object} newValues - Values to set
 */
export function setCalculatorValues(calculator, newValues) {
    Object.entries(newValues).forEach(([key, value]) => {
        if (key in calculator.state.values) {
            calculator.state.values[key] = value;
        }
    });
    calculator.calculate();
}

// ── Calculation ────────────────────────────────────────────────

/**
 * Perform calculation
 * @param {Object} calculator - Calculator instance
 * @returns {Object} Calculation result
 */
export function performCalculation(calculator) {
    const { tool, values } = calculator;
    
    try {
        const result = tool.calculate(values);
        calculator.state.lastResult = result;
        calculator.state.errors = {};
        
        // Render results
        renderResults(calculator, result);
        
        return result;
    } catch (error) {
        console.error('Calculation error:', error);
        calculator.state.errors = { general: error.message };
        renderError(calculator, error.message);
        return { error: true, message: error.message };
    }
}

/**
 * Validate calculator fields
 * @param {Object} calculator - Calculator instance
 * @returns {Object} Validation result
 */
export function validateFields(calculator) {
    const { tool, values } = calculator;
    const errors = {};
    
    tool.fields.forEach(field => {
        if (field.type === 'number') {
            const value = values[field.id];
            
            if (value === '' || value === null || value === undefined) {
                if (field.required) {
                    errors[field.id] = 'This field is required';
                }
                return;
            }
            
            const num = parseFloat(value);
            
            if (isNaN(num)) {
                errors[field.id] = 'Please enter a valid number';
                return;
            }
            
            if (field.min !== undefined && num < field.min) {
                errors[field.id] = `Minimum value is ${field.min}`;
            }
            
            if (field.max !== undefined && num > field.max) {
                errors[field.id] = `Maximum value is ${field.max}`;
            }
        }
    });
    
    calculator.state.errors = errors;
    return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Reset calculator to default values
 * @param {Object} calculator - Calculator instance
 */
export function resetCalculator(calculator) {
    const { tool } = calculator;
    
    // Reset values to defaults
    tool.fields.forEach(field => {
        calculator.state.values[field.id] = typeof field.default === 'function'
            ? field.default()
            : field.default;
    });
    
    // Clear errors
    calculator.state.errors = {};
    calculator.state.lastResult = null;
    
    // Re-render
    calculator.render();
}

// ── Results Rendering ──────────────────────────────────────────

/**
 * Render calculation results
 * @param {Object} calculator - Calculator instance
 * @param {Object} result - Calculation result
 */
export function renderResults(calculator, result) {
    const container = calculator.container.querySelector('.calculator-results-card');
    if (!container) return;
    
    if (result.error) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>${escapeHtml(result.stats[0]?.value || 'An error occurred')}</p>
            </div>
        `;
        return;
    }
    
    // Build results HTML
    let html = '';
    
    // Insight
    if (result.insight) {
        html += buildInsightHtml(result.insight);
    }
    
    // Recommendation
    if (result.recommendation) {
        html += buildRecommendationHtml(result.recommendation);
    }
    
    // Summary
    if (result.summary) {
        html += buildSummaryHtml(result.summary);
    }
    
    // BMI Gauge
    if (result.bmiGauge) {
        html += buildBmiGaugeHtml(result.bmiGauge);
    }
    
    // Stats
    if (result.stats) {
        html += buildStatsHtml(result.stats);
    }
    
    // Bars
    if (result.bars) {
        html += buildBarsHtml(result.bars);
    }
    
    // Charts
    if (result.chart || result.chart2 || result.compareChart || result.chart3) {
        html += buildChartsHtml(result);
    }
    
    // Tables
    if (result.table) {
        html += buildTableHtml(result.table);
    }
    
    // Breakdown tables
    if (result.assetTable || result.liabilityTable) {
        html += buildBreakdownTablesHtml(result);
    }
    
    // Insights
    if (result.insights) {
        html += buildInsightsHtml(result.insights);
    }
    
    container.innerHTML = html;
    
    // Render charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        renderCharts(calculator, result);
    }
}

/**
 * Render error message
 * @param {Object} calculator - Calculator instance
 * @param {string} message - Error message
 */
export function renderError(calculator, message) {
    const container = calculator.container.querySelector('.calculator-results-card');
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-message">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

// ── HTML Builders ──────────────────────────────────────────────

/**
 * Build stats HTML
 * @param {Array} stats - Stats array
 * @returns {string} HTML string
 */
export function buildStatsHtml(stats) {
    return stats.map(stat => `
        <div class="result-stat-box">
            <span class="res-label">${escapeHtml(stat.label)}</span>
            <span class="res-val ${stat.highlight ? 'highlight' : ''}"
                  style="${stat.color ? `color:${escapeHtml(stat.color)}` : ''}">
                ${escapeHtml(stat.value)}
            </span>
        </div>
    `).join('');
}

/**
 * Build insight HTML
 * @param {Object} insight - Insight object
 * @returns {string} HTML string
 */
export function buildInsightHtml(insight) {
    if (!insight) return '';
    
    const toneMap = { positive: '#10B981', neutral: '#6366F1', warning: '#EF4444' };
    const color = toneMap[insight.tone] || toneMap.neutral;
    
    return `
        <div class="insight-callout" style="border-left:4px solid ${color};background:var(--bg-main);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px;">
            <i class="fa-solid ${escapeHtml(insight.icon)}" style="color:${color};margin-top:2px;font-size:16px;"></i>
            <div>
                <div style="font-weight:700;font-size:14px;color:var(--text-primary);line-height:1.4;">${escapeHtml(insight.headline)}</div>
                <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;line-height:1.6;">${escapeHtml(insight.detail)}</div>
            </div>
        </div>
    `;
}

/**
 * Build recommendation HTML
 * @param {Object} rec - Recommendation object
 * @returns {string} HTML string
 */
export function buildRecommendationHtml(rec) {
    if (!rec) return '';
    
    const isBuy = rec.winner === 'buy';
    const accent = isBuy ? '#10B981' : '#6366F1';
    const icon = isBuy ? 'fa-house-chimney' : 'fa-key';
    const winnerLabel = isBuy ? 'Buying' : 'Renting';
    
    const reasonsHtml = (rec.reasons || []).map(r => `
        <li style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;">
            <i class="fa-solid fa-circle-check" style="color:#10B981;margin-top:3px;font-size:12px;"></i>
            <span>${escapeHtml(r)}</span>
        </li>
    `).join('');
    
    const risksHtml = (rec.risks || []).map(r => `
        <li style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;">
            <i class="fa-solid fa-triangle-exclamation" style="color:#F59E0B;margin-top:3px;font-size:12px;"></i>
            <span>${escapeHtml(r)}</span>
        </li>
    `).join('');
    
    return `
        <div class="recommendation-card" style="border:1px solid ${accent}33;background:linear-gradient(135deg, ${accent}0D, transparent);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="width:44px;height:44px;border-radius:50%;background:${accent}1A;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fa-solid ${icon}" style="color:${accent};font-size:18px;"></i>
                </div>
                <div>
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:${accent};">Recommendation</div>
                    <div style="font-size:18px;font-weight:800;color:var(--text-primary);line-height:1.3;">${winnerLabel} is projected to ${rec.savings ? `save you approximately <span style="color:${accent};">${escapeHtml(rec.savings)}</span>` : 'be the better financial choice'} over the analysis period.</div>
                </div>
            </div>
            ${rec.confidence ? `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-main);border:1px solid var(--border-color);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;"><i class="fa-solid fa-gauge-high" style="color:${accent};"></i> Confidence: ${escapeHtml(rec.confidence)}</div>` : ''}
            ${rec.breakEvenYear ? `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-main);border:1px solid var(--border-color);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;margin-left:8px;"><i class="fa-solid fa-flag-checkered" style="color:${accent};"></i> Break-even: ${escapeHtml(rec.breakEvenYear)}</div>` : ''}
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
        </div>
    `;
}

/**
 * Build summary HTML
 * @param {Object} summary - Summary object
 * @returns {string} HTML string
 */
export function buildSummaryHtml(summary) {
    if (!summary) return '';
    
    const kpis = (summary.kpis || []).map(k => `
        <div class="result-stat-box" style="margin-top:0;">
            <span class="res-label">${escapeHtml(k.label)}</span>
            <span class="res-val ${k.highlight ? 'highlight' : ''}" style="${k.color ? `color:${escapeHtml(k.color)}` : ''}">${escapeHtml(k.value)}</span>
        </div>
    `).join('');
    
    return `
        <div class="executive-summary" style="margin-bottom:16px;">
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px;"><i class="fa-solid fa-gauge-high" style="color:var(--primary-color);margin-right:8px;"></i>Executive Results Dashboard</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">${kpis}</div>
        </div>
    `;
}

/**
 * Build BMI gauge HTML
 * @param {Object} bmiGauge - BMI gauge data
 * @returns {string} HTML string
 */
export function buildBmiGaugeHtml(bmiGauge) {
    if (!bmiGauge) return '';
    
    return `
        <div class="bmi-gauge-container">
            <div class="bmi-gauge">
                <div class="bmi-gauge-fill" style="transform:rotate(${bmiGauge.bmi * 4.5}deg);background-color:${bmiGauge.color};"></div>
                <div class="bmi-gauge-cover">
                    <div class="bmi-value">${bmiGauge.bmi.toFixed(1)}</div>
                    <div class="bmi-label" style="color:${bmiGauge.color};">${escapeHtml(bmiGauge.label)}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Build charts HTML
 * @param {Object} result - Calculation result
 * @returns {string} HTML string
 */
export function buildChartsHtml(result) {
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

/**
 * Build table HTML
 * @param {Object} table - Table data
 * @returns {string} HTML string
 */
export function buildTableHtml(table) {
    if (!table) return '';
    
    // Custom table mode
    if (table.mode) {
        return buildTableSpecHtml(table);
    }
    
    // Standard amortization table
    const rows = table.map(row => `
        <tr>
            <td>${escapeHtml(row.month)}</td>
            <td>${formatCurrency(row.payment)}</td>
            <td>${formatCurrency(row.principal)}</td>
            <td>${formatCurrency(row.interest)}</td>
            <td>${formatCurrency(row.balance)}</td>
        </tr>
    `).join('');
    
    return `
        <div class="result-table-container calc-data-table">
            <h4>Amortization Schedule</h4>
            <div class="table-wrapper">
                <table>
                    <thead><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Build breakdown tables HTML
 * @param {Object} result - Calculation result
 * @returns {string} HTML string
 */
export function buildBreakdownTablesHtml(result) {
    if (!result.assetTable && !result.liabilityTable) return '';
    
    let html = '';
    
    if (result.assetTable) {
        const rows = result.assetTable.map(r => `
            <tr>
                <td>${escapeHtml(r.category)}</td>
                <td>${formatCurrency(r.amount)}</td>
                <td>${escapeHtml(r.pct + '%')}</td>
            </tr>
        `).join('');
        
        html += `
            <div class="result-table-container breakdown-table-container">
                <h4>Asset Breakdown</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Category</th><th>Amount</th><th>% of Assets</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    if (result.liabilityTable) {
        const rows = result.liabilityTable.map(r => `
            <tr>
                <td>${escapeHtml(r.category)}</td>
                <td>${formatCurrency(r.amount)}</td>
                <td>${escapeHtml(r.pct + '%')}</td>
            </tr>
        `).join('');
        
        html += `
            <div class="result-table-container breakdown-table-container">
                <h4>Liability Breakdown</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Category</th><th>Amount</th><th>% of Liabilities</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    return html;
}

/**
 * Build insights HTML
 * @param {Array} insights - Insights array
 * @returns {string} HTML string
 */
export function buildInsightsHtml(insights) {
    if (!insights || !insights.length) return '';
    
    const items = insights.map(ins => `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border-color);">
            <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--primary-color);margin-top:3px;font-size:14px;flex-shrink:0;"></i>
            <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">${escapeHtml(ins)}</div>
        </div>
    `).join('');
    
    return `
        <div class="insights-card" style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px 18px;margin-top:16px;">
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:4px;"><i class="fa-solid fa-brain" style="color:var(--primary-color);margin-right:8px;"></i>Personalized Insights</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">AI-like observations based on your specific numbers.</div>
            ${items}
        </div>
    `;
}

/**
 * Build bars HTML
 * @param {Array} bars - Bars array
 * @returns {string} HTML string
 */
export function buildBarsHtml(bars) {
    if (!bars || !bars.length) return '';
    
    return `
        <div class="coverage-bars" style="margin-top:8px;">
            ${bars.map(bar => {
                const pct = Math.min(100, (safeNum(bar.value, 0) / safeNum(bar.target, 1)) * 100);
                const color = bar.color || '#10B981';
                return `
                    <div style="margin-bottom:14px;">
                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
                            <span style="font-weight:600;color:var(--text-primary);">${escapeHtml(bar.label)}</span>
                            <span style="color:var(--text-secondary);">${safeStr(bar.caption) ? escapeHtml(bar.caption) : pct.toFixed(0) + '%'}</span>
                        </div>
                        <div style="width:100%;height:10px;background:var(--border-color);border-radius:5px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:${color};border-radius:5px;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Build table spec HTML
 * @param {Object} tbl - Table specification
 * @returns {string} HTML string
 */
export function buildTableSpecHtml(tbl) {
    if (!tbl || !tbl.columns) return '';
    
    const headerCells = tbl.columns.map(c =>
        `<th${c.emphasis ? ' style="font-weight:700;color:var(--text-primary);"' : ''}>${escapeHtml(c.label)}</th>`
    ).join('');
    
    const dataRows = (tbl.rows || []).map(r => {
        const cells = tbl.columns.map(c => {
            const formatted = formatCell(r[c.key], c.format);
            return `<td${c.emphasis ? ' style="font-weight:600;color:var(--text-primary);"' : ''}>${formatted}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    
    return `
        <div class="result-table-container calc-data-table">
            <h4>${escapeHtml(tbl.title)}</h4>
            <div class="table-wrapper">
                <table>
                    <thead><tr>${headerCells}</tr></thead>
                    <tbody>${dataRows}</tbody>
                </table>
            </div>
        </div>
    `;
}

// ── Chart Rendering ────────────────────────────────────────────

/**
 * Render charts for calculator
 * @param {Object} calculator - Calculator instance
 * @param {Object} result - Calculation result
 */
export function renderCharts(calculator, result) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return;
    }
    
    const { container } = calculator;
    
    // Destroy existing charts
    if (calculator.chartInstances) {
        calculator.chartInstances.forEach(chart => chart.destroy());
    }
    calculator.chartInstances = [];
    
    // Render each chart
    const charts = [
        { data: result.chart, id: 'result-chart' },
        { data: result.chart2, id: 'result-chart-2' },
        { data: result.compareChart, id: 'result-chart-3' },
        { data: result.chart3, id: 'result-chart-4' }
    ];
    
    charts.forEach(({ data, id }) => {
        if (!data) return;
        
        const canvas = container.querySelector(`#${id}`);
        if (!canvas) return;
        
        const chart = createChart(canvas, data);
        if (chart) {
            calculator.chartInstances.push(chart);
        }
    });
}

/**
 * Create Chart.js instance
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} chartData - Chart configuration
 * @returns {Chart} Chart instance
 */
export function createChart(canvas, chartData) {
    const type = chartData.type || 'doughnut';
    const ctx = canvas.getContext('2d');
    
    // Doughnut chart
    if (type === 'doughnut' || !type) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels || ['Principal', 'Total Interest'],
                datasets: [{
                    data: chartData.data || [chartData.principal, chartData.totalInterest],
                    backgroundColor: chartData.colors || ['#6366F1', '#F59E0B'],
                    borderWidth: 2,
                    borderColor: 'var(--bg-card)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: chartData.cutout || '62%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 14,
                            color: 'var(--text-secondary)'
                        }
                    }
                }
            }
        });
    }
    
    // Line/Bar chart
    const datasets = (chartData.datasets || []).map(ds => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color || '#6366F1',
        backgroundColor: ds.color || '#6366F1',
        tension: 0.25,
        pointRadius: type === 'line' ? 3 : 0,
        pointHoverRadius: type === 'line' ? 5 : 0,
        fill: ds.fill || false,
        borderWidth: type === 'line' ? 2.5 : 1,
        borderRadius: type === 'bar' ? 6 : 0,
        borderSkipped: false
    }));
    
    return new Chart(ctx, {
        type: type === 'horizontalBar' ? 'bar' : type,
        data: {
            labels: chartData.labels || [],
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: type === 'horizontalBar' ? 'y' : undefined,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 16,
                        color: 'var(--text-secondary)'
                    }
                }
            },
            scales: type === 'line' || type === 'bar' ? {
                x: {
                    ticks: { color: 'var(--text-secondary)', font: { size: 11 } },
                    grid: { display: false }
                },
                y: {
                    ticks: {
                        color: 'var(--text-secondary)',
                        font: { size: 11 },
                        callback: v => '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
                    },
                    grid: { color: 'var(--border-color)' }
                }
            } : undefined
        }
    });
}

// ── Utility Functions ──────────────────────────────────────────

// Note: escapeHtml, formatCurrency, formatNumber, safeNum, safeStr, roundTo
// are imported from ../utils/index.js at the top of this file

/**
 * Set global option
 * @param {string} key - Option key
 * @param {*} value - Option value
 */
export function setGlobalOption(key, value) {
    if (key in engineState.globalSettings) {
        engineState.globalSettings[key] = value;
    }
}

/**
 * Get global option
 * @param {string} key - Option key
 * @param {*} fallback - Fallback value
 * @returns {*} Option value
 */
export function getGlobalOption(key, fallback = null) {
    return engineState.globalSettings[key] || fallback;
}

// ── Engine Statistics ──────────────────────────────────────────

/**
 * Get engine statistics
 * @returns {Object} Engine stats
 */
export function getEngineStats() {
    return {
        activeCalculators: engineState.activeCalculators.size,
        globalSettings: { ...engineState.globalSettings }
    };
}

// Log engine initialization
console.log('Calculator Engine initialized');
console.log('Global settings:', engineState.globalSettings);