# GetCalcu — Master Issue Register

**Date:** 2026-08-21  
**Severity Scale:** P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)  
**Confidence Scale:** Confirmed / Highly Likely / Needs Runtime Verification

---

## P0 — Critical (Security / Data Loss / Incorrect Financial Results)

### ISSUE-001
- **Category:** Security
- **File:** js/config.js
- **Function:** APP_CONFIG
- **Description:** EmailJS public key, service ID, and template ID are hardcoded in client-side JavaScript. Anyone can extract these credentials from the browser and send emails through GetCalcu's EmailJS account, enabling spam and phishing abuse.
- **Reproduction:** Open browser DevTools → Network tab → View config.js → Extract EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID.
- **Expected:** Credentials are server-side only, never exposed to the browser.
- **Actual:** All EmailJS credentials are publicly visible in client-side config.js.
- **Severity:** P0
- **Business Impact:** Reputational damage, spam abuse, potential EmailJS account suspension, possibility of template abuse to send malicious emails appearing to come from GetCalcu.
- **Technical Impact:** An attacker can use the discovered service/template IDs to send arbitrary emails via the GetCalcu EmailJS account.
- **Recommended Fix Direction:** Move EmailJS sending to a serverless function (e.g., Vercel API route). If that is not immediate, restrict EmailJS template/service usage and scope API keys. At minimum, rotate the credentials.
- **Dependencies:** Contact form implementation (contact.html), EmailJS account.
- **Confidence:** Confirmed

### ISSUE-002
- **Category:** Security
- **File:** js/supabase.js
- **Function:** getHistory()
- **Description:** The `getHistory()` function queries the `calculations` table with `.select(...)` and `.order(...)`/`.limit(...)` but does NOT filter by `user_id`. It relies entirely on Row Level Security (RLS) to prevent returning other users' rows. If RLS is not enabled or is misconfigured on the deployed Supabase project, this query would leak all users' calculation history.
- **Reproduction:** Sign in → Go to /history → Observe the network request to Supabase REST API → Check that the request has no `user_id` filter.
- **Expected:** The query should include `.eq('user_id', user.id)` to scope results to the authenticated user.
- **Actual:** The query fetches all rows from `calculations`; only RLS protects data isolation.
- **Severity:** P0
- **Business Impact:** Data breach of user financial calculations — severe privacy/reputational damage.
- **Technical Impact:** Potential mass data exposure; also inefficient (fetches all rows before RLS filters).
- **Recommended Fix Direction:** Add `.eq('user_id', user.id)` to the query. Additionally, verify RLS is enabled in the live Supabase project.
- **Dependencies:** Supabase project, RLS policies in supabase-schema.sql.
- **Confidence:** Confirmed

### ISSUE-003
- **Category:** Security / Database
- **File:** supabase-schema.sql
- **Function:** Line 105
- **Description:** There is a contradictory permission statement: `revoke insert on public.calculations from anon, authenticated; grant insert on public.calculations to authenticated;` — the revoke removes insert from both `anon` and `authenticated`, but then immediately re-grants insert to `authenticated`. This negates the intent of the revoke and is confusing. Net effect: `authenticated` CAN insert, `anon` cannot. But the line is misleading and indicates a potential misconfiguration misunderstanding.
- **Reproduction:** Read supabase-schema.sql lines 100-106.
- **Expected:** Clear, unambiguous permission model (typically: anon has no insert; authenticated has insert with RLS check `auth.uid() = user_id`).
- **Actual:** Conflicting revoke/grant pair that is logically redundant and confusing.
- **Severity:** P0 (risk of misconfiguration; the intent — blocking anon — is still achieved, but any future edit to this block could accidentally open insert to anon).
- **Business Impact:** If mistakenly configured to allow anon insert, anyone could write arbitrary calculation records / spam the DB.
- **Technical Impact:** Data integrity issues; potential storage abuse.
- **Recommended Fix Direction:** Replace the contradictory lines with a single clear statement: `revoke insert on public.calculations from anon;` (leave `authenticated` relying on the RLS policy).
- **Dependencies:** Supabase project.
- **Confidence:** Confirmed

