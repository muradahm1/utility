# GetCalcu — Phased Implementation Plan, Problems & Enhancement Suggestions

**Author:** Cline (World-Class Software Builder / SEO / UX)
**Date:** 2026-08-21
**Basis:** MASTER_ISSUE_REGISTER.md (498 lines, 5×P0, 11×P1, 7×P2, 6×P3) + AUDIT_REPORT.md (546 lines)

---

## 0. Executive Summary

GetCalcu has **excellent content foundations** (rich SEO articles, correct core formulas, clean utility layer) but suffers from four systemic problems:

1. **The new modular architecture is broken** — `construction.js` = `engineering.js` (byte-identical), `registerConstructionCalculators` doesn't exist → the entire core migration silently never activates.
2. **Financial correctness risk** — 2 calculators (retirement, HYSA) mix real/nominal dollar bases → users get materially wrong advice.
3. **SEO relies entirely on JavaScript** — no crawlable metadata/structured data → rich results likely not appearing.
4. **Zero automated tests + no build system + no PWA** — blocks safe refactoring, hurts Core Web Vitals, and forfeits installability.

The plan below breaks all 30 registered issues into **7 dependency-aware phases**, each with: goals, tasks (mapped to ISSUE IDs), enhancement suggestions, and exit criteria.

---

## 1. Problem Taxonomy (Re-categorized by Domain)

| Domain | Issues | Count | Theme |
|--------|--------|-------|-------|
| 🔒 Security / Data | #001, #002, #003, #110 | 4 | Exposed creds, missing user filter, SQL confusion, XSS |
| 🧮 Calculation Accuracy | #004, #005, #202 | 3 | Real/nominal mixing, HYSA understatement, date approx |
| 🏗 Architecture / Integration | #101, #104, #105, #201, #205, #301–#304 | 9 | Broken imports, dead modules, engine bypass, duplication |
| 🐞 Runtime Bugs | #106, #203 | 2 | customRenderer TypeError, no error boundary |
| 🔍 SEO | #102, #103, #111 | 3 | Dead links, JS-only metadata, canonical gaps |
| ⚡ Performance / PWA | #107, #109, #204 | 3 | Bundle bloat, no PWA, no debounce |
| 🧪 Testing | #108 | 1 | Zero coverage |
| ♿ Accessibility / UX | #206, #305 | 2 | aria-live gaps, inline styles |

---

## 2. The 7-Phase Roadmap

### 🔥 Phase 1 — Stabilize & Protect (Security + Calculation Accuracy)

**Goal:** Stop the bleeding. Fix everything that can cause financial harm, data leaks, or security abuse. **Estimated: 1 sprint (1–2 weeks)**

| # | Task | Issue ID | Enhancement Suggestion |
|---|------|----------|----------------------|
| 1.1 | Add **test-first** unit tests (Vitest) for retirement & HYSA math **before** changing the formulas — lock in the bug as a failing test, then fix | #004, #005, #108 (partial) | Extract pure functions (`projectRetirement`, `computeHysaRealValue`) into `js/utils/finance.js` so they're testable and reusable; then port to other calculators |
| 1.2 | Fix **retirement calculator**: pick one dollar basis. Recommend: **project everything in nominal dollars** (contributions grow nominally; target = desired income inflated × 25) — or convert target to real dollars by dividing by inflation factor. Show BOTH "today's dollars" and "future dollars" columns so users understand the basis | #004 | Add a small explainer tooltip: "Projections shown in __ dollars (inflation-adjusted / future)" — great for trust and SEO? No — for UX trust |
| 1.3 | Fix **HYSA real-yield**: discount each contribution period individually (per-period real FV), or clearly label as approximation and add "why this differs" note | #005 | Add a per-year contribution table so users see the year-by-year real value — turns a math fix into a UX win |
| 1.4 | Add `.eq('user_id', user.id)` to `getHistory()` + verify RLS policies in live project | #002 | Also add `.select('id, tool_slug, inputs, results, created_at')` whitelisting (don't fetch unnecessary columns) |
| 1.5 | Clean up Supabase grants: single `revoke insert on public.calculations from anon;` — remove the contradictory re-grant | #003 | Document the final permission model in supabase-schema.sql header comment |
| 1.6 | **Rotate EmailJS credentials** immediately; move email sending to a **Vercel serverless function** (`/api/contact.js`) that holds creds server-side | #001 | Serverless route also enables: rate-limiting, honeypot spam field, sanitization, and a success/failure logger — better than EmailJS direct from browser |
| 1.7 | Fix history XSS: wrap all `${v}` renderings with existing `escapeHtml()` | #110 | Add a small `renderSafeChips` helper; later move to a render-function approach |

