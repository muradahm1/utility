/**
 * Core Tools Registry
 * 
 * Single registry for all calculators with:
 * - Tool registration and lookup
 * - Category management
 * - Search functionality
 * - Related tool lookup
 * - Dynamic loading support
 * 
 * @module core/tools
 */

// ── Tool Registry ──────────────────────────────────────────────
/**
 * Central registry of all available calculators/tools
 * @type {Object<string, Object>}
 */
export const TOOLS = {};

if (typeof window !== 'undefined' && window.TOOLS && typeof window.TOOLS === 'object') {
    Object.assign(TOOLS, window.TOOLS);
}

// ── Registry Management ────────────────────────────────────────

/**
 * Register a new tool in the registry
 * @param {string} slug - Unique identifier for the tool
 * @param {Object} toolDefinition - Complete tool definition object
 * @returns {boolean} Success status
 */
export function registerTool(slug, toolDefinition) {
    if (!slug || typeof slug !== 'string') {
        console.error('Invalid tool slug provided');
        return false;
    }
    
    if (!toolDefinition || typeof toolDefinition !== 'object') {
        console.error('Invalid tool definition provided for slug:', slug);
        return false;
    }
    
    // Validate required fields
    const requiredFields = ['name', 'category', 'description', 'fields', 'calculate'];
    const missingFields = requiredFields.filter(field => !(field in toolDefinition));
    
    if (missingFields.length > 0) {
        console.error(`Tool "${slug}" missing required fields:`, missingFields.join(', '));
        return false;
    }
    
    // Ensure id matches slug
    toolDefinition.id = slug;
    
    // Register the tool
    TOOLS[slug] = toolDefinition;
    return true;
}

/**
 * Unregister a tool from the registry
 * @param {string} slug - Tool identifier to remove
 * @returns {boolean} Success status
 */
export function unregisterTool(slug) {
    if (TOOLS[slug]) {
        delete TOOLS[slug];
        return true;
    }
    return false;
}

/**
 * Get a tool by its slug
 * @param {string} slug - Tool identifier
 * @returns {Object|undefined} Tool definition or undefined
 */
export function getTool(slug) {
    if (TOOLS[slug]) return TOOLS[slug];
    if (typeof window !== 'undefined' && window.TOOLS && window.TOOLS[slug]) {
        TOOLS[slug] = window.TOOLS[slug];
        return TOOLS[slug];
    }
    return undefined;
}

/**
 * Get all registered tools
 * @returns {Object} Complete tools registry
 */
export function getAllTools() {
    return { ...TOOLS };
}

/**
 * Get the count of registered tools
 * @returns {number} Number of registered tools
 */
export function getToolCount() {
    return Object.keys(TOOLS).length;
}

// ── Category Management ────────────────────────────────────────

/**
 * Get all unique categories
 * @returns {Array<string>} Sorted array of category names
 */
export function getCategories() {
    const categories = new Set();
    Object.values(TOOLS).forEach(tool => {
        if (tool.category) {
            categories.add(tool.category);
        }
    });
    return Array.from(categories).sort();
}

/**
 * Get tools by category
 * @param {string} category - Category name to filter by
 * @returns {Array<Object>} Array of tool definitions
 */
export function getToolsByCategory(category) {
    return Object.entries(TOOLS)
        .filter(([slug, tool]) => tool.category === category)
        .map(([slug, tool]) => ({ slug, ...tool }));
}

/**
 * Group tools by category
 * @returns {Object<Object>} Object with category names as keys and tool arrays as values
 */
export function getToolsGroupedByCategory() {
    const grouped = {};
    Object.entries(TOOLS).forEach(([slug, tool]) => {
        const category = tool.category || 'Uncategorized';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push({ slug, ...tool });
    });
    return grouped;
}

// ── Search Functionality ───────────────────────────────────────

/**
 * Search tools by query string
 * Searches in name, description, and category
 * @param {string} query - Search query
 * @returns {Array<Object>} Array of matching tool definitions with slugs
 */
