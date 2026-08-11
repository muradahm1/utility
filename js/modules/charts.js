/**
 * Charts Module
 * 
 * Chart.js wrapper with themes, responsive rendering, and lifecycle management.
 * 
 * @module modules/charts
 */

let chartManager = null;

export function getChartManager() {
    if (!chartManager) {
        chartManager = {
            charts: new Map(),
            register(id, chart) {
                this.charts.set(id, chart);
            },
            get(id) {
                return this.charts.get(id);
            },
            destroy(id) {
                const chart = this.charts.get(id);
                if (chart) {
                    chart.destroy();
                    this.charts.delete(id);
                }
            },
            destroyAll() {
                this.charts.forEach(chart => chart.destroy());
                this.charts.clear();
            }
        };
    }
    return chartManager;
}

export function createDoughnutChart(canvas, config) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return null;
    }
    
    const manager = getChartManager();
    const id = canvas.id || `chart-${Date.now()}`;
    
    if (!canvas.id) canvas.id = id;
    
    manager.destroy(id);
    
    const chartConfig = createDoughnutConfig(config);
    const chart = new Chart(canvas.getContext('2d'), chartConfig);
    manager.register(id, chart);
    
    return chart;
}

export function createLineChart(canvas, config) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return null;
    }
    
    const manager = getChartManager();
    const id = canvas.id || `chart-${Date.now()}`;
    
    if (!canvas.id) canvas.id = id;
    
    manager.destroy(id);
    
    const chartConfig = createLineConfig(config);
    const chart = new Chart(canvas.getContext('2d'), chartConfig);
    manager.register(id, chart);
    
    return chart;
}

export function createBarChart(canvas, config) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return null;
    }
    
    const manager = getChartManager();
    const id = canvas.id || `chart-${Date.now()}`;
    
    if (!canvas.id) canvas.id = id;
    
    manager.destroy(id);
    
    const chartConfig = {
        type: 'bar',
        data: {
            labels: config.labels || [],
            datasets: config.datasets || []
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
                        color: 'var(--text-secondary)'
                    }
                }
            },
            scales: {
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
            }
        }
    };
    
    const chart = new Chart(canvas.getContext('2d'), chartConfig);
    manager.register(id, chart);
    
    return chart;
}

export function destroyChart(canvas) {
    const manager = getChartManager();
    const id = canvas.id;
    if (id) manager.destroy(id);
}

export function destroyAllCharts() {
    const manager = getChartManager();
    manager.destroyAll();
}

export function createDoughnutConfig(data, options = {}) {
    const config = {
        type: 'doughnut',
        data: {
            labels: data.labels || ['Principal', 'Total Interest'],
            datasets: [{
                data: data.data || [data.principal, data.totalInterest],
                backgroundColor: data.colors || ['#6366F1', '#F59E0B'],
                borderWidth: 2,
                borderColor: 'var(--bg-card)'
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
                        color: 'var(--text-secondary)'
                    }
                }
            }
        }
    };

    if (options.plugins) {
        config.options.plugins = { ...config.options.plugins, ...options.plugins };
        delete options.plugins;
    }
    
    return { ...config, ...options };
}

export function createLineConfig(data, options = {}) {
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
                        color: 'var(--text-secondary)'
                    }
                }
            },
            scales: {
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
            }
        }
    };
}

export function buildChartContainer(canvasId) {
    return `<div class="chart-container"><canvas id="${canvasId}"></canvas></div>`;
}
