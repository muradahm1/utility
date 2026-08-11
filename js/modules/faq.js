/**
 * FAQ Module
 * 
 * Dynamic FAQ rendering and JSON-LD generation for SEO.
 * 
 * @module modules/faq
 */

export function createFAQItem(question, answer, keywords = []) {
    return { q: question, a: answer, keywords };
}

import { escapeHtml } from '../utils/index.js';

export function searchFAQs(faqs, query) {
    if (!query || !faqs.length) return [];
    const q = query.toLowerCase();
    return faqs.filter(faq => 
        faq.q.toLowerCase().includes(q) || 
        faq.a.toLowerCase().includes(q) ||
        (faq.keywords && faq.keywords.some(kw => kw.toLowerCase().includes(q)))
    );
}

export function buildFAQHtml(faqs, options = {}) {
    const { searchable = true, title = 'Frequently Asked Questions' } = options;
    
    if (!faqs || !faqs.length) return '';
    
    const items = faqs.map((faq, i) => `
        <details style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:8px;">
            <summary style="font-size:14px;font-weight:700;cursor:pointer;color:var(--text-primary);list-style:none;display:flex;justify-content:space-between;align-items:center;">
                ${escapeHtml(faq.q)} <i class="fa-solid fa-chevron-down" style="font-size:12px;color:var(--text-secondary);"></i>
            </summary>
            <p style="font-size:13px;color:var(--text-secondary);margin-top:10px;line-height:1.7;">${escapeHtml(faq.a)}</p>
        </details>
    `).join('');
    
    return `
        <div class="faq-section" style="margin-top:24px;">
            <h2 id="faqs" style="font-size:18px;font-weight:700;margin-bottom:16px;">${escapeHtml(title)}</h2>
            ${searchable ? '<input type="text" id="faq-search" placeholder="Search FAQs..." style="width:100%;padding:10px 14px;border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:16px;font-size:14px;">' : ''}
            <div id="faq-list">${items}</div>
        </div>
    `;
}

export function buildCalculatorFAQ(tool, options = {}) {
    if (!tool) return '';
    
    const faqs = tool.faqs || [];
    return buildFAQHtml(faqs, { ...options, title: `Frequently Asked Questions about ${tool.name}` });
}

export function initFAQSearch(containerId, faqs) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const searchInput = container.querySelector('#faq-search');
    const listContainer = container.querySelector('#faq-list');
    if (!searchInput || !listContainer) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        const filtered = searchFAQs(faqs, query);
        
        if (filtered.length === 0) {
            listContainer.innerHTML = '<p style="color:var(--text-secondary);font-size:14px;">No matching questions found.</p>';
            return;
        }
        
        listContainer.innerHTML = filtered.map((faq, i) => `
            <details style="border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px 18px;margin-bottom:8px;">
                <summary style="font-size:14px;font-weight:700;cursor:pointer;color:var(--text-primary);list-style:none;display:flex;justify-content:space-between;align-items:center;">
                    ${escapeHtml(faq.q)} <i class="fa-solid fa-chevron-down" style="font-size:12px;color:var(--text-secondary);"></i>
                </summary>
                <p style="font-size:13px;color:var(--text-secondary);margin-top:10px;line-height:1.7;">${escapeHtml(faq.a)}</p>
            </details>
        `).join('');
    });
}

export function generateFAQJsonLd(faqs, pageUrl) {
    if (!faqs || !faqs.length) return null;
    
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
    };
}

export function addFAQJsonLd(faqs, pageUrl) {
    const jsonLd = generateFAQJsonLd(faqs, pageUrl);
    if (!jsonLd) return;
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
}

export function trackFAQInteraction(action, data) {
    if (typeof gtag === 'function') {
        gtag('event', action, {
            event_category: 'FAQ',
            event_label: data.question || '',
            ...data
        });
    }
}

export function initFAQAccessibility(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.querySelectorAll('details').forEach(details => {
        details.addEventListener('toggle', () => {
            const summary = details.querySelector('summary');
            if (summary) {
                summary.setAttribute('aria-expanded', details.open);
            }
            if (details.open) {
                trackFAQInteraction('faq_open', { question: details.querySelector('summary')?.textContent || '' });
            }
        });
    });
}
