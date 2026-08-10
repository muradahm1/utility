/**
 * Recommendations Module
 * 
 * Rule-based recommendation engine for personalized insights and next calculators.
 * Provides smart suggestions based on user inputs and behavior.
 * 
 * @module modules/recommendations
 */

import { getTool, getToolsByCategory } from '../core/tools.js';

// ── Recommendation Engine ──────────────────────────────────────

/**
 * Recommendation item
 * @typedef {Object} Recommendation
 * @property {Object} tool - Tool definition
 * @property {string} reason - Recommendation reason
 * @property {number} priority - Priority level (1-5)
 * @property {string} [action] - Suggested action
 */

/**
 * Get personalized recommendations based on user context
 * @param {Object} context - User context
 * @param {string} context.currentTool - Current calculator slug
 * @param {Object} context.inputs - User inputs
 * @param {Object} context.result - Calculation result
 * @param {Array<string>} context.history - Recently used tools
 * @param {Object} [options] - Options
 * @param {number} [options.limit=4] - Maximum recommendations
 * @returns {Array<Recommendation>} Recommendations
 */
export function getPersonalizedRecommendations(context, options = {}) {
    const {
        currentTool,
        inputs = {},
        result = {},
        history = []
    } = options;
    
    const limit = options.limit || 4;
    const recommendations = [];
    const seen = new Set(history);
    
    // Get current tool
    const tool = getTool(currentTool);
    if (!tool) return [];
    
    // Strategy 1: Result-based recommendations
    const resultRecs = getResultBasedRecommendations(tool, result);
    resultRecs.forEach(rec => {
        if (!seen.has(rec.tool.id) && recommendations.length < limit) {
            recommendations.push(rec);
            seen.add(rec.tool.id);
        }
    });
    
    // Strategy 2: Input-based recommendations
    const inputRecs = getInputBasedRecommendations(tool, inputs);
    inputRecs.forEach(rec => {
        if (!seen.has(rec.tool.id) && recommendations.length < limit) {
            recommendations.push(rec);
            seen.add(rec.tool.id);
        }
    });
    
    // Strategy 3: Workflow recommendations
    const workflowRecs = getWorkflowRecommendations(currentTool);
    workflowRecs.forEach(rec => {
        if (!seen.has(rec.tool.id) && recommendations.length < limit) {
            recommendations.push(rec);
            seen.add(rec.tool.id);
        }
    });
    
    // Strategy 4: Category recommendations
    const categoryRecs = getCategoryRecommendations(tool.category, limit - recommendations.length, seen);
    categoryRecs.forEach(rec => {
        if (recommendations.length < limit) {
            recommendations.push({
                tool: rec,
                reason: 'Explore more in this category',
                priority: 4
            });
            seen.add(rec.id);
        }
    });
    
    return recommendations.slice(0, limit);
}

/**
 * Get result-based recommendations
 * @param {Object} tool - Current tool
 * @param {Object} result - Calculation result
 * @returns {Array<Recommendation>} Recommendations
 */
function getResultBasedRecommendations(tool, result) {
    const recommendations = [];
    
    // Mortgage calculator recommendations
    if (tool.id === 'mortgage-calculator' && result.stats) {
        const monthlyPayment = result.stats.find(s => s.label === 'Monthly Payment');
        const totalInterest = result.stats.find(s => s.label === 'Total Interest');
        
        if (monthlyPayment && totalInterest) {
            // High interest recommendation
            const interestValue = parseFloat(totalInterest.value.replace(/[^0-9.-]/g, ''));
            if (interestValue > 100000) {
                recommendations.push({
                    tool: getTool('investment-calculator'),
                    reason: 'Consider investing extra money instead of paying high interest',
                    priority: 1
                });
            }
        }
    }
    
    // BMI calculator recommendations
    if (tool.id === 'bmi-calculator' && result.bmiGauge) {
        const bmi = result.bmiGauge.bmi;
        
        if (bmi > 25) {
            recommendations.push({
                tool: getTool('calorie-calculator'),
                reason: 'Calculate your daily calorie needs for weight management',
                priority: 1
            });
        }
        
        if (bmi < 18.5) {
            recommendations.push({
                tool: getTool('calorie-calculator'),
                reason: 'Calculate healthy calorie intake for weight gain',
                priority: 1
            });
        }
    }
    
    // Investment calculator recommendations
    if (tool.id === 'investment-calculator' && result.stats) {
        recommendations.push({
            tool: getTool('retirement-calculator'),
            reason: 'Plan your retirement with these investment returns',
            priority: 1
        });
        
        recommendations.push({
            tool: getTool('compound-interest-calculator'),
            reason: 'See how compound interest grows your money',
            priority: 2
        });
    }
    
    return recommendations;
}