export function searchTools(query) {
    if (!query || typeof query !== 'string') {
        return [];
    }
    
    const searchTerm = query.toLowerCase().trim();
    const searchFields = ['name', 'description', 'category', 'metaDescription'];
    
    return Object.entries(TOOLS)
        .filter(([slug, tool]) => {
            return searchFields.some(field => {
                const value = tool[field];
                return value && typeof value === 'string' && value.toLowerCase().includes(searchTerm);
            });
        })
        .map(([slug, tool]) => ({ slug, ...tool }));
}

/**
 * Advanced search with weighted relevance
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum results to return (default: 20)
 * @returns {Array<Object>} Sorted array of matching tools with relevance scores
 */
export function searchToolsAdvanced(query, options = {}) {
    const { limit = 20 } = options;
    
    if (!query || typeof query !== 'string') {
        return [];
    }
    
    const searchTerm = query.toLowerCase().trim();
    const results = [];
    
    Object.entries(TOOLS).forEach(([slug, tool]) => {
        let score = 0;
        const matches = [];
        
        // Exact name match (highest weight)
        if (tool.name && tool.name.toLowerCase() === searchTerm) {
            score += 100;
            matches.push('exact_name');
        }
        // Name contains
        else if (tool.name && tool.name.toLowerCase().includes(searchTerm)) {
            score += 50;
            matches.push('name');
        }
        
        // Description contains
        if (tool.description && tool.description.toLowerCase().includes(searchTerm)) {
            score += 25;
            matches.push('description');
        }
        
        // Category match
        if (tool.category && tool.category.toLowerCase().includes(searchTerm)) {
            score += 20;
            matches.push('category');
        }
        
        // Meta description
        if (tool.metaDescription && tool.metaDescription.toLowerCase().includes(searchTerm)) {
            score += 15;
            matches.push('meta');
        }
        
        // Keywords
        if (tool.keywords && Array.isArray(tool.keywords)) {
            const keywordMatch = tool.keywords.some(kw => 
                kw.toLowerCase().includes(searchTerm)
            );
            if (keywordMatch) {
                score += 30;
                matches.push('keywords');
            }
        }
        
        if (score > 0) {
            results.push({
                slug,
                ...tool,
                _score: score,
                _matches: matches
            });
        }
    });
    
    // Sort by relevance score (descending)
    results.sort((a, b) => b._score - a._score);
    
    // Apply limit
    return results.slice(0, limit);
}

// ── Related Tools ──────────────────────────────────────────────

/**
 * Get related tools for a given tool
 * Checks explicit 'related' array first, then falls back to same category
 * @param {string} slug - Tool identifier
 * @param {number} limit - Maximum number of related tools to return (default: 4)
 * @returns {Array<Object>} Array of related tool definitions
 */
export function getRelatedTools(slug, limit = 4) {
    const tool = TOOLS[slug];
    if (!tool) {
        return [];
    }
    
    const related = [];
    const seen = new Set([slug]);
    
    // First, check explicit related array
    if (tool.related && Array.isArray(tool.related)) {
        tool.related.forEach(relatedSlug => {
            if (!seen.has(relatedSlug) && TOOLS[relatedSlug]) {
                related.push({ slug: relatedSlug, ...TOOLS[relatedSlug] });
                seen.add(relatedSlug);
            }
        });
    }
    
    // If not enough, add tools from same category
    if (related.length < limit) {
        Object.entries(TOOLS)
            .filter(([s, t]) => !seen.has(s) && t.category === tool.category)
            .forEach(([s, t]) => {
                if (related.length < limit) {
                    related.push({ slug: s, ...t });
                    seen.add(s);
                }
            });
    }
    
    return related.slice(0, limit);
}

/**
 * Get tools that share the same category
 * @param {string} slug - Tool identifier
 * @param {number} limit - Maximum number to return (default: 4)
 * @returns {Array<Object>} Array of tools in the same category
 */
export function getToolsInSameCategory(slug, limit = 4) {
    const tool = TOOLS[slug];
    if (!tool || !tool.category) {
        return [];
    }
    
    return Object.entries(TOOLS)
        .filter(([s, t]) => s !== slug && t.category === tool.category)
        .map(([slug, tool]) => ({ slug, ...tool }))
        .slice(0, limit);
}

