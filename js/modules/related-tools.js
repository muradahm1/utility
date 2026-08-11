/**
 * Related Tools Module
 * 
 * Dynamic internal linking based on categories, tags, and user context.
 * 
 * @module modules/related-tools
 */

import { getTool, getToolsByCategory, searchToolsAdvanced } from '../core/tools.js';
import { escapeHtml } from '../utils/index.js';

export function getRelatedTools(slug, options = {}) {
    const { limit = 4 } = options;
    const tool = getTool(slug);
    if (!tool) return [];
    
    const related = [];
    const seen = new Set([slug]);
    
    if (tool.related && Array.isArray(tool.related)) {
        tool.related.forEach(relatedSlug => {
            if (!seen.has(relatedSlug)) {
                const relatedTool = getTool(relatedSlug);
                if (relatedTool) {
                    related.push({ slug: relatedSlug, ...relatedTool });
                    seen.add(relatedSlug);
                }
            }
        });
    }
    
    if (related.length < limit) {
        const sameCategory = getToolsByCategory(tool.category);
        sameCategory.forEach(t => {
            if (!seen.has(t.slug) && related.length < limit) {
                related.push(t);
                seen.add(t.slug);
            }
        });
    }
    
    return related.slice(0, limit);
}

export function getRecommendations(context) {
    const { currentSlug, category, searchQuery } = context;
    const recommendations = [];
    
    if (currentSlug) {
        const related = getRelatedTools(currentSlug, { limit: 3 });
        recommendations.push(...related.map(t => ({ ...t, reason: 'related' })));
    }
    
    if (category) {
        const categoryTools = getToolsByCategory(category);
        categoryTools.slice(0, 4).forEach(t => {
            if (!recommendations.find(r => r.slug === t.slug)) {
                recommendations.push({ ...t, reason: 'category' });
            }
        });
    }
    
    if (searchQuery) {
        const searchResults = searchToolsAdvanced(searchQuery, { limit: 5 });
        searchResults.forEach(t => {
            if (!recommendations.find(r => r.slug === t.slug)) {
                recommendations.push({ ...t, reason: 'search' });
            }
        });
    }
    
    return recommendations.slice(0, 6);
}

export function buildRelatedToolsHtml(slug, options = {}) {
    const { limit = 4 } = options;
    const related = getRelatedTools(slug, { limit });
    
    if (!related.length) return '';
    
    const cards = related.map(t => `
        <a href="/tool?slug=${encodeURIComponent(t.slug)}" class="tool-card">
            <div class="tool-icon ${escapeHtml(t.iconClass || 'icon-finance')}">
                <i class="fa-solid ${escapeHtml(t.icon || 'fa-calculator')}"></i>
            </div>
            <h3 style="font-size:14px;margin-bottom:4px;">${escapeHtml(t.name)}</h3>
            <p style="font-size:12px;color:var(--text-secondary);">${escapeHtml(t.description || '')}</p>
            <span class="tag ${escapeHtml(t.tagClass || 'tag-finance')}">${escapeHtml(t.category)}</span>
        </a>
    `).join('');
    
    return `
        <div class="tool-runner-card" style="margin-top:24px;">
            <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Related Calculators</h2>
            <div class="tools-grid">${cards}</div>
        </div>
    `;
}

export function buildRecommendationsHtml(slug, context = {}) {
    const recommendations = getRecommendations({ currentSlug: slug, ...context });
    
    if (!recommendations.length) return '';
    
    const cards = recommendations.map(t => `
        <a href="/tool?slug=${encodeURIComponent(t.slug)}" class="tool-card">
            <div class="tool-icon ${escapeHtml(t.iconClass || 'icon-finance')}">
                <i class="fa-solid ${escapeHtml(t.icon || 'fa-calculator')}"></i>
            </div>
            <h3 style="font-size:14px;margin-bottom:4px;">${escapeHtml(t.name)}</h3>
            <p style="font-size:12px;color:var(--text-secondary);">${escapeHtml(t.description || '')}</p>
        </a>
    `).join('');
    
    return `
        <div class="tool-runner-card" style="margin-top:24px;">
            <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Recommended For You</h2>
            <div class="tools-grid">${cards}</div>
        </div>
    `;
}

export function buildCategoryNavHtml(slug) {
    const tool = getTool(slug);
    if (!tool || !tool.category) return '';
    
    const categoryTools = getToolsByCategory(tool.category);
    const links = categoryTools
        .filter(t => t.slug !== slug)
        .slice(0, 5)
        .map(t => `<a href="/tool?slug=${encodeURIComponent(t.slug)}" class="nav-chip">${escapeHtml(t.name)}</a>`)
        .join('');
    
    if (!links) return '';
    
    return `
        <div class="category-nav" style="margin-top:24px;padding:16px;background:var(--bg-main);border-radius:var(--radius-md);">
            <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;">More ${escapeHtml(tool.category)} Calculators:</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">${links}</div>
        </div>
    `;
}
