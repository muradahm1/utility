// ============================================================
// GetCalcu — Shared Cookie Consent Module
// ============================================================
// Extracted from inline scripts across all HTML pages to eliminate
// code duplication. Provides a single source of truth for cookie
// consent logic.
//
// Usage: Include this script AFTER the cookie banner HTML exists.
//   <script src="js/cookie-consent.js"></script>
//   <script>initCookieConsent();</script>
// ============================================================

(function () {
    'use strict';

    // Guard: don't re-initialize if already done
    if (window.__cookieConsentInitialized) return;
    window.__cookieConsentInitialized = true;

    window.initCookieConsent = function () {
        const banner = document.getElementById('cookie-banner');
        if (!banner) return;

        const acceptBtn = document.getElementById('cookie-accept-btn');
        const essentialBtn = document.getElementById('cookie-essential-btn');
        const prefStatus = document.getElementById('pref-status');
        const resetBtn = document.getElementById('reset-consent-btn');

        function setConsent(value) {
            localStorage.setItem('cookie_consent', value);
            banner.classList.remove('show');
            updatePrefStatus();
        }

        function updatePrefStatus() {
            if (!prefStatus) return;
            const pref = localStorage.getItem('cookie_consent');
            if (pref === 'all') {
                prefStatus.textContent = 'Accept All — analytics and advertising cookies are enabled.';
            } else if (pref === 'essential') {
                prefStatus.textContent = 'Essential Only — only necessary cookies are active.';
            } else {
                prefStatus.textContent = 'No preference set yet.';
            }
        }

        // Show banner on first visit (with a slight delay for UX)
        if (!localStorage.getItem('cookie_consent')) {
            setTimeout(() => banner.classList.add('show'), 800);
        }

        // Bind event listeners
        if (acceptBtn) acceptBtn.addEventListener('click', () => setConsent('all'));
        if (essentialBtn) essentialBtn.addEventListener('click', () => setConsent('essential'));
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                localStorage.removeItem('cookie_consent');
                updatePrefStatus();
                setTimeout(() => banner.classList.add('show'), 300);
            });
        }

        // Update preference status on load
        updatePrefStatus();
    };

    // Auto-initialize if the banner is present on the page
    if (document.getElementById('cookie-banner')) {
        // Wait for DOMContentLoaded if needed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', window.initCookieConsent);
        } else {
            window.initCookieConsent();
        }
    }
})();
