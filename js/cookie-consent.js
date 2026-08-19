
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
        const resetBtns = Array.from(new Set(document.querySelectorAll('[data-reset-consent], #reset-consent-btn')));

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
        if (resetBtns.length) {
            resetBtns.forEach(btn => btn.addEventListener('click', () => {
                localStorage.removeItem('cookie_consent');
                updatePrefStatus();
                setTimeout(() => banner.classList.add('show'), 300);
            }));
        }

        // Update preference status on load
        updatePrefStatus();
        
        // Focus trap for keyboard accessibility
        if (banner.classList.contains('show')) {
            const focusable = banner.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length) focusable[0].focus();
        }
        banner.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const focusable = banner.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
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
