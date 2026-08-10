/**
 * Charts Module
 * 
 * Chart.js wrapper with themes, responsive rendering, and lifecycle management.
 * Provides a unified API for all chart types used across calculators.
 * 
 * @module modules/charts
 */

import { formatCurrency, formatPercentage, formatNumber } from '../utils/index.js';

// ── Chart Configuration ────────────────────────────────────────

/**
 * Default chart themes for light/dark modes
 */
export const CHART_THEMES = {
    light: {
        textColor: '#1F2937',
        gridColor: '#E5E7EB',
        tooltipBg: 'rgba(255, 255, 255, 0.95)',
        tooltipBorder: '#E5E7EB',
        tooltipText: '#1F2937'
    },
    dark: {
        textColor: '#F9FAFB',
        gridColor: '#374151',
        tooltipBg: 'rgba(31, 41, 55, 0.95)',
        tooltipBorder: '#4B5563',
        tooltipText: '#F9FAFB'
    }
};

/**
 * Default color palette
 */
export const CHART_COLORS = {
    primary: '#6366F1',
    secondary: '#10B981',
    tertiary: '#F59E0B',
    quaternary: '#EF4444',
    quinary: '#8B5CF6',
    senary: '#EC4899',
    palette: [
        '#6366F1', '#10B981', '#F59E0B', '#EF4444', 
        '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6'
    ]
};

// ── Chart Manager ──────────────────────────────────────────────

/**
 * Chart manager for creating and managing Chart.js instances
 */
export class ChartManager {
    constructor() {
        this.instances = new Map();
        this.currentTheme = 'light';
    }

    /**
     * Set chart theme
     * @param {string} theme - 'light' or 'dark'
     */
    setTheme(theme) {
        this.currentTheme = theme;
    }

    /**
     * Create a doughnut chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} config - Chart configuration
     * @returns {Chart} Chart instance
     */
    createDoughnut(canvas, config = {}) {
        const theme = CHART_THEMES[this.currentTheme];
        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: config.labels || [],
                datasets: [{
                    data: config.data || [],
                    backgroundColor: config.colors || CHART_COLORS.palette,
                    borderWidth: 2,
                    borderColor: this.currentTheme === 'dark' ? '#1F2937' : '#FFFFFF',
                    hoverBorderWidth: 3,
                    hoverBorderColor: this.currentTheme === 'dark' ? '#374151' : '#F3F4F6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: config.cutout || '62%',
                plugins: {
                    legend: {
                        position: config.legendPosition || 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 14,
                            color: theme.textColor,
                            font: {
                                size: 12,
                                family: "'Inter', 'Segoe UI', sans-serif"
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        boxPadding: 4,
                        callbacks: config.tooltipCallbacks || {}
                    }
                }
            }
        });

        this.instances.set(canvas.id || canvas, chart);
        return chart;
    }

    /**
     * Create a line chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} config - Chart configuration
     * @returns {Chart} Chart instance
     */
    createLine(canvas, config = {}) {
        const theme = CHART_THEMES[this.currentTheme];
        const ctx = canvas.getContext('2d');

        const datasets = (config.datasets || []).map((ds, index) => ({
            label: ds.label,
            data: ds.data,
            borderColor: ds.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length],
            backgroundColor: ds.backgroundColor || (ds.fill ? CHART_COLORS.palette[index % CHART_COLORS.palette.length] + '20' : 'transparent'),
            tension: 0.25,
            pointRadius: config.pointRadius !== false ? (config.labels && config.labels.length > 30 ? 0 : 3) : 0,
            pointHoverRadius: 5,
            fill: ds.fill || false,
            borderWidth: 2.5,
            pointBackgroundColor: ds.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length],
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        }));

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: config.labels || [],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 16,
                            color: theme.textColor,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: theme.textColor, 
                            font: { size: 11 },
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: { 
                            display: false 
                        }
                    },
                    y: {
                        ticks: {
                            color: theme.textColor,
                            font: { size: 11 },
                            callback: config.yAxisCallback || (v => formatCurrency(v))
                        },
                        grid: { 
                            color: theme.gridColor 
                        }
                    }
                }
            }
        });

        this.instances.set(canvas.id || canvas, chart);
        return chart;
    }

    /**
     * Create a bar chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} config - Chart configuration
     * @returns {Chart} Chart instance
     */
    createBar(canvas, config = {}) {
        const theme = CHART_THEMES[this.currentTheme];
        const ctx = canvas.getContext('2d');

        const datasets = (config.datasets || []).map((ds, index) => ({
            label: ds.label,
            data: ds.data,
            backgroundColor: ds.colors || ds.data.map((_, i) => CHART_COLORS.palette[i % CHART_COLORS.palette.length]),
            borderColor: ds.colors || ds.data.map((_, i) => CHART_COLORS.palette[i % CHART_COLORS.palette.length]),
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
        }));

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: config.labels || [],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: config.horizontal ? 'y' : 'x',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 16,
                            color: theme.textColor,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        borderColor: theme.tooltipBorder,
                        borderWidth: 1,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: theme.textColor, 
                            font: { size: 11 } 
                        },
                        grid: { 
                            display: false 
                        }
                    },
                    y: {
                        ticks: {
                            color: theme.textColor,
                            font: { size: 11 },
                            callback: config.yAxisCallback || (v => formatCurrency(v))
                        },
                        grid: { 
                            color: theme.gridColor 
                        }
                    }
                }
            }
        });

        this.instances.set(canvas.id || canvas, chart);
        return chart;
    }

    /**
     * Create a horizontal bar chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} config - Chart configuration
     * @returns {Chart} Chart instance
     */
    createHorizontalBar(canvas, config = {}) {
        return this.createBar(canvas, { ...config, horizontal: true });
    }

    /**
     * Destroy a chart instance
     * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
     */
    destroy(canvas) {
        const key = canvas.id || canvas;
        const chart = this.instances.get(key);
        
        if (chart) {
            chart.destroy();
            this.instances.delete(key);
        }
    }

    /**
     * Destroy all chart instances
     */
    destroyAll() {
        this.instances.forEach(chart => chart.destroy());
        this.instances.clear();
    }

    /**
     * Update chart data
     * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
     * @param {Object} newData - New chart data
     */
    update(canvas, newData) {
        const key = canvas.id || canvas;
        const chart = this.instances.get(key);
        
        if (chart) {
            if (newData.labels) chart.data.labels = newData.labels;
            if (newData.datasets) chart.data.datasets = newData.datasets;
            if (newData.data) chart.data.datasets[0].data = newData.data;
            chart.update('active');
        }
    }

    /**
     * Get chart instance
     * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
     * @returns {Chart|undefined} Chart instance
     */
    get(canvas) {
        const key = canvas.id || canvas;
        return this.instances.get(key);
    }
}