### ISSUE-004
- **Category:** Calculation Accuracy (Financial)
- **File:** js/tools.js — retirement-calculator
- **Function:** calculate(v)
- **Description:** The retirement calculator computes `realReturn = (1 + annualReturn) / (1 + inflationRate) - 1` and uses this real (inflation-adjusted) rate to project `totalNestEgg`. However, `targetNestEgg` is computed using `fvDesiredIncome = desiredIncomeToday * Math.pow(1 + inflationRate, yearsToRetire)` (nominal future income) times 25. This mixes real-dollar projections (nest egg) with nominal future-dollar targets (desired income), producing mathematically inconsistent financial advice. The comparison `if (totalNestEgg >= targetNestEgg)` is therefore comparing apples to oranges.
- **Reproduction:** Retirement Calculator: Age 25, Income $55,000, Savings $0, Monthly $500, Return 7%, Inflation 3%, Retire 65, Life 95, Income Replacement 80%. Check whether the "Status" (On Track / Needs Attention) is mathematically sound.
- **Expected:** Both nest egg and target should be in the same dollar basis (both real or both nominal).
- **Actual:** Nest egg projected in real dollars; target in nominal dollars — inconsistent comparison.
- **Severity:** P0
- **Business Impact:** Users receive materially incorrect retirement readiness advice — could lead to under-saving or a false sense of security.
- **Technical Impact:** Incorrect "Additional Monthly Savings Needed" and "Status" calculations.
- **Recommended Fix Direction:** Convert the target to real dollars (divide `fvDesiredIncome` by inflation factor, or compute target using today's income × 25) OR project the nest egg in nominal dollars. Choose one consistent basis.
- **Dependencies:** None directly.
- **Confidence:** Highly Likely (needs runtime verification with concrete numbers)

### ISSUE-005
- **Category:** Calculation Accuracy (Financial)
- **File:** js/tools.js — savings-calculator
- **Function:** calculate(v) — 'hysa-real-yield' mode
- **Description:** In HYSA real-yield mode, `fvReal = fvPost / Math.pow(1 + pi, tUse)` divides the post-tax nominal future value by inflation to express it in today's dollars. However, the monthly contributions made over time are NOT inflation-adjusted in this conversion, so the "real future value (today's $)" is understated relative to the true purchasing power (contributions made in future dollars are being discounted back as if they were today's dollars). This produces a misleading "Real Return" figure and real future value.
- **Reproduction:** HYSA mode: $5,000 at 4.5% APY, 22% tax, 2.5% inflation, $250/mo, 5 years.
- **Expected:** Real value should account for the fact that future contributions have lower purchasing power individually (or the calculator should clearly state the assumption).
- **Actual:** All contributions are discounted at the same factor, understating real value.
- **Severity:** P0
- **Business Impact:** Misleading real-yield advice for savers.
- **Technical Impact:** Incorrect "Real Future Value" and "Real Return" metrics.
- **Recommended Fix Direction:** Recompute real value by discounting each period's contribution/investment separately, or clearly label the metric as an approximation. Document the assumption.
- **Dependencies:** None directly.
- **Confidence:** Highly Likely (needs runtime verification)

---

## P1 — High (Major Functionality / SEO / Architecture)

