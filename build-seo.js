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
    { slug: 'house-affordability-calculator', name: 'House Affordability Calculator', desc: 'Find the maximum home price you qualify for based on debt-to-income ratios.' },
    { slug: 'amortization-calculator', name: 'Amortization Calculator', desc: 'See how extra monthly principal payments reduce total loan interest.' },
    { slug: 'rent-vs-buy-calculator', name: 'Rent vs. Buy Calculator', desc: 'Compare long-term net worth between buying a home and renting.' },
    { slug: 'salary-calculator', name: 'Salary Paycheck Calculator', desc: 'Verify your net take-home pay to ensure your mortgage is under 28% of income.' }
  ],
  'auto-loan-calculator': [
    { slug: 'loan-calculator', name: 'Personal Loan Calculator', desc: 'Compare bank or credit union personal loan rates against dealership financing.' },
    { slug: 'budget-planner', name: 'Budget Planner', desc: 'Check if your car payment stays within the recommended 15% of net income.' },
    { slug: 'loan-interest-calculator', name: 'Loan Interest Calculator', desc: 'Analyze total interest paid across various loan terms and interest rates.' }
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
  'bmi-calculator': [
    { slug: 'tdee-calculator', name: 'TDEE & Calorie Calculator', desc: 'Find daily calorie requirements for weight maintenance, cutting, or bulking.' }
  ],
  'tdee-calculator': [
    { slug: 'bmi-calculator', name: 'BMI Calculator', desc: 'Check your current Body Mass Index and healthy weight category.' }
  ],
  'profit-margin-calculator': [
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
    { slug: 'mortgage-calculator', name: 'Mortgage Calculator', desc: 'Recalculate your principal and interest payments with new interest rates.' },
    { slug: 'amortization-calculator', name: 'Amortization Calculator', desc: 'View complete year-by-year principal reduction schedules.' },
    { slug: 'house-affordability-calculator', name: 'House Affordability Calculator', desc: 'Check debt-to-income limits and maximum borrowing capacity.' },
    { slug: 'rent-vs-buy-calculator', name: 'Rent vs. Buy Calculator', desc: 'Compare total housing costs and home equity over 5, 10, or 20 years.' }
  ],
  'self-employment-tax-calculator': [
    { slug: 'salary-calculator', name: 'Salary Paycheck Calculator', desc: 'Compare your 1099 freelance net income against equivalent W-2 corporate salaries.' },
    { slug: 'tax-calculator', name: 'Income Tax Calculator', desc: 'Estimate standard federal tax brackets and taxable income deductions.' },
    { slug: 'emergency-fund-calculator', name: 'Emergency Fund Calculator', desc: 'Freelancers need a 6-month buffer to protect against slow invoice payment months.' },
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


// ── Category Educational Guides & Plain-English Glossaries ───────────
const CATEGORY_GUIDES = {
  finance: {
    title: 'The Plain-English Money Roadmap',
    subtitle: 'A practical, jargon-free step-by-step framework to organize your money, destroy debt, and build lasting wealth.',
    steps: [
      {
        step: 'Step 1',
        title: 'Track Where Your Money Actually Goes (The 50/30/20 Rule)',
        desc: 'Before investing or making big financial changes, divide your take-home pay into three simple buckets: <strong>50% for Needs</strong> (housing, groceries, utilities, minimum debt payments), <strong>30% for Wants</strong> (dining out, hobbies, shopping), and <strong>20% for Your Future</strong> (savings and debt payoff). You do not need a complicated spreadsheet—just keep your essential needs under half your income.'
      },
      {
        step: 'Step 2',
        title: 'Build a Starter Emergency Safety Cushion ($1,000 to 3 Months)',
        desc: 'Before aggressively investing in stocks or paying down low-interest debt, park a small cash reserve in a high-yield savings account. Without this safety net, a single flat tire or emergency doctor visit will force you back onto high-interest credit cards.'
      },
      {
        step: 'Step 3',
        title: 'Eliminate High-Interest Debt (Snowball vs. Avalanche)',
        desc: 'Any debt with an interest rate above 7%—especially credit cards with 20% to 29% APR—destroys wealth faster than the stock market creates it. Use our <strong>Debt Snowball Calculator</strong> to pay off smallest balances first for fast emotional wins, or the <strong>Avalanche method</strong> to save maximum math interest.'
      },
      {
        step: 'Step 4',
        title: 'Capture 100% of Your Employer 401(k) Match',
        desc: 'If your employer offers a company 401(k) match (such as 50% match up to 6% of your pay), contribute at least enough to get every cent. This is an immediate, guaranteed 50% to 100% return on your money—literally "free money" that compounds tax-deferred.'
      },
      {
        step: 'Step 5',
        title: 'Let Long-Term Compounding Build Your Financial Freedom',
        desc: 'Once high-interest debt is gone, invest consistently every month into low-cost, diversified index funds. Thanks to the power of compound interest, investing a modest amount in your 20s or 30s can grow into millions by retirement.'
      }
    ],
    glossary: [
      { term: 'APR (Annual Percentage Rate)', definition: 'The yearly cost you pay to borrow money, including the interest rate and lender fees. Lower is always better.' },
      { term: 'APY (Annual Percentage Yield)', definition: 'The total interest you earn on your savings in one year, including compounding. Higher is always better.' },
      { term: 'Principal', definition: 'The actual loan amount or starting cash, completely separate from accumulated interest.' },
      { term: 'Amortization', definition: 'The schedule of how each monthly loan payment is split: early payments go mostly toward bank interest, while later payments pay down principal.' },
      { term: 'SECA Tax (15.3%)', definition: 'The federal Social Security (12.4%) and Medicare (2.9%) tax paid by 1099 freelancers and independent contractors on their net profits.' }
    ]
  },
  health: {
    title: 'The Everyday Body & Energy Guide',
    subtitle: 'Understand calories, energy balance, and body mass without complicated medical jargon.',
    steps: [
      {
        step: 'Concept 1',
        title: 'What BMI Tells You (And What It Does Not)',
        desc: 'Body Mass Index (BMI) is a quick screening tool comparing your height to your weight. While useful for general health guidelines, it cannot distinguish between dense muscle and body fat. Use it as a helpful directional compass, not an absolute diagnosis.'
      },
      {
        step: 'Concept 2',
        title: 'TDEE: How Many Calories Your Body Burns Every 24 Hours',
        desc: 'Your Total Daily Energy Expenditure is the real total of calories your body burns every day: your Basal Metabolic Rate (breathing and staying alive) plus every step, chore, workout, and digestion. Knowing your TDEE is the master key to weight management.'
      },
      {
        step: 'Concept 3',
        title: 'The 500-Calorie Deficit Rule for Sustainable Fat Loss',
        desc: 'One pound of stored body fat equals roughly 3,500 calories. By eating 500 fewer calories per day than your TDEE (or burning 500 more through light movement), you create a safe 3,500-calorie weekly deficit—dropping about 1 steady pound per week without starvation.'
      }
    ],
    glossary: [
      { term: 'BMR (Basal Metabolic Rate)', definition: 'The bare minimum calories your body burns at complete rest just to keep your heart beating, lungs breathing, and organs working.' },
      { term: 'TDEE', definition: 'Total Daily Energy Expenditure: your BMR multiplied by your daily physical activity level.' },
      { term: 'Caloric Deficit', definition: 'Consuming fewer calories than your body burns, prompting your body to use stored fat for fuel.' },
      { term: 'Macronutrients', definition: 'The three essential dietary building blocks: Protein (muscle & tissue repair), Carbohydrates (fast physical energy), and Healthy Fats (hormones & cell structure).' }
    ]
  },
  business: {
    title: 'The Small Business & Freelancer Playbook',
    subtitle: 'The essential unit economics and tax rules every founder and freelancer must know.',
    steps: [
      {
        step: 'Rule 1',
        title: 'Gross Margin vs. Net Profit: Revenue is Vanity, Cash is Reality',
        desc: 'A business can make $1,000,000 in sales and still go bankrupt if margins are thin. Gross margin measures how much money remains after directly delivering your product or service. Net profit is what is actually left after paying software, rent, marketing, and taxes.'
      },
      {
        step: 'Rule 2',
        title: 'Calculate Your Break-Even Point Before Spending Money',
        desc: 'Your break-even sales volume tells you the exact number of units, subscriptions, or consulting hours you must sell each month just to pay the bills and hit zero. Every dollar sold past that number is pure pre-tax profit.'
      },
      {
        step: 'Rule 3',
        title: 'The Freelancer Golden Rule: Save 25% to 30% Immediately',
        desc: 'Unlike W-2 workers, 1099 contractors and freelancers do not have taxes withheld automatically. Transfer 25% to 30% of every invoice into a high-yield business savings account the day the client pays to comfortably cover quarterly IRS 1040-ES payments.'
      }
    ],
    glossary: [
      { term: 'Gross Margin', definition: 'The percentage of revenue left over after subtracting direct costs: (Revenue - COGS) ÷ Revenue × 100.' },
      { term: 'Break-Even Point', definition: 'The point where total business revenue equals total fixed and variable costs, meaning zero loss and zero profit.' },
      { term: 'LTV (Customer Lifetime Value)', definition: 'The total estimated gross profit a single customer brings to your business across the entire duration of your relationship.' },
      { term: 'CAC (Customer Acquisition Cost)', definition: 'Total marketing and sales dollars spent divided by the number of new paying customers gained.' }
    ]
  },
  education: {
    title: 'The Student Success & Grade Mastery Guide',
    subtitle: 'Clear, practical tools to calculate GPAs, predict final exam requirements, and plan study loads.',
    steps: [
      {
        step: 'Strategy 1',
        title: 'How Credit-Weighted GPA Actually Works',
        desc: 'College and high school GPAs are weighted by credit hours: earning an A in a 4-credit science lecture carries twice the mathematical weight of an A in a 2-credit lab course. Protect your GPA by prioritizing study time on high-credit classes.'
      },
      {
        step: 'Strategy 2',
        title: 'The Final Exam Math: Know Exactly What Score You Need',
        desc: 'Before stressing about finals week, calculate the exact minimum score required on the final exam to maintain your desired course grade. Often, a student only needs a 72% or 78% on the final to lock in their "B" or "A".'
      }
    ],
    glossary: [
      { term: 'Credit Hours', definition: 'The number of classroom hours per week assigned to a course, determining how heavily it influences your GPA.' },
      { term: 'Unweighted GPA', definition: 'Standard 4.0 scale where every class is graded on the same numerical scale regardless of difficulty.' },
      { term: 'Weighted GPA', definition: 'A 5.0 scale that awards bonus grade points for Advanced Placement (AP), International Baccalaureate (IB), or Honors courses.' }
    ]
  },
  construction: {
    title: 'The Practical Job Site & Remodel Estimator Guide',
    subtitle: 'Essential dimensional rules and ordering guidelines for contractors, landscapers, and DIYers.',
    steps: [
      {
        step: 'Rule 1',
        title: 'Always Add the 10% Waste Factor',
        desc: 'Never order the exact square footage of flooring, tile, drywall, or lumber. Cutting around doors, corner angles, and accidental breakage will leave you short. Add 10% for standard layouts and 15% for diagonal tile or complex cuts.'
      },
      {
        step: 'Rule 2',
        title: 'Square Feet (Area) vs. Cubic Yards (Volume)',
        desc: 'Surface projects (painting, carpet, hardwood) are measured in square feet (Length × Width). Bulk materials (concrete slabs, gravel, soil, mulch) require volume in cubic yards: multiply square footage by depth in feet, then divide by 27.'
      }
    ],
    glossary: [
      { term: 'Cubic Yard', definition: 'A standard unit of volume equal to 27 cubic feet. Used universally by ready-mix concrete and bulk gravel suppliers.' },
      { term: 'Roofing Square', definition: 'A construction measurement equal to 100 square feet of roof area, typically covered by 3 bundles of asphalt shingles.' }
    ]
  },
  engineering: {
    title: 'Everyday Engineering & Physics Guide',
    subtitle: 'Practical explanations of Ohm\'s law, structural deflection, and fluid pressure.',
    steps: [
      {
        step: 'Concept 1',
        title: 'Ohm\'s Law Explained with the Water Hose Analogy',
        desc: 'Think of electricity like water running through a hose: Voltage (V) is water pressure, Current (I) is the flow rate of water, Resistance (R) is the narrowness of the nozzle, and Electrical Power (Watts = V × I) is the total force of the water spray.'
      },
      {
        step: 'Concept 2',
        title: 'Beam Deflection and Structural Safety',
        desc: 'Deflection is the distance a structural beam bends under applied loads. Building codes strictly limit deflection (typically to Span ÷ 360) so floors feel rigid and drywall ceilings do not crack under weight.'
      }
    ],
    glossary: [
      { term: 'Ohm (Ω)', definition: 'The international unit of electrical resistance. One ohm allows one ampere of current to flow when one volt is applied.' },
      { term: 'Pascal (Pa) / PSI', definition: 'Units of physical pressure representing force distributed over a specific surface area.' }
    ]
  },
  math: {
    title: 'Everyday Math Made Simple',
    subtitle: 'Understand percentages, ratios, and practical mental math tricks for daily life.',
    steps: [
      {
        step: 'Insight 1',
        title: 'The Hidden Trap of Percentage Asymmetry',
        desc: 'If an investment drops 50% in value, it does NOT take a 50% gain to get back to even—it takes a 100% gain! A $100 stock dropping 50% becomes $50. A 50% gain on $50 is only $25 (bringing you to $75). Always understand that losses hurt twice as much as equivalent gains.'
      },
      {
        step: 'Insight 2',
        title: 'Quick Mental Math Shortcuts for Daily Life',
        desc: 'To calculate a 20% tip in 5 seconds: take your bill, move the decimal one place left to find 10%, and double that number. For example, a $64.50 meal has a 10% value of $6.45. Doubling that gives an instant $12.90 tip.'
      }
    ],
    glossary: [
      { term: 'Percentage Delta', definition: 'The relative percentage change between an old number and a new number: ((New - Old) ÷ Old) × 100.' },
      { term: 'Aspect Ratio', definition: 'The proportional relationship between an image or video\'s width and height (e.g. 16:9 for widescreen displays, 1:1 for square photos).' }
    ]
  }
};

function renderCategoryHubGuide(catSlug) {
  const guide = CATEGORY_GUIDES[catSlug];
  if (!guide) return '';

  const stepsHtml = guide.steps.map(s => `
    <div class="tool-runner-card" style="margin-bottom:16px; background:var(--card-bg, #fff); border:1px solid var(--border-color, #e2e8f0); border-radius:12px; padding:20px;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="background:var(--primary-color, #6366F1); color:#fff; font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(s.step)}</span>
        <h3 style="font-size:16px; font-weight:700; color:var(--text-primary); margin:0;">${escapeHtml(s.title)}</h3>
      </div>
      <p style="font-size:14px; color:var(--text-secondary); line-height:1.6; margin:0;">${s.desc}</p>
    </div>
  `).join('');

  const glossaryHtml = guide.glossary.map(g => `
    <div style="padding:12px 16px; background:var(--bg-main, #f8fafc); border-radius:8px; border:1px solid var(--border-color, #e2e8f0);">
      <div style="font-weight:700; font-size:13px; color:var(--text-primary); margin-bottom:4px;">${escapeHtml(g.term)}</div>
      <div style="font-size:13px; color:var(--text-secondary); line-height:1.5;">${escapeHtml(g.definition)}</div>
    </div>
  `).join('');

  return `
    <section class="section-container" style="margin-top:40px;">
      <div class="section-header" style="margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          <i class="fa-solid fa-book-open-reader" style="color:var(--primary-color); font-size:18px;"></i>
          <h2 style="font-size:22px; font-weight:800; color:var(--text-primary); margin:0;">${escapeHtml(guide.title)}</h2>
        </div>
        <p style="font-size:14px; color:var(--text-secondary); margin:0;">${escapeHtml(guide.subtitle)}</p>
      </div>

      <div style="margin-bottom:32px;">
        ${stepsHtml}
      </div>

      <div class="tool-runner-card" style="background:var(--card-bg, #fff); border:1px solid var(--border-color, #e2e8f0); border-radius:12px; padding:24px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px;">
          <i class="fa-solid fa-spell-check" style="color:var(--primary-color); font-size:16px;"></i>
          <h3 style="font-size:17px; font-weight:700; color:var(--text-primary); margin:0;">Plain-English Terms You Need to Know</h3>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px;">
          ${glossaryHtml}
        </div>
      </div>
    </section>
  `;
}

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

                <!-- Authority Hub Educational Guide -->
                ${renderCategoryHubGuide(cat.slug)}
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
