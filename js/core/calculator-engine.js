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
import { ChartManager } from '../modules/charts.js';
import { validateNumber, validateRequired, validateInteger, validatePercentage } from '../modules/validation.js';

export { escapeHtml, formatCurrency, formatNumber, safeNum, safeStr, roundTo };

// ═══════════════════════════════════════════════════════════════
// CalculatorEngine — Pure Calculation Infrastructure
// 
// Separates INPUTS → NORMALIZE → VALIDATE → CALCULATE → RESULT
// Contains NO DOM manipulation, NO rendering, NO charts, NO PDF.
// 
// @module core/calculator-engine
// ═══════════════════════════════════════════════════════════════

const ENGINE_VERSION = '1.0.0';

// ── Input Normalization ─────────────────────────────────────────
const INPUT_TYPES = {
    number: (v) => {
        if (v === null || v === undefined || v === '') return null;
        const num = Number(String(v).replace(/[$,%\s]/g, ''));
        return isFinite(num) ? num : null;
    },
    currency: (v) => {
        if (v === null || v === undefined || v === '') return null;
        const num = Number(String(v).replace(/[$,%\s]/g, ''));
        return isFinite(num) ? num : null;
    },
    percentage: (v) => {
        if (v === null || v === undefined || v === '') return null;
        const num = Number(String(v).replace(/[%\s]/g, ''));
        return isFinite(num) ? num / 100 : null;
    },
    integer: (v) => {
        if (v === null || v === undefined || v === '') return null;
        const num = Math.round(Number(String(v).replace(/[$,%\s]/g, '')));
        return isFinite(num) ? num : null;
    },
    decimal: (v) => {
        if (v === null || v === undefined || v === '') return null;
        const num = Number(String(v).replace(/[$,%\s]/g, ''));
        return isFinite(num) ? num : null;
    },
    date: (v) => {
        if (v === null || v === undefined || v === '') return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    },
    boolean: (v) => {
        if (v === null || v === undefined) return false;
        if (typeof v === 'boolean') return v;
        return v === 'true' || v === '1' || v === 'yes';
    },
    select: (v) => v === null || v === undefined ? null : String(v),
    text: (v) => v === null || v === undefined ? '' : String(v).trim()
};

/**
 * Normalize raw inputs based on field definitions
 * @param {Array} fields - Calculator field definitions
 * @param {Object} rawInputs - Raw input values
 * @returns {Object} Normalized inputs
 */
export function normalizeInputs(fields, rawInputs) {
    const normalized = {};
    
    fields.forEach(field => {
        const raw = rawInputs[field.id];
        const type = field.type || 'number';
        const normalizer = INPUT_TYPES[type] || INPUT_TYPES.number;
        
        let value = normalizer(raw);
        
        // Apply default if value is null
        if (value === null && field.default !== undefined) {
            value = typeof field.default === 'function' ? field.default() : field.default;
        }
        
        normalized[field.id] = value;
    });
    
    return normalized;
}

// ── Validation Integration ──────────────────────────────────────
/**
 * Validate inputs against field constraints
 * @param {Array} fields - Calculator field definitions
 * @param {Object} inputs - Normalized inputs
 * @returns {Object} { isValid, errors }
 */
