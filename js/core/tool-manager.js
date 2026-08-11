/**
 * Tool Manager
 * 
 * Central system for managing, adding, and organizing tools.
 * Provides a unified API for tool registration, discovery, and management.
 * Supports both legacy (js/tools.js) and modular (js/calculators/) tools.
 * 
 * @module core/tool-manager
 */

import { TOOLS, registerTool, getTool, getAllTools, getToolCount, getCategories, getToolsByCategory, getToolsGroupedByCategory, searchTools, searchToolsAdvanced, getRelatedTools, getToolsInSameCategory, getToolMetadata, getAllToolSlugs, toolExists, validateTool, getRegistryStats } from './tools.js';

// ── Tool Manager State ──────────────────────────────────────────

const managerState = {
    initialized: false,
    legacyToolsLoaded: false,
    categoryModulesLoaded: false,
    totalTools: 0,
    lastSync: null
};

// ── Tool Registration API ───────────────────────────────────────

/**
 * Register a single tool
 * @param {string} slug - Tool slug
 * @param {Object} definition - Tool definition
 * @returns {boolean} Success
 */
export function addTool(slug, definition) {
    return registerTool(slug, definition);
}

/**
 * Register multiple tools at once
 * @param {Object} tools - Object of { slug: definition }
 * @returns {Object} Result with registered and failed counts
 */
export function addTools(tools) {
    let registered = 0;
    let failed = 0;
    const errors = [];
    
    Object.entries(tools).forEach(([slug, definition]) => {
        const success = registerTool(slug, definition);
        if (success) {
            registered++;
        } else {
            failed++;
            errors.push({ slug, error: 'Failed to register' });
        }
    });
    
    return { registered, failed, errors };
}

/**
 * Register tools from a category module
 * @param {Array} calculators - Array of calculator definitions
 * @param {string} category - Category name
 * @returns {Object} Result
 */
export function registerCategoryTools(calculators, category) {
    let registered = 0;
    let failed = 0;
    
    calculators.forEach(calculator => {
        if (!calculator.id) {
            console.error(`Calculator in ${category} missing id`);
            failed++;
            return;
        }
        
        // Ensure category is set
        if (!calculator.category) {
            calculator.category = category;
        }
        
        const success = registerTool(calculator.id, calculator);
        if (success) {
            registered++;
        } else {
            failed++;
        }
    });
    
    return { registered, failed };
}

// ── Tool Discovery ──────────────────────────────────────────────

/**
 * Get all tools with metadata
 * @returns {Array} Array of tool objects
 */
export function getAllToolsWithMeta() {
    return Object.entries(TOOLS).map(([slug, tool]) => ({
        slug,
        ...getToolMetadata(slug),
        hasChart: !!(tool.chart || tool.chart2 || tool.compareChart || tool.chart3),
        hasTable: !!tool.table,
        hasFaqs: !!(tool.faqs && tool.faqs.length),
        hasArticle: !!tool.article
    }));
}

/**
 * Get tools by category with metadata
 * @param {string} category - Category name
 * @returns {Array} Array of tool objects
 */
export function getCategoryTools(category) {
    return getToolsByCategory(category);
}

/**
 * Get all categories with tool counts
 * @returns {Array} Array of { name, count, tools }
 */
export function getCategorySummary() {
    const grouped = getToolsGroupedByCategory();
    return Object.entries(grouped).map(([name, tools]) => ({
        name,
        count: tools.length,
        tools: tools.map(t => ({ slug: t.slug, name: t.name, icon: t.icon, iconClass: t.iconClass }))
    }));
}

// ── Tool Validation ─────────────────────────────────────────────

/**
 * Validate all registered tools
 * @returns {Object} Validation results
 */
export function validateAllTools() {
    const results = {
        total: 0,
        valid: 0,
        invalid: 0,
        errors: []
    };
    
    Object.keys(TOOLS).forEach(slug => {
        results.total++;
        const validation = validateTool(slug);
        if (validation.isValid) {
            results.valid++;
        } else {
            results.invalid++;
            results.errors.push({
                slug,
                errors: validation.errors
            });
        }
    });
    
    return results;
}

/**
 * Check for duplicate tool IDs
 * @returns {Array} Array of duplicate slugs
 */
export function checkDuplicateIds() {
    const seen = new Set();
    const duplicates = [];
    
    Object.keys(TOOLS).forEach(slug => {
        if (seen.has(slug)) {
            duplicates.push(slug);
        }
        seen.add(slug);
    });
    
    return duplicates;
}

