/**
 * Sharing Module
 * 
 * Handles sharing calculator results via URLs, clipboard, and social media.
 * Provides Web Share API support with fallbacks for broader compatibility.
 * 
 * @module modules/sharing
 */

// ── URL Management ─────────────────────────────────────────────

/**
 * Create a shareable URL for a calculator
 * @param {string} slug - Calculator slug
 * @param {Object} params - Additional parameters to include
 * @returns {string} Shareable URL
 */
export function createShareUrl(slug, params = {}) {
    const baseUrl = window.location.origin + '/tool';
    const url = new URL(baseUrl, window.location.origin);
    
    url.searchParams.set('slug', slug);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });
    
    return url.toString();
}

/**
 * Get current page URL
 * @returns {string} Current URL
 */
export function getCurrentUrl() {
    return window.location.href;
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
        if (value !== undefined && value !== null && value !== '') {
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

// ── Clipboard Operations ───────────────────────────────────────

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @param {boolean} showFeedback - Show visual feedback (default: true)
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text, showFeedback = true) {
    try {
        // Modern API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            if (showFeedback) showCopyFeedback(true);
            return true;
        }
        
        // Fallback for older browsers
        return fallbackCopy(text, showFeedback);
    } catch (error) {
        console.error('Copy to clipboard failed:', error);
        if (showFeedback) showCopyFeedback(false);
        return false;
    }
}

/**
 * Fallback copy method for older browsers
 * @param {string} text - Text to copy
 * @param {boolean} showFeedback - Show visual feedback
 * @returns {boolean} Success status
 */
function fallbackCopy(text, showFeedback) {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.top = '0';
        textarea.style.left = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (showFeedback) showCopyFeedback(success);
        return success;
    } catch (error) {
        console.error('Fallback copy failed:', error);
        if (showFeedback) showCopyFeedback(false);
        return false;
    }
}

/**
 * Show visual feedback for copy action
 * @param {boolean} success - Whether copy was successful
 */
function showCopyFeedback(success) {
    // Dispatch event for UI to handle
    window.dispatchEvent(new CustomEvent('clipboard:update', {
        detail: {
            success,
            timestamp: Date.now()
        }
    }));
}

// ── Web Share API ──────────────────────────────────────────────

/**
 * Share using Web Share API
 * @param {Object} shareData - Share data
 * @param {string} shareData.title - Title
 * @param {string} shareData.text - Text description
 * @param {string} shareData.url - URL to share
 * @returns {Promise<boolean>} Success status
 */
export async function share(shareData) {
    const { title, text, url } = shareData;
    
    // Check if Web Share API is supported
    if (navigator.share) {
        try {
            await navigator.share({
                title: title || 'GetCalcu Calculator',
                text: text || 'Check out this calculator',
                url: url || window.location.href
            });
            return true;
        } catch (error) {
            // User cancelled or share failed
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
            }
            return false;
        }
    }
    
    // Fallback: copy to clipboard
    return copyToClipboard(url || window.location.href);
}

/**
 * Share calculator with default data
 * @param {string} slug - Calculator slug
 * @param {Object} tool - Tool definition
 * @returns {Promise<boolean>} Success status
 */
export async function shareCalculator(slug, tool) {
    const url = createShareUrl(slug);
    const title = tool ? tool.name : 'Calculator';
    const text = tool ? tool.description : 'Check out this calculator on GetCalcu';
    
    return share({ title, text, url });
}

// ── Social Media Sharing ───────────────────────────────────────

/**
 * Share on Twitter/X
 * @param {Object} shareData - Share data
 * @param {string} shareData.text - Tweet text
 * @param {string} shareData.url - URL to share
 * @param {string} shareData.hashtags - Comma-separated hashtags
 */
export function shareOnTwitter(shareData) {
    const { text, url, hashtags } = shareData;
    const tweetText = encodeURIComponent(text || 'Check out this calculator');
    const tweetUrl = encodeURIComponent(url || window.location.href);
    const tweetHashtags = hashtags || 'calculator,math,finance';
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}&hashtags=${tweetHashtags}`;
    
    window.open(twitterUrl, '_blank', 'width=550,height=420');
}

/**
 * Share on Facebook
 * @param {string} url - URL to share
 * @param {string} quote - Quote text
 */
export function shareOnFacebook(url, quote) {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url || window.location.href)}`;
    
    if (quote) {
        fbUrl + `&quote=${encodeURIComponent(quote)}`;
    }
    
    window.open(fbUrl, '_blank', 'width=550,height=420');
}

/**
 * Share on LinkedIn
 * @param {string} url - URL to share
 * @param {string} title - Title
 * @param {string} summary - Summary text
 */
export function shareOnLinkedIn(url, title, summary) {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url || window.location.href)}`;
    
    window.open(linkedInUrl, '_blank', 'width=550,height=420');
}

/**
 * Share via email
 * @param {Object} shareData - Share data
 * @param {string} shareData.subject - Email subject
 * @param {string} shareData.body - Email body
 * @param {string} shareData.to - Recipient email
 */
export function shareViaEmail(shareData) {
    const { subject, body, to } = shareData;
    
    const mailtoUrl = `mailto:${to || ''}?subject=${encodeURIComponent(subject || 'Check out this calculator')}&body=${encodeURIComponent(body || window.location.href)}`;
    
    window.location.href = mailtoUrl;
}

/**
 * Share via WhatsApp
 * @param {string} text - Message text
 * @param {string} url - URL to share
 */
export function shareViaWhatsApp(text, url) {
    const message = `${text || 'Check out this calculator'}: ${url || window.location.href}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank', 'width=550,height=420');
}

