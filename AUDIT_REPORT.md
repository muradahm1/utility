# GetCalcu — Complete Read-Only Forensic Audit Report

**Date:** 2026-08-21  
**Auditor:** Cline (AI Code Review)  
**Mode:** Read-only forensic audit — NO code was modified  
**Repository:** c:/Users/DELL/Downloads/getcalcu  
**Git HEAD:** 7a5bb901092947b78339a6715c4af66d399a75bf

---

## 1. Executive Summary

GetCalcu is a web-based calculator/utility platform targeting US, European, and international users. The project has undergone a **3-phase architecture migration** (documented in ARCHITECTURE.md, PHASE2.md, PHASE3.md, MIGRATION_COMPLETE.md, PHASE4_MIGRATION_REPORT.md) that introduced a modular core architecture (`js/core/`), shared utilities (`js/utils/`), and reusable feature modules (`js/modules/`).

**The migration is incomplete and contains critical integration failures.** The application currently runs in a **hybrid mode** where:

- The legacy `js/tools.js` (327KB, 18 calculators) is the **primary source of truth** for calculator definitions.
- The new modular architecture (`js/core/`) is **partially wired** but has **broken imports** that cause it to fail at runtime, triggering the legacy fallback.
- The `js/calculators/construction.js` and `js/calculators/engineering.js` files are **byte-for-byte identical** (confirmed via `fc /b`), and the `registerConstructionCalculators` function referenced in `core/index.js` and `core/migration.js` **does not exist** — this will throw a ReferenceError.
- The sitemap and homepage JSON-LD reference **3 non-existent calculators** (`concrete-calculator`, `paint-calculator`, `tile-calculator`).
- The `tip-calculator` (added via `tools-template.js`) is **missing from the sitemap**.
- SEO metadata (title, description, canonical, JSON-LD) is **entirely client-side rendered** — if JavaScript fails, all tool pages have identical empty metadata.
- **No automated tests exist** for any calculator, module, or utility.
- **No PWA** (no manifest, no service worker, no offline support).
- **No build system** — all scripts are loaded via `<script>` tags with no bundling, minification, or tree-shaking.

**Overall assessment:** The architecture is well-intentioned but the migration is **incomplete and partially broken**. The legacy system works, but the new modular system has critical integration failures that prevent it from being the reliable foundation for scaling to hundreds of calculators.

---

## 2. Architecture Overview

### 2.1 Application Entry

**Entry point:** `tool.html` (for calculators) and `index.html` (for homepage).

**Load sequence (tool.html):**
1. `js/tools.js` → populates `window.TOOLS` with 18 legacy calculators
2. `js/tools-template.js` → merges `tip-calculator` into `window.TOOLS`
3. `js/core/index.js` (ES module) → initializes CORE, registers construction/engineering calculators
4. `js/modules/*.js` (ES modules) → charts, validation, formatting, faq, related-tools, recommendations
5. Chart.js + Supabase CDN
6. `js/config.js` + `js/supabase.js` → Supabase client
7. `js/modules/budget-planner.js` (ES module)
8. `js/tool-runner.js` (ES module) → **HYBRID ROUTER**
9. `js/app.js` + `cookie-consent.js` + `maintenance-banner.js`

### 2.2 Routing

- **URL format:** `/tool?slug=calculator-slug`
- **Routing is client-side only** — the server (Vercel) rewrites `/tool` → `/tool.html`
- **No server-side rendering** — all calculator content is rendered client-side
- **Invalid routes:** handled by `tool-runner.js` with a "Tool Not Found" page and suggestions
- **Direct URL visits:** work, but SEO metadata is empty until JS executes
- **Refreshes:** safe (stateless, no SPA state to lose)

### 2.3 Calculator Registry

- **Primary registry:** `window.TOOLS` (populated by `js/tools.js` + `js/tools-template.js`)
- **Secondary registry:** `js/core/tools.js` `TOOLS` object (populated by `registerTool()`)
- **Migration layer:** `js/core/migration.js` `registerLegacyTools()` copies `window.TOOLS` into the core registry
- **Duplicate IDs:** The `registerTool()` function overwrites existing entries silently — no duplicate detection
- **Disconnected entries:** The `concrete-calculator`, `paint-calculator`, `tile-calculator` slugs exist in the sitemap/JSON-LD but have no calculator definitions

