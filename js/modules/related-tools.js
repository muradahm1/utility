/**
 * Related Tools Module
 * 
 * Dynamic internal linking based on categories, tags, and user context.
 * Provides smart recommendations for related calculators.
 * 
 * @module modules/related-tools
 */

import { getTool, getToolsByCategory, searchTools } from '../core/tools.js';

// ── Related Tools Engine ───────────────────────────────────────

/**
 * Get related tools for a given calculator
 * @param {string} slug - Current calculator slug
 * @param {Object} options - Options
 * @param {number} options.limit - Maximum number of results (default: 4)
 * @param {string} options.strategy - Strategy: 'category', 'tags', 'hybrid' (default: 'hybrid')
 * @returns {Array<Object>} Related tools
 */
export function getRelatedTools(slug, options = {}) {
    const {
        limit = 4,
        strategy = 'hybrid'
    } = options;
    
    const currentTool = getTool(slug);
    
    if (!currentTool) {
        return [];
    }
    
    const related = [];
    const seen = new Set([slug]);
    
    switch (strategy) {
        case 'category':
            return getToolsByCategory(currentTool.category, limit + 1)
                .filter(tool => !seen.has(tool.id))
                .slice(0, limit);
        
        case 'tags':
            return getToolsByTags(currentTool.tags, limit + 1, seen)
                .slice(0, limit);
        
        case 'hybrid':
        default:
            // First, get tools from same category
            const sameCategory = getToolsByCategory(currentTool.category, limit + 1)
                .filter(tool => !seen.has(tool.id));
            
            sameCategory.forEach(tool => {
                seen.add(tool.id);
                related.push(tool);
            });
            
            // If not enough, add tools with similar tags
            if (related.length < limit && currentTool.tags) {
                const byTags = getToolsByTags(currentTool.tags, limit - related.length + 1, seen);
                byTags.forEach(tool => {
                    if (related.length < limit) {
                        related.push(tool);
                    }
                });
            }
            
            // If still not enough, add popular tools
            if (related.length < limit) {
                const popular = getPopularTools(limit - related.length, seen);
                popular.forEach(tool => {
                    if (related.length < limit) {
                        related.push(tool);
                    }
                });
            }
            
            return related.slice(0, limit);
    }
}

/**
 * Get tools by tags
 * @param {Array<string>} tags - Tags to match
 * @param {number} limit - Maximum results
 * @param {Set<string>} exclude - Slugs to exclude
 * @returns {Array<Object>} Matching tools
 */
function getToolsByTags(tags, limit, exclude) {
    if (!tags || !Array.isArray(tags)) {
        return [];
    }
    
    const allTools = getAllTools();
    const scored = [];
    
    allTools.forEach(tool => {
        if (exclude.has(tool.id)) return;
        
        // Count matching tags
        const matchingTags = tool.tags ? tags.filter(tag => tool.tags.includes(tag)) : [];
        const score = matchingTags.length;
        
        if (score > 0) {
            scored.push({ tool, score });
        }
    });
    
    // Sort by score (most matching tags first)
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, limit).map(item => item.tool);
}

/**
 * Get popular tools
 * @param {number} limit - Maximum results
 * @param {Set<string>} exclude - Slugs to exclude
 * @returns {Array<Object>} Popular tools
 */
function getPopularTools(limit, exclude) {
    // This would ideally come from analytics
    // For now, return tools in a predefined order
    const popularOrder = [
        'mortgage-calculator',
        'loan-calculator',
        'investment-calculator',
        'retirement-calculator',
        'bmi-calculator',
        'calorie-calculator'
    ];
    
    const tools = [];
    
    popularOrder.forEach(slug => {
        const tool = getTool(slug);
        if (tool && !exclude.has(slug)) {
            tools.push(tool);
        }
    });
    
    return tools.slice(0, limit);
}

/**
 * Get all tools
 * @returns {Array<Object>} All tools
 */
function getAllTools() {
    // Import from core/tools
    const { getAllTools: getCoreTools } = require('../core/tools.js');
    return getCoreTools ? getCoreTools() : [];
}

// ── Tool Recommendations ───────────────────────────────────────

/**
 * Get recommended next calculators based on user context
 * @param {Object} context - User context
 * @param {string} context.currentTool - Current calculator slug
 * @param {Object} context.userInputs - User inputs from current calculator
 * @param {Array<string>} context.recentTools - Recently used tools
 * @returns {Array<Object>} Recommended tools
 */
export function getRecommendations(context = {}) {
    const {
        currentTool,
        userInputs = {},
        recentTools = []
    } = context;
    
    const recommendations = [];
    const seen = new Set(recentTools);
    
    // Get current tool info
    const tool = getTool(currentTool);
    if (!tool) return [];
    
    // Strategy 1: Category-based recommendations
    const categoryTools = getToolsByCategory(tool.category, 5)
        .filter(t => !seen.has(t.id) && t.id !== currentTool);
    
    categoryTools.forEach(t => {
        recommendations.push({
            tool: t,
            reason: 'Same category',
            priority: 1
        });
        seen.add(t.id);
    });
    
    // Strategy 2: Workflow-based recommendations
    const workflowRecs = getWorkflowRecommendations(currentTool, userInputs);
    workflowRecs.forEach(rec => {
        if (!seen.has(rec.tool.id)) {
            recommendations.push({
                tool: rec.tool,
                reason: rec.reason,
                priority: 2
            });
            seen.add(rec.tool.id);
        }
    });
    
    // Strategy 3: Tag-based recommendations
    if (tool.tags) {
        const tagRecs = getToolsByTags(tool.tags, 3, seen);
        tagRecs.forEach(t => {
            recommendations.push({
                tool: t,
                reason: 'Related topic',
                priority: 3
            });
            seen.add(t.id);
        });
    }
    
    // Sort by priority and return top recommendations
    return recommendations
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 4)
        .map(rec => rec.tool);
}

