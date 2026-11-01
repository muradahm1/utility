/**
 * ChartManager — Centralized Chart System
 * 
 * Single reusable chart infrastructure for all GetCalcu calculators.
 * Handles chart creation, updates, destruction, theming, responsiveness,
 * accessibility, and lifecycle management.
 * 
 * @module modules/charts
 */

import { formatCurrency, formatNumber, formatPercentage, escapeHtml, safeNum } from '../utils/index.js';

// ── Chart Type Registry ─────────────────────────────────────────
const CHART_TYPES = new Set(['line', 'bar', 'doughnut', 'pie', 'area', 'comparison', 'stackedBar']);

// ── Instance Registry ───────────────────────────────────────────
const instances = new Map();
let resizeObservers = new Map();

// ── Theme Detection ─────────────────────────────────────────────
function getCssVar(name, fallback = '') {
    if (typeof getComputedStyle === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name);
    return value ? value.trim() : fallback;
}

function getThemeConfig() {
    return {
        text: getCssVar('--text-secondary', '#64748B'),
        textPrimary: getCssVar('--text-primary', '#0F172A'),
        border: getCssVar('--border-color', '#E2E8F0'),
        grid: getCssVar('--border-color', '#E2E8F0'),
        background: getCssVar('--bg-card', '#FFFFFF'),
        primary: getCssVar('--primary-color', '#6366F1'),
        success: getCssVar('--success-color', '#10B981'),
        warning: getCssVar('--warning-color', '#F59E0B'),
        danger: getCssVar('--danger-color', '#EF4444')
    };
}

// ── Default Palette ─────────────────────────────────────────────
const DEFAULT_PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'];

// ── Data Validation ─────────────────────────────────────────────
function validateConfig(config) {
    const errors = [];
    
    if (!config || typeof config !== 'object') {
        return { isValid: false, errors: ['Chart config must be an object'] };
    }
    
    if (!config.id || typeof config.id !== 'string') {
        errors.push('Chart id is required and must be a string');
    }
    
    if (!config.type || !CHART_TYPES.has(config.type)) {
        errors.push(`Chart type must be one of: ${[...CHART_TYPES].join(', ')}`);
    }
    
    if (!config.container) {
        errors.push('Chart container is required');
    }
    
    if (config.data) {
        if (!Array.isArray(config.data.labels)) {
            errors.push('Chart data.labels must be an array');
        }
        if (!Array.isArray(config.data.datasets)) {
            errors.push('Chart data.datasets must be an array');
        }
    }
    
    return { isValid: errors.length === 0, errors };
}

function validateDatasets(datasets) {
    if (!Array.isArray(datasets)) return false;
    return datasets.every(ds => 
        ds && 
        Array.isArray(ds.data) && 
        ds.data.every(v => v === null || v === undefined || typeof v === 'number')
    );
}

// ── Number Formatting Helpers ───────────────────────────────────
function formatValue(value, format) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value;
    
    switch (format) {
        case 'currency':
            return formatCurrency(value);
        case 'percent':
            return formatPercentage(value / 100, { decimals: 1 });
        case 'number':
            return formatNumber(value, { maximumFractionDigits: 0 });
        case 'compact':
            return formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 });
        default:
            return formatNumber(value, { maximumFractionDigits: 2 });
    }
}

// ── Chart Type Normalization ────────────────────────────────────
function normalizeType(type) {
    if (type === 'area') return 'line';
    if (type === 'comparison') return 'bar';
    if (type === 'stackedBar') return 'bar';
    return type;
}