**🎯 Exit criteria:** Retirement & HYSA match independently computed spreadsheet math; `getHistory()` request shows `user_id` filter in DevTools; no EmailJS keys in client bundle; a security scan shows no innerHTML with unescaped user data.

---

### 🏗 Phase 2 — Repair the Architecture Core

**Goal:** Make the modular architecture actually load. Unblock everything downstream. **Estimated: 1 sprint**

| # | Task | Issue ID | Enhancement Suggestion |
|---|------|----------|----------------------|
| 2.1 | Rewrite `js/calculators/construction.js` with **real construction calculators** (concrete, paint, tile) + export `registerConstructionCalculators` | #101, #102 (partial) | Mirror the rich content style of legacy calculators (article, howTo, examples, FAQs) — this simultaneously fixes 3 dead sitemap links |
| 2.2 | Strip `construction.js` to construction-only; ensure `engineering.js` has engineering-only calculators; dedupe shared helpers into `js/utils/` | #101, #201 | Create a shared `js/calculators/_common.js` for `errorResult`, `safeNum`, `fmt` so all calculator files import rather than redefine |
| 2.3 | Fix `core/index.js` + `core/migration.js` imports; add a **module-level try/catch** so one broken module can't kill the whole page | #101 | Add a `safeImport()` helper with console.error + fallback — resilience over brittleness |
| 2.4 | Fix `budget-planner` `customRenderer: true` → wire to `renderBudgetPlanner` | #106 | Add a defensive check in tool-runner: `typeof tool.customRenderer === 'function'` (protects against future booleans) |
| 2.5 | Add **runtime verification** (console + automated smoke) that the new architecture activates (`useNewArchitecture === true`) | #101, #105 | Add a `window.__GETCALCU_ARCH__` debug flag: 'core' | 'legacy' | 'hybrid' — invaluable for support/debugging |

**🎯 Exit criteria:** No console errors on tool.html load; `registerConstructionCalculators` exists and registers 3 construction calculators; construction category renders.

---

### 🧪 Phase 3 — Test Coverage Foundation

**Goal:** Build the safety net that makes every subsequent phase safe. **Estimated: 1–2 sprints**

| # | Task | Issue ID | Enhancement Suggestion |
|---|------|----------|----------------------|
| 3.1 | Set up **Vitest + jsdom**, npm scripts (`test`, `test:watch`), GitHub Actions CI | #108 | CI runs: `lint` → `test` → `build` → (optional) Lighthouse CI budget check |
| 3.2 | Unit tests for **all 18 legacy + 3 modular + tip calculators' `calculate()`** — golden values from an independent spreadsheet | #108 | Build a `test/fixtures/expected.json` of known-good inputs→outputs; regenerate with an audited reference implementation |
| 3.3 | Unit tests for `js/utils/math.js`, `currency.js`, `date.js` edge cases (zero rates, negatives, large numbers, NaN/Infinity) | #108 | Property-based testing (fast-check) for compound interest: FV must be ≥ PV for positive rates |
| 3.4 | Integration tests for tool-runner: slug resolution, not-found path, render + recalc flow | #108 | Mock `window.TOOLS`; assert DOM structure contract (form renders before results) |
| 3.5 | E2E smoke (Playwright): load homepage, navigate to a calculator, change input, see updated result; history flow with mocked Supabase | #108 | 5–8 critical journeys; run nightly + on PR |

