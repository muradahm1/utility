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

const CACHE_NAME = 'getcalcu-v6';
const STATIC_CACHE = 'getcalcu-static-v6';
const PAGE_CACHE = 'getcalcu-pages-v6';

// Core shell assets to precache on install (lightweight to prevent bandwidth congestion)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/tool.html',
  '/css/style.min.css',
  '/css/icons.css',
  '/css/webfonts/fa-solid-900.woff2',
  '/js/tools.js',
  '/js/tools-template.js',
  '/js/app.js',
  '/favicon.png',
  '/manifest.json'
];

// Assets that should be cache-first (never change)
const CACHE_FIRST = /\.(css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf)$/;

// API & external CDN endpoints that should always hit network directly
const NETWORK_ONLY = [
  'supabase.co',
  'emailjs.com',
  'google-analytics.com',
  'googletagmanager.com',
  'google.com/g/collect',
  'analytics.google.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net'
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

  // HTML navigations & tool routes: network-first with resilient offline fallback
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.startsWith('/tool/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // 1. Try exact or search-ignored match in page cache
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;

          // 2. Try tool shell for tool routes
          if (url.pathname.startsWith('/tool/')) {
            const toolShell = await caches.match('/tool.html', { ignoreSearch: true });
            if (toolShell) return toolShell;
          }

          // 3. Try index.html shell
          const indexShell = await caches.match('/index.html', { ignoreSearch: true });
          if (indexShell) return indexShell;

          // 4. Guaranteed valid Response object to prevent TypeError: Failed to convert value to 'Response'
          return new Response('<!DOCTYPE html><html lang="en"><head><title>Offline — GetCalcu</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:40px 20px;"><h2>You are currently offline</h2><p>Please check your internet connection and try again.</p><a href="/" style="color:#6366F1;text-decoration:none;font-weight:600;">Go to Home</a></body></html>', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  if (CACHE_FIRST.test(url.pathname)) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(async () => {
          const fallback = await caches.match(request, { ignoreSearch: true });
          return fallback || new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
    );
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        return cached || new Response('', { status: 404, statusText: 'Not Found' });
      })
  );
});
