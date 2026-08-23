/**
 * pwa.js — PWA Registration & Dynamic Theme Color
 *
 * Registers the service worker (for installability + offline support)
 * and keeps the theme-color meta in sync with the active theme.
 *
 * Load this on every page via: <script src="/js/pwa.js" defer></script>
 */

(function () {
  'use strict';

  // ── Service Worker registration ───────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js')
        .then(function (reg) {
          console.log('[PWA] Service worker registered:', reg.scope);
        })
        .catch(function (err) {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    });
  }

  // ── Dynamic theme-color meta (match light/dark mode) ──────────
  function syncThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    // Matches the CSS variable --primary-color / dark-mode background
    meta.setAttribute('content', theme === 'dark' ? '#0F172A' : '#6366F1');
  }

  // On load and whenever the theme changes (dispatched by app.js initTheme)
  document.addEventListener('DOMContentLoaded', syncThemeColor);
  document.documentElement.addEventListener('themechange', syncThemeColor);

  // Also observe attribute changes as a fallback
  if (window.MutationObserver) {
    const observer = new MutationObserver(syncThemeColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }
})();