// ── Chart Config Builder ────────────────────────────────────────
function buildChartConfig(config) {
    const theme = getThemeConfig();
    const type = normalizeType(config.type);
    const isDoughnut = type === 'doughnut' || type === 'pie';
    const isLine = type === 'line';
    const isBar = type === 'bar';
    const isStacked = config.type === 'stackedBar';
    const isComparison = config.type === 'comparison';
    
    // Build datasets
    const datasets = (config.data?.datasets || []).map((ds, i) => {
        const color = ds.color || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
        const base = {
            label: ds.label || '',
            data: ds.data || [],
            borderColor: color,
            backgroundColor: isDoughnut ? (ds.colors || config.data?.colors || DEFAULT_PALETTE) : (ds.backgroundColor || color),
            borderWidth: isLine ? 2.5 : (isBar ? 1 : 2),
            tension: isLine ? 0.25 : 0,
            pointRadius: isLine ? 3 : 0,
            pointHoverRadius: isLine ? 5 : 0,
            fill: config.type === 'area' ? (ds.fill !== undefined ? ds.fill : true) : (ds.fill || false),
            borderRadius: isBar ? 6 : 0,
            borderSkipped: false
        };
        
        if (isStacked) {
            base.stack = ds.stack || 'default';
        }
        
        if (isComparison) {
            base.borderWidth = 1;
            base.borderRadius = 8;
        }
        
        return base;
    });
    
    // Build options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: config.animation !== false ? 300 : 0
        },
        plugins: {
            legend: {
                display: config.legend !== false,
                position: config.legendPosition || 'bottom',
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    padding: 16,
                    color: theme.text,
                    font: { size: 12 }
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: theme.background,
                titleColor: theme.textPrimary,
                bodyColor: theme.text,
                borderColor: theme.border,
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                    label: (context) => {
                        const ds = config.data?.datasets?.[context.datasetIndex];
                        const format = ds?.format || config.format || 'number';
                        const value = formatValue(context.parsed.y ?? context.parsed, format);
                        return `${context.dataset.label || ''}: ${value}`.trim();
                    }
                }
            }
        },
        scales: isDoughnut ? undefined : {
            x: {
                ticks: { color: theme.text, font: { size: 11 } },
                grid: { display: false },
                stacked: isStacked
            },
            y: {
                ticks: {
                    color: theme.text,
                    font: { size: 11 },
                    callback: (value) => {
                        const format = config.format || 'number';
                        return formatValue(value, format);
                    }
                },
                grid: { color: theme.grid },
                stacked: isStacked
            }
        }
    };
    
    // Doughnut-specific options
    if (isDoughnut) {
        options.cutout = config.type === 'pie' ? 0 : (config.cutout || '62%');
    }
    
    // Merge user options
    if (config.options) {
        deepMerge(options, config.options);
    }
    
    return {
        type,
        data: {
            labels: config.data?.labels || [],
            datasets
        },
        options
    };
}

function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return;
    Object.entries(source).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object') {
            deepMerge(target[key], value);
        } else {
            target[key] = value;
        }
    });
}

// ── Accessibility Helper ────────────────────────────────────────
function setupAccessibility(container, config) {
    if (!container) return;
    
    // Set ARIA attributes
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', config.ariaLabel || config.title || 'Chart');
    
    // If container is unified, remove any previous title element to avoid collision/duplication
    if (container.classList && container.classList.contains('chart-container--unified')) {
        const existingTitle = container.querySelector('.chart-title');
        if (existingTitle) existingTitle.remove();
    } else if (config.title) {
        // Add or update title if provided
        let title = container.querySelector('.chart-title');
        if (!title) {
            title = document.createElement('div');
            title.className = 'chart-title';
            title.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px;';
            container.prepend(title);
        }
        title.textContent = config.title;
    }
    
    // Add text summary if provided
    if (config.summary && !container.querySelector('.chart-summary')) {
        const summary = document.createElement('div');
        summary.className = 'chart-summary';
        summary.textContent = config.summary;
        summary.style.cssText = 'font-size:12px;color:var(--text-secondary);margin-top:8px;line-height:1.5;';
        container.appendChild(summary);
    }
}

// ── ResizeObserver Setup ────────────────────────────────────────
function setupResizeObserver(id, canvas) {
    if (typeof ResizeObserver === 'undefined') return;
    
    // Clean up existing observer
    if (resizeObservers.has(id)) {
        resizeObservers.get(id).disconnect();
        resizeObservers.delete(id);
    }
    
    const observer = new ResizeObserver(() => {
        const instance = instances.get(id);
        if (instance && instance.chart) {
            instance.chart.resize();
        }
    });
    
    observer.observe(canvas.parentElement);
    resizeObservers.set(id, observer);
}

// ── Phase 5.11: Dynamic Chart.js Loader ────────────────────────
let chartJsPromise = null;
function loadChartJs() {
    if (chartJsPromise) return chartJsPromise;
    chartJsPromise = new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(script);
    });
    return chartJsPromise;
}

// ── ChartManager API ────────────────────────────────────────────

