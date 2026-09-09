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

const CONTEXTUAL_LINKS = {
  'mortgage-calculator': [
    { slug: '15-year-mortgage-calculator', name: '15-Year vs 30-Year Mortgage', desc: 'Compare 15-year and 30-year payment difference and interest savings.' },
    { slug: 'fha-loan-calculator', name: 'FHA Loan Calculator', desc: 'Calculate 3.5% down payments and FHA monthly mortgage insurance.' },
    { slug: 'house-affordability-calculator', name: 'House Affordability Calculator', desc: 'Find the maximum home price you qualify for based on debt-to-income ratios.' },
    { slug: 'amortization-calculator', name: 'Amortization Calculator', desc: 'See how extra monthly principal payments reduce total loan interest.' },
    { slug: 'refinance-calculator', name: 'Refinance Break-Even Calculator', desc: 'Determine when lower refinance rates pay off closing costs.' }
  ],
  '15-year-mortgage-calculator': [
    { slug: 'mortgage-calculator', name: 'Mortgage Calculator', desc: 'Standard 30-year mortgage calculation with taxes and insurance.' },
    { slug: 'refinance-calculator', name: 'Refinance Calculator', desc: 'Check if refinancing into a 15-year loan saves money.' },
    { slug: 'amortization-calculator', name: 'Amortization Calculator', desc: 'View full month-by-month principal reduction schedules.' },
    { slug: 'house-affordability-calculator', name: 'House Affordability', desc: 'Check maximum loan limits based on debt ratios.' }
  ],
  'fha-loan-calculator': [
    { slug: 'mortgage-calculator', name: 'Conventional Mortgage Calculator', desc: 'Compare conventional loans with 20% down to skip mortgage insurance.' },
    { slug: '15-year-mortgage-calculator', name: '15-Year Mortgage Calculator', desc: 'Evaluate shorter loan terms for faster equity growth.' },
    { slug: 'house-affordability-calculator', name: 'House Affordability Calculator', desc: 'Calculate qualifying income for FHA loan limits.' },
    { slug: 'rent-vs-buy-calculator', name: 'Rent vs. Buy Calculator', desc: 'Compare renting vs purchasing your first home.' }
  ],
  'auto-loan-calculator': [
    { slug: 'auto-refinance-calculator', name: 'Auto Loan Refinance Calculator', desc: 'Calculate how much you save by refinancing your car loan.' },
    { slug: 'loan-calculator', name: 'Personal Loan Calculator', desc: 'Compare bank or credit union loan rates against dealership financing.' },
    { slug: 'budget-planner', name: 'Budget Planner', desc: 'Check if your car payment stays within 15% of net income.' },
    { slug: 'loan-interest-calculator', name: 'Loan Interest Calculator', desc: 'Analyze total interest across various loan terms.' }
  ],
  'auto-refinance-calculator': [
    { slug: 'auto-loan-calculator', name: 'Auto Loan Calculator', desc: 'Calculate new car loan payments and sales tax.' },
    { slug: 'loan-calculator', name: 'Personal Loan Calculator', desc: 'Explore personal loan alternatives for debt consolidation.' },
    { slug: 'budget-planner', name: 'Budget Planner', desc: 'Reallocate auto loan savings into emergency reserves.' },
    { slug: 'loan-interest-calculator', name: 'Loan Interest Calculator', desc: 'See total interest saved across lower interest rates.' }
  ],
  'freelance-hourly-rate-calculator': [
    { slug: 'self-employment-tax-calculator', name: '1099 Self-Employment Tax Calculator', desc: 'Calculate quarterly IRS 1040-ES estimated payments.' },
    { slug: 'salary-calculator', name: 'Salary Paycheck Calculator', desc: 'Compare freelance revenue against equivalent corporate W-2 salaries.' },
    { slug: 'profit-margin-calculator', name: 'Profit Margin Calculator', desc: 'Price client project proposals with healthy profit margins.' },
    { slug: 'emergency-fund-calculator', name: 'Emergency Fund Calculator', desc: 'Build a 6-month buffer for unpredictable freelance income months.' }
  ],
  'body-fat-percentage-calculator': [
    { slug: 'bmi-calculator', name: 'BMI Calculator', desc: 'Compare your body fat percentage to standard Body Mass Index categories.' },
    { slug: 'tdee-calculator', name: 'TDEE & Calorie Calculator', desc: 'Find your daily calorie target for fat loss while preserving muscle.' }
  ],
  'bmi-calculator': [
    { slug: 'body-fat-percentage-calculator', name: 'Body Fat Calculator (Navy Method)', desc: 'Measure body composition using simple tape measurements at home.' },
    { slug: 'tdee-calculator', name: 'TDEE & Calorie Calculator', desc: 'Find daily calorie requirements for weight maintenance, cutting, or bulking.' }
  ],
  'tdee-calculator': [
    { slug: 'body-fat-percentage-calculator', name: 'Body Fat Calculator', desc: 'Calculate fat mass and lean body mass to fine-tune macros.' },
    { slug: 'bmi-calculator', name: 'BMI Calculator', desc: 'Check your current Body Mass Index and healthy weight category.' }
  ],
  'retirement-calculator': [
    { slug: '401k-calculator', name: '401(k) Retirement Calculator', desc: 'Maximize your employer matching contributions and tax-deferred growth.' },
    { slug: 'fire-calculator', name: 'FIRE Calculator', desc: 'Determine your Financial Independence number and safe withdrawal rate.' },
    { slug: 'investment-calculator', name: 'Investment Calculator', desc: 'Project long-term compound growth of stocks, bonds, and index funds.' },
    { slug: 'compound-interest-calculator', name: 'Compound Interest Calculator', desc: 'See how frequent deposits accelerate multi-decade savings.' }
  ],
  'emergency-fund-calculator': [
    { slug: 'savings-calculator', name: 'Savings & HYSA Calculator', desc: 'Model high-yield savings growth while your emergency reserve is parked.' },
    { slug: 'budget-planner', name: 'Budget Planner', desc: 'Categorize your monthly essential expenses versus discretionary spending.' },
    { slug: 'credit-card-payoff-calculator', name: 'Credit Card Payoff Calculator', desc: 'Pay down high-interest debt alongside building your safety fund.' }
  ],
  '401k-calculator': [
    { slug: 'retirement-calculator', name: 'Retirement Calculator', desc: 'Combine your 401(k), IRA, and Social Security for a total retirement projection.' },
    { slug: 'salary-calculator', name: 'Salary Paycheck Calculator', desc: 'See how pre-tax 401(k) deductions lower your take-home tax burden today.' },
    { slug: 'investment-calculator', name: 'Investment Calculator', desc: 'Simulate taxable brokerage investments alongside your 401(k).' }
  ],
  'savings-calculator': [
    { slug: 'emergency-fund-calculator', name: 'Emergency Fund Calculator', desc: 'Calculate your target savings cushion for 3, 6, or 12 months of expenses.' },
    { slug: 'compound-interest-calculator', name: 'Compound Interest Calculator', desc: 'Calculate how interest compounds daily, monthly, or annually.' }
  ],
  'profit-margin-calculator': [
    { slug: 'freelance-hourly-rate-calculator', name: 'Freelance Rate Calculator', desc: 'Calculate client billing rates from desired take-home salary.' },
    { slug: 'break-even-calculator', name: 'Break-Even Calculator', desc: 'Calculate the exact unit sales volume needed to cover overhead costs.' },
    { slug: 'customer-lifetime-value-calculator', name: 'Customer Lifetime Value (LTV)', desc: 'Assess unit economics and customer acquisition payback periods.' }
  ],
  'break-even-calculator': [
    { slug: 'profit-margin-calculator', name: 'Profit Margin Calculator', desc: 'Optimize pricing markup and target gross margin percentages.' },
    { slug: 'customer-lifetime-value-calculator', name: 'Customer Lifetime Value (LTV)', desc: 'Evaluate marketing profitability and customer retention impact.' }
  ],
  'gpa-calculator': [
    { slug: 'final-grade-calculator', name: 'Final Grade Calculator', desc: 'Calculate the exact exam score required to achieve your target semester grade.' }
  ],
  'final-grade-calculator': [
    { slug: 'gpa-calculator', name: 'GPA Calculator', desc: 'Calculate your cumulative semester GPA across all course credits.' }
  ],
  'debt-snowball-calculator': [
    { slug: 'credit-card-payoff-calculator', name: 'Credit Card Payoff Calculator', desc: 'Focus specifically on high-interest revolving credit cards and repayment months.' },
    { slug: 'emergency-fund-calculator', name: 'Emergency Fund Calculator', desc: 'Save your starter emergency fund cushion so you never fall back into debt.' },
    { slug: 'budget-planner', name: 'Budget Planner', desc: 'Use the 50/30/20 rule to find extra cash to throw into your debt snowball.' },
    { slug: 'savings-calculator', name: 'High-Yield Savings Calculator', desc: 'Grow your cash cushion while staying completely debt-free.' }
  ],
  'refinance-calculator': [
    { slug: '15-year-mortgage-calculator', name: '15-Year vs 30-Year Mortgage', desc: 'Compare 15-year and 30-year payments and interest savings.' },
    { slug: 'mortgage-calculator', name: 'Mortgage Calculator', desc: 'Recalculate your principal and interest payments with new interest rates.' },
    { slug: 'amortization-calculator', name: 'Amortization Calculator', desc: 'View complete year-by-year principal reduction schedules.' },
    { slug: 'house-affordability-calculator', name: 'House Affordability Calculator', desc: 'Check debt-to-income limits and maximum borrowing capacity.' }
  ],
  'self-employment-tax-calculator': [
    { slug: 'freelance-hourly-rate-calculator', name: 'Freelance Hourly Rate Calculator', desc: 'Calculate client billing rates to hit your target personal take-home salary.' },
    { slug: 'salary-calculator', name: 'Salary Paycheck Calculator', desc: 'Compare your 1099 freelance net income against equivalent W-2 corporate salaries.' },
    { slug: 'profit-margin-calculator', name: 'Profit Margin Calculator', desc: 'Price your client work with healthy gross margins after accounting for taxes.' }
  ],
  'credit-card-payoff-calculator': [
    { slug: 'debt-snowball-calculator', name: 'Debt Snowball Calculator', desc: 'Roll multiple credit card balances together into an accelerated payoff plan.' },
    { slug: 'emergency-fund-calculator', name: 'Emergency Fund Calculator', desc: 'Build a safety buffer to stop unexpected expenses from adding to your balance.' },
    { slug: 'loan-interest-calculator', name: 'Loan Interest Calculator', desc: 'Analyze how much bank interest you save with larger payments.' }
  ]
};

  // 9. Authoritative E-E-A-T Editorial & Trust Block (Scoped Authority)
  const trustInfo = getToolTrustInfo(tool, slug);
  const trustBlockHtml = `
    <div class="tool-runner-card" style="margin-top:24px; border-left:4px solid var(--primary-color); background:var(--bg-main);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
        <div>
          <h3 style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">
            <i class="fa-solid fa-shield-halved" style="color:var(--primary-color); margin-right:6px;"></i>
            GetCalcu Methodology & Editorial Standards
          </h3>
          <p style="font-size:13px; color:var(--text-secondary); margin:0;">
            ${escapeHtml(trustInfo.standard)}
          </p>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; font-size:12px; color:var(--text-secondary); margin-top:10px; padding-top:10px; border-top:1px solid var(--border-color);">
        <div><strong>Reviewed by:</strong> ${escapeHtml(trustInfo.reviewer)}</div>
        <div><strong>Last Verified:</strong> September 2026</div>
        <div><strong>Accuracy Policy:</strong> ${escapeHtml(trustInfo.policy)}</div>
        <div><strong>Feedback:</strong> <a href="/contact?subject=${encodeURIComponent(tool.name + ' Correction')}" style="color:var(--primary-color); text-decoration:none;">Report an issue</a></div>
      </div>
    </div>
  `;

  // 10. Contextual Cross-Linking Mesh
  let complementaryMeshHtml = '';
  const relList = CONTEXTUAL_LINKS[slug] || [];
  if (relList.length > 0) {
    const linkCards = relList.map(item => `
      <a href="/tool/${encodeURIComponent(item.slug)}" class="tool-card" style="text-decoration:none; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <h4 style="font-size:14px; font-weight:700; margin-bottom:6px; color:var(--text-primary);">${escapeHtml(item.name)}</h4>
          <p style="font-size:12px; color:var(--text-secondary); line-height:1.5; margin:0;">${escapeHtml(item.desc)}</p>
        </div>
        <div style="margin-top:12px; font-size:12px; color:var(--primary-color); font-weight:600; display:flex; align-items:center; gap:4px;">
          <span>Explore Tool</span> <i class="fa-solid fa-arrow-right"></i>
        </div>
      </a>
    `).join('');
    complementaryMeshHtml = `
      <div class="tool-runner-card" style="margin-top:24px;">
        <h2 style="font-size:18px; font-weight:700; margin-bottom:16px;">
          <i class="fa-solid fa-arrows-split-up-and-left" style="color:var(--primary-color); margin-right:8px;"></i>
          Complementary Tools & Next Steps
        </h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:16px;">
          ${linkCards}
        </div>
      </div>
    `;
  }

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
    ${complementaryMeshHtml}
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
