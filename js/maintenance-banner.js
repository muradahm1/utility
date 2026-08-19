/**
 * Temporary Maintenance Banner
 * 
 * Displays a temporary banner to inform users that the site is under maintenance.
 * Remove this file and its script tags once maintenance is complete.
 * 
 * @module maintenance-banner
 */

(function() {
    'use strict';

    // ── Configuration ────────────────────────────────────────────
    // Set to false to hide the banner (e.g., after maintenance is done)
    const MAINTENANCE_ENABLED = false;
    
    // Banner message
    const BANNER_MESSAGE = 'We are currently performing maintenance to improve your experience. Some features may be temporarily unavailable.';
    
    // ── Banner Creation ──────────────────────────────────────────
    function createBanner() {
        if (!MAINTENANCE_ENABLED) return;
        
        // Check if banner already exists
        if (document.getElementById('maintenance-banner')) return;
        
        const banner = document.createElement('div');
        banner.id = 'maintenance-banner';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        
        banner.innerHTML = `
            <div class="maintenance-banner-inner">
                <i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i>
                <span class="maintenance-banner-text">${BANNER_MESSAGE}</span>
                <button class="maintenance-banner-close" id="maintenance-banner-close" aria-label="Dismiss maintenance notice">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </div>
        `;
        
        document.body.prepend(banner);
        
        // Add close button handler
        const closeBtn = document.getElementById('maintenance-banner-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                banner.remove();
            });
        }
    }
    
    // ── Initialize ───────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createBanner);
    } else {
        createBanner();
    }
})();