/**
 * Migration Adapter
 * 
 * Bridges legacy tool-runner.js with new core architecture
 * Ensures backward compatibility while enabling gradual migration
 * 
 * @module core/migration
 */

import { TOOLS as coreTOOLS, registerTool, getTool, toolExists } from './tools.js';
import { parseCurrentUrl, resolveToolFromUrl, handleRoute, initRouter } from './router.js';
import { initializeCalculator, escapeHtml, safeNum, safeStr, roundTo, formatCurrency } from './calculator-engine.js';

// Import category calculator modules
import { registerFinanceCalculators, financeCalculators } from '../calculators/finance.js';
import { registerHealthCalculators, healthCalculators } from '../calculators/health.js';

// ── Legacy Compatibility ─────────────────────────────────────

/**
 * Legacy helper functions (moved from tool-runner.js)
 * These maintain backward compatibility with existing calculators
 */
export const legacyHelpers = {
    esc: escapeHtml,
    fmt: formatCurrency,
    fmtN: (n) => safeNum(n, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    pct: (n) => (safeNum(n, 0) * 100).toFixed(2) + '%',
    safeNum,
    safeStr,
    roundTo,
    errorResult: (message) => ({ error: true, stats: [{ label: 'Error', value: message, warn: true }] }),
    bmiCategory: (bmi) => {
        if (!isFinite(bmi)) return { label: '—', color: '#64748B' };
        if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' };
        if (bmi < 25) return { label: 'Normal Weight', color: '#10B981' };
        if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
        return { label: 'Obese', color: '#EF4444' };
    },
    buildAmortization: (principal, r, n, payment) => {
        const rows = [];
        let balance = safeNum(principal, 0);
        for (let i = 1; i <= n; i++) {
            const interest = roundTo(balance * r, 2);
            let principalPaid = roundTo(payment - interest, 2);
            if (principalPaid > balance) principalPaid = balance;
            balance = roundTo(balance - principalPaid, 2);
            rows.push({ 
                month: i, 
                payment: (i === n && balance > 0) ? roundTo(principalPaid + balance, 2) : payment, 
                principal: principalPaid, 
                interest, 
                balance: Math.max(0, balance) 
            });
            if (balance <= 0 && i < n) break;
        }
        if (rows.length > 0) {
            rows[rows.length - 1].balance = 0;
            rows[rows.length - 1].payment = roundTo(rows[rows.length - 1].principal + rows[rows.length - 1].interest, 2);
        }
        return rows;
    }
};

// ── Tool Registration ──────────────────────────────────────────

/**
 * Register all legacy tools from TOOLS object
 * Call this once to migrate existing tools to the new registry
 */
export function registerLegacyTools() {
    let registered = 0;
    let failed = 0;
    
    // Get legacy tools from window.TOOLS (populated by js/tools.js)
    const legacyTools = typeof window !== 'undefined' && window.TOOLS ? window.TOOLS : {};
    
    Object.entries(legacyTools).forEach(([slug, tool]) => {
        // Skip if already registered
        if (toolExists(slug)) {
            registered++;
            return;
        }
        
        // Register tool
        const success = registerTool(slug, tool);
        if (success) {
            registered++;
        } else {
            failed++;
        }
    });
    
    return { registered, failed };
}

/**
 * Migrate a single tool to the new architecture
 * @param {string} slug - Tool slug
 * @param {Object} toolDefinition - Tool definition
 * @returns {boolean} Success status
 */
export function migrateTool(slug, toolDefinition) {
    return registerTool(slug, toolDefinition);
}

// ── Runner Migration ───────────────────────────────────────────

/**
 * Create a new-style tool runner instance
 * This replaces the legacy tool-runner.js pattern
 * @param {string} slug - Tool slug
 * @param {HTMLElement} container - Container element
 * @returns {Object} Calculator instance
 */
export function createToolRunner(slug, container) {
    if (!toolExists(slug)) {
        console.error('Tool not found:', slug);
        return null;
    }
    
    // Use the new calculator engine
    return initializeCalculator(slug, container);
}

/**
 * Initialize the new tool runner system
 * This replaces the DOMContentLoaded listener in tool-runner.js
 * @param {HTMLElement} container - Container element
 * @returns {Object|null} Calculator instance or null
 */
export function initToolRunner(container) {
    if (!container) {
        console.error('No container provided');
        return null;
    }
    
    // Get slug from URL
    const { slug } = parseCurrentUrl();
    
    // Handle missing slug
    if (!slug) {
        container.innerHTML = `
            <div class="tool-not-found">
                <div class="not-found-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Welcome to GetCalcu</h2>
                <p>Select a calculator from the home page to get started.</p>
                <a href="/" class="btn btn-primary"><i class="fa-solid fa-house"></i> Go to Home</a>
            </div>
        `;
        return null;
    }
    
    // Resolve tool
    const result = resolveToolFromUrl(slug);
    
    if (!result.isValid) {
        container.innerHTML = `
            <div class="tool-not-found">
                <div class="not-found-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h2>Tool Not Found</h2>
                <p>${escapeHtml(result.error)}</p>
                ${result.suggestions && result.suggestions.length > 0 ? `
                    <div style="margin-top:20px;">
                        <p style="font-weight:600;margin-bottom:10px;">Did you mean:</p>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
                            ${result.suggestions.map(s => `
                                <a href="/tool?slug=${encodeURIComponent(s.slug || s)}" class="btn btn-outline">
                                    ${escapeHtml(s.name || s)}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                <a href="/" class="btn btn-primary" style="margin-top:20px;"><i class="fa-solid fa-house"></i> Back to Home</a>
            </div>
        `;
        return null;
    }
    
    // Create calculator instance
    const calculator = createToolRunner(slug, container);
    
    if (!calculator) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Failed to initialize calculator. Please refresh the page.</p>
            </div>
        `;
        return null;
    }
    
    return calculator;
}

// ── SEO Helpers ────────────────────────────────────────────────

/**
 * Update SEO meta tags for a tool
 * @param {Object} tool - Tool definition
 * @param {string} slug - Tool slug
 */
export function updateSeoMeta(tool, slug) {
    const pageUrl = `https://www.getcalcu.com/tool?slug=${slug}`;
    
    // Title
    document.title = tool.metaTitle
        ? tool.metaTitle
        : (`${tool.name} — Free Online Calculator | GetCalcu`.length > 60
            ? `${tool.name} | Free Calculator — GetCalcu`
            : `${tool.name} — Free Online Calculator | GetCalcu`);
    
    // Description
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', tool.metaDescription);
    
    // Keywords
    if (tool.keywords && tool.keywords.length) {
        let kwMeta = document.querySelector('meta[name="keywords"]');
        if (!kwMeta) {
            kwMeta = document.createElement('meta');
            kwMeta.setAttribute('name', 'keywords');
            document.head.appendChild(kwMeta);
        }
        kwMeta.setAttribute('content', tool.keywords.join(', '));
    }
    
    // Canonical
    const canonicalTag = document.getElementById('canonical-tag');
    if (canonicalTag) canonicalTag.setAttribute('href', pageUrl);
    
    // Open Graph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${tool.name} | GetCalcu`);
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', tool.metaDescription);
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', pageUrl);
    
    // Twitter
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', `${tool.name} | GetCalcu`);
    
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', tool.metaDescription);
    
    // Schema.org markup
    addSchemaMarkup(tool, pageUrl);
}

/**
 * Add Schema.org structured data
 * @param {Object} tool - Tool definition
 * @param {string} pageUrl - Page URL
 */
export function addSchemaMarkup(tool, pageUrl) {
    // SoftwareApplication schema
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: tool.name,
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: tool.metaDescription,
        url: pageUrl,
    });
    document.head.appendChild(schemaScript);
    
    // BreadcrumbList schema
    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.getcalcu.com/' },
            { '@type': 'ListItem', position: 2, name: tool.category, item: `https://www.getcalcu.com/?category=${tool.category.toLowerCase()}` },
            { '@type': 'ListItem', position: 3, name: tool.name, item: pageUrl },
        ]
    });
    document.head.appendChild(breadcrumbScript);
    
    // FAQPage schema
    if (tool.faqs && tool.faqs.length) {
        const faqScript = document.createElement('script');
        faqScript.type = 'application/ld+json';
        faqScript.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: tool.faqs.map(f => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a }
            }))
        });
        document.head.appendChild(faqScript);
    }
    
    // TechArticle schema
    if (tool.article) {
        const articleScript = document.createElement('script');
        articleScript.type = 'application/ld+json';
        articleScript.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: tool.article.heading,
            description: tool.article.intro,
            author: { '@type': 'Organization', name: 'GetCalcu' },
            publisher: { '@type': 'Organization', name: 'GetCalcu', url: 'https://www.getcalcu.com/' },
            about: tool.name,
            url: pageUrl,
        });
        document.head.appendChild(articleScript);
    }
}

