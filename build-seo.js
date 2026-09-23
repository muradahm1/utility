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
    metaDescription: 'Free financial calculators for mortgages, loans, investments, retirement, budgeting, compound interest, and debt payoff. Fast, accurate, and completely private.',
    heading: 'Financial Calculators & Decision Tools',
    subheading: 'Make confident financial moves. Calculate mortgage payments, evaluate debt payoff strategies, plan retirement, and forecast investments with verified formulas.',
  },
  health: {
    name: 'Health',
    slug: 'health',
    icon: 'fa-heart-pulse',
    iconClass: 'icon-health',
    tagClass: 'tag-health',
    title: 'Health & Fitness Calculators — Free Online | GetCalcu',
    metaDescription: 'Free health and fitness calculators including Body Mass Index (BMI), daily calorie needs (TDEE), and wellness targets. Fast and reliable.',
    heading: 'Health & Fitness Calculators',
    subheading: 'Track vital wellness metrics, calculate Body Mass Index (BMI), and explore healthy target weight ranges backed by standard health guidelines.',
  },
  math: {
    name: 'Math',
    slug: 'math',
    icon: 'fa-percent',
    iconClass: 'icon-math',
    tagClass: 'tag-math',
    title: 'Math Calculators & Percentage Tools | GetCalcu',
    metaDescription: 'Free online math calculators for percentages, date differences, unit conversions, and everyday arithmetic calculations.',
    heading: 'Everyday Math & Percentage Tools',
    subheading: 'Get fast, accurate answers for percentage changes, date arithmetic, discount calculations, and split totals.',
  },
  business: {
    name: 'Business',
    slug: 'business',
    icon: 'fa-briefcase',
    iconClass: 'icon-business',
    tagClass: 'tag-business',
    title: 'Business & Commercial Calculators | GetCalcu',
    metaDescription: 'Free business and commercial calculators for profit margins, break-even targets, customer lifetime value, and financial planning.',
    heading: 'Business & Commerce Calculators',
    subheading: 'Calculate profit margins, break-even points, customer lifetime value, and key metrics to run and grow your business.',
  },
  education: {
    name: 'Education',
    slug: 'education',
    icon: 'fa-graduation-cap',
    iconClass: 'icon-education',
    tagClass: 'tag-education',
    title: 'Educational & Study Calculators | GetCalcu',
    metaDescription: 'Free educational calculators and study tools for students and educators, including GPA and grade calculators.',
    heading: 'Academic & Study Calculators',
    subheading: 'Streamline your coursework with reliable GPA calculations, final exam targets, and practical study utilities.',
  },
  construction: {
    name: 'Construction',
    slug: 'construction',
    icon: 'fa-helmet-safety',
    iconClass: 'icon-construction',
    tagClass: 'tag-construction',
    title: 'Construction & Material Estimators | GetCalcu',
    metaDescription: 'Free construction calculators for concrete volume, paint coverage, tile layout, and raw building materials.',
    heading: 'Construction & Material Estimators',
    subheading: 'Plan home improvement and job site projects with precision. Accurately estimate concrete volume, paint coverage, tile layout, and raw materials.',
  },
  engineering: {
    name: 'Engineering',
    slug: 'engineering',
    icon: 'fa-gears',
    iconClass: 'icon-engineering',
    tagClass: 'tag-engineering',
    title: 'Engineering & Physics Calculators | GetCalcu',
    metaDescription: 'Free engineering calculators for Ohm\'s Law, beam deflection, pressure units, and physics formulas.',
    heading: 'Engineering & Physics Calculators',
    subheading: 'Solve circuit equations, structural beam deflections, fluid pressure conversions, and physics formulas with engineering precision.',
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
      revisionDate: t.revisionDate || null,
      lastReviewed: t.lastReviewed || null,
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
      name: f.q || f.question || '',
      acceptedAnswer: { '@type': 'Answer', text: f.a || f.answer || '' },
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
      text: typeof step === 'string' ? step : (step.text || step.name || ''),
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
    dateModified: tool.revisionDate || TODAY,
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
                <div class="brand-icon"><img src="/logo.png" alt="GetCalcu" width="36" height="36"></div>
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

// ── Contextual Trust Standards & Authority Scoping ─────────────────
function getToolTrustInfo(tool, slug) {
  const cat = (tool.category || '').toLowerCase();
  if (cat === 'finance') {
    if (['mortgage-calculator', 'auto-loan-calculator', 'loan-calculator', 'loan-interest-calculator', 'credit-card-payoff-calculator', 'amortization-calculator', 'house-affordability-calculator', 'student-loan-calculator'].includes(slug)) {
      return {
        standard: 'Consumer Financial Protection Bureau (CFPB) Regulation Z (12 CFR § 1026.22) & Truth in Lending Act (TILA) amortization standards.',
        reviewer: 'GetCalcu Consumer Credit & Lending Review Board',
        policy: 'Deterministic in-browser amortization'
      };
    }
    if (['debt-snowball-calculator'].includes(slug)) {
      return {
        standard: 'Harvard Business School debt payoff empirical behavioral research & CFPB debt reduction guidelines.',
        reviewer: 'GetCalcu Consumer Debt & Credit Planning Board',
        policy: 'Deterministic mathematical payoff simulation'
      };
    }
    if (['refinance-calculator'].includes(slug)) {
      return {
        standard: 'Consumer Financial Protection Bureau (CFPB) TILA disclosure standards & break-even mortgage amortization formulas.',
        reviewer: 'GetCalcu Mortgage & Real Estate Review Desk',
        policy: 'Deterministic break-even computation'
      };
    }
    if (['self-employment-tax-calculator'].includes(slug)) {
      return {
        standard: 'IRS Schedule SE (Form 1040) statutory 92.35% SECA rules & Social Security Administration statutory wage limits.',
        reviewer: 'GetCalcu Small Business & Tax Planning Board',
        policy: 'Deterministic progressive tax modeling'
      };
    }
    if (['salary-calculator'].includes(slug)) {
      return {
        standard: 'IRS Title 26 Internal Revenue Code (Rev. Proc. 2024-40) 2026 federal brackets, standard deductions, and FICA statutory rates.',
        reviewer: 'GetCalcu Payroll & Tax Calculation Desk',
        policy: 'Deterministic in-browser payroll calculation'
      };
    }
    if (['investment-calculator', 'compound-interest-calculator', 'retirement-calculator', 'fire-calculator', 'savings-calculator', 'emergency-fund-calculator', '401k-calculator', 'net-worth-calculator'].includes(slug)) {
      return {
        standard: 'Fisher Real Rate of Return Equation & SEC / FINRA compound interest modeling guidelines (4% Safe Withdrawal Framework).',
        reviewer: 'GetCalcu Quantitative Finance & Wealth Planning Board',
        policy: 'Deterministic real purchasing-power projection'
      };
    }
    return {
      standard: 'Generally Accepted Accounting Principles (GAAP) & CFPB financial disclosure guidelines.',
      reviewer: 'GetCalcu Financial Editorial Board',
      policy: 'Deterministic client-side computation'
    };
  }
  if (cat === 'health') {
    if (slug === 'bmi-calculator') {
      return {
        standard: 'CDC Adult & Pediatric Body Mass Index criteria and World Health Organization (WHO) international classification thresholds.',
        reviewer: 'GetCalcu Health & Nutrition Advisory Group',
        policy: 'Deterministic anthropometric evaluation'
      };
    }
    return {
      standard: 'Mifflin-St Jeor Energy Expenditure Equations (validated by the Academy of Nutrition and Dietetics).',
      reviewer: 'GetCalcu Health & Nutrition Advisory Group',
      policy: 'Deterministic metabolic computation'
    };
  }
  if (cat === 'engineering') {
    if (slug === 'ohms-law-calculator') {
      return {
        standard: "IEEE standard DC/AC resistive circuit principles and Ohm's Law governing electrical relations.",
        reviewer: 'GetCalcu Physical Science & Electrical Review Desk',
        policy: 'Deterministic physics evaluation'
      };
    }
    if (slug === 'beam-deflection-calculator') {
      return {
        standard: 'American Institute of Steel Construction (AISC) & classical Euler-Bernoulli beam theory deflection formulations.',
        reviewer: 'GetCalcu Structural Engineering Review Board',
        policy: 'Deterministic structural mechanics calculation'
      };
    }
    return {
      standard: 'ISO 80000-4 Quantities and Units (Mechanics) & standard hydrostatic pressure equations.',
      reviewer: 'GetCalcu Physical Science & Engineering Board',
      policy: 'Deterministic fluid mechanics computation'
    };
  }
  if (cat === 'construction') {
    return {
      standard: 'ASTM International standard specifications for construction materials and standard architectural coverage ratios.',
      reviewer: 'GetCalcu Construction & Building Estimations Board',
      policy: 'Deterministic volumetric & material estimation'
    };
  }
  if (cat === 'education') {
    return {
      standard: 'AACRAO (American Association of Collegiate Registrars and Admissions Officers) standard 4.0 GPA weighting conventions.',
      reviewer: 'GetCalcu Academic & Educational Review Board',
      policy: 'Deterministic academic calculation'
    };
  }
  if (cat === 'business') {
    return {
      standard: 'Corporate Finance Institute (CFI) standard unit economics, GAAP gross margin formulas, and SaaS LTV/CAC metrics.',
      reviewer: 'GetCalcu Commercial Planning & Unit Economics Desk',
      policy: 'Deterministic commercial calculation'
    };
  }
  if (cat === 'math') {
    if (slug === 'unit-converter') {
      return {
        standard: 'NIST Special Publication 811 (Guide for the Use of the International System of Units) & BIPM definitions.',
        reviewer: 'GetCalcu Metrology & Dimensional Analysis Board',
        policy: 'Deterministic floating-point unit conversion'
      };
    }
    return {
      standard: 'ISO 80000 mathematical sign standards and deterministic algebraic formulas.',
      reviewer: 'GetCalcu Mathematical Review Board',
      policy: 'Deterministic arithmetic evaluation'
    };
  }
  return {
    standard: 'Deterministic mathematical principles and open peer-reviewed computational standards.',
    reviewer: 'GetCalcu Editorial & Calculation Board',
    policy: 'In-browser deterministic computation'
  };
}

function buildMethodologyHtml(tool, slug) {
  if (!tool.methodology && !tool.formula) return '';
  const m = tool.methodology || {};
  const trustInfo = getToolTrustInfo(tool, slug);
  const standards = m.standards || trustInfo.standard || 'Calculations are based on recognized financial, mathematical, and scientific models verified against authoritative reference standards.';
  const reviewer = m.reviewer || trustInfo.reviewer || 'GetCalcu Editorial & Calculation Board';
  const lastReviewed = tool.lastReviewed || m.lastReviewed || 'September 2026';
  const assumptions = m.assumptions || [];
  const sources = m.sources || [reviewer];

  let assumptionsHtml = '';
  if (assumptions.length > 0) {
    assumptionsHtml = `
      <div class="methodology-block">
        <h4 class="methodology-subheading">Key Modeling Assumptions:</h4>
        <ul class="methodology-list">
          ${assumptions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
      </div>`;
  }
  let sourcesHtml = '';
  if (sources.length > 0) {
    sourcesHtml = `
      <div class="methodology-sources">
        <span class="methodology-sources-label"><i class="fa-solid fa-book-bookmark"></i> Reference Sources:</span>
        <span class="methodology-sources-list">${sources.map(s => escapeHtml(s)).join(' • ')}</span>
      </div>`;
  }

  return `
    <section class="tool-runner-card methodology-card" id="methodology" aria-labelledby="methodology-heading">
      <div class="methodology-header">
        <div class="methodology-title-wrap">
          <span class="methodology-badge"><i class="fa-solid fa-shield-check"></i> Editorial Standard</span>
          <h2 id="methodology-heading">GetCalcu Methodology &amp; Editorial Standards</h2>
        </div>
        <span class="methodology-review-date"><i class="fa-regular fa-calendar-check"></i> Reviewed: ${escapeHtml(lastReviewed)}</span>
      </div>
      <p class="methodology-summary">${escapeHtml(m.summary || standards)}</p>
      ${assumptionsHtml}
      ${sourcesHtml}
    </section>
  `;
}

function buildOnThisPageHtml(tocItems) {
  if (!tocItems || !tocItems.length) return '';
  return `
    <div class="on-this-page-container">
      <details class="on-this-page-details" open>
        <summary class="on-this-page-summary">
          <span class="on-this-page-title"><i class="fa-solid fa-list-ul"></i> On this page</span>
          <i class="fa-solid fa-chevron-down on-this-page-chevron" aria-hidden="true"></i>
        </summary>
        <nav class="on-this-page-nav" aria-label="On this page">
          <ul class="on-this-page-list">
            ${tocItems.map(item => `
              <li class="on-this-page-item">
                <a href="#${escapeHtml(item.id)}" class="on-this-page-link">${escapeHtml(item.label)}</a>
              </li>
            `).join('')}
          </ul>
        </nav>
      </details>
    </div>
  `;
}

// ── 3. Build Pre-Rendered Full Static HTML for Non-JS Crawlers & Humans ─
function renderPreRenderedToolContent(tool, slug, allTools = {}) {
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
    const icon = result.insight.icon || (result.insight.tone === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-check');
    const headline = result.insight.headline || result.insight.title || '';
    const detail = result.insight.detail || result.insight.text || '';
    const tone = result.insight.tone || 'positive';
    insightHtml = `
      <div class="insight-banner insight-banner--${tone}">
        <i class="fa-solid ${icon}"></i>
        <div class="insight-content">
          <h4>${escapeHtml(headline)}</h4>
          <p>${escapeHtml(detail)}</p>
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

  // TOC Item Accumulator
  const tocItems = [];

  // 5. Methodology
  const methodologyHtml = buildMethodologyHtml(tool, slug);
  if (methodologyHtml) {
    tocItems.push({ id: 'methodology', label: 'Methodology & Standards' });
  }

  // 6. Article & Educational Sections
  let articleHtml = '';
  if (tool.article) {
    const a = tool.article;
    const articleId = a.id || 'how-to-calculate';
    tocItems.push({ id: articleId, label: a.heading || 'How to Calculate' });

    const sectionsHtml = (a.sections && a.sections.length)
      ? a.sections.map((s, idx) => {
        const bodyText = typeof s.body === 'string'
          ? `<p>${escapeHtml(s.body)}</p>`
          : (Array.isArray(s.body) ? s.body.map(p => `<p>${escapeHtml(p)}</p>`).join('') : `<p>${escapeHtml(s.body || s.content || '')}</p>`);
        return `
          <div class="article-subsection" ${s.id ? `id="${escapeHtml(s.id)}"` : ''}>
            <h3 class="article-subheading">${escapeHtml(s.heading)}</h3>
            <div class="article-body-text">${bodyText}</div>
          </div>`;
      }).join('')
      : '';

    articleHtml = `
      <article class="tool-runner-card educational-card" id="${escapeHtml(articleId)}" aria-labelledby="${escapeHtml(articleId)}-title">
        <h2 id="${escapeHtml(articleId)}-title" class="educational-section-title">${escapeHtml(a.heading)}</h2>
        <div class="article-intro-text"><p>${escapeHtml(a.intro)}</p></div>
        ${sectionsHtml}
      </article>
    `;
  }

  // 7. How To
  let howToHtml = '';
  if (tool.howTo && tool.howTo.length) {
    const howToId = 'how-to-use';
    const howToTitle = `How to Use the ${tool.name}`;
    tocItems.push({ id: howToId, label: howToTitle });

    const steps = tool.howTo.map((step, i) => {
      const stepText = typeof step === 'string' ? escapeHtml(step) : (step.name ? `<strong>${escapeHtml(step.name)}:</strong> ${escapeHtml(step.text)}` : escapeHtml(step.text || ''));
      return `
        <li class="how-to-step">
          <span class="step-num">${i + 1}</span>
          <div class="step-content">${stepText}</div>
        </li>
      `;
    }).join('');

    howToHtml = `
      <section class="tool-runner-card educational-card" id="${howToId}" aria-labelledby="${howToId}-title">
        <h2 id="${howToId}-title" class="educational-section-title">${escapeHtml(howToTitle)}</h2>
        <ol class="how-to-steps-list">${steps}</ol>
      </section>
    `;
  }

  // 8. Formula
  let formulaHtml = '';
  if (tool.formula || tool.formulaBreakdown) {
    const formulaId = 'formula';
    const formulaTitle = tool.formulaTitle || `${tool.name} Formula`;
    tocItems.push({ id: formulaId, label: formulaTitle });

    let variablesHtml = '';
    if (tool.formulaVariables && tool.formulaVariables.length) {
      variablesHtml = `
        <div class="formula-variables-wrap">
          <h4 class="formula-variables-heading">Variable Definitions:</h4>
          <ul class="formula-variables-list">
            ${tool.formulaVariables.map(v => `<li><strong>${escapeHtml(v.name)}</strong>: ${escapeHtml(v.description)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    let plainEnglishHtml = '';
    if (tool.formulaExplanation) {
      plainEnglishHtml = `<div class="article-body-text"><p>${escapeHtml(tool.formulaExplanation)}</p></div>`;
    }

    formulaHtml = `
      <section class="tool-runner-card educational-card" id="${formulaId}" aria-labelledby="${formulaId}-title">
        <h2 id="${formulaId}-title" class="educational-section-title">${escapeHtml(formulaTitle)}</h2>
        <div class="formula-display-box">
          <code>${escapeHtml(tool.formula)}</code>
        </div>
        ${plainEnglishHtml}
        ${variablesHtml}
      </section>
    `;
  }

  // 9. Examples
  let examplesHtml = '';
  if (tool.examples && tool.examples.length) {
    const examplesId = 'worked-examples';
    const examplesTitle = 'Real-World Worked Examples';
    tocItems.push({ id: examplesId, label: examplesTitle });

    const exCards = tool.examples.map(ex => `
      <div class="worked-example-card">
        <h3 class="worked-example-title">${escapeHtml(ex.title)}</h3>
        <div class="worked-example-row"><span class="example-label"><strong>Input:</strong></span> <span class="example-val">${escapeHtml(ex.input)}</span></div>
        <div class="worked-example-row worked-example-result"><span class="example-label"><strong>Result:</strong></span> <span class="example-val-highlight">${escapeHtml(ex.result)}</span></div>
        ${ex.explanation ? `<p style="font-size:12px;color:var(--text-secondary);margin-top:6px;line-height:1.5;">${escapeHtml(ex.explanation)}</p>` : ''}
      </div>
    `).join('');

    examplesHtml = `
      <section class="tool-runner-card educational-card" id="${examplesId}" aria-labelledby="${examplesId}-title">
        <h2 id="${examplesId}-title" class="educational-section-title">${escapeHtml(examplesTitle)}</h2>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:14px;">These scenarios demonstrate how key input parameters alter your calculation outcome.</p>
        <div class="worked-examples-grid">${exCards}</div>
      </section>
    `;
  }

  // 10. Additional domain-specific sections
  let additionalSectionsHtml = '';
  if (tool.additionalSections && tool.additionalSections.length) {
    tool.additionalSections.forEach(sec => {
      const secId = sec.id || 'domain-guide';
      tocItems.push({ id: secId, label: sec.heading });

      let contentHtml = '';
      if (sec.items && sec.items.length) {
        contentHtml = `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
            ${sec.items.map(item => `
              <div style="background:var(--bg-main);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:16px;">
                <h4 style="font-size:14px;font-weight:700;margin-bottom:6px;color:var(--text-primary);">${escapeHtml(item.title)}</h4>
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin:0;">${escapeHtml(item.description)}</p>
                ${item.note ? `<span style="display:inline-block;margin-top:8px;font-size:11px;color:var(--primary-color);font-weight:600;">${escapeHtml(item.note)}</span>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      } else if (sec.body) {
        contentHtml = `<div class="article-body-text">${typeof sec.body === 'string' ? `<p>${escapeHtml(sec.body)}</p>` : sec.body.map(p => `<p>${escapeHtml(p)}</p>`).join('')}</div>`;
      }

      additionalSectionsHtml += `
        <section class="tool-runner-card educational-card" id="${escapeHtml(secId)}" aria-labelledby="${escapeHtml(secId)}-title">
          <h2 id="${escapeHtml(secId)}-title" class="educational-section-title">${escapeHtml(sec.heading)}</h2>
          ${sec.intro ? `<p style="font-size:14px;color:var(--text-secondary);margin-bottom:14px;">${escapeHtml(sec.intro)}</p>` : ''}
          ${contentHtml}
        </section>
      `;
    });
  }

  // 11. FAQs
  let faqsHtml = '';
  if (tool.faqs && tool.faqs.length) {
    const faqsId = 'faqs';
    const faqsTitle = 'Frequently Asked Questions';
    tocItems.push({ id: faqsId, label: faqsTitle });

    const faqItems = tool.faqs.map(f => {
      const q = f.q || f.question || '';
      const a = f.a || f.answer || '';
      return `
        <details class="faq-item" style="border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:10px;padding:12px 16px;background:var(--bg-card);">
          <summary style="font-weight:600;cursor:pointer;color:var(--text-primary);">${escapeHtml(q)}</summary>
          <p style="margin-top:10px;font-size:14px;color:var(--text-secondary);line-height:1.6;">${escapeHtml(a)}</p>
        </details>
      `;
    }).join('');

    faqsHtml = `
      <section class="tool-runner-card educational-card" id="${faqsId}" aria-labelledby="${faqsId}-title">
        <h2 id="${faqsId}-title" class="educational-section-title">${escapeHtml(faqsTitle)}</h2>
        ${faqItems}
      </section>
    `;
  }

  // 12. Related Tools Mesh
  let relatedToolsHtml = '';
  let relSlugs = tool.related || [];
  if (!relSlugs.length && allTools) {
    relSlugs = Object.keys(allTools).filter(s => s !== slug && allTools[s].category === tool.category).slice(0, 4);
  }

  if (relSlugs.length > 0) {
    const relatedId = 'related-tools';
    const relatedTitle = 'Related Calculators';
    tocItems.push({ id: relatedId, label: relatedTitle });

    const linkCards = relSlugs.map(relSlug => {
      const relTool = allTools && allTools[relSlug] ? allTools[relSlug] : null;
      const relName = relTool ? relTool.name : relSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const relDesc = relTool ? (relTool.metaDescription || relTool.description) : 'Calculate and evaluate metrics with precision.';
      const relCat = relTool ? relTool.category : (tool.category || 'Finance');
      const relIcon = (relTool && relTool.icon) || 'fa-calculator';
      const relIconClass = (relTool && relTool.iconClass) || 'icon-finance';
      const relTagClass = (relTool && relTool.tagClass) || 'tag-finance';

      return `
        <a href="/tool/${encodeURIComponent(relSlug)}" class="tool-card" style="text-decoration:none; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div class="tool-card-header" style="margin-bottom:10px;">
              <div class="tool-icon ${escapeHtml(relIconClass)}"><i class="fa-solid ${escapeHtml(relIcon)}"></i></div>
            </div>
            <h3 style="font-size:14px; font-weight:700; margin-bottom:6px; color:var(--text-primary);">${escapeHtml(relName)}</h3>
            <p style="font-size:12px; color:var(--text-secondary); line-height:1.5; margin:0;">${escapeHtml(relDesc)}</p>
          </div>
          <div class="tool-card-footer" style="margin-top:14px; display:flex; justify-content:space-between; align-items:center;">
            <span class="tag ${escapeHtml(relTagClass)}">${escapeHtml(relCat)}</span>
            <span style="font-size:12px; color:var(--primary-color); font-weight:600; display:flex; align-items:center; gap:4px;">
              <span>Calculate</span> <i class="fa-solid fa-arrow-right"></i>
            </span>
          </div>
        </a>
      `;
    }).join('');

    relatedToolsHtml = `
      <section class="tool-runner-card educational-card" id="${relatedId}" aria-labelledby="${relatedId}-title">
        <h2 id="${relatedId}-title" class="educational-section-title">
          <i class="fa-solid fa-arrows-split-up-and-left" style="color:var(--primary-color); margin-right:8px;"></i>
          ${escapeHtml(relatedTitle)}
        </h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:16px;">
          ${linkCards}
        </div>
      </section>
    `;
  }

  // 13. Sidebar TOC HTML
  const onThisPageHtml = buildOnThisPageHtml(tocItems);

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
    ${methodologyHtml}
    <div class="educational-layout">
      <div class="educational-main-content">
        ${articleHtml}
        ${howToHtml}
        ${formulaHtml}
        ${examplesHtml}
        ${additionalSectionsHtml}
        ${faqsHtml}
        ${relatedToolsHtml}
      </div>
      <aside class="educational-sidebar" aria-label="Page navigation sidebar">
        ${onThisPageHtml}
      </aside>
    </div>
  `;
}

// ── 4. Generate Static per-tool HTML pages ───────────────────────────
const toolDir = path.join(__dirname, 'tool');
if (!fs.existsSync(toolDir)) fs.mkdirSync(toolDir, { recursive: true });

const toolPageTemplate = (tool, allTools = {}) => {
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
  const preRenderedBody = renderPreRenderedToolContent(tool, tool.slug, allTools);

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

    <link rel="stylesheet" href="/css/style.min.css">
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
                <div class="brand-icon"><img src="/logo.png" alt="GetCalcu" width="36" height="36"></div>
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

const CATEGORY_GUIDES = {
  finance: {
    heading: 'Navigating Financial Calculations: Key Formulas & Rules of Thumb',
    intro: 'Whether you are buying your first home, aggressively paying off debt, or planning a multi-decade retirement, sound financial decisions start with clear mathematical principles.',
    sections: [
      {
        title: 'The 28/36 Rule for Home Affordability',
        text: 'Most mortgage lenders recommend spending no more than 28% of your gross monthly income on housing expenses (PITI: Principal, Interest, Taxes, and Insurance) and no more than 36% on total debt servicing (including student loans, auto payments, and credit cards).'
      },
      {
        title: 'Debt Payoff: Snowball vs. Avalanche',
        text: 'The Debt Snowball method focuses on psychological momentum by paying off the smallest balances first. The Debt Avalanche method focuses on mathematical efficiency by attacking the highest interest rate first, minimizing lifetime finance charges.'
      },
      {
        title: 'The Rule of 72 for Compound Growth',
        text: 'To estimate how many years it takes for an investment to double at a constant annual return, divide 72 by the annual interest rate (e.g., at an 8% annual return, your money doubles in approximately 9 years: 72 / 8 = 9).'
      }
    ]
  },
  health: {
    heading: 'Understanding Health & Body Composition Metrics',
    intro: 'Health tracking is most effective when combining multiple baseline measurements rather than relying on a single number.',
    sections: [
      {
        title: 'BMI vs. Body Fat Percentage',
        text: 'Body Mass Index (BMI) is a rapid epidemiological screening tool comparing height to total weight. However, because BMI cannot distinguish muscle from adipose tissue, pairing BMI with circumference-based body fat percentage (such as the US Navy Method) provides a much clearer picture of overall fitness.'
      },
      {
        title: 'The Energy Balance Equation (TDEE)',
        text: 'Total Daily Energy Expenditure (TDEE) accounts for Basal Metabolic Rate (BMR), the thermic effect of food, and physical activity. Creating a moderate 300 to 500 calorie daily deficit supports sustainable fat loss while preserving lean muscle mass.'
      }
    ]
  },
  math: {
    heading: 'Everyday Mathematical Relationships & Percentages',
    intro: 'From shopping discounts and sales tax to loan amortization and unit conversions, percentage math forms the foundation of daily problem-solving.',
    sections: [
      {
        title: 'Percentage Increase & Decrease',
        text: 'To find the percentage change between an old value and a new value, subtract the old value from the new value, divide by the absolute value of the old value, and multiply by 100: Change % = ((New - Old) / Old) * 100.'
      },
      {
        title: 'Dimensional Analysis & Unit Conversions',
        text: 'Converting between metric and imperial systems requires exact conversion factors (such as 1 inch = 2.54 cm, 1 pound = 0.453592 kg, and 1 gallon = 3.78541 liters) to maintain precision across scientific, culinary, and technical applications.'
      }
    ]
  },
  business: {
    heading: 'Core Business Economics: Profitability & Unit Economics',
    intro: 'Sustainable business growth relies on understanding unit economics, pricing markup vs. gross margin, and customer acquisition payback horizons.',
    sections: [
      {
        title: 'Margin vs. Markup',
        text: 'Gross Margin is profit as a percentage of selling price ((Price - Cost) / Price), while Markup is profit as a percentage of cost ((Price - Cost) / Cost). For example, buying an item for $50 and selling it for $100 yields a 50% gross margin, but a 100% markup.'
      },
      {
        title: 'The 3:1 LTV to CAC Benchmark',
        text: 'In recurring revenue and SaaS businesses, a healthy business typically aims for Customer Lifetime Value (LTV) to be at least 3 times Customer Acquisition Cost (CAC), with a payback period under 12 months.'
      }
    ]
  },
  construction: {
    heading: 'Practical Material Estimation Standards',
    intro: 'Accurate job site material calculations prevent expensive mid-project delays and minimize waste disposal costs.',
    sections: [
      {
        title: 'The 10% Waste Factor Rule',
        text: 'When ordering tiles, flooring, or brickwork, always add 10% to 15% extra material to account for diagonal cuts, edge trimming, and future repairs.'
      },
      {
        title: 'Concrete Volume Calculation',
        text: 'Concrete is ordered in cubic yards. To calculate cubic yards for a slab: multiply Length (ft) * Width (ft) * Thickness (ft), then divide by 27.'
      }
    ]
  },
  engineering: {
    heading: 'Engineering Principles & Physical Formulas',
    intro: 'Engineering calculations rely on deterministic physical laws governing electrical circuits, structural mechanics, and fluid dynamics.',
    sections: [
      {
        title: "Ohm's Law in DC & AC Circuits",
        text: 'Voltage (V), Current (I), and Resistance (R) are related by V = I * R. Electrical power dissipated in a resistive load equals P = V * I = I^2 * R.'
      },
      {
        title: 'Beam Deflection Mechanics',
        text: 'Euler-Bernoulli beam theory dictates that maximum deflection under load is inversely proportional to the modulus of elasticity (E) and area moment of inertia (I).'
      }
    ]
  },
  education: {
    heading: 'Academic Grading Standards & Coursework Planning',
    intro: 'Grade Point Average (GPA) calculations reflect weighted academic performance across credit hours.',
    sections: [
      {
        title: '4.0 Unweighted vs. Weighted 5.0 Scales',
        text: 'Standard coursework is evaluated on a 4.0 scale (A=4.0, B=3.0, C=2.0). Honors courses typically add +0.5 quality points, while Advanced Placement (AP) and International Baccalaureate (IB) courses add +1.0 quality point to reward academic rigor.'
      }
    ]
  }
};

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

    <link rel="stylesheet" href="/css/style.min.css">
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
                
                <!-- Category Topical Authority & Decision Guide -->
                ${CATEGORY_GUIDES[cat.slug] ? `
                <section class="section-container" style="margin-top:40px;">
                    <div class="tool-runner-card" style="padding:32px 28px;">
                        <h2 style="font-size:20px; font-weight:800; color:var(--text-primary); margin-bottom:12px;">
                            ${escapeHtml(CATEGORY_GUIDES[cat.slug].heading)}
                        </h2>
                        <p style="font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:24px;">
                            ${escapeHtml(CATEGORY_GUIDES[cat.slug].intro)}
                        </p>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                            ${CATEGORY_GUIDES[cat.slug].sections.map(s => `
                                <div style="background:var(--bg-main); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:20px;">
                                    <h3 style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:8px;">
                                        ${escapeHtml(s.title)}
                                    </h3>
                                    <p style="font-size:13px; color:var(--text-secondary); line-height:1.6; margin:0;">
                                        ${escapeHtml(s.text)}
                                    </p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>
                ` : ''}

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
                <div class="brand-icon"><img src="/logo.png" alt="GetCalcu" width="36" height="36"></div>
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

    <script src="/js/tools.js" defer></script>
    <script src="/js/app.js"></script>
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

    const html = toolPageTemplate(tool, tools);
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

  // 3. Generate sitemap.xml (Focus on high-value indexing targets; exclude low-intent legal boilerplate)
  const sitemapUrls = [
    { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily', lastmod: '2026-09-19' },
    ...Object.keys(CATEGORIES).map(k => ({
      loc: `${BASE_URL}/category/${CATEGORIES[k].slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: '2026-09-19',
    })),
    ...allSlugs.map(s => {
      const toolObj = tools[s] || {};
      const toolLastMod = toolObj.lastmod || '2026-09-19';
      return {
        loc: `${BASE_URL}/tool/${s}`,
        priority: '0.9',
        changefreq: 'weekly',
        lastmod: toolLastMod,
      };
    }),
    { loc: `${BASE_URL}/about`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-09-19' },
    { loc: `${BASE_URL}/contact`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-09-19' },
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
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