export const ChartManager = {
    /**
     * Create a new chart
     * @param {Object} config - Chart configuration
     * @param {string} config.id - Unique chart ID
     * @param {string} config.type - Chart type (line, bar, doughnut, pie, area, comparison, stackedBar)
     * @param {string|HTMLElement} config.container - Container selector or element
     * @param {Object} config.data - Chart data { labels, datasets }
     * @param {Object} [config.options] - Chart.js options overrides
     * @param {string} [config.format] - Default value format (currency, percent, number, compact)
     * @param {string} [config.title] - Chart title
     * @param {string} [config.summary] - Text summary for accessibility
     * @param {string} [config.ariaLabel] - ARIA label
     * @param {boolean} [config.legend=true] - Show legend
     * @param {string} [config.legendPosition='bottom'] - Legend position
     * @param {number} [config.cutout='62%'] - Doughnut cutout percentage
     * @param {boolean} [config.animation=true] - Enable animations
     * @returns {Object|null} Chart instance or null on failure
     */
    create(config) {
        // Validate config
        const validation = validateConfig(config);
        if (!validation.isValid) {
            console.error('[ChartManager] Invalid chart config:', validation.errors);
            return null;
        }
        
        // Resolve container
        const container = typeof config.container === 'string'
            ? document.querySelector(config.container)
            : config.container;
        
        if (!container) {
            console.error(`[ChartManager] Container not found: ${config.container}`);
            return null;
        }
        
        // Destroy existing chart with same ID
        if (instances.has(config.id)) {
            this.destroy(config.id);
        }
        
        // Check for existing canvas
        let canvas = container.querySelector('canvas') || (config.id ? document.getElementById(config.id) : null);
        if (!canvas) {
            canvas = document.createElement('canvas');
            if (config.id) canvas.id = config.id;
            container.appendChild(canvas);
        } else if (!canvas.id && config.id) {
            canvas.id = config.id;
        }
        
        // Validate datasets
        if (!validateDatasets(config.data?.datasets)) {
            console.error('[ChartManager] Invalid datasets:', config.data?.datasets);
            return null;
        }
        
        // Setup accessibility
        setupAccessibility(container, config);
        
        // Build chart config
        const chartConfig = buildChartConfig(config);
        
        // ── Phase 5.11: Lazy-load Chart.js only when needed ─────
        const createChart = () => {
            try {
                if (typeof Chart !== 'undefined' && Chart.getChart) {
                    const existingChart = Chart.getChart(canvas);
                    if (existingChart) {
                        existingChart.destroy();
                    }
                }
                return new Chart(canvas.getContext('2d'), chartConfig);
            } catch (err) {
                console.error('[ChartManager] Failed to create chart:', err);
                return null;
            }
        };
        
        const finalizeChart = () => {
            const chart = createChart();
            if (!chart) return null;
            
            // Store instance
            const instance = {
                id: config.id,
                chart,
                canvas,
                container,
                type: config.type,
                config: chartConfig
            };
            
            instances.set(config.id, instance);
            
            // Setup resize observer
            setupResizeObserver(config.id, canvas);
            
            return instance;
        };
        
        try {
            if (typeof Chart !== 'undefined') {
                return finalizeChart();
            }
            
            // Chart.js not yet loaded — lazy-load it
            if (!ChartManager._loadingChartJs) {
                ChartManager._loadingChartJs = loadChartJs();
            }
            ChartManager._loadingChartJs.then(() => {
                finalizeChart();
            }).catch(err => {
                console.error('[ChartManager] Failed to load Chart.js:', err);
            });
            return null;
        } catch (error) {
            console.error(`[ChartManager] Failed to create chart "${config.id}":`, error);
            return null;
        }
    },
    
    /**
     * Update an existing chart's data
     * @param {string} id - Chart ID
     * @param {Object} data - New chart data { labels, datasets }
     * @param {Object} [options] - New options to merge
     * @returns {boolean} Success
     */
    update(id, data, options = {}) {
        const instance = instances.get(id);
        if (!instance || !instance.chart) {
            console.warn(`[ChartManager] Chart "${id}" not found for update`);
            return false;
        }
        
        try {
            if (data) {
                if (data.labels) instance.chart.data.labels = data.labels;
                if (data.datasets) {
                    instance.chart.data.datasets = data.datasets.map((ds, i) => {
                        const existing = instance.chart.data.datasets[i] || {};
                        return { ...existing, ...ds };
                    });
                }
            }
            
            if (options && Object.keys(options).length > 0) {
                deepMerge(instance.chart.options, options);
            }
            
            instance.chart.update();
            return true;
        } catch (error) {
            console.error(`[ChartManager] Failed to update chart "${id}":`, error);
            return false;
        }
    },
    
    /**
     * Destroy a chart instance
     * @param {string} id - Chart ID
     * @returns {boolean} Success
     */
    destroy(id, removeCanvas = false) {
        const instance = instances.get(id);
        if (!instance) return false;
        
        try {
            // Destroy chart
            if (instance.chart) {
                instance.chart.destroy();
            }
            
            // Remove canvas only if explicitly requested
            if (removeCanvas && instance.canvas && instance.canvas.parentElement) {
                instance.canvas.remove();
            }
            
            // Clean up resize observer
            if (resizeObservers.has(id)) {
                resizeObservers.get(id).disconnect();
                resizeObservers.delete(id);
            }
            
            // Remove from registry
            instances.delete(id);
            
            return true;
        } catch (error) {
            console.error(`[ChartManager] Failed to destroy chart "${id}":`, error);
            return false;
        }
    },
    
    /**
     * Destroy all chart instances
     */
    destroyAll() {
        [...instances.keys()].forEach(id => this.destroy(id));
    },
    
    /**
     * Resize a chart
     * @param {string} id - Chart ID
     * @returns {boolean} Success
     */
    resize(id) {
        const instance = instances.get(id);
        if (!instance || !instance.chart) return false;
        instance.chart.resize();
        return true;
    },
    
    /**
     * Get a chart instance
     * @param {string} id - Chart ID
     * @returns {Object|null} Chart instance
     */
    get(id) {
        return instances.get(id) || null;
    },
    
    /**
     * Check if a chart exists
     * @param {string} id - Chart ID
     * @returns {boolean} True if chart exists
     */
    exists(id) {
        return instances.has(id);
    },
    
    /**
     * Get all active chart IDs
     * @returns {Array<string>} Array of chart IDs
     */
    getActiveIds() {
        return [...instances.keys()];
    },
    
    /**
     * Get the number of active charts
     * @returns {number} Chart count
     */
    getCount() {
        return instances.size;
    },
    
    /**
     * Get theme configuration
     * @returns {Object} Current theme colors
     */
    getThemeConfig() {
        return getThemeConfig();
    },
    
    /**
     * Get the default color palette
     * @returns {Array<string>} Color palette
     */
    getPalette() {
        return [...DEFAULT_PALETTE];
    },
    
    /**
     * Format a value for chart display
     * @param {number} value - Value to format
     * @param {string} format - Format type (currency, percent, number, compact)
     * @returns {string} Formatted value
     */
    formatValue(value, format = 'number') {
        return formatValue(value, format);
    },

    /**
     * Build unified visual HTML for any calculator result
     * Supports both modern multi-view charts and legacy charts
     * @param {Object} result - Calculation result
     * @returns {string} HTML string
     */
    buildCardHtml(result) {
        if (!result) return '';
        
        // Modern multi-view chart switcher
        if (Array.isArray(result.charts) && result.charts.length > 0) {
            const tabsHtml = result.charts.map((c, idx) => `
                <button type="button" class="chart-view-tab ${idx === 0 ? 'active' : ''}" data-chart-index="${idx}" aria-label="${escapeHtml(c.title || `View ${idx+1}`)}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}">
                    ${c.icon ? `<i class="fa-solid ${escapeHtml(c.icon)}"></i> ` : ''}<span>${escapeHtml(c.title || `View ${idx+1}`)}</span>
                </button>
            `).join('');

            return `
                <div class="chart-view-card">
                    <div class="chart-view-header">
                        <span class="chart-view-title"><i class="fa-solid fa-chart-line" style="color:var(--primary-color);margin-right:6px;"></i>Visual Projection</span>
                        <div class="chart-view-tabs" role="tablist">
                            ${tabsHtml}
                        </div>
                    </div>
                    <div class="chart-container chart-container--unified">
                        <canvas id="result-chart"></canvas>
                    </div>
                </div>
            `;
        }

        // Legacy multi-chart fallback
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
    },

    /**
     * Mount and manage chart visualization inside any container
     * Automatically handles single unified canvas switching or legacy multi-canvas
     * @param {HTMLElement} container - DOM container element
     * @param {Object} result - Calculation result
     * @param {Object} [options] - Options (onTabChange, etc.)
     * @returns {Array<Object>} Created chart instances
     */
    mount(container, result, options = {}) {
        if (!container || !result) return [];
        const createdCharts = [];
        
        // Multi-view unified switcher
        if (Array.isArray(result.charts) && result.charts.length > 0) {
            const activeIdx = (typeof container._activeChartIdx === 'number' && container._activeChartIdx < result.charts.length) 
                ? container._activeChartIdx 
                : 0;
            const activeData = result.charts[activeIdx] || result.charts[0];
            
            let canvas = container.querySelector('#result-chart');
            if (!canvas) {
                const unifiedWrap = container.querySelector('.chart-container--unified') || container.querySelector('.chart-container');
                if (unifiedWrap) {
                    canvas = unifiedWrap.querySelector('canvas');
                    if (canvas) canvas.id = 'result-chart';
                }
            }
            if (canvas) {
                const chart = this.render(canvas, activeData);
                if (chart) createdCharts.push(chart);
            }
            
            // Bind tab switching cleanly
            const tabs = container.querySelectorAll('.chart-view-tab');
            tabs.forEach(tab => {
                tab.onclick = (e) => {
                    e.preventDefault();
                    const idx = parseInt(tab.getAttribute('data-chart-index'), 10);
                    if (isNaN(idx) || idx === container._activeChartIdx) return;
                    container._activeChartIdx = idx;
                    tabs.forEach(t => {
                        const isSel = parseInt(t.getAttribute('data-chart-index'), 10) === idx;
                        t.classList.toggle('active', isSel);
                        t.setAttribute('aria-selected', isSel ? 'true' : 'false');
                    });
                    
                    if (canvas && result.charts[idx]) {
                        const newChart = this.render(canvas, result.charts[idx]);
                        if (newChart && createdCharts.length > 0) {
                            createdCharts[0] = newChart;
                        } else if (newChart) {
                            createdCharts.push(newChart);
                        }
                    }
                    if (typeof options.onTabChange === 'function') {
                        options.onTabChange(idx, result.charts[idx]);
                    }
                };
            });
            return createdCharts;
        }
        
        // Legacy multi-chart mounting
        const legacyCharts = [
            { data: result.chart, id: 'result-chart' },
            { data: result.chart2, id: 'result-chart-2' },
            { data: result.compareChart, id: 'result-chart-3' },
            { data: result.chart3, id: 'result-chart-4' }
        ];
        
        legacyCharts.forEach(({ data, id }) => {
            if (!data) return;
            const canvas = container.querySelector(`#${id}`);
            if (canvas) {
                const chart = this.render(canvas, data);
                if (chart) createdCharts.push(chart);
            }
        });
        return createdCharts;
    },

    /**
     * Render raw chart data onto a canvas element
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} chartData - Chart data spec
     * @returns {Object|null} Chart instance
     */
    render(canvas, chartData) {
        if (!canvas || !chartData) return null;
        const id = canvas.id || `chart-${Date.now()}`;
        if (!canvas.id) canvas.id = id;
        
        let datasets;
        if (Array.isArray(chartData.datasets) && chartData.datasets.length > 0) {
            datasets = chartData.datasets.map(ds => ({
                label: ds.label || '',
                data: ds.data || [],
                color: ds.color || ds.borderColor,
                colors: ds.colors || (Array.isArray(ds.backgroundColor) ? ds.backgroundColor : undefined),
                backgroundColor: ds.backgroundColor,
                borderColor: ds.borderColor,
                fill: ds.fill,
                format: ds.format,
                stack: ds.stack
            }));
        } else if (Array.isArray(chartData.data)) {
            datasets = [{
                data: chartData.data,
                colors: chartData.colors || chartData.backgroundColor || DEFAULT_PALETTE,
                backgroundColor: chartData.colors || chartData.backgroundColor || DEFAULT_PALETTE
            }];
        } else if (chartData.principal !== undefined || chartData.totalInterest !== undefined) {
            datasets = [{
                data: [safeNum(chartData.principal, 0), safeNum(chartData.totalInterest, 0)],
                colors: ['#6366F1', '#F59E0B'],
                backgroundColor: ['#6366F1', '#F59E0B']
            }];
        } else {
            return null;
        }

        let type = chartData.type;
        if (!type) {
            if (datasets.length > 1 || (datasets[0] && datasets[0].label)) {
                type = 'bar';
            } else {
                type = 'doughnut';
            }
        }
        
        const isHBar = type === 'horizontalBar';
        const normalizedType = isHBar ? 'bar' : type;
        
        const instance = this.create({
            id,
            type: normalizedType,
            container: canvas.parentElement || canvas,
            data: {
                labels: chartData.labels || ['Principal', 'Interest'],
                datasets
            },
            title: chartData.title,
            format: chartData.format || 'currency',
            cutout: chartData.cutout,
            options: isHBar ? { indexAxis: 'y' } : undefined
        });
        return instance ? instance.chart : null;
    }
};