**🎯 Exit criteria:** `npm test` green; every calculator has ≥3 golden-value tests; CI blocks merges on failure.

---

### 🔍 Phase 4 — SEO Foundation (Crawlability + Structured Data)

**Goal:** Make every tool page indexable without JavaScript; remove dead links; unlock rich results. **Estimated: 1–2 sprints**

| # | Task | Issue ID | Enhancement Suggestion |
|---|------|----------|----------------------|
| 4.1 | Fix sitemap: add `tip-calculator`; remove or build concrete/paint/tile (Phase 2 builds them) | #102 | Switch `generate-sitemap.js` to consume a **single tool registry** (the source of truth) instead of parsing files — one source, no drift |
| 4.2 | Pre-render SEO metadata per slug. Two options: (a) **build-time static generation** of `/tool/{slug}.html` pages (best SEO), or (b) Vercel middleware/serverless that injects title/description/canonical/JSON-LD per slug | #103, #111 | Prefer (a) static per-tool pages that load the same tool.html SPA shell — gives you real URLs (`/tool/mortgage-calculator`) and no JS dependency for metadata |
| 4.3 | Move structured data (SoftwareApplication, BreadcrumbList, FAQPage, TechArticle) into the **static HTML** of each tool page | #103 | Generate FAQ JSON-LD from the same FAQ data used for UI — single source, always in sync |
| 4.4 | Fix homepage ItemList JSON-LD to reference only existing calculators; add tip-calculator | #102 | Sort by category; add `position` correctness; validate with Google Rich Results Test in CI |
| 4.5 | Add canonical to every indexable page; keep noindex on auth/history/contact-confirmation | #111 | Add a `noindex` rule in robots.txt for `/?category=` parameter URLs to prevent param duplication |
| 4.6 | **Enhancement:** Add a `<noscript>` fallback block in tool.html listing the tool name + basic description + link to calculators index — protects users and crawlers with JS off | #103 | Cheap insurance; also satisfies "no-JS UX" |
| 4.7 | **Enhancement (SEO):** Add `WebSite` SearchAction already present ✅; add **Organization** schema (logo, social profiles, contact) on homepage | — | Few lines of JSON-LD, unlocks brand SERP real estate |
| 4.8 | **Enhancement (SEO):** Add `lastmod` and per-URL `changefreq` hint in sitemap; submit to Google Search Console with the new static URLs | #102 | Use git commit date as `lastmod` smartly via the build |

**🎯 Exit criteria:** `curl` (no JS) any `/tool/{slug}` returns unique title/description/canonical + JSON-LD; sitemap has zero dead URLs; Rich Results Test shows FAQ & Breadcrumb rich results.

---

### ⚡ Phase 5 — Performance, PWA & UX Polish

**Goal:** Core Web Vitals green, installable offline app, smooth interactions. **Estimated: 2 sprints**

| # | Task | Issue ID | Enhancement Suggestion |
|---|------|----------|----------------------|
| 5.1 | Introduce **Vite build** with per-route code splitting; 327KB tools.js becomes per-calculator chunks | #107 | Use Vite's `input` for each tool page OR dynamic `import()` of calculator modules; target initial JS < 100KB gzipped |
| 5.2 | Lazy-load **Chart.js** only when a calculator declares a chart; defer tools.js with `defer`; add `preload` for critical CSS | #107 | ChartManager already abstracts charts — add `chart: true` flag to calculator metadata (already exists for many) and conditionally load |
| 5.3 | **Debounce** recalculation (~200ms) + skip chart re-render when data unchanged | #204 | Add result-caching keyed by input hash; only animate chart on first paint |
| 5.4 | Add **error boundary** (window `error`/`unhandledrejection` handler) with friendly recovery UI + "Report a problem" button | #203 | Render form first, then results region (decouple); errors go into a visible status area, never blank page |
| 5.5 | Add **loading state** skeleton for the tool container (instead of blank ad slot) | #203 | Instant skeleton = perceived performance boost |
| 5.6 | Add **PWA**: `manifest.json` (name, icons, theme-color), service worker (cache-first static, network-first API), register on all pages | #109 | Add `theme-color` meta to all HTML pages; generate icons from favicon at 192/512/512-maskable |
| 5.7 | Add `theme-color` to about/contact/privacy/terms/cookie-policy/history/auth | #109 | Match dark-mode theme-color via JS when toggled |
| 5.8 | **Enhancement (UX):** Add "Reset", "Save" (auth), and keyboard-friendly `Enter`=recalculate on all calculators | — | Small touches, big trust delta |
| 5.9 | **Enhancement (UX):** Add share-friendly result URL (encode inputs in hash `#input=...`) so users can bookmark/share exact scenarios | #110 pattern | Cheap, high-value: "share my mortgage scenario" |
| 5.10 | **Enhancement (Performance):** Replace Font Awesome full CSS with only the ~15 icons actually used (or inline SVGs) | #107 | ~100KB → ~5KB |

