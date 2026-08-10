/**
 * FAQ Module
 * 
 * Dynamic FAQ rendering and JSON-LD generation for SEO.
 * Provides consistent FAQ functionality across all calculators.
 * 
 * @module modules/faq
 */

// ── FAQ Data Management ────────────────────────────────────────

/**
 * FAQ item structure
 * @typedef {Object} FAQItem
 * @property {string} question - FAQ question
 * @property {string} answer - FAQ answer
 * @property {Array<string>} keywords - Related keywords
 */

/**
 * Create FAQ item
 * @param {string} question - Question text
 * @param {string} answer - Answer text
 * @param {Array<string>} keywords - Related keywords
 * @returns {FAQItem} FAQ item
 */
export function createFAQItem(question, answer, keywords = []) {
    return {
        question: question.trim(),
        answer: answer.trim(),
        keywords: keywords.map(k => k.toLowerCase().trim())
    };
}

/**
 * Filter FAQ items by search query
 * @param {Array<FAQItem>} faqs - FAQ items
 * @param {string} query - Search query
 * @returns {Array<FAQItem>} Matching FAQs
 */
export function searchFAQs(faqs, query) {
    if (!query || query.trim() === '') {
        return faqs;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const words = searchTerm.split(/\s+/);
    
    return faqs.filter(faq => {
        const question = faq.question.toLowerCase();
        const answer = faq.answer.toLowerCase();
        const keywords = faq.keywords.join(' ').toLowerCase();
        
        // Match if all words are found in question, answer, or keywords
        return words.every(word => 
            question.includes(word) || 
            answer.includes(word) || 
            keywords.includes(word)
        );
    });
}

// ── FAQ Rendering ──────────────────────────────────────────────

/**
 * Build FAQ HTML
 * @param {Array<FAQItem>} faqs - FAQ items
 * @param {Object} options - Rendering options
 * @param {boolean} options.collapsible - Make FAQs collapsible (default: true)
 * @param {boolean} options.showSearch - Show search box (default: false)
 * @param {string} options.title - Section title (default: 'Frequently Asked Questions')
 * @returns {string} HTML string
 */
export function buildFAQHtml(faqs, options = {}) {
    const {
        collapsible = true,
        showSearch = false,
        title = 'Frequently Asked Questions'
    } = options;
    
    if (!faqs || faqs.length === 0) {
        return '';
    }
    
    const faqItems = faqs.map((faq, index) => {
        if (collapsible) {
            return `
                <details class="faq-item" data-faq-index="${index}">
                    <summary class="faq-question">
                        <span>${escapeHtml(faq.question)}</span>
                        <i class="fa-solid fa-chevron-down faq-icon"></i>
                    </summary>
                    <div class="faq-answer">
                        <p>${escapeHtml(faq.answer)}</p>
                    </div>
                </details>
            `;
        } else {
            return `
                <div class="faq-item" data-faq-index="${index}">
                    <div class="faq-question">${escapeHtml(faq.question)}</div>
                    <div class="faq-answer">
                        <p>${escapeHtml(faq.answer)}</p>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    const searchHtml = showSearch ? `
        <div class="faq-search">
            <input type="text" 
                   id="faq-search-input" 
                   placeholder="Search FAQs..." 
                   class="faq-search-input"
                   aria-label="Search frequently asked questions">
            <i class="fa-solid fa-search faq-search-icon"></i>
        </div>
    ` : '';
    
    return `
        <div class="faq-section" data-faq-count="${faqs.length}">
            <h3 class="faq-title">
                <i class="fa-solid fa-circle-question"></i>
                ${escapeHtml(title)}
            </h3>
            ${searchHtml}
            <div class="faq-list">
                ${faqItems}
            </div>
        </div>
    `;
}

/**
 * Build calculator-specific FAQ
 * @param {Object} tool - Tool definition
 * @param {Object} options - Rendering options
 * @returns {string} HTML string
 */
export function buildCalculatorFAQ(tool, options = {}) {
    const faqs = tool.faqs || getDefaultFAQs(tool);
    return buildFAQHtml(faqs, options);
}

/**
 * Get default FAQs for a calculator
 * @param {Object} tool - Tool definition
 * @returns {Array<FAQItem>} Default FAQs
 */
function getDefaultFAQs(tool) {
    const faqs = [];
    
    // General FAQ
    faqs.push(createFAQItem(
        `How accurate is the ${tool.name}?`,
        `The ${tool.name} provides estimates based on standard financial formulas and the information you provide. While we strive for accuracy, actual results may vary based on additional factors not accounted for in this calculator.`,
        ['accuracy', 'accurate', 'reliable', 'estimate']
    ));
    
    faqs.push(createFAQItem(
        'What information do I need to use this calculator?',
        'You will need to provide the required input values as indicated in the form. Common inputs include principal amounts, interest rates, time periods, and other relevant financial figures.',
        ['information', 'input', 'required', 'needed']
    ));
    
    faqs.push(createFAQItem(
        'How often should I recalculate?',
        'You should recalculate whenever your financial situation changes or when market conditions (like interest rates) change significantly. For long-term planning, consider recalculating annually.',
        ['recalculate', 'how often', 'frequency', 'update']
    ));
    
    faqs.push(createFAQItem(
        'Are the results saved?',
        'No, calculations are performed in your browser and are not saved to our servers. Your financial data remains private and is only used for the current calculation session.',
        ['saved', 'save', 'privacy', 'data', 'stored']
    ));
    
    faqs.push(createFAQItem(
        'Can I export the results?',
        'Yes, you can export your calculation results in various formats including CSV, JSON, and plain text. Look for the export options below the results.',
        ['export', 'download', 'save', 'csv', 'json']
    ));
    
    return faqs;
}

// ── FAQ Search ─────────────────────────────────────────────────

/**
 * Initialize FAQ search functionality
 * @param {string} containerId - Container element ID
 * @param {Array<FAQItem>} faqs - FAQ items
 */
export function initFAQSearch(containerId, faqs) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const searchInput = container.querySelector('.faq-search-input');
    const faqList = container.querySelector('.faq-list');
    
    if (!searchInput || !faqList) return;
    
    // Debounce search
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const query = e.target.value;
            const filteredFaqs = searchFAQs(faqs, query);
            
            // Re-render FAQ list
            const faqHtml = filteredFaqs.map((faq, index) => `
                <details class="faq-item" data-faq-index="${index}">
                    <summary class="faq-question">
                        <span>${escapeHtml(faq.question)}</span>
                        <i class="fa-solid fa-chevron-down faq-icon"></i>
                    </summary>
                    <div class="faq-answer">
                        <p>${escapeHtml(faq.answer)}</p>
                    </div>
                </details>
            `).join('');
            
            faqList.innerHTML = faqHtml;
            
            // Show "no results" message if needed
            if (filteredFaqs.length === 0) {
                faqList.innerHTML = `
                    <div class="faq-no-results">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <p>No FAQs found matching your search.</p>
                    </div>
                `;
            }
        }, 300);
    });
}

// ── JSON-LD Generation ─────────────────────────────────────────

/**
 * Generate FAQPage JSON-LD schema
 * @param {Array<FAQItem>} faqs - FAQ items
 * @param {string} pageUrl - Page URL
 * @returns {string} JSON-LD schema markup
 */
export function generateFAQJsonLd(faqs, pageUrl) {
    if (!faqs || faqs.length === 0) {
        return '';
    }
    
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': pageUrl + '#faq',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    };
    
    return JSON.stringify(schema, null, 2);
}

/**
 * Add FAQ JSON-LD to page
 * @param {Array<FAQItem>} faqs - FAQ items
 * @param {string} pageUrl - Page URL
 */
export function addFAQJsonLd(faqs, pageUrl) {
    const jsonLd = generateFAQJsonLd(faqs, pageUrl);
    
    if (!jsonLd) return;
    
    // Remove existing FAQ schema
    const existing = document.querySelector('script[type="application/ld+json"][data-faq-schema]');
    if (existing) {
        existing.remove();
    }
    
    // Add new schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-faq-schema', 'true');
    script.textContent = jsonLd;
    document.head.appendChild(script);
}

// ── FAQ Analytics ──────────────────────────────────────────────

/**
 * Track FAQ interactions
 * @param {string} action - Action type: 'expand', 'collapse', 'search'
 * @param {Object} data - Additional data
 */
export function trackFAQInteraction(action, data = {}) {
    // Dispatch event for analytics
    window.dispatchEvent(new CustomEvent('faq:interaction', {
        detail: {
            action,
            timestamp: Date.now(),
            ...data
        }
    }));
    
    // Google Analytics integration (if available)
    if (typeof gtag === 'function') {
        gtag('event', 'faq_interaction', {
            event_category: 'FAQ',
            event_label: action,
            ...data
        });
    }
}

// ── Accessibility ──────────────────────────────────────────────

/**
 * Initialize FAQ accessibility features
 * @param {string} containerId - Container element ID
 */
export function initFAQAccessibility(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Add keyboard navigation
    const faqItems = container.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const summary = item.querySelector('summary');
        const answer = item.querySelector('.faq-answer');
        
        if (!summary || !answer) return;
        
        // Make summary keyboard accessible
        summary.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                summary.click();
            }
        });
        
        // Track expand/collapse
        summary.addEventListener('click', () => {
            const isExpanded = item.open;
            const question = item.querySelector('.faq-question span')?.textContent || '';
            
            trackFAQInteraction(isExpanded ? 'collapse' : 'expand', {
                question: question.substring(0, 50)
            });
        });
    });
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
console.log('FAQ module loaded');