// ── Backward Compatibility ──────────────────────────────────────
// Preserve existing exports for backward compatibility

/**
 * Create a doughnut chart (backward compatible)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} config - Chart config
 * @returns {Chart|null} Chart instance
 */
export function createDoughnutChart(canvas, config) {
    if (!canvas) return null;
    const id = canvas.id || `doughnut-${Date.now()}`;
    if (!canvas.id) canvas.id = id;
    
    return ChartManager.create({
        id,
        type: 'doughnut',
        container: canvas.parentElement || canvas,
        data: {
            labels: config.labels || [],
            datasets: [{
                data: config.data || [],
                colors: config.colors,
                backgroundColor: config.colors
            }]
        },
        cutout: config.cutout,
        options: config.options || {}
    });
}

/**
 * Create a line chart (backward compatible)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} config - Chart config
 * @returns {Chart|null} Chart instance
 */
export function createLineChart(canvas, config) {
    if (!canvas) return null;
    const id = canvas.id || `line-${Date.now()}`;
    if (!canvas.id) canvas.id = id;
    
    return ChartManager.create({
        id,
        type: 'line',
        container: canvas.parentElement || canvas,
        data: {
            labels: config.labels || [],
            datasets: config.datasets || []
        },
        options: config.options || {}
    });
}