**🎯 Exit criteria:** Lighthouse performance ≥ 90 mobile; installability passes (manifest + SW + HTTPS); INP < 200ms on rent-vs-buy holding a key; no blank states on any error path.

---

### 🧩 Phase 6 — Wire the Module System (Features Users Were Promised)

**Goal:** Turn 8 dead modules into live features; differentiate the product. **Estimated: 2 sprints**

| # | Task | Issue ID | Enhancement Suggestion |
|---|------|----------|----------------------|
| 6.1 | Wire **FAQ + Related Tools modules** into tool-runner (replace inline duplicate logic) | #104 | Single source; module already exists — just call it |
| 6.2 | Add **Export (CSV/JSON), Print, PDF, Share buttons** to calculator results area | #104 | Use existing modules; place in a results toolbar; respect `navigator.share` on mobile, fallback to clipboard link |
| 6.3 | Wire **Recommendations module** into the results ("Based on your numbers…") | #104 | Start with 4 rules: retirement → savings, mortgage → amortization, BMI → net-worth, rent-vs-buy → house-affordability |
| 6.4 | Wire **Tables module** for amortization/schedule-style outputs (sticky header, sortable, copy-to-clipboard) | #104 | Turns a static table into a tool |
| 6.5 | Consolidate duplicate calculator definitions (mortgage/loan/BMI) into modular files **with full SEO content**; keep tools.js as fallback only | #201 | After Phase 3 tests pass, migration is safe; single source of truth per calculator |
| 6.6 | Activate **`runCalculator()` pipeline** (normalize → validate → calculate → structured result) for calculators that opt in; legacy remains fallback | #105 | Add `engine: 'core'` metadata flag per calculator; migrate one category at a time with tests green |
| 6.7 | **Enhancement (UX):** Per-calculator "What does this mean?" info popovers on key result metrics | — | Educational UX → longer sessions → better engagement signals |
| 6.8 | **Enhancement (UX):** Add calculation timestamp + "inputs used" summary above results (record of what was computed) | — | Trust + share-readiness |
| 6.9 | **Enhancement (SEO):** Add `HowTo` schema to step-by-step calculators (amortization, credit-card-payoff) | — | Eligible for HowTo rich results; another SERP surface |

**🎯 Exit criteria:** Every calculator results card has Export/Print/PDF/Share; FAQ & related-tools come from modules; zero duplicate definitions; at least 50% of calculators run through the core engine.

---

### 🧹 Phase 7 — Hardening, Cleanup & Scale-Ready

**Goal:** Remove debt, make accessibility airtight, prepare for international scale. **Estimated: ongoing / 1 sprint per wave**

