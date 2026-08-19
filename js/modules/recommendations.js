/**
 * Recommendations Module
 * 
 * Rule-based recommendation engine for personalized insights.
 * 
 * @module modules/recommendations
 */

import { escapeHtml } from '../utils/index.js';

export function getPersonalizedRecommendations(context) {
    const { tool, result, inputs } = context;
    const recommendations = [];
    
    if (!tool || !result) return recommendations;
    
    if (tool.category === 'Finance' && result.stats) {
        const monthlyPayment = result.stats.find(s => s.label.toLowerCase().includes('monthly'));
        if (monthlyPayment) {
            const val = extractNumber(monthlyPayment.value);
            if (val > 2000) {
                recommendations.push({
                    type: 'insight',
                    headline: 'High Monthly Payment',
                    detail: 'Consider a larger down payment or longer loan term to reduce your monthly payment.',
                    icon: 'fa-triangle-exclamation',
                    tone: 'warning'
                });
            }
        }
    }
    
    if (tool.id === 'mortgage-calculator') {
        recommendations.push({
            type: 'tool',
            slug: 'rent-vs-buy-calculator',
            reason: 'Compare renting vs buying'
        });
        recommendations.push({
            type: 'tool',
            slug: 'house-affordability-calculator',
            reason: 'Check what home you can truly afford'
        });
    }
    
    if (tool.id === 'loan-calculator') {
        recommendations.push({
            type: 'tool',
            slug: 'loan-interest-calculator',
            reason: 'See total interest with different payment frequencies'
        });
    }
    
    if (tool.id === 'bmi-calculator') {
        recommendations.push({
            type: 'insight',
            headline: 'Health Calculator',
            detail: 'Combine BMI with other health metrics for a complete picture.',
            icon: 'fa-heart-pulse',
            tone: 'neutral'
        });
    }
    
    return recommendations;
}

export function generateInsights(tool, result, inputs) {
    const insights = [];
    const recommendations = getPersonalizedRecommendations({ tool, result, inputs });
    
    recommendations.filter(r => r.type === 'insight').forEach(rec => {
        insights.push({
            headline: rec.headline,
            detail: rec.detail,
            icon: rec.icon || 'fa-circle-info',
            tone: rec.tone || 'neutral'
        });
    });
    
    return insights;
}

export function buildRecommendationsHtml(recs) {
    if (!recs || !recs.length) return '';
    
    const items = recs.filter(r => r.type === 'insight').map(ins => `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border-color);">
            <i class="fa-solid fa-wand-magic-sparkles" style="color:var(--primary-color);margin-top:3px;font-size:14px;flex-shrink:0;"></i>
            <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">
                <strong style="color:var(--text-primary);">${escapeHtml(ins.headline)}</strong><br>
                ${escapeHtml(ins.detail)}
            </div>
        </div>
    `).join('');
    
    if (!items) return '';
    
    return `
        <div class="insights-card" style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px 18px;margin-top:16px;">
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:4px;"><i class="fa-solid fa-brain" style="color:var(--primary-color);margin-right:8px;"></i>Personalized Insights</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">Observations based on your specific numbers.</div>
            ${items}
        </div>
    `;
}

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

function extractNumber(str) {
    if (!str) return 0;
    const match = String(str).replace(/[^0-9.]/g, '');
    return parseFloat(match) || 0;
}