// ── Tool Metadata ──────────────────────────────────────────────

/**
 * Get tool metadata (name, description, category, icon)
 * @param {string} slug - Tool identifier
 * @returns {Object|undefined} Tool metadata or undefined
 */
export function getToolMetadata(slug) {
    const tool = TOOLS[slug];
    if (!tool) return undefined;
    
    return {
        id: tool.id || slug,
        name: tool.name,
        category: tool.category,
        icon: tool.icon,
        iconClass: tool.iconClass,
        tagClass: tool.tagClass,
        description: tool.description,
        metaDescription: tool.metaDescription,
        metaTitle: tool.metaTitle,
        keywords: tool.keywords
    };
}

/**
 * Get all tool slugs
 * @returns {Array<string>} Array of tool slugs
 */
export function getAllToolSlugs() {
    return Object.keys(TOOLS);
}

/**
 * Check if a tool exists
 * @param {string} slug - Tool identifier
 * @returns {boolean} True if tool exists
 */
export function toolExists(slug) {
    return slug in TOOLS;
}

// ── Dynamic Loading Support ────────────────────────────────────

/**
 * Preload tool definitions (for lazy loading scenarios)
 * @param {Array<string>} slugs - Array of tool slugs to preload
 * @returns {Promise<Array<Object>>} Array of loaded tool definitions
 */
export async function preloadTools(slugs) {
    const promises = slugs.map(slug => {
        return new Promise((resolve) => {
            // Simulate async loading (in real scenario, might fetch from server)
            setTimeout(() => {
                const tool = getTool(slug);
                resolve(tool || null);
            }, 0);
        });
    });
    
    return Promise.all(promises);
}

/**
 * Load tool on demand
 * @param {string} slug - Tool identifier
 * @returns {Promise<Object|undefined>} Tool definition or undefined
 */
export async function loadTool(slug) {
    // In current architecture, tools are already loaded
    // This function provides a hook for future dynamic loading
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getTool(slug));
        }, 0);
    });
}

// ── Utility Functions ──────────────────────────────────────────

/**
 * Validate tool structure
 * @param {string} slug - Tool identifier
 * @returns {Object} Validation result with isValid and errors
 */
export function validateTool(slug) {
    const tool = TOOLS[slug];
    
    if (!tool) {
        return {
            isValid: false,
            errors: [`Tool "${slug}" not found in registry`]
        };
    }
    
    const errors = [];
    const requiredFields = ['name', 'category', 'description', 'fields', 'calculate'];
    
    requiredFields.forEach(field => {
        if (!(field in tool)) {
            errors.push(`Missing required field: ${field}`);
        }
    });
    
    // Validate fields array
    if (tool.fields && !Array.isArray(tool.fields)) {
        errors.push('Field "fields" must be an array');
    }
    
    // Validate calculate function
    if (tool.calculate && typeof tool.calculate !== 'function') {
        errors.push('Field "calculate" must be a function');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings: []
    };
}

/**
 * Get registry statistics
 * @returns {Object} Registry stats
 */
export function getRegistryStats() {
    const stats = {
        totalTools: Object.keys(TOOLS).length,
        categories: {},
        toolsWithCharts: 0,
        toolsWithFAQs: 0,
        toolsWithArticles: 0
    };
    
    Object.values(TOOLS).forEach(tool => {
        // Count by category
        const cat = tool.category || 'Uncategorized';
        stats.categories[cat] = (stats.categories[cat] || 0) + 1;
        
        // Count features
        if (tool.chart || tool.chart2 || tool.compareChart || tool.chart3) {
            stats.toolsWithCharts++;
        }
        if (tool.faqs && tool.faqs.length) {
            stats.toolsWithFAQs++;
        }
        if (tool.article) {
            stats.toolsWithArticles++;
        }
    });
    
    return stats;
}

// ── Backward Compatibility ─────────────────────────────────────

/**
 * Export tools in legacy format for backward compatibility
 * @returns {Object} Legacy TOOLS object
 */
export function getLegacyTools() {
    return TOOLS;
}