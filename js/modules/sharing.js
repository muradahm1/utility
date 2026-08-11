/**
 * Sharing Module
 * 
 * Share calculator results via URLs, clipboard, and social media.
 * 
 * @module modules/sharing
 */

export function createShareUrl(slug, params = {}) {
    const url = new URL(window.location.origin + '/tool');
    url.searchParams.set('slug', slug);
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
        }
    });
    
    return url.toString();
}

export function getCurrentUrl() {
    return window.location.href;
}

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
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
    });
    
    if (replace) {
        window.history.replaceState({}, '', url);
    } else {
        window.history.pushState({}, '', url);
    }
    
    window.dispatchEvent(new CustomEvent('url:updated', {
        detail: { url: url.href, timestamp: Date.now() }
    }));
}

export async function share(shareData) {
    if (navigator.share) {
        try {
            await navigator.share(shareData);
            return true;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
            }
            return false;
        }
    }
    return false;
}

export async function shareCalculator(slug, tool) {
    const url = createShareUrl(slug);
    const shareData = {
        title: tool ? tool.name : 'Calculator',
        text: tool ? tool.description : 'Check out this calculator',
        url: url
    };
    
    const shared = await share(shareData);
    if (!shared) {
        return copyToClipboard(url);
    }
    return true;
}

export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (err) {
        console.error('Copy failed:', err);
    }
    
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    } catch {
        document.body.removeChild(textarea);
        return false;
    }
}

export function shareOnTwitter(data) {
    const text = encodeURIComponent(data.text || data.title || '');
    const url = encodeURIComponent(data.url || window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=550,height=420');
}

export function shareOnFacebook(url) {
    const shareUrl = encodeURIComponent(url || window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank', 'width=550,height=420');
}

export function shareOnLinkedIn(url) {
    const shareUrl = encodeURIComponent(url || window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank', 'width=550,height=420');
}

export function shareViaEmail(data) {
    const subject = encodeURIComponent(data.subject || data.title || 'Check out this calculator');
    const body = encodeURIComponent(data.body || data.text || '');
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export function shareViaWhatsApp(text, url) {
    const message = encodeURIComponent(`${text}\n${url}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
}

export function updateOpenGraphMetadata(metadata) {
    if (metadata.title) {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', metadata.title);
    }
    if (metadata.description) {
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', metadata.description);
    }
    if (metadata.url) {
        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', metadata.url);
    }
    if (metadata.image) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) ogImage.setAttribute('content', metadata.image);
    }
}

export function generateShareText(tool, result) {
    if (!tool) return 'Check out this calculator';
    
    const parts = [tool.name];
    if (result && result.stats) {
        const mainStat = result.stats.find(s => s.highlight) || result.stats[0];
        if (mainStat) parts.push(mainStat.label + ': ' + mainStat.value);
    }
    
    return parts.join(' - ');
}

export function buildShareButtons(options = {}) {
    const { slug, tool, result } = options;
    const url = createShareUrl(slug);
    const text = generateShareText(tool, result);
    
    return `
        <div class="share-buttons">
            <button class="btn btn-outline btn-sm share-btn" data-share="twitter" aria-label="Share on Twitter">
                <i class="fa-brands fa-twitter"></i> Twitter
            </button>
            <button class="btn btn-outline btn-sm share-btn" data-share="facebook" aria-label="Share on Facebook">
                <i class="fa-brands fa-facebook"></i> Facebook
            </button>
            <button class="btn btn-outline btn-sm share-btn" data-share="linkedin" aria-label="Share on LinkedIn">
                <i class="fa-brands fa-linkedin"></i> LinkedIn
            </button>
            <button class="btn btn-outline btn-sm share-btn" data-share="copy" aria-label="Copy link">
                <i class="fa-regular fa-copy"></i> Copy
            </button>
        </div>
    `;
}
