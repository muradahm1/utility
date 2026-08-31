/**
 * build-seo.js
 * 
 * Phase 4 — SEO Foundation build script.
 * 
 * This script is the SINGLE SOURCE OF TRUTH for the tool registry.
 * It:
 *   1. Executes js/tools.js in a sandboxed VM to get the real tool objects
 *   2. Generates static per-tool HTML pages under /tool/{slug}/index.html
 *      with pre-rendered title, description, canonical, and JSON-LD
 *      (SoftwareApplication, BreadcrumbList, FAQPage, TechArticle)
 *   3. Regenerates sitemap.xml with pretty /tool/{slug} URLs
 *   4. Regenerates robots.txt with noindex rules for param URLs
 * 
 * Run with: node build-seo.js
 * Add to deploy step so SEO stays in sync with the tool registry.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_URL = 'https://www.getcalcu.com';
const TODAY = new Date().toISOString().split('T')[0];

// ── 1. Load the tool registry by executing tools.js in a sandbox ─────
// tools.js depends on helper functions (safeNum, roundTo, fmt, etc.)
// defined at the bottom of the file, and sets window.TOOLS. We stub
// window and provide the helpers via the sandbox so the file executes.

function loadTools() {
  const source = fs.readFileSync(path.join(__dirname, 'js', 'tools.js'), 'utf8');

  // Stub browser globals that tools.js might reference
  const sandbox = {
    window: {},
    document: { createElement: () => ({ setAttribute() {}, appendChild() {} }) },
    navigator: { userAgent: 'node' },
    console,
    URLSearchParams,
    URL,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    JSON,
    isFinite,
    isNaN,
    parseFloat,
    parseInt,
  };

  // Provide the helper functions tools.js defines at the bottom
  // (they're function declarations, hoisted, so they'll be available)
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'tools.js' });

  return sandbox.window.TOOLS || {};
}

// ── 2. Load modular calculator files (ES modules) ────────────────────
// These are ES modules with imports, so we can't execute them directly.
// We parse them for id/name/category/metaDescription via regex.
function loadModularTools() {
  const tools = {};
  const modularFiles = [
    path.join(__dirname, 'js', 'calculators', 'construction.js'),
    path.join(__dirname, 'js', 'calculators', 'engineering.js'),
    path.join(__dirname, 'js', 'calculators', 'finance.js'),
    path.join(__dirname, 'js', 'calculators', 'health.js'),
  ];

  modularFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    const source = fs.readFileSync(filePath, 'utf8');
    const calcRegex = /export\s+const\s+\w+\s*=\s*\{([\s\S]*?)\n\s*\};/g;
    let match;
    while ((match = calcRegex.exec(source)) !== null) {
      const body = match[1];
      const idMatch = body.match(/id:\s*'([a-z0-9-]+)'/);
      if (!idMatch) continue;
      const slug = idMatch[1];
      const nameMatch = body.match(/name:\s*'([^']+)'/);
      const catMatch = body.match(/category:\s*'([^']+)'/);
      const descMatch = body.match(/metaDescription:\s*'([^']+)'/);
      const descMatch2 = body.match(/description:\s*'([^']+)'/);
      tools[slug] = {
        slug,
        name: nameMatch ? nameMatch[1] : slug.replace(/-/g, ' '),
        category: catMatch ? catMatch[1] : 'General',
        description: descMatch2 ? descMatch2[1] : '',
        metaDescription: descMatch ? descMatch[1] : (descMatch2 ? descMatch2[1] : ''),
        metaTitle: null,
        keywords: [],
        formula: null,
        articleHeading: null,
        articleIntro: null,
        faqs: [],
      };
    }
  });
  return tools;
}

// ── 3. Merge and normalize the registry ──────────────────────────────
function buildRegistry() {
  const legacy = loadTools();
  const modular = loadModularTools();
  const merged = { ...legacy, ...modular };

  // Normalize each tool to a clean SEO metadata object
  const registry = {};
  Object.keys(merged).forEach(slug => {
    const t = merged[slug];
    registry[slug] = {
      slug,
      name: t.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      category: t.category || 'General',
      description: t.description || '',
      metaDescription: t.metaDescription || t.description || '',
      metaTitle: t.metaTitle || null,
      keywords: Array.isArray(t.keywords) ? t.keywords : [],
      formula: t.formula || null,
      articleHeading: (t.article && t.article.heading) || null,
      articleIntro: (t.article && t.article.intro) || null,
      faqs: Array.isArray(t.faqs) ? t.faqs.map(f => ({ q: f.q, a: f.a })) : [],
    };
  });
  return registry;
}

// ── 4. Helpers ───────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

function buildTitle(tool) {
  if (tool.metaTitle) return tool.metaTitle;
  const t = `${tool.name} — Free Online Calculator | GetCalcu`;
  return t.length > 60 ? `${tool.name} | Free Calculator — GetCalcu` : t;
}

function buildCanonical(slug) {
  return `${BASE_URL}/tool/${slug}`;
}

function buildSoftwareAppJsonLd(tool) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: tool.metaDescription || tool.description,
    url: buildCanonical(tool.slug),
  };
}

function buildBreadcrumbJsonLd(tool) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: tool.category, item: `${BASE_URL}/?category=${tool.category.toLowerCase()}` },
      { '@type': 'ListItem', position: 3, name: tool.name, item: buildCanonical(tool.slug) },
    ],
  };
}

function buildFaqJsonLd(tool) {
  if (!tool.faqs || !tool.faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: tool.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function buildArticleJsonLd(tool) {
  if (!tool.articleHeading) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: tool.articleHeading,
    description: tool.articleIntro || tool.metaDescription || tool.description,
    author: { '@type': 'Organization', name: 'GetCalcu' },
    publisher: { '@type': 'Organization', name: 'GetCalcu', url: `${BASE_URL}/` },
    about: tool.name,
    url: buildCanonical(tool.slug),
  };
}

// ── 5. Generate static per-tool HTML pages ───────────────────────────
const toolDir = path.join(__dirname, 'tool');
if (!fs.existsSync(toolDir)) fs.mkdirSync(toolDir, { recursive: true });

const toolPageTemplate = (tool) => {
  const title = buildTitle(tool);
  const canonical = buildCanonical(tool.slug);
  const desc = escapeHtml(tool.metaDescription || tool.description);
  const jsonLdBlocks = [
    buildSoftwareAppJsonLd(tool),
    buildBreadcrumbJsonLd(tool),
    buildFaqJsonLd(tool),
    buildArticleJsonLd(tool),
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#6366F1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${desc}">
    <link rel="canonical" href="${canonical}">
    <meta name="robots" content="index, follow">
    ${tool.keywords && tool.keywords.length ? `<meta name="keywords" content="${escapeHtml(tool.keywords.join(', '))}">` : ''}

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="GetCalcu">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${BASE_URL}/og-image.png">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${BASE_URL}/og-image.png">

    <!-- Structured Data -->
    ${jsonLdBlocks.map(b => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join('\n    ')}

    <!-- Favicon & Icons -->
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png">
    <link rel="shortcut icon" href="/favicon.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

    <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://www.googletagmanager.com">
    <link rel="preconnect" href="https://www.google-analytics.com">
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">

    <!-- Google Analytics & Tag Manager DataLayer Init -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-M2PTXPP9QG');
    </script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-M2PTXPP9QG"></script>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-WT5JT9KH');</script>
    <!-- Font Preload for instant icon rendering -->
    <link rel="preload" href="/css/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossorigin>

    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/icons.css">
</head>
<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WT5JT9KH"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <a href="#main-content" class="skip-link">Skip to content</a>
    <div class="app-container">
        <aside class="sidebar">
            <a href="/" class="brand">
                <div class="brand-icon"><img src="/favicon.png" alt="GetCalcu"></div>
                <span class="brand-name">GetCalcu</span>
            </a>
            <nav class="nav-menu">
                <a href="/" class="nav-item"><i class="fa-solid fa-house"></i><span>Home</span></a>
                <a href="/?category=finance" class="nav-item"><i class="fa-solid fa-calculator"></i><span>Finance</span></a>
                <a href="/?category=health" class="nav-item"><i class="fa-solid fa-heart-pulse"></i><span>Health</span></a>
                <a href="/?category=business" class="nav-item"><i class="fa-solid fa-briefcase"></i><span>Business</span></a>
                <a href="/?category=education" class="nav-item"><i class="fa-solid fa-graduation-cap"></i><span>Education</span></a>
                <a href="/?category=construction" class="nav-item"><i class="fa-solid fa-helmet-safety"></i><span>Construction</span></a>
                <a href="/?category=engineering" class="nav-item"><i class="fa-solid fa-gears"></i><span>Engineering</span></a>
                <a href="/?category=math" class="nav-item"><i class="fa-solid fa-percent"></i><span>Math</span></a>
                <a href="/history" class="nav-item auth-only hidden"><i class="fa-solid fa-clock-rotate-left"></i><span>History</span></a>
            </nav>
            <div class="sidebar-footer">
                <div class="promo-card" id="sidebar-promo">
                    <h4>Save your results</h4>
                    <p>Create a free account to save your calculations and history.</p>
                    <a href="/auth?mode=signup" class="btn btn-primary btn-sm">Sign up free</a>
                </div>
                <div class="theme-switch-container">
                    <span class="theme-label"><i class="fa-solid fa-moon"></i> Dark mode</span>
                    <label class="switch">
                        <input type="checkbox" id="theme-toggle-switch" aria-label="Toggle dark mode">
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        </aside>

        <main class="main-wrapper" id="main-content">
            <header class="top-header">
                <button class="hamburger-btn" id="hamburger-btn" aria-label="Open navigation" aria-expanded="false">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <div class="search-trigger" id="cmd-k-trigger">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <span>Search calculators, converters, tools...</span>
                    <kbd>⌘K</kbd>
                </div>
                <div class="header-actions">
                    <button class="icon-btn" id="theme-toggle-btn" title="Toggle Theme"><i class="fa-solid fa-moon"></i></button>
                    <div id="auth-header-slot">
                        <a href="/auth" class="btn btn-primary btn-pill">Sign in</a>
                    </div>
                </div>
            </header>

            <div class="content-body" id="tool-runner-container">
                <!-- Loading skeleton shown while tool initializes (Phase 5.5) -->
                <div id="tool-loading-skeleton" class="tool-skeleton" aria-label="Loading calculator">
                    <div class="skeleton-form">
                        <div class="skeleton-line tall"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                    <div class="skeleton-results">
                        <div class="skeleton-line full"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
                <div id="ad-slot-tool" class="ad-slot ad-slot--leaderboard" aria-label="Advertisement">
                    <span class="ad-slot-label">Advertisement</span>
                </div>
            </div>
        </main>
    </div>

    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <div class="modal-overlay hidden" id="search-modal" role="dialog" aria-label="Search calculators">
        <div class="modal-card">
            <div class="modal-search-input-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="modal-search-field" placeholder="Search all calculators...">
                <button class="close-btn" id="modal-close-btn">&times;</button>
            </div>
            <div class="search-results-list" id="search-results"></div>
        </div>
    </div>

    <footer class="site-footer">
        <div class="footer-inner">
            <div class="footer-brand">
                <div class="brand-icon"><img src="/favicon.png" alt="GetCalcu"></div>
                <span class="brand-name">GetCalcu</span>
            </div>
            <p class="footer-tagline">Free, fast and accurate tools for everyday problems.</p>
            <nav class="footer-links" aria-label="Footer navigation">
                <a href="/about">About</a>
                <a href="/contact">Contact</a>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="/cookie-policy">Cookie Policy</a>
            </nav>
            <p class="footer-copy">&copy; <span id="footer-year"></span> GetCalcu. All rights reserved.</p>
        </div>
    </footer>

    <div class="cookie-consent-banner" id="cookie-banner" role="dialog" aria-label="Cookie consent">
        <p class="cookie-consent-text">
            <i class="fa-solid fa-cookie-bite" style="color: var(--primary-color); margin-right: 6px;"></i>
            We use cookies to improve your experience and analyze anonymous traffic. See our <a href="/cookie-policy">Cookie Policy</a>.
        </p>
        <div class="cookie-consent-actions">
            <button class="btn btn-outline btn-sm" id="cookie-essential-btn">Essential Only</button>
            <button class="btn btn-primary btn-sm" id="cookie-accept-btn">Accept All</button>
            <button class="btn btn-outline btn-sm btn-reset" id="reset-consent-btn">Reset Preferences</button>
        </div>
    </div>

    <noscript>
        <div style="max-width:800px;margin:40px auto;padding:24px;text-align:center;font-family:system-ui,sans-serif;">
            <h1>${escapeHtml(tool.name)}</h1>
            <p>${desc}</p>
            <p>This calculator requires JavaScript. Please enable JavaScript in your browser to use it.</p>
            <p><a href="/">Browse all GetCalcu calculators</a></p>
        </div>
    </noscript>

    <script src="/js/tools.js"></script>
    <script src="/js/tools-template.js"></script>
    <script src="/js/modules/budget-planner.js" type="module"></script>
    <script src="/js/tool-runner.js" type="module"></script>
    <script src="/js/app.js"></script>
    <script src="/js/config.js" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
    <script src="/js/supabase.js" defer></script>
    <script src="/js/cookie-consent.js" defer></script>
    <script src="/js/maintenance-banner.js" defer></script>
    <script src="/js/pwa.js" defer></script>
    <script>
        // Redirect legacy ?slug= URLs to pretty URLs
        (function() {
            const params = new URLSearchParams(window.location.search);
            const slug = params.get('slug');
            if (slug) {
                window.location.replace('/tool/' + encodeURIComponent(slug));
            }
        })();
    </script>
</body>
</html>`;
};

// ── 6. Main ──────────────────────────────────────────────────────────
const registry = buildRegistry();
const slugs = Object.keys(registry).sort();

// Write each tool page
slugs.forEach(slug => {
  const tool = registry[slug];
  const slugDir = path.join(toolDir, slug);
  if (!fs.existsSync(slugDir)) fs.mkdirSync(slugDir, { recursive: true });
  fs.writeFileSync(path.join(slugDir, 'index.html'), toolPageTemplate(tool));
});

// Generate sitemap.xml
const staticUrls = [
  { loc: `${BASE_URL}/`,            priority: '1.0', changefreq: 'weekly'  },
  { loc: `${BASE_URL}/about`,       priority: '0.8', changefreq: 'monthly' },
  { loc: `${BASE_URL}/contact`,     priority: '0.7', changefreq: 'monthly' },
  { loc: `${BASE_URL}/privacy`,     priority: '0.6', changefreq: 'monthly' },
  { loc: `${BASE_URL}/terms`,       priority: '0.6', changefreq: 'monthly' },
  { loc: `${BASE_URL}/cookie-policy`, priority: '0.6', changefreq: 'monthly' },
];

const toolUrls = slugs.map(slug => ({
  loc:        `${BASE_URL}/tool/${slug}`,
  priority:   '0.9',
  changefreq: 'monthly',
}));

const allUrls = [...staticUrls, ...toolUrls];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('')}
</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml.trimStart());

// Generate robots.txt
const robots = `User-agent: *
Allow: /
Disallow: /auth
Disallow: /history
Disallow: /tool?slug=
Disallow: /?category=

Sitemap: ${BASE_URL}/sitemap.xml
`;

fs.writeFileSync(path.join(__dirname, 'robots.txt'), robots);

// Summary
console.log(`✓ build-seo.js complete`);
console.log(`  Tools registered: ${slugs.length}`);
console.log(`  Static tool pages: ${slugs.length} (in /tool/{slug}/)`);
console.log(`  Sitemap URLs: ${allUrls.length}`);
console.log(`  robots.txt updated with noindex rules`);