/**
 * Core Router
 * 
 * Handles URL parsing, calculator lookup, navigation, and deep linking
 * 
 * @module core/router
 */

import { getTool, toolExists, getAllToolSlugs, getCategories } from './tools.js';

// ── Router State ───────────────────────────────────────────────

const routerState = {
    currentSlug: null,
    previousSlug: null,
    queryParams: {},
    history: [],
    maxHistoryLength: 50
};

// ── URL Parsing ────────────────────────────────────────────────

/**
 * Parse current URL and extract tool slug and query parameters
 * @returns {Object} Parsed URL data with slug and queryParams
 */
export function parseCurrentUrl() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    const slug = params.get('slug');
    const queryParams = {};
    
    // Extract all query parameters
    params.forEach((value, key) => {
        if (key !== 'slug') {
            queryParams[key] = value;
        }
    });
    
    return {
        slug: slug || null,
        queryParams,
        pathname: url.pathname,
        hash: url.hash,
        fullUrl: url.href
    };
}

/**
 * Get tool slug from URL
 * @returns {string|null} Tool slug or null
 */
export function getSlugFromUrl() {
    return parseCurrentUrl().slug;
}

/**
 * Get query parameters from URL
 * @returns {Object} Query parameters object
 */
export function getQueryParams() {
    return parseCurrentUrl().queryParams;
}

// ── Tool Lookup ────────────────────────────────────────────────

/**
 * Find and validate tool from URL
 * @param {string|null} slug - Tool slug from URL
 * @returns {Object} Result with tool, isValid, and error message
 */
export function resolveToolFromUrl(slug) {
    // No slug provided
    if (!slug) {
        return {
            tool: null,
            isValid: false,
            error: 'No calculator specified. Please provide a valid calculator slug.',
            errorType: 'missing_slug'
        };
    }
    
    // Check if tool exists
    if (!toolExists(slug)) {
        return {
            tool: null,
            isValid: false,
            error: `Calculator "${slug}" not found. It may have been moved or removed.`,
            errorType: 'not_found',
            suggestions: getSuggestedTools(slug)
        };
    }
    
    // Tool found
    const tool = getTool(slug);
    return {
        tool,
        isValid: true,
        error: null,
        errorType: null
    };
}

/**
 * Get suggested tools based on partial slug match
 * @param {string} slug - Slug to match against
 * @param {number} limit - Maximum suggestions (default: 4)
 * @returns {Array<Object>} Array of suggested tools
 */
export function getSuggestedTools(slug, limit = 4) {
    const allSlugs = getAllToolSlugs();
    const lowerSlug = slug.toLowerCase();
    
    // Find tools with similar slugs (fuzzy match)
    const suggestions = allSlugs
        .filter(s => s.includes(lowerSlug) || lowerSlug.includes(s))
        .slice(0, limit);
    
    // If no slug matches, suggest popular tools
    if (suggestions.length === 0) {
        const popularTools = ['mortgage-calculator', 'bmi-calculator', 'loan-calculator', 'percentage-calculator'];
        return popularTools
            .filter(s => allSlugs.includes(s))
            .slice(0, limit)
            .map(s => ({ slug: s, ...getTool(s) }));
    }
    
    return suggestions.map(s => ({ slug: s, ...getTool(s) }));
}

// ── Navigation ─────────────────────────────────────────────────

/**
 * Navigate to a specific tool
 * @param {string} slug - Tool slug to navigate to
 * @param {Object} options - Navigation options
 * @param {boolean} options.replace - Replace current history entry (default: false)
 * @param {boolean} options.animate - Animate transition (default: true)
 */
export function navigateToTool(slug, options = {}) {
    const { replace = false, animate = true } = options;
    
    if (!toolExists(slug)) {
        console.error('Cannot navigate to non-existent tool:', slug);
        return false;
    }
    
    // Update router state
    routerState.previousSlug = routerState.currentSlug;
    routerState.currentSlug = slug;
    
    // Build URL
    const url = new URL(window.location.href);
    url.searchParams.set('slug', slug);
    
    // Remove other query params if needed
    if (!animate) {
        url.search = `slug=${encodeURIComponent(slug)}`;
    }
    
    // Navigate
    if (replace) {
        window.history.replaceState({ slug }, '', url);
    } else {
        window.history.pushState({ slug }, '', url);
    }
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('tool:navigate', {
        detail: {
            slug,
            previousSlug: routerState.previousSlug,
            replace,
            timestamp: Date.now()
        }
    }));
    
    return true;
}