// ── Tool Search & Discovery ─────────────────────────────────────

/**
 * Search tools with relevance scoring
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Search results
 */
export function searchAllTools(query, options = {}) {
    return searchToolsAdvanced(query, options);
}

/**
 * Get popular tools
 * @param {number} limit - Number of tools
 * @returns {Array} Popular tools
 */
export function getPopularTools(limit = 6) {
    const popular = ['mortgage-calculator', 'bmi-calculator', 'percentage-calculator', 'loan-calculator', 'compound-interest-calculator', 'budget-planner'];
    return popular
        .filter(slug => toolExists(slug))
        .slice(0, limit)
        .map(slug => ({ slug, ...getTool(slug) }));
}

/**
 * Get recently added tools
 * @param {number} limit - Number of tools
 * @returns {Array} Recent tools
 */
export function getRecentTools(limit = 6) {
    // In a real system, this would track when tools were added
    // For now, return tools in reverse registration order
    return Object.entries(TOOLS)
        .slice(-limit)
        .reverse()
        .map(([slug, tool]) => ({ slug, ...tool }));
}

// ── Tool Management ─────────────────────────────────────────────

/**
 * Remove a tool from the registry
 * @param {string} slug - Tool slug
 * @returns {boolean} Success
 */
export function removeTool(slug) {
    if (TOOLS[slug]) {
        delete TOOLS[slug];
        return true;
    }
    return false;
}

/**
 * Update an existing tool
 * @param {string} slug - Tool slug
 * @param {Object} updates - Partial tool definition to update
 * @returns {boolean} Success
 */
export function updateTool(slug, updates) {
    if (!TOOLS[slug]) {
        console.error(`Tool "${slug}" not found`);
        return false;
    }
    
    TOOLS[slug] = { ...TOOLS[slug], ...updates };
    return true;
}

// ── Tool Template ───────────────────────────────────────────────

/**
 * Create a new tool from template
 * @param {Object} config - Tool configuration
 * @returns {Object} Tool definition
 */
export function createToolFromTemplate(config) {
    const {
        id,
        name,
        category = 'Finance',
        icon = 'fa-calculator',
        iconClass = 'icon-finance',
        tagClass = 'tag-finance',
        description = '',
        metaDescription = '',
        fields = [],
        calculate = () => ({ stats: [] }),
        faqs = [],
        article = null,
        howTo = [],
        examples = [],
        formula = ''
    } = config;
    
    return {
        id,
        name,
        category,
        icon,
        iconClass,
        tagClass,
        description,
        metaDescription,
        fields,
        calculate,
        faqs,
        article,
        howTo,
        examples,
        formula
    };
}

// ── Initialization ──────────────────────────────────────────────

/**
 * Initialize the tool manager
 * @returns {Object} Manager API
 */
export function initToolManager() {
    if (managerState.initialized) {
        return getManagerAPI();
    }
    
    // Load legacy tools from window.TOOLS
    if (typeof window !== 'undefined' && window.TOOLS) {
        const legacyTools = window.TOOLS;
        let registered = 0;
        
        Object.entries(legacyTools).forEach(([slug, tool]) => {
            if (!toolExists(slug)) {
                registerTool(slug, tool);
                registered++;
            }
        });
        
        managerState.legacyToolsLoaded = true;
    }
    
    managerState.initialized = true;
    managerState.totalTools = getToolCount();
    managerState.lastSync = new Date();
    
    return getManagerAPI();
}

/**
 * Get the manager API
 * @returns {Object} Manager API
 */
function getManagerAPI() {
    return {
        // Registration
        addTool,
        addTools,
        registerCategoryTools,
        removeTool,
        updateTool,
        
        // Discovery
        getAllTools: getAllToolsWithMeta,
        getCategoryTools,
        getCategorySummary,
        getPopularTools,
        getRecentTools,
        searchTools: searchAllTools,
        
        // Validation
        validateAllTools,
        checkDuplicateIds,
        
        // Stats
        getStats: () => ({
            total: getToolCount(),
            categories: getCategories(),
            ...getRegistryStats()
        }),
        
        // Template
        createTool: createToolFromTemplate,
        
        // State
        getState: () => ({ ...managerState })
    };
}

// ── Auto-initialize ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.ToolManager = initToolManager();
}