### 2.4 Calculator Engine

- **Legacy engine:** Each calculator has its own `calculate(values)` function — no shared pipeline
- **New engine:** `js/core/calculator-engine.js` provides `runCalculator()` with normalize → validate → calculate → result pipeline
- **Critical gap:** The new engine's `runCalculator()` is **never called** by the legacy calculators. The legacy `tool.calculate(values)` is called directly.
- **Validation:** Legacy calculators have minimal validation (mostly `safeNum` + manual checks). The new `validateInputs()` is not used by legacy calculators.
- **Formatting:** Legacy calculators use global helpers (`fmt`, `fmtN`, `pct`) defined in `tools.js`. The new engine imports from `utils/index.js`.

### 2.5 Reusable Module System

| Module | Exists | Used by Calculators | Notes |
|--------|--------|-------------------|-------|
| charts.js | ✅ | ✅ (via ChartManager) | Used by tool-runner.js |
| pdf.js | ✅ | ❌ | Never imported by any calculator or runner |
| print.js | ✅ | ❌ | Never imported by any calculator or runner |
| export.js | ✅ | ❌ | Never imported by any calculator or runner |
| sharing.js | ✅ | ❌ | Never imported by any calculator or runner |
| faq.js | ✅ | ❌ | FAQ rendering is duplicated inline in tool-runner.js |
| related-tools.js | ✅ | ❌ | Related tools rendering is duplicated inline in tool-runner.js |
| recommendations.js | ✅ | ❌ | Never imported by any calculator or runner |
| tables.js | ✅ | ❌ | Never imported by any calculator or runner |
| validation.js | ✅ | ✅ (budget-planner) | Used by budget-planner only |
| formatting.js | ✅ | ✅ (budget-planner) | Used by budget-planner only |
| ads.js | ✅ | ❌ | Placeholder, `MONETIZATION_ENABLED = false` |

**Key finding:** 8 of 12 modules are **dead code** — they exist but are never imported by any calculator or the tool runner.

---

## 3. Strengths

1. **Comprehensive calculator content:** Each calculator has rich SEO content (article, howTo, examples, formula, FAQs) — excellent for organic search.
2. **Good financial formula coverage:** Mortgage, loan, compound interest, retirement, FIRE, rent-vs-buy, amortization — all use standard financial formulas.
3. **Clean utility layer:** `js/utils/` has well-structured, pure, tree-shakeable functions.
4. **Chart integration:** ChartManager provides a solid abstraction over Chart.js with theming, accessibility, and lifecycle management.
5. **Security headers:** `vercel.json` includes CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
6. **Supabase RLS:** Row Level Security is enabled on all tables with proper policies.
7. **Dark mode:** Full theme support with CSS variables.
8. **Responsive design:** CSS uses modern grid/flexbox with mobile-first breakpoints.
9. **Accessibility basics:** Skip links, ARIA labels on modals, focus traps, reduced-motion support.
10. **Documentation:** 5 comprehensive architecture documents.

---

## 4. Critical Problems (P0/P1)

### P0 — Critical

| ID | Issue | File | Impact |
|----|-------|------|--------|
| P0-01 | **Exposed EmailJS credentials** (public key, service ID, template ID) in client-side config | js/config.js | Anyone can send emails through GetCalcu's EmailJS account (spam/abuse) |
| P0-02 | **`getHistory()` has no user filter** — queries all calculations without `.eq('user_id', user.id)` | js/supabase.js | Potential data leak if RLS is misconfigured |
| P0-03 | **Contradictory SQL grants** — `revoke insert from anon, authenticated` then `grant insert to authenticated` | supabase-schema.sql | Confusing/misconfigured permissions |
| P0-04 | **Retirement calculator mixes real and nominal values** — uses inflation-adjusted returns for projections but applies 4% rule to nominal nest egg | js/tools.js | Mathematically inconsistent retirement projections |
| P0-05 | **HYSA real-yield mode understates real value** — contributions not inflation-adjusted | js/tools.js | Incorrect "real future value" |

