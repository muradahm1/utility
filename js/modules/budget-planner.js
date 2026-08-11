/**
 * Budget Planner Module
 * 
 * Complete interactive budget planner with income sources, expense categories,
 * 50/30/20 rule analysis, charts, and localStorage persistence.
 * 
 * @module modules/budget-planner
 */

import { escapeHtml } from '../utils/index.js';
import { formatMoney } from './formatting.js';
import { safeNum } from '../utils/index.js';
import { createDoughnutChart, destroyChart } from './charts.js';
import { validateNumber, showFieldError, clearFieldError } from './validation.js';

// ── Constants ───────────────────────────────────────────────────

const STORAGE_KEY = 'getcalcu_budget_data_v1';

const DEFAULT_INCOME = [
    { id: 'inc_1', label: 'Salary', amount: 5000 }
];

const DEFAULT_CATEGORIES = [
    { id: 'needs',   label: 'Needs',   color: '#6366F1', items: [
        { id: 'needs_1', label: 'Housing',    amount: 1500 },
        { id: 'needs_2', label: 'Groceries',  amount: 500 },
        { id: 'needs_3', label: 'Utilities',  amount: 250 },
        { id: 'needs_4', label: 'Transport',  amount: 300 }
    ]},
    { id: 'wants',   label: 'Wants',   color: '#F59E0B', items: [
        { id: 'wants_1', label: 'Dining Out',  amount: 300 },
        { id: 'wants_2', label: 'Entertainment', amount: 200 }
    ]},
    { id: 'savings', label: 'Savings', color: '#10B981', items: [
        { id: 'savings_1', label: 'Emergency Fund', amount: 500 },
        { id: 'savings_2', label: 'Investments',    amount: 300 }
    ]}
];

// ── Helpers ─────────────────────────────────────────────────────

function uid(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
}

// ── State Management ────────────────────────────────────────────

function loadBudgetData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.income) && Array.isArray(parsed.categories)) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to load budget data:', e);
    }
    
    return {
        income: JSON.parse(JSON.stringify(DEFAULT_INCOME)),
        categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
    };
}

function saveBudgetData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save budget data:', e);
    }
}

function resetBudgetData() {
    const data = {
        income: JSON.parse(JSON.stringify(DEFAULT_INCOME)),
        categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
    };
    saveBudgetData(data);
    return data;
}

// ── Budget Calculations ─────────────────────────────────────────

function calculateBudget(data) {
    const totalIncome = data.income.reduce((sum, i) => sum + safeNum(i.amount, 0), 0);
    
    const categories = data.categories.map(cat => {
        const total = cat.items.reduce((sum, item) => sum + safeNum(item.amount, 0), 0);
        return {
            ...cat,
            total,
            percent: totalIncome > 0 ? (total / totalIncome) * 100 : 0
        };
    });
    
    const totalExpenses = categories.reduce((sum, cat) => sum + cat.total, 0);
    const remaining = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;
    
    const needsCat = categories.find(c => c.id === 'needs');
    const wantsCat = categories.find(c => c.id === 'wants');
    const savingsCat = categories.find(c => c.id === 'savings');
    
    const needsPct = needsCat ? (needsCat.total / (totalIncome || 1)) * 100 : 0;
    const wantsPct = wantsCat ? (wantsCat.total / (totalIncome || 1)) * 100 : 0;
    const savingsPct = savingsCat ? (savingsCat.total / (totalIncome || 1)) * 100 : 0;
    
    const needsOnTrack = needsPct <= 50;
    const wantsOnTrack = wantsPct <= 30;
    const savingsOnTrack = savingsPct >= 20;
    
    return {
        totalIncome,
        totalExpenses,
        remaining,
        savingsRate,
        categories,
        rule: {
            needs: { amount: needsCat ? needsCat.total : 0, pct: needsPct, target: 50, onTrack: needsOnTrack },
            wants: { amount: wantsCat ? wantsCat.total : 0, pct: wantsPct, target: 30, onTrack: wantsOnTrack },
            savings: { amount: savingsCat ? savingsCat.total : 0, pct: savingsPct, target: 20, onTrack: savingsOnTrack }
        }
    };
}

