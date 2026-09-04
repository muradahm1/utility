const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_URL = 'https://www.getcalcu.com';
const TODAY = new Date().toISOString().split('T')[0];

const CATEGORIES = {
  finance: {
    name: 'Finance',
    slug: 'finance',
    icon: 'fa-calculator',
    iconClass: 'icon-finance',
    tagClass: 'tag-finance',
    title: 'Finance Calculators & Free Financial Tools | GetCalcu',
    metaDescription: 'Free financial calculators for mortgages, loans, investments, retirement, budgeting, compound interest, and debt payoff. Fast, accurate, and easy to use.',
    heading: 'Finance Calculators & Tools',
    subheading: 'Plan your budget, project investment growth, calculate mortgage payments, and master your financial future with our free financial calculators.',
  },
  health: {
    name: 'Health',
    slug: 'health',
    icon: 'fa-heart-pulse',
    iconClass: 'icon-health',
    tagClass: 'tag-health',
    title: 'Health & Fitness Calculators — Free Online | GetCalcu',
    metaDescription: 'Free health and fitness calculators including Body Mass Index (BMI), ideal weight ranges, and wellness calculators. Fast and reliable.',
    heading: 'Health & Fitness Calculators',
    subheading: 'Track health metrics, calculate Body Mass Index (BMI), and understand your target weight ranges.',
  },
  math: {
    name: 'Math',
    slug: 'math',
    icon: 'fa-percent',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    title: 'Math Calculators & Percentage Tools | GetCalcu',
    metaDescription: 'Free online math calculators for percentages, date math, tips, ratios, and everyday arithmetic calculations.',
    heading: 'Math & Percentage Calculators',
    subheading: 'Solve everyday arithmetic, percentage increases, date differences, and bill splits instantly.',
  },
  business: {
    name: 'Business',
    slug: 'business',
    icon: 'fa-briefcase',
    iconClass: 'icon-business',
    tagClass: 'tag-business',
    title: 'Business & Commercial Calculators | GetCalcu',
    metaDescription: 'Free business and commercial calculators for profit planning, currency exchange, and financial management.',
    heading: 'Business Calculators & Tools',
    subheading: 'Optimize financial planning, currency conversions, and commercial calculations.',
  },
  education: {
    name: 'Education',
    slug: 'education',
    icon: 'fa-graduation-cap',
    iconClass: 'icon-education',
    tagClass: 'tag-education',
    title: 'Educational & Study Calculators | GetCalcu',
    metaDescription: 'Free educational calculators and study tools for students, teachers, and researchers.',
    heading: 'Educational & Study Calculators',
    subheading: 'Practical academic utilities and calculation tools for coursework and learning.',
  },
  construction: {
    name: 'Construction',
    slug: 'construction',
    icon: 'fa-helmet-safety',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    title: 'Construction & Material Estimators | GetCalcu',
    metaDescription: 'Free construction calculators for concrete volume, paint coverage, tile layout, and building materials.',
    heading: 'Construction & Material Calculators',
    subheading: 'Accurately estimate concrete, paint, tiles, and raw materials for home improvement and building projects.',
  },
  engineering: {
    name: 'Engineering',
    slug: 'engineering',
    icon: 'fa-gears',
    iconClass: 'icon-engineering',
    tagClass: 'tag-engineering',
    title: 'Engineering & Physics Calculators | GetCalcu',
    metaDescription: 'Free engineering calculators for Ohm\'s Law, beam deflection, pressure units, and physics equations.',
    heading: 'Engineering & Physics Calculators',
    subheading: 'Calculate electrical parameters, structural beam deflections, and pressure values with precision.',
  },
};

// ── 1. Load the tool registry by executing tools.js in a sandbox ─────
function loadTools() {
  const source = fs.readFileSync(path.join(__dirname, 'js', 'tools.js'), 'utf8');

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

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'tools.js' });

  return sandbox.window.TOOLS || {};
}