### P1 — High

| ID | Issue | File | Impact |
|----|-------|------|--------|
| P1-01 | **construction.js and engineering.js are byte-for-byte identical** | js/calculators/ | Construction category is empty; engineering calculators registered twice |
| P1-02 | **`registerConstructionCalculators` imported but does not exist** | js/core/index.js | ReferenceError at module load — breaks core initialization |
| P1-03 | **Same broken import in migration layer** | js/core/migration.js | Migration fails → legacy fallback always used |
| P1-04 | **Sitemap/JSON-LD reference 3 non-existent calculators** (concrete, paint, tile) | sitemap.xml, index.html | Dead links / 404 pages indexed |
| P1-05 | **`tip-calculator` missing from sitemap** | sitemap.xml | Orphan page not indexed |
| P1-06 | **Empty canonical URL by default** | tool.html | No canonical if JS fails |
| P1-07 | **Static title for all tool pages** | tool.html | Duplicate titles if JS fails |
| P1-08 | **Empty meta description by default** | tool.html | No description if JS fails |
| P1-09 | **All JSON-LD injected client-side** | tool-runner.js | Google may not see structured data |
| P1-10 | **8 of 12 modules are dead code** | js/modules/ | pdf, print, export, sharing, faq, related-tools, recommendations, tables never used |
| P1-11 | **No automated tests** | — | Any code change can silently break financial calculations |
| P1-12 | **No PWA** (no manifest, service worker, offline) | — | No installability, no offline support |
| P1-13 | **No build system** — 327KB tools.js loaded on every page | tool.html | Poor initial load performance |
| P1-14 | **`getHistory()` queries without user filter** | js/supabase.js | Inefficient + potential data exposure |
| P1-15 | **`house-affordability-calculator` has custom `renderResults`/`renderChart` methods** that bypass the shared engine | js/tools.js | Inconsistent rendering path |

---

## 5. Functional Bugs

1. **Construction category is empty** — `registerConstructionCalculators` doesn't exist; the construction.js file contains engineering calculators.
2. **Engineering calculators registered twice** — both construction.js and engineering.js export the same calculators; `registerEngineeringCalculators` is called from both `core/index.js` and `core/migration.js`.
3. **`budget-planner` has `customRenderer: true`** in tools.js but the actual budget-planner module uses `customRenderer: (container) => renderBudgetPlanner(container)` — the legacy runner checks `if (tool.customRenderer)` which is truthy for `true`, so it calls `tool.customRenderer(container)` which is `true` (not a function) → **TypeError**.
4. **`house-affordability-calculator` chart rendering** — the custom `renderChart` method creates a Chart directly with `new Chart(ctx, ...)` instead of using ChartManager, bypassing the shared chart lifecycle.
5. **`savings-calculator` goal-timeline mode** — `mPmt` calculation for biweekly/weekly frequencies may produce incorrect monthly-equivalent deposits.
6. **`credit-card-payoff-calculator` balance-transfer mode** — `promoInterest = promo * iM * B` assumes interest accrues on the full original balance for the entire promo period, which is an approximation that may overstate interest.

---

## 6. Calculation Accuracy Audit

### Financial Calculators