// ── HTML Builders ───────────────────────────────────────────────

function buildIncomeSection(data) {
    const rows = data.income.map((item) => `
        <div class="budget-row budget-income-row" data-id="${item.id}">
            <input type="text" id="label-${item.id}" class="budget-label-input" value="${escapeHtml(item.label)}" placeholder="Income source" aria-label="Income source name">
            <input type="number" id="amount-${item.id}" class="budget-amount-input" value="${item.amount}" min="0" step="0.01" aria-label="Income amount">
            <span class="field-error hidden" data-error="amount-${item.id}"></span>
            <button class="budget-remove-btn" data-remove="income:${item.id}" aria-label="Remove income source"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join('');
    
    return `
        <div class="budget-section-card">
            <div class="budget-section-header">
                <h3><i class="fa-solid fa-arrow-trend-up" style="color:#10B981;"></i> Income Sources</h3>
                <button class="btn btn-outline btn-sm budget-add-btn" data-add="income"><i class="fa-solid fa-plus"></i> Add Income</button>
            </div>
            <div class="budget-rows-container" data-container="income">
                ${rows}
            </div>
            <div class="budget-section-total">
                <span>Total Income</span>
                <span class="budget-total-value" data-total="income">${formatMoney(data.income.reduce((s, i) => s + safeNum(i.amount, 0), 0))}</span>
            </div>
        </div>
    `;
}

function buildExpenseSection(data) {
    const sections = data.categories.map(cat => {
        const rows = cat.items.map(item => `
            <div class="budget-row budget-expense-row" data-id="${item.id}">
                <span class="budget-category-dot" style="background:${cat.color};"></span>
                <input type="text" id="label-${item.id}" class="budget-label-input" value="${escapeHtml(item.label)}" placeholder="Expense name" aria-label="Expense name">
                <input type="number" id="amount-${item.id}" class="budget-amount-input" value="${item.amount}" min="0" step="0.01" aria-label="Expense amount">
                <span class="field-error hidden" data-error="amount-${item.id}"></span>
                <button class="budget-remove-btn" data-remove="expense:${item.id}" aria-label="Remove expense"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `).join('');
        
        return `
            <div class="budget-category-card" data-category="${cat.id}" style="border-left:4px solid ${cat.color};">
                <div class="budget-category-header">
                    <h4><span class="budget-category-dot" style="background:${cat.color};"></span> ${escapeHtml(cat.label)}</h4>
                    <button class="btn btn-outline btn-sm budget-add-btn" data-add="expense:${cat.id}"><i class="fa-solid fa-plus"></i> Add</button>
                </div>
                <div class="budget-rows-container" data-container="expense:${cat.id}">
                    ${rows}
                </div>
                <div class="budget-section-total">
                    <span>${escapeHtml(cat.label)} Total</span>
                    <span class="budget-total-value" data-total="category:${cat.id}">${formatMoney(cat.items.reduce((s, i) => s + safeNum(i.amount, 0), 0))}</span>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="budget-section-card">
            <div class="budget-section-header">
                <h3><i class="fa-solid fa-arrow-trend-down" style="color:#EF4444;"></i> Expenses by Category</h3>
            </div>
            <div class="budget-categories-container">
                ${sections}
            </div>
        </div>
    `;
}

function buildSummaryHtml(summary) {
    const statusColor = summary.remaining >= 0 ? '#10B981' : '#EF4444';
    const statusLabel = summary.remaining >= 0 ? 'Surplus' : 'Shortfall';
    
    return `
        <div class="budget-summary-grid">
            <div class="budget-stat-box" style="border-left:4px solid #6366F1;">
                <span class="budget-stat-label">Total Income</span>
                <span class="budget-stat-value">${formatMoney(summary.totalIncome)}</span>
            </div>
            <div class="budget-stat-box" style="border-left:4px solid #EF4444;">
                <span class="budget-stat-label">Total Expenses</span>
                <span class="budget-stat-value">${formatMoney(summary.totalExpenses)}</span>
            </div>
            <div class="budget-stat-box" style="border-left:4px solid ${statusColor};">
                <span class="budget-stat-label">${statusLabel}</span>
                <span class="budget-stat-value">${formatMoney(summary.remaining)}</span>
            </div>
            <div class="budget-stat-box" style="border-left:4px solid #10B981;">
                <span class="budget-stat-label">Savings Rate</span>
                <span class="budget-stat-value">${summary.savingsRate.toFixed(1)}%</span>
            </div>
        </div>
    `;
}

function buildRuleHtml(summary) {
    const rule = summary.rule;
    
    const ruleRows = ['needs', 'wants', 'savings'].map(key => {
        const r = rule[key];
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        const pctColor = r.onTrack ? '#10B981' : '#EF4444';
        const status = r.onTrack ? '<i class="fa-solid fa-circle-check"></i> On Track' : '<i class="fa-solid fa-triangle-exclamation"></i> Adjust';
        
        return `
            <div class="budget-rule-row">
                <div class="budget-rule-header">
                    <span style="font-weight:700;color:var(--text-primary);">${label}</span>
                    <span style="color:${pctColor};font-weight:600;">${r.pct.toFixed(1)}% / ${r.target}% target</span>
                    <span style="color:${pctColor};">${status}</span>
                </div>
                <div class="budget-rule-bar">
                    <div class="budget-rule-bar-fill" style="width:${Math.min(100, r.pct)}%;background:${r.onTrack ? '#10B981' : '#EF4444'};"></div>
                    <div class="budget-rule-bar-target" style="left:${r.target}%;"></div>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="budget-section-card">
            <div class="budget-section-header">
                <h3><i class="fa-solid fa-chart-pie" style="color:var(--primary-color);"></i> 50/30/20 Rule Analysis</h3>
            </div>
            ${ruleRows}
        </div>
    `;
}

function buildChartHtml(summary) {
    const labels = summary.categories.map(c => c.label);
    const data = summary.categories.map(c => c.total);
    const colors = summary.categories.map(c => c.color);
    
    if (data.every(d => d === 0)) {
        return `
            <div class="budget-section-card">
                <div class="budget-section-header">
                    <h3><i class="fa-solid fa-chart-pie" style="color:var(--primary-color);"></i> Spending Breakdown</h3>
                </div>
                <div class="budget-chart-empty" style="text-align:center;color:var(--text-secondary);padding:30px;">
                    <i class="fa-solid fa-chart-pie" style="font-size:32px;margin-bottom:10px;opacity:0.4;"></i>
                    <p>Add expenses to see your spending breakdown</p>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="budget-section-card">
            <div class="budget-section-header">
                <h3><i class="fa-solid fa-chart-pie" style="color:var(--primary-color);"></i> Spending Breakdown</h3>
            </div>
            <div class="budget-chart-container" style="height:300px;position:relative;">
                <canvas id="budget-chart"></canvas>
            </div>
        </div>
    `;
}

function buildSeoHtml() {
    return `
        <div class="tool-runner-card" style="margin-top:24px;">
            <h2 style="font-size:20px;font-weight:700;margin-bottom:14px;color:var(--text-primary);">How to Build a Monthly Budget and Track Your Spending</h2>
            <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">A budget is the foundation of financial control. The GetCalcu Budget Planner lets you log income sources, categorize expenses, visualize your spending, and get instant feedback with the 50/30/20 rule — all saved privately in your browser.</p>
            
            <h3 style="font-size:15px;font-weight:700;margin:18px 0 8px;color:var(--text-primary);">The 50/30/20 Rule Explained</h3>
            <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">This popular framework splits after-tax income into 50% needs (housing, food, utilities, transport), 30% wants (dining, entertainment, hobbies), and 20% savings and debt repayment. It is a flexible target to aim for, not a strict rule.</p>
            
            <h3 style="font-size:15px;font-weight:700;margin:18px 0 8px;color:var(--text-primary);">Why Your Savings Rate Matters</h3>
            <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">Your savings rate — the percentage of income left after expenses — is the single best predictor of financial progress. A 20% rate puts you ahead of most households; pushing toward 30% or more accelerates debt payoff, investing, and financial independence.</p>
            
            <div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px 18px;margin-top:16px;font-size:13px;color:var(--text-secondary);">
                <strong style="color:var(--text-primary);">Formula:</strong> Budget Status = Total Income &minus; Total Expenses | Savings Rate = (Remaining / Income) &times; 100 | 50/30/20 Rule: Needs &le; 50%, Wants &le; 30%, Savings &ge; 20%
            </div>
        </div>
    `;
}

function buildJourneyHtml() {
    return `
        <div id="budget-journey" class="budget-journey-card" style="margin-top:24px;padding:20px;background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-lg);">
            <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;"><i class="fa-solid fa-route" style="color:var(--primary-color);margin-right:8px;"></i> Your Next Financial Step</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Based on your budget figures, these calculators can help you optimize further.</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
                <a href="/tool?slug=mortgage-calculator" class="tool-card">
                    <div class="tool-icon icon-finance"><i class="fa-solid fa-house"></i></div>
                    <h3 style="font-size:14px;margin-bottom:4px;">Mortgage Calculator</h3>
                    <p style="font-size:12px;color:var(--text-secondary);">See what home you can afford.</p>
                </a>
                <a href="/tool?slug=retirement-calculator" class="tool-card">
                    <div class="tool-icon icon-finance"><i class="fa-solid fa-umbrella"></i></div>
                    <h3 style="font-size:14px;margin-bottom:4px;">Retirement Calculator</h3>
                    <p style="font-size:12px;color:var(--text-secondary);">Plan your retirement savings.</p>
                </a>
                <a href="/tool?slug=investment-calculator" class="tool-card">
                    <div class="tool-icon icon-finance"><i class="fa-solid fa-chart-line"></i></div>
                    <h3 style="font-size:14px;margin-bottom:4px;">Investment Calculator</h3>
                    <p style="font-size:12px;color:var(--text-secondary);">Grow your savings faster.</p>
                </a>
            </div>
        </div>
    `;
}

function buildFullHtml(data, summary) {
    return `
        <div class="tool-runner-card">
            <div class="tool-header">
                <h1>Budget Planner & Expense Tracker</h1>
                <p>Plan your monthly budget, track expenses by category, and get personalized spending insights with the 50/30/20 rule.</p>
            </div>
            
            <div class="budget-actions">
                <button class="btn btn-outline btn-sm" id="budget-reset-btn" title="Reset to default data">
                    <i class="fa-solid fa-rotate-left"></i> Reset
                </button>
                <button class="btn btn-outline btn-sm" id="budget-export-btn" title="Copy budget summary">
                    <i class="fa-regular fa-copy"></i> Copy Summary
                </button>
            </div>
            
            <div id="budget-summary-container">
                ${buildSummaryHtml(summary)}
            </div>
            
            <div class="budget-grid">
                <div id="budget-income-container">
                    ${buildIncomeSection(data)}
                </div>
                <div id="budget-expense-container">
                    ${buildExpenseSection(data)}
                </div>
            </div>
            
            <div id="budget-rule-container">
                ${buildRuleHtml(summary)}
            </div>
            
            <div id="budget-chart-container">
                ${buildChartHtml(summary)}
            </div>
            
            ${buildJourneyHtml()}
            
            <div id="budget-seo" class="budget-seo-card" style="margin-top:24px;">
                ${buildSeoHtml()}
            </div>
        </div>
    `;
}

// ── Main Render Function ────────────────────────────────────────

export function renderBudgetPlanner(container) {
    let data = loadBudgetData();
    let chartInstance = null;
    let summary = calculateBudget(data);
    
    container.innerHTML = buildFullHtml(data, summary);
    
    renderChart();
    
    container.addEventListener('click', (e) => {
        if (e.target.closest('[data-add="income"]')) {
            data.income.push({ id: uid('inc'), label: 'New Income', amount: 0 });
            saveBudgetData(data);
            refreshAll();
            return;
        }
        
        const addExpenseBtn = e.target.closest('[data-add^="expense:"]');
        if (addExpenseBtn) {
            const catId = addExpenseBtn.dataset.add.split(':')[1];
            const cat = data.categories.find(c => c.id === catId);
            if (cat) {
                cat.items.push({ id: uid(catId), label: 'New Expense', amount: 0 });
                saveBudgetData(data);
                refreshAll();
            }
            return;
        }
        
        const removeBtn = e.target.closest('[data-remove]');
        if (removeBtn) {
            const [type, id] = removeBtn.dataset.remove.split(':');
            if (type === 'income') {
                data.income = data.income.filter(i => i.id !== id);
            } else if (type === 'expense') {
                data.categories.forEach(cat => {
                    cat.items = cat.items.filter(item => item.id !== id);
                });
            }
            saveBudgetData(data);
            refreshAll();
            return;
        }
        
        if (e.target.closest('#budget-reset-btn')) {
            data = resetBudgetData();
            summary = calculateBudget(data);
            refreshAll();
            return;
        }
        
        if (e.target.closest('#budget-export-btn')) {
            exportSummary();
            return;
        }
    });
    
    container.addEventListener('input', (e) => {
        const row = e.target.closest('.budget-row');
        if (!row) return;
        const id = row.dataset.id;
        
        const isIncome = row.classList.contains('budget-income-row');
        
        if (e.target.classList.contains('budget-label-input')) {
            if (isIncome) {
                const item = data.income.find(i => i.id === id);
                if (item) item.label = e.target.value;
            } else {
                data.categories.forEach(cat => {
                    const item = cat.items.find(i => i.id === id);
                    if (item) item.label = e.target.value;
                });
            }
        }
        
        if (e.target.classList.contains('budget-amount-input')) {
            const amountId = e.target.id;
            const error = validateNumber(e.target.value, { min: 0, fieldName: 'Amount' });
            
            if (error) {
                showFieldError(amountId, error);
                return;
            } else {
                clearFieldError(amountId);
            }
            
            const amount = parseFloat(e.target.value) || 0;
            
            if (isIncome) {
                const item = data.income.find(i => i.id === id);
                if (item) item.amount = amount;
            } else {
                data.categories.forEach(cat => {
                    const item = cat.items.find(i => i.id === id);
                    if (item) item.amount = amount;
                });
            }
        }
        
        saveBudgetData(data);
        summary = calculateBudget(data);
        updateSummaryOnly();
    });
    
    container.addEventListener('blur', (e) => {
        if (e.target.classList.contains('budget-label-input')) {
            const row = e.target.closest('.budget-row');
            if (!row) return;
            const id = row.dataset.id;
            const trimmed = e.target.value.trim();
            
            if (!trimmed) {
                e.target.value = 'Untitled';
                if (row.classList.contains('budget-income-row')) {
                    const item = data.income.find(i => i.id === id);
                    if (item) item.label = 'Untitled';
                } else {
                    data.categories.forEach(cat => {
                        const item = cat.items.find(i => i.id === id);
                        if (item) item.label = 'Untitled';
                    });
                }
                saveBudgetData(data);
            }
        }
        
        if (e.target.classList.contains('budget-amount-input')) {
            const amountId = e.target.id;
            if (!e.target.value || isNaN(parseFloat(e.target.value))) {
                e.target.value = '0';
                clearFieldError(amountId);
                
                const row = e.target.closest('.budget-row');
                if (row) {
                    const id = row.dataset.id;
                    const amount = 0;
                    if (row.classList.contains('budget-income-row')) {
                        const item = data.income.find(i => i.id === id);
                        if (item) item.amount = amount;
                    } else {
                        data.categories.forEach(cat => {
                            const item = cat.items.find(i => i.id === id);
                            if (item) item.amount = amount;
                        });
                    }
                }
                saveBudgetData(data);
                summary = calculateBudget(data);
                updateSummaryOnly();
            }
        }
    }, true);
    
    function refreshAll() {
        data = loadBudgetData();
        summary = calculateBudget(data);
        container.innerHTML = buildFullHtml(data, summary);
        renderChart();
    }
    
    function renderChart() {
        const canvas = document.getElementById('budget-chart');
        if (!canvas) return;
        
        destroyChart(canvas);
        
        const chartData = {
            labels: summary.categories.map(c => c.label),
            data: summary.categories.map(c => c.total),
            colors: summary.categories.map(c => c.color)
        };
        
        if (chartData.data.every(d => d === 0)) return;
        
        createDoughnutChart(canvas, {
            labels: chartData.labels,
            data: chartData.data,
            colors: chartData.colors,
            cutout: '60%',
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                return context.label + ': ' + formatMoney(context.parsed) + ' (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });
    }
    
    function updateSummaryOnly() {
        const incomeTotalEl = document.querySelector('[data-total="income"]');
        if (incomeTotalEl) incomeTotalEl.textContent = formatMoney(summary.totalIncome);
        
        summary.categories.forEach(cat => {
            const totalEl = document.querySelector(`[data-total="category:${cat.id}"]`);
            if (totalEl) totalEl.textContent = formatMoney(cat.total);
        });
        
        const summaryContainer = document.getElementById('budget-summary-container');
        if (summaryContainer) {
            summaryContainer.innerHTML = buildSummaryHtml(summary);
        }
        
        const ruleContainer = document.getElementById('budget-rule-container');
        if (ruleContainer) {
            ruleContainer.innerHTML = buildRuleHtml(summary);
        }
        
        renderChart();
    }
    
    function exportSummary() {
        const lines = [
            'Budget Summary - GetCalcu',
            '================================',
            `Total Income: ${formatMoney(summary.totalIncome)}`,
            `Total Expenses: ${formatMoney(summary.totalExpenses)}`,
            `Remaining: ${formatMoney(summary.remaining)}`,
            `Savings Rate: ${summary.savingsRate.toFixed(1)}%`,
            '================================',
            '50/30/20 Rule:',
            `  Needs: ${formatMoney(summary.rule.needs.amount)} (${summary.rule.needs.pct.toFixed(1)}%)`,
            `  Wants: ${formatMoney(summary.rule.wants.amount)} (${summary.rule.wants.pct.toFixed(1)}%)`,
            `  Savings: ${formatMoney(summary.rule.savings.amount)} (${summary.rule.savings.pct.toFixed(1)}%)`,
            '================================',
            'Categories:'
        ];
        
        summary.categories.forEach(cat => {
            lines.push(`  ${cat.label}: ${formatMoney(cat.total)}`);
        });
        
        const text = lines.join('\n');
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Budget summary copied to clipboard!');
            }).catch(() => {
                showToast('Failed to copy. Please try again.');
            });
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Budget summary copied to clipboard!');
        }
    }
    
    function showToast(message) {
        const existing = document.querySelector('.budget-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = 'budget-toast';
        toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--primary-color);color:#fff;padding:12px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-size:14px;';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
}

export function initBudgetPlanner(container) {
    renderBudgetPlanner(container);
}

if (typeof window !== 'undefined') {
    window.renderBudgetPlannerModule = (container) => {
        renderBudgetPlanner(container);
    };
}
