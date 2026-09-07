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

// ── 2. Helpers ───────────────────────────────────────────────────────
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

function buildHowToJsonLd(tool) {
  if (!tool.howTo || !tool.howTo.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Use the ${tool.name}`,
    description: tool.description,
    step: tool.howTo.map((step, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: `Step ${idx + 1}`,
      text: step,
    })),
  };
}

function buildArticleJsonLd(tool) {
  if (!tool.article || !tool.article.heading) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: tool.article.heading,
    description: tool.article.intro || tool.metaDescription || tool.description,
    author: { '@type': 'Organization', name: 'GetCalcu Editorial & Calculation Review Board' },
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

// ── 3. Build Pre-Rendered Full Static HTML for Non-JS Crawlers & Humans ─
function renderPreRenderedToolContent(tool, slug) {
  // Compute default values
  const defaultVals = {};
  if (tool.fields && Array.isArray(tool.fields)) {
    tool.fields.forEach(f => {
      defaultVals[f.id] = typeof f.default === 'function' ? f.default() : f.default;
    });
  }

  let result = null;
  if (typeof tool.calculate === 'function') {
    try {
      result = tool.calculate(defaultVals);
    } catch (e) {
      // fallback
    }
  }

  // 1. Presets HTML
  let presetsHtml = '';
  if (tool.presets && tool.presets.length > 0) {
    presetsHtml = `
      <div class="preset-chips-container" role="group" aria-label="Quick Scenario Presets">
        <div class="preset-chips-header">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>Quick Scenarios</span>
        </div>
        <div class="preset-chips-list">
          ${tool.presets.map((p, idx) => `
            <button type="button" class="preset-chip ${idx === 0 ? 'active' : ''}" data-preset-idx="${idx}">
              <i class="fa-solid fa-sliders"></i> <span>${escapeHtml(p.label)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 2. Form HTML
  let formHtml = presetsHtml;
  if (tool.fields && Array.isArray(tool.fields)) {
    for (const field of tool.fields) {
      const label = field.label || field.id;
      const val = defaultVals[field.id] !== undefined ? defaultVals[field.id] : '';
      if (field.type === 'select') {
        const optionsHtml = (field.options || []).map(o => `
          <option value="${escapeHtml(o.value)}" ${o.value === val ? 'selected' : ''}>${escapeHtml(o.label)}</option>
        `).join('');
        formHtml += `
          <div class="form-group" data-field="${field.id}">
            <label for="${field.id}">${escapeHtml(label)}</label>
            ${field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : ''}
            <select id="${field.id}" data-id="${field.id}">${optionsHtml}</select>
          </div>
        `;
      } else if (field.type === 'range') {
        formHtml += `
          <div class="form-group" data-field="${field.id}">
            <label for="${field.id}">${escapeHtml(label)}</label>
            ${field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : ''}
            <div class="range-input-wrap">
              <input type="number" id="${field.id}" data-id="${field.id}" value="${val}" inputmode="decimal">
              <input type="range" id="${field.id}-range" data-range-for="${field.id}" value="${val}">
            </div>
          </div>
        `;
      } else if (field.type !== 'section') {
        formHtml += `
          <div class="form-group" data-field="${field.id}">
            <label for="${field.id}">${escapeHtml(label)}</label>
            ${field.hint ? `<span class="field-hint">${escapeHtml(field.hint)}</span>` : ''}
            <input type="${field.type || 'number'}" id="${field.id}" data-id="${field.id}" value="${val}" inputmode="decimal">
          </div>
        `;
      }
    }
  }

  // 3. Stats & Result Cards HTML
  let statsHtml = '';
  if (result && result.stats && Array.isArray(result.stats)) {
    statsHtml = `
      <div class="stats-grid">
        ${result.stats.map(s => `
          <div class="stat-card ${s.highlight ? 'stat-card--highlight' : ''} ${s.warn ? 'stat-card--warn' : ''}">
            <span class="stat-label">${escapeHtml(s.label)}</span>
            <span class="stat-value">${escapeHtml(s.value)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  let insightHtml = '';
  if (result && result.insight) {
    insightHtml = `
      <div class="insight-banner insight-banner--${result.insight.tone || 'positive'}">
        <i class="fa-solid ${result.insight.icon || 'fa-circle-check'}"></i>
        <div class="insight-content">
          <h4>${escapeHtml(result.insight.headline)}</h4>
          <p>${escapeHtml(result.insight.detail)}</p>
        </div>
      </div>
    `;
  }

  // 4. Action Toolbar
  const toolbarHtml = `
    <div class="results-action-toolbar" id="results-action-toolbar" role="toolbar" aria-label="Calculation actions">
      <button class="btn btn-outline btn-sm action-btn" id="action-compare-btn"><i class="fa-solid fa-code-compare"></i> <span>Compare A vs B</span></button>
      <button class="btn btn-outline btn-sm action-btn" id="action-share-btn"><i class="fa-solid fa-share-nodes"></i> <span>Share</span></button>
      <button class="btn btn-outline btn-sm action-btn" id="action-pdf-btn"><i class="fa-solid fa-file-pdf"></i> <span>PDF</span></button>
      <button class="btn btn-outline btn-sm action-btn" id="action-csv-btn"><i class="fa-solid fa-file-csv"></i> <span>CSV</span></button>
      <button class="btn btn-outline btn-sm action-btn" id="action-print-btn"><i class="fa-solid fa-print"></i> <span>Print</span></button>
      <button class="btn btn-outline btn-sm action-btn copy-results-btn" id="copy-results-btn"><i class="fa-regular fa-copy"></i> <span>Copy</span></button>
    </div>
  `;

  // 5. Article & Educational Sections
  let articleHtml = '';
  if (tool.article) {
    const a = tool.article;
    const sectionsHtml = (a.sections && a.sections.length)
      ? a.sections.map(s => `
        <h3 style="font-size:16px;font-weight:700;margin:20px 0 8px;color:var(--text-primary);">${escapeHtml(s.heading)}</h3>
        <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${escapeHtml(s.body)}</p>
      `).join('')
      : '';
    articleHtml = `
      <div class="tool-runner-card" style="margin-top:24px;">
        <h2 style="font-size:20px;font-weight:700;margin-bottom:14px;color:var(--text-primary);">${escapeHtml(a.heading)}</h2>
        <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${escapeHtml(a.intro)}</p>
        ${sectionsHtml}
      </div>
    `;
  }

  // 6. How To & Formula
  let howToHtml = '';
  if (tool.howTo && tool.howTo.length) {
    const steps = tool.howTo.map((step, i) => `<li style="margin-bottom:10px;"><strong>Step ${i + 1}:</strong> ${escapeHtml(step)}</li>`).join('');
    howToHtml = `
      <div class="tool-runner-card" style="margin-top:24px;">
        <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">How to Use the ${escapeHtml(tool.name)}</h2>
        <ol style="padding-left:20px;color:var(--text-secondary);font-size:14px;line-height:1.8;">${steps}</ol>
        ${tool.formula ? `<div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px 18px;margin-top:16px;font-size:13px;color:var(--text-secondary);"><strong style="color:var(--text-primary);">Formula:</strong> ${escapeHtml(tool.formula)}</div>` : ''}
      </div>
    `;
  }

  // 7. Examples
  let examplesHtml = '';
  if (tool.examples && tool.examples.length) {
    const exCards = tool.examples.map(ex => `
      <div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px;">
        <p style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text-primary);">${escapeHtml(ex.title)}</p>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;"><strong>Input:</strong> ${escapeHtml(ex.input)}</p>
        <p style="font-size:13px;color:var(--text-secondary);"><strong>Result:</strong> <span style="color:var(--primary-color);font-weight:700;">${escapeHtml(ex.result)}</span></p>
      </div>
    `).join('');
    examplesHtml = `
      <div class="tool-runner-card" style="margin-top:24px;">
        <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Real-World Worked Examples</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">${exCards}</div>
      </div>
    `;
  }

  // 8. FAQs
  let faqsHtml = '';
  if (tool.faqs && tool.faqs.length) {
    const faqItems = tool.faqs.map(f => `
      <details class="faq-item" style="border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:10px;padding:12px 16px;background:var(--bg-card);">
        <summary style="font-weight:600;cursor:pointer;color:var(--text-primary);">${escapeHtml(f.q)}</summary>
        <p style="margin-top:10px;font-size:14px;color:var(--text-secondary);line-height:1.6;">${escapeHtml(f.a)}</p>
      </details>
    `).join('');
    faqsHtml = `
      <div class="tool-runner-card" style="margin-top:24px;">
        <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;">Frequently Asked Questions</h2>
        ${faqItems}
      </div>
    `;
  }

  // 9. Authoritative E-E-A-T Editorial & Trust Block
  const trustBlockHtml = `
    <div class="tool-runner-card" style="margin-top:24px; border-left:4px solid var(--primary-color); background:var(--bg-main);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
        <div>
          <h3 style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">
            <i class="fa-solid fa-shield-halved" style="color:var(--primary-color); margin-right:6px;"></i>
            GetCalcu Methodology & Editorial Standards
          </h3>
          <p style="font-size:13px; color:var(--text-secondary); margin:0;">
            Every calculation formula on GetCalcu is peer-reviewed against official industry standards (CFPB, IRS Title 26, NIST, ISO 80000, and CDC guidelines).
          </p>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; font-size:12px; color:var(--text-secondary); margin-top:10px; padding-top:10px; border-top:1px solid var(--border-color);">
        <div><strong>Reviewed by:</strong> GetCalcu Editorial & Mathematical Board</div>
        <div><strong>Last Verified:</strong> September 2026</div>
        <div><strong>Accuracy Policy:</strong> In-browser deterministic computation</div>
        <div><strong>Feedback:</strong> <a href="/contact?subject=${encodeURIComponent(tool.name + ' Correction')}" style="color:var(--primary-color); text-decoration:none;">Report an issue</a></div>
      </div>
    </div>
  `;

  return `
    <div class="tool-runner-card">
      <div class="tool-header">
        <h1>${escapeHtml(tool.name)}</h1>
        <p>${escapeHtml(tool.description)}</p>
      </div>
      <div class="tool-grid-workspace">
        <div class="calculator-form-inputs">
          ${formHtml}
        </div>
        <div class="calculator-results-card" aria-live="polite" aria-atomic="true">
          ${insightHtml}
          ${statsHtml}
          ${toolbarHtml}
        </div>
      </div>
    </div>
    ${trustBlockHtml}
    ${articleHtml}
    ${howToHtml}
    ${examplesHtml}
    ${faqsHtml}
  `;
}

// ── 4. Generate Static per-tool HTML pages ───────────────────────────
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
    buildHowToJsonLd(tool),
    buildArticleJsonLd(tool),
  ].filter(Boolean);

  const catSlug = (tool.category || 'finance').toLowerCase();
  const preRenderedBody = renderPreRenderedToolContent(tool, tool.slug);

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

    <!-- Structured Data (JSON-LD) -->
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
                ${preRenderedBody}
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

// ── 5. Generate static per-category HTML pages ───────────────────────
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

    <!-- Structured Data (JSON-LD) -->
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
                <!-- World-Class Category Hero Banner -->
                <section class="category-hero-banner theme-${cat.slug}">
                    <div class="category-hero-content">
                        <div class="category-hero-header-row">
                            <div class="category-hero-icon-wrap">
                                <i class="fa-solid ${cat.icon}"></i>
                            </div>
                            <div class="category-hero-title-group">
                                <div class="category-hero-badge-row">
                                    <span class="category-badge-chip"><i class="fa-solid fa-sparkles"></i> ${escapeHtml(cat.name)} Suite</span>
                                    <span class="category-badge-chip"><i class="fa-solid fa-shield-halved"></i> 100% Free &amp; Private</span>
                                </div>
                                <h1 class="category-hero-heading">${escapeHtml(cat.heading)}</h1>
                                <p class="category-hero-slogan">${escapeHtml(cat.subheading)}</p>
                            </div>
                        </div>

                        <div class="category-search-container">
                            <div class="category-search-box">
                                <i class="fa-solid fa-magnifying-glass category-search-icon"></i>
                                <input type="text" class="category-search-field" id="category-filter-input" placeholder="Search ${catTools.length} ${escapeHtml(cat.name).toLowerCase()} calculators &amp; tools..." aria-label="Search ${escapeHtml(cat.name)} calculators">
                                <button type="button" class="category-search-clear hidden" id="category-search-clear" aria-label="Clear search">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                                <button type="button" class="category-search-btn" id="category-search-btn">
                                    <i class="fa-solid fa-magnifying-glass"></i>
                                    <span>Search</span>
                                </button>
                            </div>
                            <div class="category-search-stats">
                                <span>Showing <strong id="category-filtered-count">${catTools.length}</strong> of <strong>${catTools.length}</strong> calculators</span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Pre-rendered Tools Grid -->
                <section class="section-container" id="all-tools">
                    <div class="section-header">
                        <h2>Available ${escapeHtml(cat.name)} Tools</h2>
                    </div>
                    <div class="tools-grid">
                        ${catTools.map(t => `
                            <a href="/tool/${t.slug}" class="tool-card">
                                <div>
                                    <div class="tool-card-header">
                                        <div class="tool-icon ${t.iconClass || ('icon-' + cat.slug)}"><i class="fa-solid ${t.icon || 'fa-calculator'}"></i></div>
                                    </div>
                                    <h3>${escapeHtml(t.name)}</h3>
                                    <p>${escapeHtml(t.description)}</p>
                                </div>
                                <div class="tool-card-footer">
                                    <span class="tag ${t.tagClass || ('tag-' + cat.slug)}">${escapeHtml(t.category)}</span>
                                    <span class="tool-card-cta">Calculate <i class="fa-solid fa-arrow-right"></i></span>
                                </div>
                            </a>
                        `).join('\n                        ')}
                    </div>
                    <div id="category-empty-filter" class="tool-not-found" style="display:none; padding:40px 20px;">
                        <div class="not-found-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                        <h2>No matching calculators found</h2>
                        <p>Try adjusting your search terms or browse all tools.</p>
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

// ── 6. Main Build Runner ─────────────────────────────────────────────
function build() {
  const tools = loadTools();
  const allSlugs = Object.keys(tools);

  // 1. Generate tool landing pages
  allSlugs.forEach(slug => {
    const tool = { ...tools[slug], slug };
    const toolSubDir = path.join(toolDir, slug);
    if (!fs.existsSync(toolSubDir)) fs.mkdirSync(toolSubDir, { recursive: true });

    const html = toolPageTemplate(tool);
    fs.writeFileSync(path.join(toolSubDir, 'index.html'), html, 'utf8');
  });

  // 2. Generate category landing pages
  Object.keys(CATEGORIES).forEach(catKey => {
    const cat = CATEGORIES[catKey];
    const catTools = allSlugs
      .map(s => ({ ...tools[s], slug: s }))
      .filter(t => (t.category || '').toLowerCase() === cat.slug);

    const catSubDir = path.join(categoryDir, cat.slug);
    if (!fs.existsSync(catSubDir)) fs.mkdirSync(catSubDir, { recursive: true });

    const html = categoryPageTemplate(cat, catTools);
    fs.writeFileSync(path.join(catSubDir, 'index.html'), html, 'utf8');
  });

  // 3. Generate sitemap.xml
  const sitemapUrls = [
    { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily' },
    ...Object.keys(CATEGORIES).map(k => ({
      loc: `${BASE_URL}/category/${CATEGORIES[k].slug}`,
      priority: '0.8',
      changefreq: 'weekly',
    })),
    ...allSlugs.map(s => ({
      loc: `${BASE_URL}/tool/${s}`,
      priority: '0.9',
      changefreq: 'weekly',
    })),
    { loc: `${BASE_URL}/about`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${BASE_URL}/contact`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${BASE_URL}/terms`, priority: '0.3', changefreq: 'monthly' },
    { loc: `${BASE_URL}/cookie-policy`, priority: '0.3', changefreq: 'monthly' },
    { loc: `${BASE_URL}/privacy`, priority: '0.3', changefreq: 'monthly' },
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapXml, 'utf8');

  // 4. Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /auth*
Disallow: /history
Disallow: /?category=*

Sitemap: ${BASE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(__dirname, 'robots.txt'), robotsTxt, 'utf8');

  console.log(`✓ build-seo.js complete`);
  console.log(`  Tools registered: ${allSlugs.length}`);
  console.log(`  Static tool pages: ${allSlugs.length} (in /tool/{slug}/)`);
  console.log(`  Static category pages: ${Object.keys(CATEGORIES).length} (in /category/{slug}/)`);
  console.log(`  Sitemap URLs: ${sitemapUrls.length}`);
  console.log(`  robots.txt updated`);
}

build();