| # | Task | Issue ID | Enhancement Suggestion |
|---|------|----------|----------------------|
| 7.1 | Remove dead code: `tool-manager.js`, unused barrel exports, `fmtCurrency` in tools.js, ads/maintenance placeholders (or gate behind build flag) | #301–#304 | Keep ads.js as a **build-integrated** module (tree-shaken out when `MONETIZATION_ENABLED=false`) rather than a dead file |
| 7.2 | Accessibility: add `aria-live="polite"` on results region; `aria-describedby` linking inputs ↔ errors; focus management after recalc | #305, #206 | Move inline styles in `buildSeoContentHtml` to CSS classes (`.seo-article h3`, `.seo-article p`) for consistent typography |
| 7.3 | Move inline JS-generated styles to CSS classes across engine outputs | #206 | Slash DOM size; enables CSS caching & dark-mode overrides |
| 7.4 | **Enhancement (Scale):** Localization (i18n) framework — start with content strings dictionary, `lang` attribute, hreflang for future /de /fr /es | — | Architecture decision now saves huge rework later; all calculator content is currently hardcoded English |
| 7.5 | **Enhancement (Scale):** Multi-currency support — introduce `CURRENCY` locale in utils; format according to Intl.NumberFormat; persist user preference | — | Calculator platform for "US, Europe, international" must show €/£/KSh etc. |
| 7.6 | **Enhancement (Scale):** Analytics event tracking (calculator viewed, calculated, exported, shared) via GA4 dataLayer | — | Data-driven roadmap: know which calculators to expand |
| 7.7 | **Enhancement (Scale):** Add "How-to guides" content hub (blog-style pages) interlinked with calculators | — | Top-of-funnel SEO beyond tool pages; internal linking boosts tool rankings |
| 7.8 | **Enhancement (Scale):** Accept `?slug=` AND `/tool/{slug}/` Pretty URL support in vercel.json rewrites | — | Cleaner shareable URLs; can later 301 legacy query URLs to pretty ones |
| 7.9 | **Enhancement (Scale):** Rate-limit-like protection for Supabase history writes (client-side max 50/day) + server policy cap | #002 | Defense in depth beyond RLS |

**🎯 Exit criteria:** No dead files in JS tree; axe/Lighthouse accessibility ≥ 95; i18n dictionary present; multi-currency util tested; GA4 events firing.

---

## 3. Sequence Rationale (Why This Order)

```
Phase 1  ──►  Phase 3  ──►  Phase 5
    │            ▲              │
    ▼            │              ▼
Phase 2  ────────┘          Phase 6
    │                          │
    ▼                          ▼
Phase 4                    Phase 7
```

1. **Phase 1 first** — wrong financial advice and exposed credentials are active harms to users; tests added here (3.1-style "test first") protect the fix.
2. **Phase 2 next** — the architecture is broken; everything downstream (engine, modules, migration) depends on imports resolving. Also fixes 3 dead SEO links.
3. **Phase 3 early** — tests are the *safety net* for every later refactor (Phases 4–7 all touch live code). Do NOT refactor calculators without it.
4. **Phase 4 (SEO)** can run parallel to Phase 3 — they touch different files.
5. **Phase 5 after tests** — build system + perf gains are safest after CI/tests exist to catch regressions.
6. **Phase 6 after 5** — module wiring benefits from the build system (tree-shaking) and tests.
7. **Phase 7 is continuous** — cleanup happens alongside everything; scale features build on Phases 3 + 5 foundations.

---

## 4. Strategic Enhancements Beyond Bug-Fixing (The "30-Years Experience" Angle)

### SEO Strategy

| Enhancement | Why It Matters | Effort |
|-------------|---------------|--------|
| **Static per-tool URLs** (`/tool/mortgage-calculator`) with server-rendered HTML | Google indexes non-JS snapshots; CTR ↑ from accurate titles/descriptions | MEDIUM |
| **Programmatic FAQ schema** from existing FAQ data | Every calculator already has FAQs — free rich-result eligibility; ~35% of queries get rich results | LOW |
| **Internal-link hub pages** (category pages: Finance, Health, Construction) | Distributes PageRank from homepage to all tools; improves crawl depth | LOW |
| **HowTo schema** on step-based calculators | Second SERP surface; eligibility is easy since content exists | LOW |
| **Search-console-monitored** `lastmod` sitemap | Faster re-indexing after content updates | LOW |
| **Location/currency landing pages** (e.g., "Mortgage Calculator – Kenya", "… – UK") | "US + Europe + international" audience → country-specific long-tail SEO with localization (Phase 7.4) | HIGH (later) |
| **Content hub**: explainer articles interlinked to calculators | Top-funnel keywords; builds topical authority; E-E-A-T signals | MEDIUM (later) |