// ── Social Media Metadata ──────────────────────────────────────

/**
 * Update Open Graph meta tags
 * @param {Object} metadata - Metadata to set
 * @param {string} metadata.title - Page title
 * @param {string} metadata.description - Page description
 * @param {string} metadata.image - Image URL
 * @param {string} metadata.url - Page URL
 */
export function updateOpenGraphMetadata(metadata) {
    const { title, description, image, url } = metadata;
    
    // Open Graph
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', image);
    setMetaTag('property', 'og:url', url || window.location.href);
    setMetaTag('property', 'og:type', 'website');
    
    // Twitter Card
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', image);
}

/**
 * Set meta tag
 * @param {string} attr - Attribute name (property or name)
 * @param {string} key - Meta tag key
 * @param {string} value - Meta tag value
 */
function setMetaTag(attr, key, value) {
    if (!value) return;
    
    let metaTag = document.querySelector(`meta[${attr}="${key}"]`);
    
    if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attr, key);
        document.head.appendChild(metaTag);
    }
    
    metaTag.setAttribute('content', value);
}

// ── Share Utilities ────────────────────────────────────────────

/**
 * Generate share text for a calculator result
 * @param {Object} tool - Tool definition
 * @param {Object} result - Calculation result
 * @returns {string} Share text
 */
export function generateShareText(tool, result) {
    if (!tool || !result) return '';
    
    let text = `${tool.name} Results:\n\n`;
    
    if (result.stats) {
        result.stats.forEach(stat => {
            text += `• ${stat.label}: ${stat.value}\n`;
        });
    }
    
    if (result.insight) {
        text += `\n${result.insight.headline}\n`;
    }
    
    text += `\nCalculate yours: ${window.location.href}`;
    
    return text;
}

/**
 * Check if sharing is supported
 * @returns {Object} Support information
 */
export function getSharingSupport() {
    return {
        webShare: !!navigator.share,
        clipboard: !!navigator.clipboard && !!navigator.clipboard.writeText,
        email: true, // Always supported via mailto
        twitter: true,
        facebook: true,
        linkedIn: true,
        whatsApp: true
    };
}

// ── Share Button Builder ───────────────────────────────────────

/**
 * Build share buttons HTML
 * @param {Object} options - Share options
 * @param {string} options.slug - Calculator slug
 * @param {Object} options.tool - Tool definition
 * @param {Object} options.result - Calculation result
 * @returns {string} HTML string
 */
export function buildShareButtons(options = {}) {
    const { slug, tool, result } = options;
    const url = createShareUrl(slug);
    const text = generateShareText(tool, result);
    const support = getSharingSupport();
    
    let html = '<div class="share-buttons">';
    
    // Native share (mobile)
    if (support.webShare) {
        html += `
            <button class="share-btn share-native" onclick="window.shareModules.share('${url}', '${tool?.name || 'Calculator'}', '${text?.replace(/'/g, "\\'") || ''}')">
                <i class="fa-solid fa-share-nodes"></i> Share
            </button>
        `;
    }
    
    // Copy link
    html += `
        <button class="share-btn share-copy" onclick="window.shareModules.copyLink('${url}')">
            <i class="fa-regular fa-copy"></i> Copy Link
        </button>
    `;
    
    // Twitter
    html += `
        <button class="share-btn share-twitter" onclick="window.shareModules.shareOnTwitter('${text?.replace(/'/g, "\\'") || ''}', '${url}')">
            <i class="fa-brands fa-twitter"></i> Tweet
        </button>
    `;
    
    // Facebook
    html += `
        <button class="share-btn share-facebook" onclick="window.shareModules.shareOnFacebook('${url}')">
            <i class="fa-brands fa-facebook"></i> Share
        </button>
    `;
    
    // Email
    html += `
        <button class="share-btn share-email" onclick="window.shareModules.shareViaEmail('${tool?.name || 'Calculator'}', '${text?.replace(/'/g, "\\'") || ''}')">
            <i class="fa-regular fa-envelope"></i> Email
        </button>
    `;
    
    html += '</div>';
    
    return html;
}

// ── Global API ─────────────────────────────────────────────────

/**
 * Initialize sharing module globally
 */
export function initSharingGlobal() {
    if (typeof window !== 'undefined') {
        window.shareModules = {
            share,
            shareCalculator,
            copyToClipboard,
            copyLink: (url) => copyToClipboard(url),
            shareOnTwitter,
            shareOnFacebook,
            shareOnLinkedIn,
            shareViaEmail,
            shareViaWhatsApp,
            createShareUrl,
            generateShareText,
            getSharingSupport
        };
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    initSharingGlobal();
}

// Log module initialization
console.log('Sharing module loaded');