/**
 * Get input-based recommendations
 * @param {Object} tool - Current tool
 * @param {Object} inputs - User inputs
 * @returns {Array<Recommendation>} Recommendations
 */
function getInputBasedRecommendations(tool, inputs) {
    const recommendations = [];
    
    // High loan amount
    if (inputs.loanAmount && inputs.loanAmount > 500000) {
        recommendations.push({
            tool: getTool('affordability-calculator'),
            reason: 'Check if this loan amount fits your budget',
            priority: 2
        });
    }
    
    // Long loan term
    if (inputs.loanTerm && inputs.loanTerm > 30) {
        recommendations.push({
            tool: getTool('loan-calculator'),
            reason: 'Compare with shorter loan terms',
            priority: 2
        });
    }
    
    // High interest rate
    if (inputs.interestRate && inputs.interestRate > 0.07) {
        recommendations.push({
            tool: getTool('refinance-calculator'),
            reason: 'See if refinancing could lower your rate',
            priority: 1
        });
    }
    
    return recommendations;
}

/**
 * Get workflow recommendations
 * @param {string} currentTool - Current calculator
 * @returns {Array<Recommendation>} Recommendations
 */
function getWorkflowRecommendations(currentTool) {
    const workflows = {
        'mortgage-calculator': [
            { tool: 'loan-calculator', reason: 'Compare with other loan types', priority: 1 },
            { tool: 'affordability-calculator', reason: 'Check what you can afford', priority: 2 },
            { tool: 'investment-calculator', reason: 'Compare buying vs investing', priority: 3 }
        ],
        'loan-calculator': [
            { tool: 'mortgage-calculator', reason: 'Calculate mortgage payments', priority: 1 },
            { tool: 'amortization-calculator', reason: 'See detailed payment schedule', priority: 2 }
        ],
        'bmi-calculator': [
            { tool: 'calorie-calculator', reason: 'Calculate daily calorie needs', priority: 1 },
            { tool: 'body-fat-calculator', reason: 'Calculate body fat percentage', priority: 2 }
        ],
        'investment-calculator': [
            { tool: 'retirement-calculator', reason: 'Plan for retirement', priority: 1 },
            { tool: 'compound-interest-calculator', reason: 'Understand compound growth', priority: 2 }
        ],
        'retirement-calculator': [
            { tool: 'investment-calculator', reason: 'Optimize your investment strategy', priority: 1 },
            { tool: 'social-security-calculator', reason: 'Calculate Social Security benefits', priority: 2 }
        ]
    };
    
    const workflow = workflows[currentTool] || [];
    
    return workflow.map(rec => ({
        tool: getTool(rec.tool),
        reason: rec.reason,
        priority: rec.priority
    })).filter(rec => rec.tool);
}

/**
 * Get category recommendations
 * @param {string} category - Current category
 * @param {number} limit - Maximum results
 * @param {Set<string>} exclude - Tools to exclude
 * @returns {Array<Object>} Tools
 */
function getCategoryRecommendations(category, limit, exclude) {
    return getToolsByCategory(category, limit + 1)
        .filter(tool => !exclude.has(tool.id));
}

// ── Insights Generator ─────────────────────────────────────────

/**
 * Generate personalized insights based on result
 * @param {Object} tool - Tool definition
 * @param {Object} result - Calculation result
 * @param {Object} inputs - User inputs
 * @returns {Array<Object>} Insights
 */