export function validateInputs(fields, inputs) {
    const errors = [];
    
    fields.forEach(field => {
        if (field.type === 'section' || field.type === 'select' || field.type === 'boolean') return;
        
        const value = inputs[field.id];
        const label = field.label || field.id;
        
        // Required check
        if (field.required && (value === null || value === undefined || value === '')) {
            errors.push({
                field: field.id,
                code: 'REQUIRED',
                message: `${label} is required`
            });
            return;
        }
        
        // Skip further validation if value is null/undefined and not required
        if (value === null || value === undefined || value === '') return;
        
        // Number validation
        if (field.type === 'number' || field.type === 'currency' || field.type === 'decimal') {
            const num = Number(value);
            if (isNaN(num)) {
                errors.push({
                    field: field.id,
                    code: 'INVALID_NUMBER',
                    message: `${label} must be a valid number`
                });
                return;
            }
            
            if (field.min !== undefined && num < field.min) {
                errors.push({
                    field: field.id,
                    code: 'MIN_VALUE',
                    message: `${label} must be at least ${field.min}`
                });
            }
            
            if (field.max !== undefined && num > field.max) {
                errors.push({
                    field: field.id,
                    code: 'MAX_VALUE',
                    message: `${label} must be at most ${field.max}`
                });
            }
        }
        
        // Integer validation
        if (field.type === 'integer') {
            const num = Number(value);
            if (!Number.isInteger(num)) {
                errors.push({
                    field: field.id,
                    code: 'INVALID_INTEGER',
                    message: `${label} must be a whole number`
                });
            }
        }
        
        // Percentage validation
        if (field.type === 'percentage') {
            const num = Number(value);
            if (num < 0 || num > 1) {
                errors.push({
                    field: field.id,
                    code: 'INVALID_PERCENTAGE',
                    message: `${label} must be between 0% and 100%`
                });
            }
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// ── Result Helpers ──────────────────────────────────────────────
/**
 * Create an empty result template
 * @param {string} calculatorId - Calculator ID
 * @returns {Object} Empty result
 */
export function createResult(calculatorId) {
    return {
        success: true,
        inputs: {},
        results: {},
        metrics: {},
        breakdown: {},
        timeline: [],
        comparison: {},
        warnings: [],
        errors: [],
        metadata: {
            calculatorId,
            version: ENGINE_VERSION,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Add an error to a result
 * @param {Object} result - Result object
 * @param {string} field - Field name
 * @param {string} code - Error code
 * @param {string} message - Error message
 */
export function addError(result, field, code, message) {
    result.success = false;
    result.errors.push({ field, code, message });
}

/**
 * Add a warning to a result
 * @param {Object} result - Result object
 * @param {string} message - Warning message
 */
export function addWarning(result, message) {
    result.warnings.push(message);
}

// ── Precision Helpers ───────────────────────────────────────────
/**
 * Round a number to specified decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Decimal places
 * @returns {number} Rounded value
 */
export function round(value, decimals = 2) {
    if (!isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

// ── Financial Math Primitives ───────────────────────────────────
/**
 * Calculate loan payment (PMT)
 * @param {Object} config - Loan config
 * @param {number} config.principal - Loan amount
 * @param {number} config.annualRate - Annual interest rate (decimal, e.g. 0.07)
 * @param {number} config.termYears - Loan term in years
 * @param {number} [config.paymentsPerYear=12] - Payments per year
 * @returns {number} Monthly payment
 */
export function loanPayment({ principal, annualRate, termYears, paymentsPerYear = 12 }) {
    const p = safeNum(principal, 0);
    const r = safeNum(annualRate, 0) / paymentsPerYear;
    const n = Math.round(safeNum(termYears, 0)) * paymentsPerYear;
    
    if (p <= 0 || n <= 0) return 0;
    if (r === 0) return p / n;
    
    return p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Generate amortization schedule
 * @param {Object} config - Amortization config
 * @param {number} config.principal - Loan amount
 * @param {number} config.annualRate - Annual interest rate (decimal)
 * @param {number} config.termYears - Loan term in years
 * @param {number} [config.paymentsPerYear=12] - Payments per year
 * @param {number} [config.payment] - Fixed payment (optional, defaults to PMT)
 * @returns {Array} Amortization schedule
 */
export function amortization({ principal, annualRate, termYears, paymentsPerYear = 12, payment }) {
    const p = safeNum(principal, 0);
    const r = safeNum(annualRate, 0) / paymentsPerYear;
    const n = Math.round(safeNum(termYears, 0)) * paymentsPerYear;
    const pmt = payment !== undefined ? safeNum(payment, 0) : loanPayment({ principal: p, annualRate, termYears, paymentsPerYear });
    
    const schedule = [];
    let balance = p;
    let cumulativePrincipal = 0;
    let cumulativeInterest = 0;
    
    for (let i = 1; i <= n; i++) {
        const interest = balance * r;
        let principalPaid = pmt - interest;
        
        if (principalPaid > balance) principalPaid = balance;
        
        balance = Math.max(0, balance - principalPaid);
        cumulativePrincipal += principalPaid;
        cumulativeInterest += interest;
        
        schedule.push({
            paymentNumber: i,
            payment: round(pmt, 2),
            principal: round(principalPaid, 2),
            interest: round(interest, 2),
            balance: round(balance, 2),
            cumulativePrincipal: round(cumulativePrincipal, 2),
            cumulativeInterest: round(cumulativeInterest, 2)
        });
        
        if (balance <= 0 && i < n) break;
    }
    
    // Fix final payment
    if (schedule.length > 0) {
        const last = schedule[schedule.length - 1];
        last.balance = 0;
        last.payment = round(last.principal + last.interest, 2);
    }
    
    return schedule;
}

/**
 * Calculate compound interest growth
 * @param {Object} config - Compound interest config
 * @param {number} config.principal - Initial amount
 * @param {number} config.annualRate - Annual rate (decimal)
 * @param {number} config.years - Number of years
 * @param {number} [config.compoundsPerYear=12] - Compounding frequency
 * @param {number} [config.monthlyContribution=0] - Monthly contribution
 * @returns {Object} Growth data
 */
export function compoundInterest({ principal, annualRate, years, compoundsPerYear = 12, monthlyContribution = 0 }) {
    const p = safeNum(principal, 0);
    const r = safeNum(annualRate, 0);
    const y = safeNum(years, 0);
    const cpy = Math.max(1, Math.round(safeNum(compoundsPerYear, 12)));
    const mc = safeNum(monthlyContribution, 0);
    
    const timeline = [];
    let balance = p;
    let totalContributions = p;
    let totalGrowth = 0;
    
    for (let year = 1; year <= y; year++) {
        // Monthly compounding with contributions
        for (let m = 0; m < cpy; m++) {
            const monthlyRate = r / cpy;
            balance = balance * (1 + monthlyRate) + mc;
            totalContributions += mc;
        }
        
        totalGrowth = balance - totalContributions;
        
        timeline.push({
            year,
            value: round(balance, 2),
            contributions: round(totalContributions, 2),
            growth: round(totalGrowth, 2)
        });
    }
    
    return {
        finalValue: round(balance, 2),
        totalContributions: round(totalContributions, 2),
        totalGrowth: round(totalGrowth, 2),
        timeline
    };
}

/**
 * Calculate break-even point
 * @param {Object} config - Break-even config
 * @param {Array} config.scenarios - Array of scenario cost functions
 * @returns {Object} Break-even analysis
 */
export function breakEven({ scenarios }) {
    if (!Array.isArray(scenarios) || scenarios.length < 2) {
        return { breakEvenPoint: null, comparison: {} };
    }
    
    const comparison = {};
    const maxYears = 30;
    
    // Calculate cumulative costs for each scenario
    scenarios.forEach((scenario, i) => {
        const key = `scenario${i + 1}`;
        comparison[key] = {
            name: scenario.name || `Scenario ${i + 1}`,
            cumulative: []
        };
        
        let cumulative = 0;
        for (let year = 1; year <= maxYears; year++) {
            cumulative += scenario.annualCost(year);
            comparison[key].cumulative.push({
                year,
                cumulativeCost: round(cumulative, 2)
            });
        }
    });
    
    // Find break-even year
    let breakEvenPoint = null;
    const a = comparison.scenario1?.cumulative || [];
    const b = comparison.scenario2?.cumulative || [];
    
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i].cumulativeCost <= b[i].cumulativeCost) {
            breakEvenPoint = a[i].year;
            break;
        }
    }
    
    return { breakEvenPoint, comparison };
}

// ── Main Engine Pipeline ────────────────────────────────────────
/**
 * Run a calculator through the engine pipeline
 * @param {Object} calculator - Calculator definition
 * @param {Object} rawInputs - Raw input values
 * @param {Object} [context] - Additional context
 * @returns {Object} Structured result
 */
export function runCalculator(calculator, rawInputs, context = {}) {
    const result = createResult(calculator.id || calculator.slug);
    
    // 1. Normalize inputs
    const inputs = normalizeInputs(calculator.fields || [], rawInputs);
    result.inputs = inputs;
    
    // 2. Validate inputs
    const validation = validateInputs(calculator.fields || [], inputs);
    if (!validation.isValid) {
        result.success = false;
        result.errors = validation.errors;
        return result;
    }
    
    // 3. Calculate
    try {
        const calcResult = calculator.calculate(inputs, context);
        
        // Merge calculation result into structured result
        if (calcResult && typeof calcResult === 'object') {
            Object.assign(result.results, calcResult.results || {});
            Object.assign(result.metrics, calcResult.metrics || {});
            Object.assign(result.breakdown, calcResult.breakdown || {});
            
            if (calcResult.timeline) result.timeline = calcResult.timeline;
            if (calcResult.comparison) result.comparison = calcResult.comparison;
            if (calcResult.warnings) result.warnings = result.warnings.concat(calcResult.warnings);
            
            // Preserve legacy result fields for backward compatibility
            if (calcResult.stats) result.stats = calcResult.stats;
            if (calcResult.chart) result.chart = calcResult.chart;
            if (calcResult.chart2) result.chart2 = calcResult.chart2;
            if (calcResult.compareChart) result.compareChart = calcResult.compareChart;
            if (calcResult.chart3) result.chart3 = calcResult.chart3;
            if (calcResult.table) result.table = calcResult.table;
            if (calcResult.insight) result.insight = calcResult.insight;
            if (calcResult.recommendation) result.recommendation = calcResult.recommendation;
            if (calcResult.summary) result.summary = calcResult.summary;
            if (calcResult.bmiGauge) result.bmiGauge = calcResult.bmiGauge;
            if (calcResult.bars) result.bars = calcResult.bars;
            if (calcResult.insights) result.insights = calcResult.insights;
            if (calcResult.journey) result.journey = calcResult.journey;
        }
    } catch (error) {
        console.error(`[CalculatorEngine] Calculation error for "${calculator.id}":`, error);
        addError(result, 'general', 'CALCULATION_ERROR', 'An error occurred during calculation');
    }
    
    return result;
}

// ── Backward Compatibility ──────────────────────────────────────
// Export the engine as a namespace for easy access
export const CalculatorEngine = {
    run: runCalculator,
    normalizeInputs,
    validateInputs,
    createResult,
    addError,
    addWarning,
    round,
    loanPayment,
    amortization,
    compoundInterest,
    breakEven,
    version: ENGINE_VERSION
};

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
        // Destroy any charts associated with this calculator
        if (instance.container) {
            const canvases = instance.container.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                if (canvas.id) ChartManager.destroy(canvas.id);
            });
        }
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
    
    // Special handling for budget-planner
    if (calculator.slug === 'budget-planner') {
        const budgetModule = window.renderBudgetPlannerModule || window.renderBudgetPlanner;
        if (budgetModule) {
            budgetModule(container);
            return;
        }
    }
    
    // Build form HTML
    const formHtml = buildFormHtml(tool, values);
    
    // Build results container
    const resultsHtml = '<div class="calculator-results-card"></div>';
    
    // Build SEO content (article, how-to, examples, FAQs)
    const seoContentHtml = buildSeoContentHtml(tool);
    
    // Build related tools
    const relatedToolsHtml = buildRelatedToolsHtml(tool, calculator.slug);
    
    // Render to container
    container.innerHTML = `
        <div class="tool-runner-card">
            <div class="tool-header">
                <h1>${escapeHtml(tool.name)}</h1>
                <p>${escapeHtml(tool.description)}</p>
            </div>
            <div class="tool-grid-workspace">
                <div class="calculator-form-inputs">
                    ${formHtml}
                </div>
                <div class="calculator-results-container">
                    ${resultsHtml}
                </div>
            </div>
            <div class="save-result-bar" id="save-result-bar">
                <button class="btn btn-primary" id="save-result-btn"><i class="fa-solid fa-bookmark"></i> Save Result</button>
                <span class="save-result-msg hidden" id="save-result-msg"></span>
            </div>
        </div>
        ${seoContentHtml}
        ${relatedToolsHtml}
    `;
    
    // Bind events
    bindCalculatorEvents(calculator);
    
    // Initialize save button
    initSaveButton(calculator);
    
    // Perform initial calculation
    setTimeout(() => calculator.calculate(), 0);
}

/**
 * Build SEO content HTML (article, how-to, examples, FAQs)
 * @param {Object} tool - Tool definition
 * @returns {string} HTML string
 */
export function buildSeoContentHtml(tool) {
    let html = '';
    
    // Article content
    if (tool.article) {
        const a = tool.article;
        const sectionsHtml = (a.sections && a.sections.length)
            ? a.sections.map(s => `<h3 style="font-size:15px;font-weight:700;margin:18px 0 8px;color:var(--text-primary);">${escapeHtml(s.heading)}</h3><p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${escapeHtml(s.body)}</p>`).join('')
            : '';
        html += `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:20px;font-weight:700;margin-bottom:14px;color:var(--text-primary);">${escapeHtml(a.heading)}</h2><p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${escapeHtml(a.intro)}</p>${sectionsHtml}</div>`;
    }
    
    // How-to guide
    if (tool.howTo && tool.howTo.length) {
        const steps = tool.howTo.map((step, i) => `<li style="margin-bottom:10px;"><strong>Step ${i + 1}:</strong> ${escapeHtml(step)}</li>`).join('');
        html += `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">How to Use the ${escapeHtml(tool.name)}</h2><ol style="padding-left:20px;color:var(--text-secondary);font-size:14px;line-height:1.8;">${steps}</ol>${tool.formula ? `<div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px 18px;margin-top:16px;font-size:13px;color:var(--text-secondary);"><strong style="color:var(--text-primary);">Formula:</strong> ${escapeHtml(tool.formula)}</div>` : ''}</div>`;
    }
    
    // Examples
    if (tool.examples && tool.examples.length) {
        const exHtml = tool.examples.map(ex => `<div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px;"><p style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text-primary);">${escapeHtml(ex.title)}</p><p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;"><strong>Input:</strong> ${escapeHtml(ex.input)}</p><p style="font-size:13px;color:var(--text-secondary);"><strong>Result:</strong> <span style="color:var(--primary-color);font-weight:700;">${escapeHtml(ex.result)}</span></p></div>`).join('');
        html += `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Real-World Examples</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">${exHtml}</div></div>`;
    }
    
    // FAQs
    if (tool.faqs && tool.faqs.length) {
        const faqHtml = tool.faqs.map(f => `<details style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:8px;"><summary style="font-size:14px;font-weight:700;cursor:pointer;color:var(--text-primary);list-style:none;display:flex;justify-content:space-between;align-items:center;">${escapeHtml(f.q)} <i class="fa-solid fa-chevron-down" style="font-size:12px;color:var(--text-secondary);"></i></summary><p style="font-size:13px;color:var(--text-secondary);margin-top:10px;line-height:1.7;">${escapeHtml(f.a)}</p></details>`).join('');
        html += `<div class="tool-runner-card" style="margin-top:24px;"><h2 id="faqs" style="font-size:18px;font-weight:700;margin-bottom:16px;">Frequently Asked Questions</h2>${faqHtml}</div>`;
    }
    
    return html;
}

/**
 * Build related tools HTML
 * @param {Object} tool - Tool definition
 * @param {string} slug - Current tool slug
 * @returns {string} HTML string
 */
export function buildRelatedToolsHtml(tool, slug) {
    const allTools = typeof window !== 'undefined' && window.TOOLS ? window.TOOLS : {};
    
    // Get related tools from explicit related array or same category
    const related = Object.entries(allTools)
        .filter(([s, t]) => s !== slug && (t.category === tool.category || (tool.related && tool.related.includes(s))))
        .slice(0, 4);
    
    if (!related.length) return '';
    
    const cards = related.map(([s, t]) => `<a href="/tool?slug=${encodeURIComponent(s)}" class="tool-card"><div class="tool-icon ${escapeHtml(t.iconClass || 'icon-finance')}"><i class="fa-solid ${escapeHtml(t.icon || 'fa-calculator')}"></i></div><h3 style="font-size:14px;margin-bottom:4px;">${escapeHtml(t.name)}</h3><p style="font-size:12px;color:var(--text-secondary);">${escapeHtml(t.description || '')}</p><span class="tag ${escapeHtml(t.tagClass || 'tag-finance')}">${escapeHtml(t.category || '')}</span></a>`).join('');
    
    return `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Related Calculators</h2><div class="tools-grid">${cards}</div></div>`;
}

/**
 * Initialize save button
 * @param {Object} calculator - Calculator instance
 */
export function initSaveButton(calculator) {
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
            const result = calculator.tool.calculate(calculator.state.values);
            const { error } = await saveCalculation(calculator.slug, calculator.tool.name, calculator.state.values, { stats: result.stats });
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
        const errorMsg = (result.stats && result.stats[0] && result.stats[0].value) 
            ? result.stats[0].value 
            : 'An error occurred';
        container.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>${escapeHtml(errorMsg)}</p>
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
    
    // Copy results button
    html += buildCopyBtnHtml();
    
    container.innerHTML = html;
    
    // Render charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        renderCharts(calculator, result);
    }
    
    // Bind copy button
    bindCopyBtn(result.stats);
    
    // Render journey/next-step content
    if (result.journey && result.journey.length) {
        renderJourneyHtml(calculator, result.journey);
    }
}

/**
 * Build copy results button HTML
 * @returns {string} HTML string
 */
export function buildCopyBtnHtml() {
    return `<button class="btn btn-outline btn-sm copy-results-btn" id="copy-results-btn" style="margin-top:16px;"><i class="fa-regular fa-copy"></i> Copy Results</button>`;
}

/**
 * Bind copy results button
 * @param {Array} stats - Stats array
 */
export function bindCopyBtn(stats) {
    const btn = document.getElementById('copy-results-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const text = (stats || []).map(s => `${s.label}: ${s.value}`).join('\n');
        try {
            await navigator.clipboard.writeText(text);
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            btn.style.color = '#10B981';
            btn.style.borderColor = '#10B981';
            setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Results'; btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
        } catch {
            btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Copy failed';
            btn.style.color = '#EF4444';
            btn.style.borderColor = '#EF4444';
            setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Results'; btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
        }
    });
}

/**
 * Render journey/next-step HTML
 * @param {Object} calculator - Calculator instance
 * @param {Array} journey - Journey items
 */
export function renderJourneyHtml(calculator, journey) {
    if (!journey || !journey.length) return;
    
    const items = journey.map(j => `<a href="/tool?slug=${encodeURIComponent(j.slug)}" class="tool-card"><div class="tool-icon ${escapeHtml(j.iconClass || 'icon-finance')}"><i class="fa-solid ${escapeHtml(j.icon || 'fa-calculator')}"></i></div><h3 style="font-size:14px;margin-bottom:4px;">${escapeHtml(j.name)}</h3><p style="font-size:12px;color:var(--text-secondary);">${escapeHtml(j.description || j.why || '')}</p></a>`).join('');
    
    const journeyHtml = `<div class="tool-runner-card" style="margin-top:24px;"><h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Your Next Step</h2><div class="tools-grid">${items}</div></div>`;
    
    // Append after the calculator results card
    const resultsCard = calculator.container.querySelector('.calculator-results-card');
    if (resultsCard) {
        resultsCard.insertAdjacentHTML('afterend', journeyHtml);
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
 * Format a cell value for table display
 * @param {*} raw - Raw value
 * @param {string} format - Format type (currency, percent, number, text)
 * @returns {string} Formatted value
 */
export function formatCell(raw, format) {
    if (raw === null || raw === undefined || raw === '') return '';
    if (typeof raw === 'string') return escapeHtml(raw);
    if (format === 'currency') return formatCurrency(raw);
    if (format === 'percent') return (safeNum(raw, 0) * 100).toFixed(2) + '%';
    if (format === 'number') return safeNum(raw, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return escapeHtml(raw);
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
    
    const footerRow = tbl.footer ? `<tr style="font-weight:700;border-top:2px solid var(--border-color);">${tbl.columns.map(c => { const formatted = formatCell(tbl.footer[c.key], c.format); return `<td${c.emphasis ? ' style="font-weight:700;color:var(--text-primary);"' : ''}>${formatted}</td>`; }).join('')}</tr>` : '';
    
    return `
        <div class="result-table-container calc-data-table">
            <h4>${escapeHtml(tbl.title)}</h4>
            <div class="table-wrapper">
                <table>
                    <thead><tr>${headerCells}</tr></thead>
                    <tbody>${dataRows}${footerRow}</tbody>
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
 * Create Chart.js instance via ChartManager
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} chartData - Chart configuration
 * @returns {Object|null} Chart instance
 */
export function createChart(canvas, chartData) {
    if (!canvas) return null;
    const id = canvas.id || `chart-${Date.now()}`;
    if (!canvas.id) canvas.id = id;
    
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
    const instance = ChartManager.create({
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
    
    return instance ? instance.chart : null;
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