/**
 * Navigate to home page
 * @param {boolean} replace - Replace current history entry
 */
export function navigateToHome(replace = false) {
    const url = new URL(window.location.href);
    url.search = '';
    
    if (replace) {
        window.history.replaceState({}, '', url);
    } else {
        window.history.pushState({}, '', url);
    }
    
    routerState.previousSlug = routerState.currentSlug;
    routerState.currentSlug = null;
    
    window.dispatchEvent(new CustomEvent('tool:navigate', {
        detail: {
            slug: null,
            previousSlug: routerState.previousSlug,
            replace,
            timestamp: Date.now()
        }
    }));
}

/**
 * Go back to previous tool
 */
export function navigateBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        navigateToHome();
    }
}

/**
 * Go forward to next tool in history
 */
export function navigateForward() {
    if (window.history.length > 1) {
        window.history.forward();
    }
}

// ── Browser History Management ─────────────────────────────────

/**
 * Initialize browser history handling
 * @returns {Function} Cleanup function
 */
export function initBrowserHistory() {
    // Handle back/forward navigation
    window.addEventListener('popstate', (event) => {
        const { slug } = parseCurrentUrl();
        
        routerState.previousSlug = routerState.currentSlug;
        routerState.currentSlug = slug;
        
        window.dispatchEvent(new CustomEvent('tool:popstate', {
            detail: {
                slug,
                previousSlug: routerState.previousSlug,
                state: event.state,
                timestamp: Date.now()
            }
        }));
    });
    
    // Track navigation history
    window.addEventListener('tool:navigate', (event) => {
        routerState.history.push({
            slug: event.detail.slug,
            timestamp: event.detail.timestamp
        });
        
        // Trim history if too long
        if (routerState.history.length > routerState.maxHistoryLength) {
            routerState.history.shift();
        }
    });
    
    return () => {
        // Cleanup function
        window.removeEventListener('popstate', () => {});
    };
}

/**
 * Get navigation history
 * @returns {Array} Array of navigation history entries
 */
export function getNavigationHistory() {
    return [...routerState.history];
}

/**
 * Clear navigation history
 */
export function clearNavigationHistory() {
    routerState.history = [];
}

// ── Deep Linking ───────────────────────────────────────────────

/**
 * Create a deep link URL for a tool
 * @param {string} slug - Tool slug
 * @param {Object} params - Additional query parameters
 * @returns {string} Full URL
 */
export function createDeepLink(slug, params = {}) {
    const url = new URL(window.location.origin + '/tool');
    url.searchParams.set('slug', slug);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
        }
    });
    
    return url.toString();
}

/**
 * Share current tool URL
 * @param {string} slug - Tool slug
 * @returns {Promise<boolean>} Success status
 */
export async function shareTool(slug) {
    const url = createDeepLink(slug);
    const tool = getTool(slug);
    
    const shareData = {
        title: tool ? tool.name : 'Calculator',
        text: tool ? tool.description : 'Check out this calculator',
        url: url
    };
    
    try {
        if (navigator.share) {
            await navigator.share(shareData);
            return true;
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            return true;
        }
    } catch (err) {
        console.error('Share failed:', err);
    }
    
    return false;
}

/**
 * Copy tool URL to clipboard
 * @param {string} slug - Tool slug
 * @returns {Promise<boolean>} Success status
 */
export async function copyToolUrl(slug) {
    const url = createDeepLink(slug);
    
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            return true;
        }
    } catch (err) {
        console.error('Copy failed:', err);
    }
    
    return false;
}

// ── Route Handling ─────────────────────────────────────────────

/**
 * Handle invalid or missing tool URLs
 * @param {string} slug - Invalid slug
 * @returns {Object} Error handling result
 */