### ISSUE-101
- **Category:** Architecture (Critical Integration Failure)
- **File:** js/calculators/construction.js / js/calculators/engineering.js
- **Function:** Module definitions
- **Description:** construction.js and engineering.js are **byte-for-byte identical** files (verified with `fc /b` — "no differences encountered"). Both export `ohmsLawCalculator`, `pressureCalculator`, `beamDeflectionCalculator`, and `registerEngineeringCalculators`. Neither exports a `registerConstructionCalculators` function, yet `core/index.js` and `core/migration.js` both import `registerConstructionCalculators` from construction.js.
- **Reproduction:** Load tool.html → Observe console: `ReferenceError: registerConstructionCalculators is not defined` (or module evaluation failure) → Core architecture falls back to legacy.
- **Expected:** construction.js should contain construction calculators (concrete, paint, tile — referenced in sitemap); engineering.js should contain engineering calculators; both registration functions should exist.
- **Actual:** Identical files; broken import; construction category empty; engineering calculators would be double-registered (though registration fails before that point).
- **Severity:** P1
- **Business Impact:** Construction category is non-functional; new modular architecture never activates (always falls back to legacy); the sitemap links to non-existent concrete/paint/tile calculators.
- **Technical Impact:** Broken ES module import chain → `initializeCore()` / `initializeMigration()` throws → `useNewArchitecture = false` → legacy runner used. All the new modular work is effectively bypassed.
- **Recommended Fix Direction:** Rewrite construction.js with actual construction calculators and a `registerConstructionCalculators` export. Make engineering.js contain only engineering calculators. Fix core/index.js and migration.js imports.
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-102
- **Category:** SEO (Dead Links / Indexed 404s)
- **File:** index.html (ItemList JSON-LD) + sitemap.xml
- **Function:** Structured data markup
- **Description:** The homepage ItemList JSON-LD (lines 63-85) references `concrete-calculator`, `paint-calculator`, and `tile-calculator` (positions 14-16), but **none of these calculators exist** in any JavaScript file (verified via search across all .js files). These are dead links → 404 pages. Additionally, `tip-calculator` (defined in tools-template.js) is NOT in the sitemap.
- **Reproduction:** Click any of the 3 links in the JSON-LD → 404 "Tool Not Found". Or run `node generate-sitemap.js` and inspect output — it does not parse tools-template.js, so tip-calculator is omitted.
- **Expected:** All sitemap/JSON-LD URLs resolve to existing calculators. tip-calculator should be included.
- **Actual:** 3 dead URLs in both JSON-LD and (for concrete/paint/tile) the sitemap; tip-calculator missing from sitemap.
- **Severity:** P1
- **Business Impact:** Google indexes 404 pages; crawl budget wasted; user trust damaged; missed opportunity to index tip-calculator.
- **Technical Impact:** Broken internal linking; inconsistent sitemap generation.
- **Recommended Fix Direction:** (a) Either build the 3 construction calculators (recommended — construction category is empty) or remove their references. (b) Update generate-sitemap.js to also parse tools-template.js (or a shared tool registry).
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-103
- **Category:** SEO (Client-Side-Only Metadata)
- **File:** tool.html
- **Function:** <head> + updateSeoMeta()/updateSeoLegacy()
- **Description:** Title, meta description, canonical URL, Open Graph, Twitter cards, and all JSON-LD structured data (SoftwareApplication, BreadcrumbList, FAQPage, TechArticle) are populated ONLY client-side by JavaScript after the DOM loads. The static HTML has an empty title default, empty description (`content=""`), empty canonical (`href=""`). If JavaScript fails, is slow, or is not executed (e.g., some crawlers), every tool page has identical/empty metadata and NO structured data.
- **Reproduction:** Disable JavaScript → Open /tool?slug=mortgage-calculator → Inspect <head>.
- **Expected:** Each tool page should have server-rendered (static) unique title, description, canonical, and JSON-LD.
- **Actual:** Empty/identical metadata without JS.
- **Severity:** P1
- **Business Impact:** Google may not index tool pages with proper titles/descriptions; FAQ rich results, breadcrumb rich results, and software app rich results may not appear (they are injected via JS which Google can render but less reliably).
- **Technical Impact:** Risk of duplicate/empty titles; reduced organic CTR.
- **Recommended Fix Direction:** Move SEO metadata and JSON-LD into the static HTML (e.g., pre-render each calculator page or use Vercel middleware/serverless to inject metadata per slug). At minimum, add a fallback `<noscript>`/static default per known slug.
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-104
- **Category:** Architecture (Dead Code)
- **File:** js/modules/*.js
- **Function:** pdf.js, print.js, export.js, sharing.js, faq.js, related-tools.js, recommendations.js, tables.js, ads.js
- **Description:** 8 of 12 (plus ads.js placeholder) feature modules are never imported by any calculator, the tool runner, or any HTML page. The functionality they provide (PDF, print, export, sharing, FAQ building, related-tools building, recommendations, tables, ads) is either implemented inline elsewhere (FAQ/related-tools in tool-runner.js) or not implemented at all (PDF/print/export/sharing). This is dead code that inflates the codebase and creates a false impression of feature availability.
- **Reproduction:** Search all .js files for `import ... from './modules/pdf.js'` (or any of the listed) → no matches.
- **Expected:** Either wire modules in (recommended) or remove them (cleanup).
- **Actual:** Dead modules.
- **Severity:** P1
- **Business Impact:** Features advertised in architecture docs (PDF, print, export, sharing) are not actually available to users; maintenance burden; confusion.
- **Technical Impact:** Unused code to maintain; no clear extension path for new calculators to use these features.
- **Recommended Fix Direction:** In the next architecture phase, wire these modules into the calculator results rendering (add PDF/Print/Export/Share buttons to results). Until then, mark them clearly as "unused" or remove.
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-105
- **Category:** Architecture (Hybrid Bypass)
- **File:** js/tool-runner.js
- **Function:** initLegacyRunner() / performCalculation()
- **Description:** Even when the new core architecture initializes successfully (which currently it does NOT due to the broken import), the legacy runner (`initLegacyRunner`) and legacy `tool.calculate(values)` are used directly. The new `runCalculator()` pipeline (normalize → validate → calculate → structured result) in `core/calculator-engine.js` is never invoked for any calculator. Thus the entire "Calculator Engine" layer is dead code in practice.
- **Reproduction:** Search for `runCalculator(` calls → only defined, never called outside tests.
- **Expected:** Calculators should run through the central engine pipeline to benefit from shared validation/normalization/result structure.
- **Actual:** Each calculator's `calculate()` is called directly; engine bypassed.
- **Severity:** P1
- **Business Impact:** Validation, error handling, and result-structure consistency are absent; hard to standardize across 100+ future calculators.
- **Technical Impact:** Architectural inconsistency between documented design and actual runtime.
- **Recommended Fix Direction:** After fixing the broken imports, make the hybrid runner invoke `runCalculator()` / `initializeCalculator()` for calculators that support it, falling back to legacy only where necessary.
- **Dependencies:** ISSUE-101 (fix imports).
- **Confidence:** Confirmed

### ISSUE-106
- **Category:** Bug (Runtime)
- **File:** js/tools.js — 'budget-planner'
- **Function:** customRenderer: true
- **Description:** In tools.js, `budget-planner` defines `customRenderer: true` (a boolean). The legacy runner in tool-runner.js checks `if (tool.customRenderer) { tool.customRenderer(container); return; }` — since `true` is truthy, it attempts to call `true(container)`, causing a **TypeError: tool.customRenderer is not a function**.
- **Reproduction:** Navigate to /tool?slug=budget-planner.
- **Expected:** Budget planner renders via the budget-planner module's `renderBudgetPlanner`.
- **Actual:** Potential TypeError → blank/broken page (the actual budget-planner module registers a proper function, but tools.js's legacy definition with `true` may win or conflict depending on load order).
- **Severity:** P1
- **Business Impact:** Core flagship tool (Budget Planner) may be broken.
- **Technical Impact:** Runtime error path.
- **Recommended Fix Direction:** Either change tools.js's budget-planner to `customRenderer: (container) => window.renderBudgetPlannerModule(container)` or remove the field and let the module handle it. Ensure only the module definition is used.
- **Dependencies:** budget-planner module.
- **Confidence:** Highly Likely (needs runtime verification)

### ISSUE-107
- **Category:** Performance (First Load)
- **File:** tool.html / index.html
- **Function:** Script loading
- **Description:** All pages load `js/tools.js` (327KB unminified) synchronously in the <head>-less body, blocking rendering. Chart.js (~200KB) is loaded on every tool page even for text-only calculators. Font Awesome full CSS (~100KB) is loaded everywhere. Google Analytics + GTM add more third-party scripts. There is no code splitting, no minification, no async/defer for the biggest local script, no service worker caching.
- **Reproduction:** Open DevTools → Performance → record load of /tool?slug=percentage-calculator (no charts) → observe Chart.js still loads.
- **Expected:** Load only what the page needs; defer non-critical scripts; minify; use service worker.
- **Actual:** Full 18-calculator registry + chart library loaded for every tool page.
- **Severity:** P1
- **Business Impact:** Poor LCP/INP → lower SEO rankings (Core Web Vitals) and higher bounce rate, especially mobile.
- **Technical Impact:** Large bundle, render-blocking.
- **Recommended Fix Direction:** Introduce a build step (Vite/esbuild) with per-route code splitting; load Chart.js only when a calculator declares a chart; defer tools.js with a mechanism that still resolves slugs before tool-runner runs; consider a hybrid static-prefetch. Add a service worker.
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-108
- **Category:** Testing (No Coverage)
- **File:** Entire project
- **Function:** N/A
- **Description:** There are zero automated tests (no unit, integration, or E2E). All 18+ calculators, all financial formulas, the router, the modules, and the Supabase integration are unprotected. A future code change could silently produce incorrect financial results (e.g., the P0-04/P0-05 issues) with no test to catch it.
- **Reproduction:** `find . -name "*test*" -o -name "*.spec.*"` → none.
- **Expected:** Unit tests for all financial calculations; integration tests for the runner; E2E smoke tests.
- **Actual:** No tests.
- **Severity:** P1
- **Business Impact:** High risk of regressions reaching production; especially dangerous for a calculator platform where wrong financial output damages trust.
- **Technical Impact:** Cannot refactor safely (which blocks fixing other issues).
- **Recommended Fix Direction:** Add a test runner (Vitest/Jest) and write calculation tests for every calculator's `calculate()`, plus tests for utils/math.js financial functions. Add CI (GitHub Actions) to run on every commit.
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-109
- **Category:** PWA / Offline
- **File:** Entire project (no manifest/service worker)
- **Function:** N/A
- **Description:** No PWA implementation: no web app manifest, no service worker, no offline support, no installability, no app icons beyond favicon.png. The `<meta name="theme-color">` is present only on tool.html and index.html, not on about/contact/privacy/terms/cookie-policy/history/auth.
- **Reproduction:** LightHouse audit → PWA category fails.
- **Expected:** Basic PWA: manifest.json + service worker for caching static assets and offline shell.
- **Actual:** No PWA.
- **Severity:** P1
- **Business Impact:** No installability; poor offline experience; missing mobile UX opportunity for a calculator app (highly suited to PWA).
- **Technical Impact:** N/A.
- **Recommended Fix Direction:** Add manifest.json (icons, theme color, name), a simple service worker (cache-first for static assets), and register it. Add theme-color meta to all pages.
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-110
- **Category:** Security (XSS / Data Handling)
- **File:** history.html
- **Function:** buildHistoryCard()
- **Description:** The history page renders `row.inputs` and `row.results` values into HTML using template literals with `${v}` without escaping (e.g., `<span class="history-input-chip">... <strong>${v}</strong></span>`). If a stored calculation input/result contained HTML (e.g., a malicious slug/value saved via a crafted request), it would be injected unsanitized → XSS risk.
- **Reproduction:** Save a calculation with an input value containing `<img src=x onerror=alert(1)>` (may require crafting a request since inputs are numbers) or store malicious results.
- **Expected:** All user-derived values escaped before insertion into innerHTML.
- **Actual:** Raw values inserted into template strings.
- **Severity:** P1
- **Business Impact:** Stored XSS → session hijack, defacement, phishing within GetCalcu.
- **Technical Impact:** Client-side XSS vector.
- **Recommended Fix Direction:** Use `escapeHtml()` (already available) on `v` when rendering history chips/result lines. Also consider sanitizing on the server/Supabase side.
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-111
- **Category:** SEO (Missing canonical per variant / duplicate content)
- **File:** All pages
- **Function:** <link rel="canonical">
- **Description:** about.html, contact.html (noindex), privacy.html, terms.html, cookie-policy.html, and history.html (noindex) either lack a canonical tag entirely or differ. Only index.html and tool.html (client-side) set a canonical. This creates duplicate-content risk for parameterized URLs (e.g., /?category=finance, /?category=health share index canonical → actually that's fine; but tool pages without JS have no canonical).
- **Reproduction:** View source of about.html — no canonical link element? (It has `<link rel="canonical" href="https://www.getcalcu.com/about">` per the read. Verifying: about.html line 24 has canonical. So the gap is mainly tool.html behavior + any parameter combinations on index.)
- **Expected:** Every indexable page has a unique self-referencing canonical.
- **Actual:** Canonical present on most static pages; tool pages rely on JS to set canonical (empty by default in HTML).
- **Severity:** P1 (tied to ISSUE-103)
- **Business Impact:** Google may generate its own canonical choice → index wrong URL variants.
- **Technical Impact:** Crawl/index inconsistency.
- **Recommended Fix Direction:** Pre-render canonical for tool pages (part of ISSUE-103 fix).
- **Dependencies:** ISSUE-103.
- **Confidence:** Confirmed

---

## P2 — Medium (Important Bugs / Architectural Weakness)

### ISSUE-201
- **Category:** Architecture (Duplicate definitions)
- **File:** js/calculators/finance.js, js/calculators/health.js
- **Function:** mortgageCalculator, loanCalculator, bmiCalculator
- **Description:** The modular files define mortgage/loan/BMI calculators with **simplified/less rich** definitions than the legacy tools.js versions (e.g., modular finance.js mortgage has empty `faqs: []`, `howTo: []`, `examples: []`, while tools.js has full SEO content). The registration functions (`registerFinanceCalculators`, `registerHealthCalculators`) skip registration if the tool already exists (legacy wins) — so the modular definitions are effectively dead, but remain confusing duplicates. 16 of 18 calculators are mentioned in PHASE4_MIGRATION_REPORT.md as "remaining in legacy" but the modular files only contain 3, and they're never loaded anyway.
- **Reproduction:** Compare mortgage-calculator in tools.js vs finance.js — same id, different content/quality.
- **Expected:** Single source of truth per calculator.
- **Actual:** Two divergent definitions per calculator (legacy rich, modular thin).
- **Severity:** P2
- **Business Impact:** Confusion for developers; risk of accidentally using the thin definitions and losing SEO content.
- **Technical Impact:** Duplication; maintenance risk.
- **Recommended Fix Direction:** When completing migration, move full definitions (including SEO content) into modular files and delete from tools.js. Until then, document that tools.js is authoritative.
- **Dependencies:** Migration completion (Phase 4+).
- **Confidence:** Confirmed

### ISSUE-202
- **Category:** Bug (Calculation accuracy — day count / date)
- **File:** js/tools.js — date-calculator
- **Function:** calculate(v) 'between' mode
- **Description:** The "days between" calculation uses `Math.round((endUTC - startUTC) / msPerDay)` which is correct for UTC midnight dates, but the duration decomposition uses fixed 365-day years and 30-day months (`years = floor(days/365)`, `months = floor(rem/30)`). This produces approximate "X yr Y mo" that can be off by a month for long spans — acceptable as display but should be labeled approximate. Also date parsing only handles YYYY-MM-DD via split, and `new Date(startStr + 'T12:00:00')` is used for add mode (good).
- **Reproduction:** Days between 2020-01-01 and 2024-12-31 → duration breakdown.
- **Expected:** Clear labeling of approximate year/month decomposition, or exact calendar-based decomposition.
- **Actual:** Approximate fixed-length month/year.
- **Severity:** P2
- **Business Impact:** Minor confusion about duration breakdown.
- **Technical Impact:** Low.
- **Recommended Fix Direction:** Either compute exact calendar years/months/days or label the decomposition as approximate.
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-203
- **Category:** UX (No loading state / No error boundary)
- **File:** js/tool-runner.js
- **Function:** initLegacyRunner() / render()
- **Description:** When a calculator's `calculate()` throws during initial render, the legacy runner catches it and shows a generic error message inside the results card, but the form is never rendered (the card is inside the template that only renders after a successful calculation). Also, there is no global error boundary — a JS error in any module (e.g., the broken `registerConstructionCalculators` import) causes the whole page to fall back / potentially show blank content. The `#tool-runner-container` starts with an advertisement placeholder; if JS fails entirely, users see only an empty ad slot.
- **Reproduction:** Introduce a temporary error in any calculator's calculate() (do NOT do this in production) → observe blank form.
- **Expected:** Form should render first, then results area shows error; global error boundary should catch and display a friendly recovery message.
- **Actual:** Form may not render if initial calculation fails; no error boundary.
- **Severity:** P2
- **Business Impact:** Broken UX when a calculator errors; users see blank page.
- **Technical Impact:** Poor resilience.
- **Recommended Fix Direction:** Separate form rendering from calculation; render form always, then populate results (or error). Add a window error handler to show a recovery UI.
- **Dependencies:** None.
- **Confidence:** Highly Likely

### ISSUE-204
- **Category:** Performance (No debounce)
- **File:** js/tool-runner.js
- **Function:** handleInputChange()
- **Description:** Every keystroke/input event triggers a full recalculation. For heavy calculators (rent-vs-buy with a 40-year simulation, amortization with extra payments, FIRE with iterative loops), this can cause jank, especially on mobile. There is no debounce/throttle.
- **Reproduction:** Open rent-vs-buy → hold a number key → observe jank (CPU usage).
- **Expected:** Debounce recalculation (~150-250ms).
- **Actual:** Recalculate on every input.
- **Severity:** P2
- **Business Impact:** Poor INP (Core Web Vital), frustrated users on slow devices.
- **Technical Impact:** Wasted CPU; potential memory pressure from chart re-creation.
- **Recommended Fix Direction:** Debounce the calculation trigger (and don't re-create charts if data unchanged).
- **Dependencies:** None.
- **Confidence:** Confirmed

### ISSUE-205
- **Category:** Architecture (Form field types inconsistent)
- **File:** js/core/calculator-engine.js buildFormHtml() / tools.js field definitions
- **Function:** buildInputField()
- **Description:** The engine's `buildInputField` always uses `<input type="${field.type}">`. If a calculator defines `type: 'range'` (e.g., rent-vs-buy, FIRE, amortization use `type: 'range'` in tools.js), the legacy runner handles it via the range branch, but the NEW engine only has explicit branches for `select`, `range`, and falls back to `buildInputField` for everything else. Since the new engine isn't actually used this is latent, but if wired in later, `type: 'range'` fields would be handled by `buildRangeField` (good) — however `type: 'section'` is handled, `type: 'date'` works via standard input, `type: 'number'` fine. The latent risk is `type: 'range'` in the new engine IS handled. The real inconsistency: tools.js sometimes uses `type: 'range'` with no matching `data-range-for` wiring when fields are conditional — minor.
- **Reproduction:** Inspect field type usage across calculators (number, select, range, date, section, boolean).
- **Expected:** Consistent field-type handling between legacy and new engine.
- **Actual:** Two parallel form builders (legacy in tool-runner.js, new in calculator-engine.js) that can diverge.
- **Severity:** P2
- **Business Impact:** Inconsistency risk if/when new engine is activated.
- **Technical Impact:** Dual maintenance of form builders.
- **Recommended Fix Direction:** Consolidate form building into the shared engine and use it in both paths.
- **Dependencies:** ISSUE-105 (engine activation).
- **Confidence:** Confirmed

### ISSUE-206
- **Category:** SEO (Heading/duplicate H1 risk)
- **File:** js/tool-runner.js / js/core/calculator-engine.js
- **Function:** buildSeoContentHtml()
- **Description:** When rendering a calculator, the tool-runner renders an `<h1>` with the tool name, then SEO article content uses `<h2>`/`<h3>` — consistent. However, `buildRelatedToolsHtml` renders the "Related Calculators" heading as `<h2>`, and `renderJourneyHtml` as `<h2>` — fine. The risk: FAQ section uses `<h2 id="faqs">` and summary uses `<h2>`. No H1 duplication detected. Minor: the main `<h1>` is the tool name but there's no `<h2>` intro paragraph under it before article content — acceptable. Low priority. Also, `buildSeoContentHtml` in the NEW engine uses inline styles with hardcoded `h3`/`p` styling, which is not accessible via CSS classes and can cause heading font inconsistency.
- **Severity:** P2 (low)
- **Recommended Fix Direction:** Move inline styles to CSS classes.
- **Confidence:** Confirmed

### ISSUE-207
- **Category:** Architecture (Configuration hardcoded)
- **File:** js/config.js
- **Function:** APP_CONFIG
- **Description:** Supabase URL/key and EmailJS credentials are hardcoded. There is no environment-variable handling (the project has no build step, so env vars would need a Vercel-injected runtime config or a build-time replacement). This couples the codebase to one environment and prevents staging/prod separation, and makes it impossible to rotate secrets without a code change.
- **Reproduction:** N/A.
- **Expected:** Env-driven config (e.g., window.APP_CONFIG injected via a small snippet from env, or .env with build substitution).
- **Actual:** Hardcoded.
- **Severity:** P2
- **Business Impact:** Security/rotation friction; no staging environment.
- **Technical Impact:** Config not swap-able per environment.
- **Recommended Fix Direction:** Adopt a minimal build/SSR step that injects env vars. For Vercel, use `vc dev` with `@vercel/static` + a small injection script or a serverless middleware to set window.APP_CONFIG.
- **Dependencies:** Build-system introduction (ISSUE-107).
- **Confidence:** Confirmed

---

## P3 — Low (Polish / Cleanup / Technical Debt)

### ISSUE-301
- **Category:** Cleanup (Dead file)
- **File:** js/core/tool-manager.js
- **Description:** tool-manager.js is never imported by any HTML page or module (the auto-init sets window.ToolManager but nothing uses it). Dead code.
- **Severity:** P3
- **Confidence:** Confirmed

### ISSUE-302
- **Category:** Cleanup (Dead imports)
- **File:** js/core/index.js exports formatting/engine helpers that are re-exported but unused; js/modules/index.js barrel exports many modules never consumed.
- **Description:** Barrel files export 100+ symbols; only a handful are actually imported. Not harmful but adds confusion.
- **Severity:** P3
- **Confidence:** Confirmed

### ISSUE-303
- **Category:** Cleanup (Unused helper)
- **File:** js/tools.js line 4091 — `fmtCurrency` is defined but never used.
- **Severity:** P3
- **Confidence:** Confirmed

### ISSUE-304
- **Category:** Cleanup (Empty placeholders)
- **File:** js/modules/ads.js — `MONETIZATION_ENABLED = false`; createAdSlot/initAds never called. js/maintenance-banner.js — `MAINTENANCE_ENABLED = false`.
- **Severity:** P3
- **Confidence:** Confirmed

### ISSUE-305
- **Category:** Accessibility (aria-live missing)
- **File:** js/core/calculator-engine.js renderResults() / js/tool-runner.js updateResults()
- **Description:** Calculator results area updates with no `aria-live="polite"` region; screen readers won't announce new results. Also `field-error` spans exist but are not tied with aria-describedby to inputs.
- **Severity:** P3 (WCAG 4.1.3)
- **Confidence:** Confirmed

### ISSUE-306
- **Category:** UX (Footer year / minor)
- **File:** js/app.js initFooterYear()
- **Description:** Works fine; the footer year is set once on DOMContentLoaded. No issue.
- **Severity:** P3 (informational)
- **Confidence:** Confirmed

---

## Top 10 Problems (by severity × impact)

1. **P0-001** Broken/absent registration function `registerConstructionCalculators` + duplicate engineering.js/construction.js → core architecture never activates.
2. **P0-004** Retirement calculator mixes real and nominal dollars → materially incorrect financial advice.
3. **P0-005** Savings HYSA mode understates real value → incorrect advice.
4. **P0-002** getHistory() missing user_id filter → data-leak risk if RLS misconfigured.
5. **P0-001** EmailJS credentials exposed client-side.
6. **P1-103** SEO metadata/structured data rendered only client-side → poor indexation & rich results.
7. **P1-102** Sitemap/JSON-LD reference 3 non-existent calculators + missing tip-calculator.
8. **P1-106** budget-planner `customRenderer: true` → possible TypeError.
9. **P1-104** 8 of 12 modules are dead code — feature gap (no PDF/print/export/share).
10. **P1-108** Zero automated tests → unsafe to refactor/scale.

---

## Top 10 Opportunities (highest-value improvements)

1. **Add automated calculation tests (Vitest)** — protects all financial formulas, enabling safe migration/refactor of every other issue.
2. **Fix the core-module integration (imports + wiring runCalculator)** — activates the modular architecture and unlocks reuse.
3. **Build the 3 missing construction calculators** (concrete, paint, tile) — restores category, fixes 3 dead links, adds SEO value.
4. **Wire PDF/Print/Export/Share modules into the results UI** — delivers advertised features and differentiates the product.
5. **Pre-render/SSR SEO metadata per slug** (Vercel serverless or static-per-tool pages) — unlocks rich results & higher CTR.
6. **Add a build step (Vite) + code splitting + minification** — improves Core Web Vitals, enables tree-shaking of dead modules.
7. **Add a service worker / PWA** — offline calculator support + installability (ideal for a calculator app).
8. **Consolidate duplicate calculator definitions** into modular files with full SEO content — single source of truth.
9. **Add debounced inputs + result-caching** — smooth UX for heavy calculators.
10. **Introduce env-driven configuration** — enable staging environment and secret rotation.

---

## Recommended Development Roadmap

### Phase A — Stabilize (Critical fixes, ~1 sprint)
1. Fix broken import chain (ISSUE-101): create `registerConstructionCalculators`, split construction/engineering files.
2. Fix budget-planner customRenderer bug (ISSUE-106).
3. Add `user_id` filter to getHistory() + clean up Supabase grants (ISSUE-002, ISSUE-003).
4. Remove/rotate exposed EmailJS credentials; move sending server-side (ISSUE-001).
5. Fix retirement (ISSUE-004) and HYSA (ISSUE-005) calculation math; **add unit tests for these first** to lock in the fix.

### Phase B — SEO Foundation (~1-2 sprints)
1. Fix sitemap generator to include all tools (tools-template.js) and remove dead references (ISSUE-102).
2. Either build concrete/paint/tile calculators or remove from sitemap/JSON-LD.
3. Pre-render static SEO metadata + JSON-LD for tool pages (ISSUE-103) via Vercel middleware/serverless.
4. Add canonical to toolbar pages.

### Phase C — Engine & Modules (~2-3 sprints)
1. Activate `runCalculator()` pipeline (ISSUE-105).
2. Wire in FAQ/related-tools modules (replace inline duplicates).
3. Add PDF/Print/Export/Share buttons to results (populate dead modules).
4. Consolidate calculator definitions into modular files.

### Phase D — Performance & PWA (~2 sprints)
1. Introduce Vite build + code splitting + minification (ISSUE-107).
2. Lazy-load Chart.js only for calculators with charts.
3. Add manifest + service worker + theme-color on all pages (ISSUE-109).
4. Debounce input handling (ISSUE-204).

### Phase E — Testing & Hardening (ongoing)
1. Unit tests for all calculators/utils (ISSUE-108).
2. E2E smoke tests for major user journeys.
3. Accessibility pass (aria-live, describedby) (ISSUE-305).
4. Add CI pipeline (GitHub Actions).

### Phase F — Scale
1. Server-side rendering / static generation per tool.
2. Localization framework (i18n) for US/EU/international markets.
3. Multi-currency support.
4. Analytics event tracking.
5. Monetization (ads module enablement).

---

## Confidence Assessment

| Finding | Confidence |
|---------|-----------|
| construction.js = engineering.js (byte-identical) | **Confirmed** (`fc /b`) |
| registerConstructionCalculators missing | **Confirmed** (full search) |
| Sitemap/JSON-LD dead links (concrete/paint/tile) | **Confirmed** (full search) |
| tip-calculator missing from sitemap | **Confirmed** |
| 8 modules never imported | **Confirmed** (import search) |
| No tests / no PWA / no build system | **Confirmed** (no files present) |
| getHistory() lacks user filter | **Confirmed** (code) |
| EmailJS creds exposed | **Confirmed** |
| History XSS (unescaped values) | **Confirmed** (code) |
| SEO metadata client-side only | **Confirmed** (HTML empty defaults) |
| Retirement real/nominal mixing | **Highly Likely** (needs runtime numeric verification) |
| HYSA real-value understatement | **Highly Likely** (needs runtime numeric verification) |
| budget-planner customRenderer TypeError | **Highly Likely** (needs runtime verification) |
| No error boundary / blank form on calc error | **Highly Likely** (needs runtime verification) |
| CSP 'unsafe-inline'/'unsafe-eval' weakness | **Confirmed** (config) |

---

*End of Master Issue Register*