// ── Initialization ─────────────────────────────────────────────

let migrationInitialized = false;

/**
 * Initialize the migration layer
 * Call this once to set up backward compatibility
 */
export function initializeMigration() {
    // Prevent double initialization
    if (migrationInitialized) {
        return getMigrationAPI();
    }
    migrationInitialized = true;
    
    registerLegacyTools();
    
    // Register category-specific calculators (only if not already registered)
    // Pass toolExists to preserve richer legacy tool definitions
    registerFinanceCalculators(registerTool, toolExists);
    registerHealthCalculators(registerTool, toolExists);
    
    // Initialize router
    const router = initRouter();
    
    // Expose legacy globals
    if (typeof window !== 'undefined') {
        // Legacy helpers
        window.esc = escapeHtml;
        window.fmt = formatCurrency;
        window.fmtN = legacyHelpers.fmtN;
        window.pct = legacyHelpers.pct;
        window.safeNum = safeNum;
        window.safeStr = safeStr;
        window.roundTo = roundTo;
        window.errorResult = legacyHelpers.errorResult;
        window.bmiCategory = legacyHelpers.bmiCategory;
        window.buildAmortization = legacyHelpers.buildAmortization;
        
        // Core API
        window.CORE = window.CORE || {};
        window.CORE.helpers = legacyHelpers;
        window.CORE.router = router;
        window.CORE.migrateTool = migrateTool;
        window.CORE.registerLegacyTools = registerLegacyTools;
    }
    
    return getMigrationAPI();
}

/**
 * Get the migration API
 * @returns {Object} Migration API
 */
function getMigrationAPI() {
    return {
        helpers: legacyHelpers,
        router: window.CORE?.router || null,
        registerLegacyTools,
        migrateTool,
        createToolRunner,
        initToolRunner,
        updateSeoMeta
    };
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMigration);
    } else {
        initializeMigration();
    }
}