| Calculator | Formula | Accuracy | Notes |
|-----------|---------|----------|-------|
| mortgage-calculator | M = P[r(1+r)^n]/[(1+r)^n−1] | ✅ Correct | Standard PMT formula |
| loan-calculator | Same PMT formula | ✅ Correct | |
| loan-interest-calculator | PMT with payment frequency | ✅ Correct | |
| compound-interest-calculator | FV = P(1+r/n)^(nt) + PMT[((1+r/n)^(nt)−1)/(r/n)] | ✅ Correct | |
| investment-calculator | Same compound formula | ✅ Correct | |
| retirement-calculator | Real return via Fisher equation | ⚠️ **P0-04** | Mixes real/nominal values |
| savings-calculator | Various modes | ⚠️ **P0-05** | HYSA real value understated |
| credit-card-payoff-calculator | Daily periodic rate | ⚠️ Approximate | Promo interest approximation |
| rent-vs-buy-calculator | Year-by-year simulation | ✅ Correct | Complex but sound |
| house-affordability-calculator | DTI ratios + PV | ✅ Correct | |
| inflation-calculator | FV = PV(1+i)^n | ✅ Correct | |
| net-worth-calculator | Assets − Liabilities | ✅ Correct | |
| fire-calculator | FIRE = Expenses / Withdrawal Rate | ✅ Correct | |
| amortization-calculator | PMT + schedule | ✅ Correct | Handles extra payments |
| percentage-calculator | Standard percentage formulas | ✅ Correct | |
| date-calculator | Calendar arithmetic | ✅ Correct | |
| bmi-calculator | kg/m² | ✅ Correct | |

### Edge Cases

- **NaN/Infinity:** Most calculators use `safeNum()` which returns fallback (0) for non-finite values. However, division by zero in some calculators (e.g., `percentage-calculator` with `b === 0`) is handled with `errorResult()`.
- **Negative values:** Most financial calculators validate `min: 0` on fields, but the `percentage-calculator` allows negative values (intentionally).
- **Zero interest rate:** Handled correctly in mortgage/loan calculators (`r === 0` branch).
- **Extremely large numbers:** No upper bounds on most fields — could produce `Infinity` in compound interest with very large rates/years.

---

## 7. SEO Audit

### Technical SEO

| Item | Status | Notes |
|------|--------|-------|
| robots.txt | ✅ | Disallows /auth, /history; references sitemap |
| sitemap.xml | ⚠️ | Missing tip-calculator; references 3 non-existent calculators |
| Canonical URLs | ⚠️ | Empty by default; only set client-side |
| Title tags | ⚠️ | Static default; only set client-side |
| Meta descriptions | ⚠️ | Empty by default; only set client-side |
| H1/H2 structure | ✅ | Good hierarchy in calculator content |
| URL structure | ✅ | Clean `/tool?slug=` format |
| Indexability | ⚠️ | All tool pages are client-side rendered |
| Duplicate content | ⚠️ | All tool pages share the same static title/description until JS runs |
| Internal links | ✅ | Related tools + journey links present |
| 404 behavior | ✅ | Custom "Tool Not Found" page with suggestions |
| HTTPS | ✅ | Vercel + HSTS |
| www/non-www | ✅ | Canonical uses www.getcalcu.com |

### Structured Data

| Schema | Status | Notes |
|--------|--------|-------|
| WebSite + SearchAction | ✅ | On homepage (static) |
| ItemList | ⚠️ | References 3 non-existent calculators |
| SoftwareApplication | ⚠️ | Client-side only |
| BreadcrumbList | ⚠️ | Client-side only |
| FAQPage | ⚠️ | Client-side only |
| TechArticle | ⚠️ | Client-side only |

### Calculator SEO

- **Unique titles:** ⚠️ Only set client-side; some calculators lack `metaTitle` (fall back to generic)
- **Unique descriptions:** ⚠️ Only set client-side
- **Introduction content:** ✅ All calculators have `article` content
- **FAQ:** ✅ Most calculators have FAQs (some have empty `faqs: []` in modular versions)
- **Related tools:** ✅ Present via `related` array or same-category fallback
- **Indexable URLs:** ⚠️ Client-side rendering means Google must execute JS

---

## 8. Performance Audit

| Bottleneck | Impact | Severity |
|-----------|--------|----------|
| **327KB tools.js loaded on every page** | High initial load time; blocks rendering | HIGH |
| **No code splitting** | All 18 calculators loaded even when viewing one | HIGH |
| **No minification** | ~30% larger files than necessary | MEDIUM |
| **No caching strategy** | No service worker; CDN caching only | MEDIUM |
| **Chart.js loaded on every tool page** | ~200KB even for calculators without charts | MEDIUM |
| **Font Awesome full CSS** | ~100KB for icons | MEDIUM |
| **Google Analytics + GTM on every page** | Third-party scripts block rendering | MEDIUM |
| **Inline styles in JS-generated HTML** | Prevents CSS caching; increases DOM size | LOW |
| **No lazy loading** | All modules loaded upfront | MEDIUM |
| **Repeated DOM queries** | `document.getElementById` called repeatedly in event handlers | LOW |