export function handleInvalidUrl(slug) {
    const result = resolveToolFromUrl(slug);
    
    if (result.isValid) {
        return result;
    }
    
    // Log error
    console.error('Invalid URL:', result.error);
    
    // Dispatch error event
    window.dispatchEvent(new CustomEvent('tool:error', {
        detail: {
            error: result.error,
            errorType: result.errorType,
            slug: slug,
            suggestions: result.suggestions,
            timestamp: Date.now()
        }
    }));
    
    return result;
}

/**
 * Validate URL and return appropriate action
 * @returns {Object} Route handling result
 */
export function handleRoute() {
    const { slug } = parseCurrentUrl();
    
    // Home page (no slug)
    if (!slug) {
        return {
            action: 'home',
            tool: null,
            isValid: true
        };
    }
    
    // Validate tool
    const result = resolveToolFromUrl(slug);
    
    if (result.isValid) {
        return {
            action: 'tool',
            tool: result.tool,
            isValid: true,
            slug
        };
    }
    
    // Invalid tool
    return {
        action: 'error',
        tool: null,
        isValid: false,
        error: result.error,
        errorType: result.errorType,
        suggestions: result.suggestions,
        slug
    };
}

// ── Router Initialization ──────────────────────────────────────

/**
 * Initialize the router
 * @returns {Object} Router API
 */
export function initRouter() {
    // Initialize browser history
    initBrowserHistory();
    
    // Handle initial route
    const route = handleRoute();
    
    // Dispatch initial route event
    window.dispatchEvent(new CustomEvent('router:ready', {
        detail: {
            route,
            currentSlug: routerState.currentSlug,
            timestamp: Date.now()
        }
    }));
    
    return {
        // State
        getCurrentSlug: () => routerState.currentSlug,
        getPreviousSlug: () => routerState.previousSlug,
        getState: () => ({ ...routerState }),
        
        // Navigation
        navigateTo: navigateToTool,
        navigateToHome,
        navigateBack,
        navigateForward,
        
        // URL handling
        parseUrl: parseCurrentUrl,
        getSlug: getSlugFromUrl,
        getParams: getQueryParams,
        createDeepLink,
        
        // Tool lookup
        resolveTool: resolveToolFromUrl,
        handleRoute,
        
        // Sharing
        share: shareTool,
        copyUrl: copyToolUrl,
        
        // History
        getHistory: getNavigationHistory,
        clearHistory: clearNavigationHistory
    };
}

// ── Utility Functions ──────────────────────────────────────────

/**
 * Check if current URL matches a pattern
 * @param {string} pattern - URL pattern to match
 * @returns {boolean} True if matches
 */
export function urlMatches(pattern) {
    const url = new URL(window.location.href);
    const pathname = url.pathname;
    
    // Convert pattern to regex
    const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pathname);
}

/**
 * Get canonical URL for current page
 * @param {string} slug - Tool slug (optional)
 * @returns {string} Canonical URL
 */
export function getCanonicalUrl(slug = null) {
    const toolSlug = slug || getSlugFromUrl();
    
    if (toolSlug) {
        return `${window.location.origin}/tool?slug=${encodeURIComponent(toolSlug)}`;
    }
    
    return window.location.origin;
}

/**
 * Update URL without reloading page
 * @param {Object} updates - URL updates
 * @param {string} updates.slug - New slug
 * @param {Object} updates.params - Query parameters
 * @param {boolean} updates.replace - Replace history entry
 */
export function updateUrl(updates = {}) {
    const { slug, params = {}, replace = false } = updates;
    const url = new URL(window.location.href);
    
    if (slug !== undefined) {
        if (slug) {
            url.searchParams.set('slug', slug);
        } else {
            url.searchParams.delete('slug');
        }
    }
    
    // Update query parameters
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
    });
    
    // Update history
    if (replace) {
        window.history.replaceState({}, '', url);
    } else {
        window.history.pushState({}, '', url);
    }
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('url:updated', {
        detail: { url: url.href, timestamp: Date.now() }
    }));
}

// Log router initialization
console.log('Core Router initialized');
console.log('Current slug:', routerState.currentSlug);