// ── 2. Load modular calculator files (ES modules) ────────────────────
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

  const registry = {};
  Object.keys(merged).forEach(slug => {
    const t = merged[slug];
    registry[slug] = {
      slug,
      name: t.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      category: t.category || 'General',
      icon: t.icon || 'fa-calculator',
      iconClass: t.iconClass || 'icon-finance',
      tagClass: t.tagClass || 'tag-finance',
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
  const catSlug = (tool.category || 'finance').toLowerCase();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: tool.category, item: `${BASE_URL}/category/${catSlug}` },
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

function renderSidebarNav(activeSlug = null, isHome = false) {
  const items = [
    { href: '/', icon: 'fa-house', label: 'Home', active: isHome },
    { href: '/category/finance', icon: 'fa-calculator', label: 'Finance', active: activeSlug === 'finance' },
    { href: '/category/health', icon: 'fa-heart-pulse', label: 'Health', active: activeSlug === 'health' },
    { href: '/category/business', icon: 'fa-briefcase', label: 'Business', active: activeSlug === 'business' },
    { href: '/category/education', icon: 'fa-graduation-cap', label: 'Education', active: activeSlug === 'education' },
    { href: '/category/construction', icon: 'fa-helmet-safety', label: 'Construction', active: activeSlug === 'construction' },
    { href: '/category/engineering', icon: 'fa-gears', label: 'Engineering', active: activeSlug === 'engineering' },
    { href: '/category/math', icon: 'fa-percent', label: 'Math', active: activeSlug === 'math' },
  ];

  return `
        <aside class="sidebar">
            <a href="/" class="brand">
                <div class="brand-icon"><img src="/favicon.png" alt="GetCalcu"></div>
                <span class="brand-name">GetCalcu</span>
            </a>
            <nav class="nav-menu">
                ${items.map(it => `<a href="${it.href}" class="nav-item ${it.active ? 'active' : ''}"><i class="fa-solid ${it.icon}"></i><span>${it.label}</span></a>`).join('\n                ')}
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
        </aside>`;
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

  const catSlug = (tool.category || 'finance').toLowerCase();

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
        ${renderSidebarNav(catSlug, false)}

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
                <!-- Loading skeleton shown while tool initializes -->
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

// ── 6. Generate static per-category HTML pages ───────────────────────
const categoryDir = path.join(__dirname, 'category');
if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

const categoryPageTemplate = (cat, catTools) => {
  const canonical = `${BASE_URL}/category/${cat.slug}`;
  const desc = escapeHtml(cat.metaDescription);
  
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: `${cat.name} Calculators`, item: canonical },
    ]
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${cat.name} Calculators & Tools`,
    description: cat.metaDescription,
    numberOfItems: catTools.length,
    itemListElement: catTools.map((t, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: t.name,
      url: `${BASE_URL}/tool/${t.slug}`,
      description: t.description,
    }))
  };

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#6366F1">
    <title>${escapeHtml(cat.title)}</title>
    <meta name="description" content="${desc}">
    <link rel="canonical" href="${canonical}">
    <meta name="robots" content="index, follow">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="GetCalcu">
    <meta property="og:title" content="${escapeHtml(cat.title)}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${BASE_URL}/og-image.png">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(cat.title)}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${BASE_URL}/og-image.png">

    <!-- Structured Data -->
    <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
    <script type="application/ld+json">${JSON.stringify(itemListJsonLd)}</script>

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
        ${renderSidebarNav(cat.slug, false)}

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

            <div class="content-body">
                <!-- Category Hero Banner -->
                <section class="section-container" style="padding-top:1.5rem; padding-bottom:1rem;">
                    <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem; font-size:0.875rem; color:var(--text-muted);">
                        <a href="/" style="color:var(--text-muted); text-decoration:none;"><i class="fa-solid fa-house"></i> Home</a>
                        <i class="fa-solid fa-chevron-right" style="font-size:0.7rem;"></i>
                        <span style="color:var(--text-primary); font-weight:600;">${escapeHtml(cat.name)}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:1rem; margin-top:1rem;">
                        <div class="icon-wrapper ${cat.iconClass}" style="width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">
                            <i class="fa-solid ${cat.icon}"></i>
                        </div>
                        <div>
                            <h1 style="font-size:1.75rem; margin:0 0 0.25rem 0;">${escapeHtml(cat.heading)}</h1>
                            <p style="color:var(--text-muted); margin:0; font-size:1rem;">${escapeHtml(cat.subheading)}</p>
                        </div>
                    </div>
                </section>

                <!-- Pre-rendered Tools Grid -->
                <section class="section-container" id="all-tools">
                    <div class="section-header">
                        <h2>Available ${escapeHtml(cat.name)} Tools (${catTools.length})</h2>
                    </div>
                    <div class="tools-grid">
                        ${catTools.length > 0 ? catTools.map(t => `
                            <a href="/tool/${t.slug}" class="tool-card">
                                <div class="tool-icon ${t.iconClass || 'icon-finance'}"><i class="fa-solid ${t.icon || 'fa-calculator'}"></i></div>
                                <h3>${escapeHtml(t.name)}</h3>
                                <p>${escapeHtml(t.description || '')}</p>
                                <span class="tag ${t.tagClass || 'tag-finance'}">${escapeHtml(t.category)}</span>
                            </a>
                        `).join('\n                        ') : `
                            <div class="tool-not-found" style="grid-column: 1 / -1; padding:3rem 1rem; text-align:center;">
                                <div class="not-found-icon" style="background:rgba(99,102,241,0.1); color:var(--primary-color); width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem auto; font-size:1.75rem;">
                                    <i class="fa-solid fa-sparkles"></i>
                                </div>
                                <h2>Exciting ${escapeHtml(cat.name)} calculators are coming soon!</h2>
                                <p style="color:var(--text-muted); margin-bottom:1.5rem;">We are regularly adding new verified calculation tools. Check out our popular tools in the meantime.</p>
                                <a href="/" class="btn btn-primary"><i class="fa-solid fa-house"></i> Browse All Calculators</a>
                            </div>
                        `}
                    </div>
                </section>
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

    <script src="/js/tools.js"></script>
    <script src="/js/tools-template.js"></script>
    <script src="/js/app.js"></script>
    <script src="/js/config.js" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
    <script src="/js/supabase.js" defer></script>
    <script src="/js/cookie-consent.js" defer></script>
    <script src="/js/maintenance-banner.js" defer></script>
    <script src="/js/pwa.js" defer></script>
</body>
</html>`;
};

// ── 7. Main Execution ────────────────────────────────────────────────
const registry = buildRegistry();
const slugs = Object.keys(registry).sort();

// Write each tool page
slugs.forEach(slug => {
  const tool = registry[slug];
  const slugDir = path.join(toolDir, slug);
  if (!fs.existsSync(slugDir)) fs.mkdirSync(slugDir, { recursive: true });
  fs.writeFileSync(path.join(slugDir, 'index.html'), toolPageTemplate(tool));
});

// Write each category page
const categorySlugs = Object.keys(CATEGORIES);
categorySlugs.forEach(catSlug => {
  const cat = CATEGORIES[catSlug];
  const catTools = Object.values(registry).filter(t => t.category.toLowerCase() === cat.name.toLowerCase());
  const catDirPath = path.join(categoryDir, catSlug);
  if (!fs.existsSync(catDirPath)) fs.mkdirSync(catDirPath, { recursive: true });
  fs.writeFileSync(path.join(catDirPath, 'index.html'), categoryPageTemplate(cat, catTools));
});

// Generate sitemap.xml
const staticUrls = [
  { loc: `${BASE_URL}/`,            priority: '1.0',  changefreq: 'weekly'  },
  { loc: `${BASE_URL}/about`,       priority: '0.8',  changefreq: 'monthly' },
  { loc: `${BASE_URL}/contact`,     priority: '0.7',  changefreq: 'monthly' },
  { loc: `${BASE_URL}/privacy`,     priority: '0.6',  changefreq: 'monthly' },
  { loc: `${BASE_URL}/terms`,       priority: '0.6',  changefreq: 'monthly' },
  { loc: `${BASE_URL}/cookie-policy`, priority: '0.6', changefreq: 'monthly' },
];

const categoryUrls = categorySlugs.map(catSlug => ({
  loc:        `${BASE_URL}/category/${catSlug}`,
  priority:   '0.85',
  changefreq: 'weekly',
}));

const toolUrls = slugs.map(slug => ({
  loc:        `${BASE_URL}/tool/${slug}`,
  priority:   '0.9',
  changefreq: 'monthly',
}));

const allUrls = [...staticUrls, ...categoryUrls, ...toolUrls];

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
console.log(`  Static category pages: ${categorySlugs.length} (in /category/{slug}/)`);
console.log(`  Sitemap URLs: ${allUrls.length}`);
console.log(`  robots.txt updated`);