**Core Web Vitals risk:** LCP is likely poor due to render-blocking scripts (tools.js, Chart.js, Font Awesome) and no preload hints for critical resources.

---

## 9. Security Audit

| Risk | Severity | Notes |
|------|----------|-------|
| **Exposed EmailJS credentials** | HIGH | Public key + service ID + template ID in config.js |
| **Supabase anon key exposed** | LOW | Expected — anon key is public by design |
| **`getHistory()` without user filter** | MEDIUM | Relies on RLS; inefficient query |
| **XSS via `innerHTML`** | LOW | Most user input is escaped via `escapeHtml()`, but some paths use raw values (e.g., history page renders `row.inputs` values without escaping) |
| **CSP allows 'unsafe-inline' and 'unsafe-eval'** | MEDIUM | Weakens XSS protection |
| **No rate limiting on auth** | MEDIUM | Supabase handles this server-side |
| **localStorage for theme/cookie consent** | LOW | Acceptable for non-sensitive data |
| **No CSRF protection** | LOW | Supabase uses JWT auth |

---

## 10. Accessibility Audit

| Issue | WCAG Reference | Severity |
|-------|---------------|----------|
| **No `aria-live` on calculator results** | 4.1.3 | MEDIUM — screen readers don't announce result updates |
| **No `aria-describedby` on inputs** | 1.3.1 | MEDIUM — hints not associated with inputs |
| **Form errors not announced** | 4.1.3 | MEDIUM — error messages not in aria-live regions |
| **Color contrast** | 1.4.3 | LOW — need runtime verification |
| **Focus states** | 2.4.7 | LOW — CSS has focus styles but not verified on all elements |
| **Heading hierarchy** | 1.3.1 | LOW — calculator content uses h1→h2→h3 correctly |
| **Skip link** | 2.4.1 | ✅ Present |
| **ARIA on modals** | 4.1.2 | ✅ Present with focus traps |
| **Reduced motion** | 2.3.3 | ✅ Present |

---

## 11. UX Audit

| Issue | Severity |
|-------|----------|
| **No loading state for calculator initialization** | MEDIUM — blank container until JS runs |
| **No error boundary** — if one calculator throws, the whole page breaks | HIGH |
| **Save Result button hidden for non-authenticated users** | LOW — by design |
| **No "Reset" button on most calculators** | LOW — users must manually clear fields |
| **Results update on every keystroke** | MEDIUM — can cause performance issues on complex calculators (e.g., rent-vs-buy) |
| **No debouncing on input events** | MEDIUM — rent-vs-buy recalculates a 40-year simulation on every keystroke |
| **Mobile: sidebar overlay works** | ✅ |
| **Mobile: touch targets** | LOW — need runtime verification |

---

## 12. PWA Audit

**No PWA implementation exists.** There is:
- ❌ No `manifest.json`
- ❌ No service worker
- ❌ No offline support
- ❌ No installability
- ❌ No app icons (only favicon.png)
- ❌ No theme-color on all pages (only tool.html and index.html have it)

---

## 13. Backend / Supabase Audit

| Item | Status | Notes |
|------|--------|-------|
| Tables | ✅ | `profiles`, `calculations` |
| RLS | ✅ | Enabled on both tables |
| Policies | ✅ | Select/insert/delete on own rows |
| Indexes | ✅ | `idx_calculations_user_created` |
| Auto-profile creation | ✅ | Trigger on auth.users |
| History cap at 50 | ✅ | Trigger deletes oldest |
| **`getHistory()` missing user filter** | ⚠️ | Queries all rows; relies on RLS |
| **Contradictory grants** | ⚠️ | `revoke` then `grant` on same role |
| Realtime | ❌ | Not used |
| Unused features | ❌ | None significant |