export function generateInsights(tool, result, inputs = {}) {
    const insights = [];
    
    // Mortgage insights
    if (tool.id === 'mortgage-calculator') {
        const monthlyPayment = result.stats?.find(s => s.label === 'Monthly Payment');
        const totalInterest = result.stats?.find(s => s.label === 'Total Interest');
        
        if (monthlyPayment && totalInterest) {
            const payment = parseFloat(monthlyPayment.value.replace(/[^0-9.-]/g, ''));
            const interest = parseFloat(totalInterest.value.replace(/[^0-9.-]/g, ''));
            const loanAmount = inputs.loanAmount || 0;
            
            // High interest insight
            if (interest > loanAmount) {
                insights.push({
                    type: 'warning',
                    headline: 'High Interest Cost',
                    detail: `You'll pay $${interest.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} in interest, which is more than your loan amount. Consider a larger down payment or shorter term.`,
                    icon: 'fa-triangle-exclamation'
                });
            }
            
            // Payment to income ratio
            if (inputs.monthlyIncome && payment > inputs.monthlyIncome * 0.36) {
                insights.push({
                    type: 'warning',
                    headline: 'High Payment-to-Income Ratio',
                    detail: 'Your monthly payment exceeds 36% of your monthly income. Lenders may view this as high risk.',
                    icon: 'fa-triangle-exclamation'
                });
            }
            
            // Good interest rate
            if (inputs.interestRate && inputs.interestRate < 0.05) {
                insights.push({
                    type: 'positive',
                    headline: 'Excellent Interest Rate',
                    detail: 'Your interest rate is below average. This will save you thousands over the life of the loan.',
                    icon: 'fa-circle-check'
                });
            }
        }
    }
    
    // Investment insights
    if (tool.id === 'investment-calculator') {
        const finalValue = result.stats?.find(s => s.label === 'Final Value');
        const totalContributions = result.stats?.find(s => s.label === 'Total Contributions');
        
        if (finalValue && totalContributions) {
            const fv = parseFloat(finalValue.value.replace(/[^0-9.-]/g, ''));
            const contrib = parseFloat(totalContributions.value.replace(/[^0-9.-]/g, ''));
            const earnings = fv - contrib;
            
            if (earnings > contrib) {
                insights.push({
                    type: 'positive',
                    headline: 'Power of Compound Interest',
                    detail: `Your earnings ($${earnings.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}) exceed your contributions ($${contrib.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}). Time is your greatest asset!`,
                    icon: 'fa-chart-line'
                });
            }
        }
    }
    
    // BMI insights
    if (tool.id === 'bmi-calculator' && result.bmiGauge) {
        const bmi = result.bmiGauge.bmi;
        
        if (bmi >= 25 && bmi < 30) {
            insights.push({
                type: 'neutral',
                headline: 'Consider Lifestyle Changes',
                detail: 'A combination of healthy eating and regular exercise can help you reach a healthier weight.',
                icon: 'fa-lightbulb'
            });
        } else if (bmi >= 30) {
            insights.push({
                type: 'warning',
                headline: 'Health Risk Alert',
                detail: 'Obesity increases risk of various health conditions. Consider consulting a healthcare provider.',
                icon: 'fa-heart-pulse'
            });
        }
    }
    
    return insights;
}

// ── UI Builders ────────────────────────────────────────────────

/**
 * Build recommendations HTML
 * @param {Array<Recommendation>} recommendations - Recommendations
 * @param {Object} options - Options
 * @returns {string} HTML string
 */
export function buildRecommendationsHtml(recommendations, options = {}) {
    const {
        title = 'You Might Also Like',
        showReason = true
    } = options;
    
    if (!recommendations || recommendations.length === 0) {
        return '';
    }
    
    const items = recommendations.map(rec => {
        const reasonHtml = showReason && rec.reason 
            ? `<p class="rec-reason">${escapeHtml(rec.reason)}</p>` 
            : '';
        
        return `
            <a href="/tool?slug=${rec.tool.id}" class="recommendation-card" data-priority="${rec.priority}">
                <div class="rec-icon">
                    <i class="fa-solid ${rec.tool.icon || 'fa-calculator'}"></i>
                </div>
                <div class="rec-content">
                    <h4>${escapeHtml(rec.tool.name)}</h4>
                    ${reasonHtml}
                </div>
                <div class="rec-arrow">
                    <i class="fa-solid fa-arrow-right"></i>
                </div>
            </a>
        `;
    }).join('');
    
    return `
        <div class="recommendations-section">
            <h3 class="recommendations-title">
                <i class="fa-solid fa-lightbulb"></i>
                ${escapeHtml(title)}
            </h3>
            <div class="recommendations-list">
                ${items}
            </div>
        </div>
    `;
}

/**
 * Build insights HTML
 * @param {Array<Object>} insights - Insights
 * @returns {string} HTML string
 */
export function buildInsightsHtml(insights) {
    if (!insights || insights.length === 0) {
        return '';
    }
    
    const items = insights.map(insight => {
        const toneMap = {
            positive: { color: '#10B981', bg: '#10B9811A' },
            warning: { color: '#EF4444', bg: '#EF44441A' },
            neutral: { color: '#6366F1', bg: '#6366F11A' }
        };
        const theme = toneMap[insight.type] || toneMap.neutral;
        
        return `
            <div class="insight-card" style="border-left:4px solid ${theme.color};background:${theme.bg};border-radius:8px;padding:14px 18px;margin-bottom:12px;display:flex;align-items:flex-start;gap:12px;">
                <i class="fa-solid ${insight.icon || 'fa-circle-info'}" style="color:${theme.color};margin-top:2px;font-size:16px;"></i>
                <div>
                    <div style="font-weight:700;font-size:14px;color:var(--text-primary);line-height:1.4;">${escapeHtml(insight.headline)}</div>
                    <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;line-height:1.6;">${escapeHtml(insight.detail)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="insights-section">
            <h3 class="insights-title">
                <i class="fa-solid fa-brain"></i>
                Personalized Insights
            </h3>
            <div class="insights-list">
                ${items}
            </div>
        </div>
    `;
}

// ── Helper Functions ───────────────────────────────────────────

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (str === null || str === undefined) {
        return '';
    }
    
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// Log module initialization
console.log('Recommendations module loaded');