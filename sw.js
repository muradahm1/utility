/**
 * sw.js — GetCalcu Service Worker
 *
 * PWA installability + offline support.
 * Strategy:
 *   - Precache: core shell (HTML, CSS, JS, manifest, icons)
 *   - Cache-first: static assets (css, js, images, fonts)
 *   - Network-first: HTML navigations (fallback to cache when offline)
 *   - Network-only: API calls (Supabase, EmailJS, GA)
 *
 * @version 1.0.0
 */

const CACHE_NAME = 'getcalcu-v2';
const STATIC_CACHE = 'getcalcu-static-v2';
const PAGE_CACHE = 'getcalcu-pages-v2';

// Core shell assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/tool.html',
  '/about.html',
  '/contact.html',
  '/privacy.html',
  '/terms.html',
  '/cookie-policy.html',
  '/css/style.css',
  '/css/icons.css',
  '/css/webfonts/fa-solid-900.woff2',
  '/css/webfonts/fa-regular-400.woff2',
  '/css/webfonts/fa-brands-400.woff2',
  '/js/tools.js',
  '/js/tools-template.js',
  '/js/config.js',
  '/js/supabase.js',
  '/js/app.js',
  '/js/tool-runner.js',
  '/js/cookie-consent.js',
  '/js/maintenance-banner.js',
  '/manifest.json',
  '/favicon.png',
];

// Assets that should be cache-first (never change)
const CACHE_FIRST = /\.(css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf)$/;

// API endpoints that should always hit the network
const NETWORK_ONLY = [
  'supabase.co',
  'emailjs.com',
  'google-analytics.com',
  'googletagmanager.com',
  'google.com/g/collect',
  'analytics.google.com',
];

// ── Install: precache core shell ────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Network-only for API/analytics endpoints
  if (NETWORK_ONLY.some((domain) => url.hostname.includes(domain))) {
    return;
  }

  // HTML navigations: network-first, fallback to cache
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache-first with network fallback
  if (CACHE_FIRST.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Tool pages: network-first (they're static HTML but may update)
  if (url.pathname.startsWith('/tool/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/tool.html')))
    );
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