---

## 14. Deployment Audit

| Item | Status | Notes |
|------|--------|-------|
| Hosting | ✅ | Vercel |
| Build process | ❌ | None — static files served directly |
| Environment variables | ⚠️ | Hardcoded in config.js (no env vars) |
| HTTPS | ✅ | Vercel + HSTS |
| Redirects | ✅ | /tool.html → /tool, etc. |
| SPA routing | ✅ | Rewrites for /tool, /auth, /history |
| Security headers | ✅ | CSP, HSTS, X-Frame-Options, etc. |
| **Production-only failures** | ⚠️ | Client-side rendering means SEO depends on JS execution; no SSR |

---

## 15. Testing Gap Analysis

**No automated tests exist.** Critical functionality with NO protection:

| Area | Risk |
|------|------|
| All 18 financial calculators | A future code change could silently produce incorrect financial results |
| Amortization schedules | Rounding errors could go undetected |
| Compound interest | Compounding frequency changes could break results |
| Retirement/FIRE projections | Real vs nominal mixing (P0-04) could go undetected |
| Rent-vs-buy simulation | Complex 40-year loop could have off-by-one errors |
| Credit card payoff | Daily-rate calculations could be wrong |
| Supabase queries | RLS changes could break history |
| SEO metadata | Title/description/canonical could break silently |

---

## 16. Technical Debt

1. **Incomplete migration** — 16 of 18 calculators still in legacy `tools.js`
2. **Dead modules** — 8 of 12 modules never used
3. **Duplicate calculator definitions** — mortgage/loan/BMI exist in both `tools.js` and `calculators/*.js`
4. **Identical files** — construction.js = engineering.js
5. **Broken imports** — `registerConstructionCalculators` doesn't exist
6. **No build system** — no bundling, minification, or tree-shaking
7. **No tests** — zero automated protection
8. **Hardcoded config** — no environment variables
9. **Inline styles** — JS generates HTML with inline styles, preventing CSS caching
10. **Global helpers** — `fmt`, `fmtN`, `pct`, `safeNum` defined in tools.js and re-exported in multiple places

---

## 17. Dead Code / Duplications

### Dead Code
- `js/modules/pdf.js` — never imported
- `js/modules/print.js` — never imported
- `js/modules/export.js` — never imported
- `js/modules/sharing.js` — never imported
- `js/modules/faq.js` — never imported (FAQ built inline in tool-runner.js)
- `js/modules/related-tools.js` — never imported (related tools built inline)
- `js/modules/recommendations.js` — never imported
- `js/modules/tables.js` — never imported
- `js/modules/ads.js` — placeholder, disabled
- `js/maintenance-banner.js` — `MAINTENANCE_ENABLED = false`
- `js/core/tool-manager.js` — never imported by any page
- `js/core/router.js` — imported but `initRouter()` never called (migration.js calls it, but migration fails)
- `js/calculators/finance.js` — never imported by any page (only referenced in migration.js which fails)
- `js/calculators/health.js` — never imported by any page
- `js/tools-template.js` — only adds tip-calculator

### Duplications
- `construction.js` = `engineering.js` (byte-identical)
- Mortgage calculator: `tools.js` + `calculators/finance.js`
- Loan calculator: `tools.js` + `calculators/finance.js`
- BMI calculator: `tools.js` + `calculators/health.js`
- `buildAmortization` defined in: `tools.js`, `calculators/finance.js`, `core/migration.js`, `core/calculator-engine.js`
- `bmiCategory` defined in: `tools.js`, `calculators/finance.js`, `calculators/health.js`, `core/migration.js`
- `errorResult` defined in: `tools.js`, `calculators/finance.js`, `calculators/health.js`, `calculators/construction.js`, `calculators/engineering.js`, `core/migration.js`
- `fmt`/`fmtN`/`pct` defined in: `tools.js`, `utils/index.js`, `core/migration.js`, `tool-runner.js`

---

## 18. Integration Failures