/**
 * Get workflow-based recommendations
 * @param {string} currentTool - Current calculator
 * @param {Object} userInputs - User inputs
 * @returns {Array<Object>} Recommendations
 */
function getWorkflowRecommendations(currentTool, userInputs) {
    const recommendations = [];
    
    // Define workflows
    const workflows = {
        'mortgage-calculator': [
            { tool: 'loan-calculator', reason: 'Compare with other loan options', condition: () => true },
            { tool: 'affordability-calculator', reason: 'Check what you can afford', condition: () => true },
            { tool: 'investment-calculator', reason: 'Compare with investing', condition: () => true }
        ],
        'loan-calculator': [
            { tool: 'mortgage-calculator', reason: 'Calculate mortgage payments', condition: () => true },
            { tool: 'affordability-calculator', reason: 'Check affordability', condition: () => true }
        ],
        'bmi-calculator': [
            { tool: 'calorie-calculator', reason: 'Calculate daily calorie needs', condition: () => true },
            { tool: 'body-fat-calculator', reason: 'Calculate body fat percentage', condition: () => true }
        ],
        'investment-calculator': [
            { tool: 'retirement-calculator', reason: 'Plan for retirement', condition: () => true },
            { tool: 'compound-interest-calculator', reason: 'See compound growth', condition: () => true }
        ]
    };
    
    const workflow = workflows[currentTool];
    
    if (workflow) {
        workflow.forEach(rec => {
            const tool = getTool(rec.tool);
            if (tool && rec.condition()) {
                recommendations.push({
                    tool,
                    reason: rec.reason
                });
            }
        });
    }
    
    return recommendations;
}

// ── Related Tools UI Builder ───────────────────────────────────

/**
 * Build related tools HTML
 * @param {string} currentSlug - Current calculator slug
 * @param {Object} options - Options
 * @returns {string} HTML string
 */
export function buildRelatedToolsHtml(currentSlug, options = {}) {
    const {
        limit = 4,
        title = 'Related Calculators',
        showDescription = true
    } = options;
    
    const relatedTools = getRelatedTools(currentSlug, { limit });
    
    if (relatedTools.length === 0) {
        return '';
    }
    
    const toolsHtml = relatedTools.map(tool => {
        const description = showDescription && tool.description 
            ? `<p class="related-tool-desc">${escapeHtml(tool.description)}</p>` 
            : '';
        
        return `
            <a href="/tool?slug=${tool.id}" class="related-tool-card">
                <div class="related-tool-icon">
                    <i class="fa-solid ${tool.icon || 'fa-calculator'}"></i>
                </div>
                <div class="related-tool-info">
                    <h4>${escapeHtml(tool.name)}</h4>
                    ${description}
                    <span class="related-tool-category">${escapeHtml(tool.category)}</span>
                </div>
            </a>
        `;
    }).join('');
    
    return `
        <div class="related-tools-section">
            <h3 class="related-tools-title">
                <i class="fa-solid fa-link"></i>
                ${escapeHtml(title)}
            </h3>
            <div class="related-tools-grid">
                ${toolsHtml}
            </div>
        </div>
    `;
}

/**
 * Build recommendations HTML
 * @param {string} currentSlug - Current calculator slug
 * @param {Object} context - User context
 * @returns {string} HTML string
 */
export function buildRecommendationsHtml(currentSlug, context = {}) {
    const recommendations = getRecommendations({
        currentTool: currentSlug,
        ...context
    });
    
    if (recommendations.length === 0) {
        return '';
    }
    
    const recsHtml = recommendations.map(tool => `
        <a href="/tool?slug=${tool.id}" class="recommendation-card">
            <div class="recommendation-icon">
                <i class="fa-solid ${tool.icon || 'fa-calculator'}"></i>
            </div>
            <div class="recommendation-content">
                <h4>${escapeHtml(tool.name)}</h4>
                <p>${escapeHtml(tool.description || 'Try this calculator')}</p>
            </div>
            <div class="recommendation-arrow">
                <i class="fa-solid fa-arrow-right"></i>
            </div>
        </a>
    `).join('');
    
    return `
        <div class="recommendations-section">
            <h3 class="recommendations-title">
                <i class="fa-solid fa-lightbulb"></i>
                You Might Also Like
            </h3>
            <div class="recommendations-list">
                ${recsHtml}
            </div>
        </div>
    `;
}

// ── Category Navigation ────────────────────────────────────────

/**
 * Build category navigation HTML
 * @param {string} currentSlug - Current calculator slug
 * @returns {string} HTML string
 */
export function buildCategoryNavHtml(currentSlug) {
    const tool = getTool(currentSlug);
    
    if (!tool) {
        return '';
    }
    
    const categoryTools = getToolsByCategory(tool.category, 10)
        .filter(t => t.id !== currentSlug);
    
    if (categoryTools.length === 0) {
        return '';
    }
    
    const navItems = categoryTools.map(t => `
        <a href="/tool?slug=${t.id}" class="category-nav-item ${t.id === currentSlug ? 'active' : ''}">
            <i class="fa-solid ${t.icon || 'fa-calculator'}"></i>
            <span>${escapeHtml(t.name)}</span>
        </a>
    `).join('');
    
    return `
        <nav class="category-navigation">
            <div class="category-nav-title">
                <i class="fa-solid fa-folder"></i>
                ${escapeHtml(tool.category)}
            </div>
            <div class="category-nav-items">
                ${navItems}
            </div>
        </nav>
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
console.log('Related tools module loaded');