### UX Strategy

| Enhancement | Why It Matters | Effort |
|-------------|---------------|--------|
| **Skeletons + loading states** | Perceived performance; prevents blank-page abandons | LOW |
| **Error boundary + friendly recovery** | Trust when things break; no dead ends | LOW |
| **Debounce + result caching** | Smooth on heavy simulators; INP Core Web Vital | LOW |
| **Shareable result URLs** (`#input=...`) | Viral loop; bookmarking; "send me your scenario" cases | LOW |
| **Result explanation tooltips** ("What does this mean?") | Educational value → trust → repeat visits | MEDIUM |
| **Reset button + Enter-to-calculate** | Standard calculator UX expectations | LOW |
| **PDF/Print/Export/Share toolbar** | The features are *already built* in modules — wire them; differentiators vs. generic calculator sites | MEDIUM |
| **PWA install + offline** | Calculator apps are the #1 PWA use case; install = retention | MEDIUM |
| **Progressively-enhanced forms** (validation inline, clear error text) | Accessibility + mobile-first UX | MEDIUM |

### Platform Strategy

| Enhancement | Why It Matters | Effort |
|-------------|---------------|--------|
| **Vite build + code-splitting** | Required for scale; tree-shakes dead modules; minification | MEDIUM |
| **CI with test + build gates** | Enables one-developer-or-team scale safely; PR confidence | LOW |
| **Env-driven config** (staging/prod) | Secret rotation + testing against a sandbox Supabase | LOW |
| **Single tool registry** as source of truth | Eliminates the sitemap/migration/duplication drift forever | MEDIUM |
| **Analytics events** | Data-driven investment: which calculators to deepen/monetize | LOW |
| **Prettier + ESLint + TS-JSDoc types** on core files | Maintainability at 100-calculator scale | LOW |

---

## 5. Quick-Win Checklist (Do These This Week)

If you only have a few hours, in order of ROI:

1. ✅ Rotate the EmailJS credentials (P0-001) — 5 minutes
2. ✅ Add `.eq('user_id', user.id)` to `getHistory()` (P0-002) — 5 minutes
3. ✅ Fix the contradictory Supabase grant line (P0-003) — 5 minutes
4. ✅ Fix `budget-planner` customRenderer (P1-106) — 10 minutes
5. ✅ Wrap history `${v}` in `escapeHtml()` (P1-110) — 15 minutes
6. ✅ Add `tip-calculator` to sitemap + remove 3 dead links (P1-102) — 20 minutes
7. ✅ Add `aria-live="polite"` to results region (P3-305) — 5 minutes
8. ✅ Debounce input handling (P2-204) — 30 minutes
9. ✅ Add error-boundary window handler (P2-203) — 30 minutes
10. ✅ Fix retirement + HYSA math with tests-first (P0-004/005) — 4 hours

---

## 6. Success Metrics to Track Per Phase

| Phase | Metric |
|-------|--------|
| Phase 1 | $0 wrong-advice incidents (validated sample scenarios) · no creds in client bundle · audit clean |
| Phase 2 | 100% of tool.html loads free of console errors · construction category live |
| Phase 3 | ≥ 60 tests green · CI blocks bad merges |
| Phase 4 | Google Search Console: indexed tool pages ↑, crawled 404s ↓ to 0 · rich results detected |
| Phase 5 | LH Performance ≥ 90 · PWA installable · INP < 200ms |
| Phase 6 | 100% calculators have export/print/PDF/share · 0 duplicate definitions |
| Phase 7 | axe score ≥ 95 · GA4 events live · i18n dictionary in place |

---

*End of Phased Implementation Plan — ready for review and execution.*