| Chain | Status | Root Cause |
|-------|--------|-----------|
| Registry → Router | ⚠️ | Router imports from core/tools.js but legacy tools are in window.TOOLS; migration layer bridges them but fails |
| Router → Calculator | ⚠️ | tool-runner.js reads slug from URL, resolves from window.TOOLS (not core registry) |
| Calculator → Engine | ❌ | Legacy calculators call `tool.calculate()` directly — never use `runCalculator()` |
| Engine → Validation | ⚠️ | New engine has `validateInputs()` but legacy calculators bypass it |
| Engine → Formatting | ⚠️ | Legacy uses global `fmt`; new engine uses `formatCurrency` from utils |
| Calculator → Chart | ⚠️ | Legacy uses `renderChart()` in tool-runner.js; new engine uses ChartManager — both work but are separate paths |
| Calculator → FAQ | ❌ | FAQ module exists but FAQ HTML is built inline in tool-runner.js |
| Calculator → Related Tools | ❌ | related-tools module exists but related tools HTML is built inline |
| Calculator → Export/PDF/Print | ❌ | Modules exist but no buttons are wired to them |
| Calculator → Sharing | ❌ | Module exists but no share buttons are rendered |
| SEO → Calculator | ⚠️ | SEO metadata set client-side after tool resolution |
| Sitemap → Calculator | ❌ | Sitemap references 3 non-existent calculators; missing tip-calculator |

---

## 19. Scalability Assessment

**Can this architecture support hundreds/thousands of calculators?**

**Current state: NO.** The architecture will break down because:

1. **Monolithic tools.js** — 327KB for 18 calculators. At 100 calculators, this would be ~1.8MB of JavaScript loaded on every page.
2. **No code splitting** — every calculator's code is loaded for every page.
3. **No build system** — no way to bundle, minify, or tree-shake.
4. **No automated tests** — adding calculators without tests will introduce regressions.
5. **Dead module system** — the reusable modules that would help scale are not wired in.
6. **Client-side rendering only** — SEO for hundreds of pages requires server-side rendering or prerendering.
7. **No localization** — all content is hardcoded English/USD.
8. **No multi-currency support** — all calculators hardcode USD.
9. **No analytics integration** — GA/GTM present but no event tracking for calculator usage.
10. **No monetization** — ads module is a placeholder.

**What would need to change:**
- Build system (Vite/Webpack) with code splitting
- Server-side rendering or prerendering for SEO
- Complete the module migration (wire in FAQ, related-tools, export, PDF, print, sharing)
- Automated test suite for all financial calculations
- Localization framework
- Multi-currency support
- Event tracking

---

## 20. Priority Matrix

| Priority | Issue | Impact | Effort | Dependency |
|----------|-------|--------|--------|------------|
| 1 | Fix broken imports (registerConstructionCalculators) | HIGH | LOW | None |
| 2 | Fix construction.js/engineering.js duplication | HIGH | LOW | None |
| 3 | Fix sitemap/JSON-LD dead links | HIGH | LOW | None |
| 4 | Fix retirement calculator real/nominal mixing | CRITICAL | MEDIUM | None |
| 5 | Fix HYSA real-yield calculation | CRITICAL | MEDIUM | None |
| 6 | Add user filter to getHistory() | HIGH | LOW | None |
| 7 | Fix budget-planner customRenderer bug | HIGH | LOW | None |
| 8 | Wire in FAQ/related-tools modules | MEDIUM | MEDIUM | Module migration |
| 9 | Add automated tests for financial calculators | CRITICAL | HIGH | None |
| 10 | Add build system with code splitting | HIGH | HIGH | None |
| 11 | Add PWA (manifest + service worker) | MEDIUM | MEDIUM | None |
| 12 | Add server-side rendering/prerendering | HIGH | HIGH | Build system |

---

## 21. Recommended Fix Order