// ── Chart Builders ─────────────────────────────────────────────

/**
 * Build chart container HTML
 * @param {string} canvasId - Canvas element ID
 * @param {Object} options - Container options
 * @returns {string} HTML string
 */
export function buildChartContainer(canvasId, options = {}) {
    const { className = 'chart-container', height = '400px' } = options;
    
    return `
        <div class="${className}" style="height: ${height}; position: relative;">
            <canvas id="${canvasId}"></canvas>
        </div>
    `;
}

/**
 * Build side-by-side chart containers
 * @param {Array<string>} canvasIds - Array of canvas IDs
 * @returns {string} HTML string
 */
export function buildSideBySideCharts(canvasIds) {
    const charts = canvasIds.map(id => buildChartContainer(id)).join('');
    return `<div class="charts-side-by-side">${charts}</div>`;
}

/**
 * Create chart configuration for doughnut chart
 * @param {Object} data - Chart data
 * @param {Object} options - Configuration options
 * @returns {Object} Chart configuration
 */
export function createDoughnutConfig(data, options = {}) {
    return {
        type: 'doughnut',
        labels: data.labels || [],
        data: data.values || [],
        colors: data.colors || CHART_COLORS.palette,
        cutout: options.cutout || '62%',
        legendPosition: options.legendPosition || 'bottom',
        tooltipCallbacks: {
            label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                const value = context.parsed;
                
                if (options.currency) {
                    return context.label + ': ' + formatCurrency(value) + ' (' + pct + '%)';
                }
                
                return context.label + ': ' + value.toFixed(2) + ' (' + pct + '%)';
            }
        }
    };
}

/**
 * Create chart configuration for line chart
 * @param {Object} data - Chart data
 * @param {Object} options - Configuration options
 * @returns {Object} Chart configuration
 */
export function createLineConfig(data, options = {}) {
    return {
        type: 'line',
        labels: data.labels || [],
        datasets: (data.series || []).map((series, index) => ({
            label: series.label,
            data: series.data,
            color: series.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length],
            fill: series.fill || false,
            tension: 0.25
        })),
        yLabel: options.yLabel || 'Value',
        yAxisCallback: options.yAxisCallback
    };
}

// ── Singleton Instance ─────────────────────────────────────────

/**
 * Global chart manager instance
 */
let chartManagerInstance = null;

/**
 * Get or create chart manager instance
 * @returns {ChartManager} Chart manager instance
 */
export function getChartManager() {
    if (!chartManagerInstance) {
        chartManagerInstance = new ChartManager();
    }
    return chartManagerInstance;
}

// ── Convenience Functions ──────────────────────────────────────

/**
 * Quick create doughnut chart
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} config - Chart configuration
 * @returns {Chart} Chart instance
 */
export function createDoughnutChart(canvas, config) {
    return getChartManager().createDoughnut(canvas, config);
}

/**
 * Quick create line chart
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} config - Chart configuration
 * @returns {Chart} Chart instance
 */
export function createLineChart(canvas, config) {
    return getChartManager().createLine(canvas, config);
}

/**
 * Quick create bar chart
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} config - Chart configuration
 * @returns {Chart} Chart instance
 */
export function createBarChart(canvas, config) {
    return getChartManager().createBar(canvas, config);
}

/**
 * Destroy chart
 * @param {HTMLCanvasElement|string} canvas - Canvas element or ID
 */
export function destroyChart(canvas) {
    getChartManager().destroy(canvas);
}

/**
 * Destroy all charts
 */
export function destroyAllCharts() {
    getChartManager().destroyAll();
}

// Log module initialization
console.log('Charts module loaded');