/**
 * Create a bar chart (backward compatible)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} config - Chart config
 * @returns {Chart|null} Chart instance
 */
export function createBarChart(canvas, config) {
    if (!canvas) return null;
    const id = canvas.id || `bar-${Date.now()}`;
    if (!canvas.id) canvas.id = id;
    
    return ChartManager.create({
        id,
        type: 'bar',
        container: canvas.parentElement || canvas,
        data: {
            labels: config.labels || [],
            datasets: config.datasets || []
        },
        options: config.options || {}
    });
}

/**
 * Destroy a chart by canvas (backward compatible)
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
export function destroyChart(canvas) {
    if (!canvas || !canvas.id) return;
    ChartManager.destroy(canvas.id);
}

/**
 * Destroy all charts (backward compatible)
 */
export function destroyAllCharts() {
    ChartManager.destroyAll();
}

/**
 * Get the chart manager (backward compatible)
 * @returns {Object} Chart manager
 */
export function getChartManager() {
    return ChartManager;
}

/**
 * Create doughnut chart config (backward compatible)
 * @param {Object} data - Chart data
 * @param {Object} options - Chart options
 * @returns {Object} Chart config
 */
export function createDoughnutConfig(data, options = {}) {
    const theme = getThemeConfig();
    return {
        type: 'doughnut',
        data: {
            labels: data.labels || ['Principal', 'Total Interest'],
            datasets: [{
                data: data.data || [data.principal, data.totalInterest],
                backgroundColor: data.colors || ['#6366F1', '#F59E0B'],
                borderWidth: 2,
                borderColor: theme.background
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: data.cutout || '62%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 14,
                        color: theme.text
                    }
                }
            },
            ...options
        }
    };
}

/**
 * Create line chart config (backward compatible)
 * @param {Object} data - Chart data
 * @param {Object} options - Chart options
 * @returns {Object} Chart config
 */
export function createLineConfig(data, options = {}) {
    const theme = getThemeConfig();
    const datasets = (data.datasets || []).map(ds => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color || '#6366F1',
        backgroundColor: ds.color || '#6366F1',
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: ds.fill || false,
        borderWidth: 2.5
    }));
    
    return {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 16,
                        color: theme.text
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: theme.text, font: { size: 11 } },
                    grid: { display: false }
                },
                y: {
                    ticks: {
                        color: theme.text,
                        font: { size: 11 },
                        callback: v => '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
                    },
                    grid: { color: theme.grid }
                }
            },
            ...options
        }
    };
}

/**
 * Build chart container HTML (backward compatible)
 * @param {string} canvasId - Canvas ID
 * @returns {string} HTML string
 */
export function buildChartContainer(canvasId) {
    return `<div class="chart-container"><canvas id="${canvasId}"></canvas></div>`;
}

// ── Auto-cleanup on page unload ─────────────────────────────────
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        ChartManager.destroyAll();
    });
}