1. **Critical calculation/security issues** (P0-01 through P0-05)
2. **Broken architecture/integration** (P1-01 through P1-03)
3. **SEO infrastructure** (P1-04 through P1-09)
4. **Core engine problems** (wire legacy calculators to new engine)
5. **Validation** (add shared validation to all calculators)
6. **Shared modules** (wire in FAQ, related-tools, export, PDF, print, sharing)
7. **Calculator-level bugs** (budget-planner customRenderer, house-affordability chart)
8. **Testing** (unit tests for all financial calculations)
9. **Performance** (build system, code splitting, minification)
10. **UX/accessibility** (loading states, error boundaries, aria-live)
11. **PWA** (manifest, service worker, offline)
12. **Cleanup/refactoring** (remove dead code, deduplicate)

---

## 22. Confidence Assessment

| Finding | Confidence |
|---------|-----------|
| construction.js = engineering.js (byte-identical) | **Confirmed** (via `fc /b`) |
| registerConstructionCalculators doesn't exist | **Confirmed** (searched all files) |
| Sitemap references non-existent calculators | **Confirmed** (searched all JS files) |
| tip-calculator missing from sitemap | **Confirmed** |
| 8 modules never imported | **Confirmed** (searched all imports) |
| No tests exist | **Confirmed** (no test files found) |
| No PWA | **Confirmed** (no manifest/service worker) |
| Retirement calculator real/nominal mixing | **Highly likely** (needs runtime verification) |
| HYSA real-yield understatement | **Highly likely** (needs runtime verification) |
| getHistory() missing user filter | **Confirmed** (code inspection) |
| budget-planner customRenderer bug | **Highly likely** (needs runtime verification) |
| EmailJS credentials exposed | **Confirmed** |
| SEO metadata client-side only | **Confirmed** |

---

## 23. "DO NOT TOUCH YET" List

The following should NOT be modified until dependencies are understood:

1. **js/tools.js** — The primary source of truth for all 18 calculators. Any change here affects every calculator. Do not refactor until the migration is complete and tested.
2. **js/tool-runner.js** — The hybrid router. Do not change the fallback logic until the new architecture is verified working.
3. **js/core/migration.js** — The migration layer. Do not change until the broken imports are understood and the new architecture is stable.
4. **supabase-schema.sql** — Database schema. Do not modify without understanding the RLS implications.
5. **vercel.json** — Deployment config. Do not change CSP without testing all third-party scripts.
6. **js/supabase.js** — Backend integration. Do not change queries without understanding RLS policies.
7. **The 18 calculator `calculate()` functions** — Do not refactor formulas until automated tests exist to verify correctness.
8. **js/calculators/construction.js and engineering.js** — Do not delete either until the registration flow is fixed and verified.
9. **index.html JSON-LD** — Do not remove the ItemList schema until the sitemap is regenerated correctly.
10. **js/config.js** — Do not remove the EmailJS credentials until the contact form is migrated to a server-side solution.

---

## 24. Final Verification Checklist

- [x] Inspected the entire repository (all files read or searched)
- [x] Understood the architecture (not just filenames)
- [x] Inspected every calculator (all 18 legacy + 3 modular + tip-calculator)
- [x] Traced the major execution paths (tool.html load sequence)
- [x] Checked shared modules (all 12 modules analyzed)
- [x] Checked calculator-engine integration (found critical gaps)
- [x] Checked SEO (robots, sitemap, metadata, structured data)
- [x] Checked performance (bundle size, render-blocking, caching)
- [x] Checked security (credentials, XSS, CSP, Supabase)
- [x] Checked accessibility (ARIA, focus, contrast, semantics)
- [x] Checked PWA (none exists)
- [x] Checked backend integrations (Supabase schema, queries, RLS)
- [x] Checked deployment (Vercel config, redirects, headers)
- [x] Checked mobile behavior (responsive CSS, touch targets)
- [x] Identified dead code (8 unused modules, unused files)
- [x] Identified duplicated logic (buildAmortization, bmiCategory, errorResult, etc.)
- [x] Identified integration failures (registry→router→calculator→engine→modules)
- [x] Identified calculation risks (retirement, HYSA, credit card)
- [x] Distinguished symptoms from root causes (e.g., "FAQ missing" → root cause: FAQ module never wired in)
- [x] **Avoided modifying the project** (read-only audit)

---

*End of Audit Report*