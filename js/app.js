document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSearchModal();
    initHeroSearch();
    initActiveNav();
    initCategoryPage();
    initMobileNav();
    initAuthUI();
    initFooterYear();
    initQuickNav();
    initBackToTop();
});

// ── Footer Year ────────────────────────────────────────────────
function initFooterYear() {
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// Quick navigation: home shortcut for non-home pages
function initQuickNav() {
    const header = document.querySelector('.top-header');
    if (!header) return;

    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html';
    if (isHomePage) return;

    let btn = document.getElementById('home-nav-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'home-nav-btn';
        btn.className = 'home-nav-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Go to home');
        btn.innerHTML = '<i class="fa-solid fa-house"></i><span>Home</span>';
        btn.addEventListener('click', () => {
            window.location.href = '/';
        });

        const hamburger = header.querySelector('.hamburger-btn');
        if (hamburger) {
            header.insertBefore(btn, hamburger);
        } else {
            header.prepend(btn);
        }
    }
}

// Floating back-to-top button
function initBackToTop() {
    let btn = document.getElementById('back-to-top-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'back-to-top-btn';
        btn.className = 'back-to-top-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.body.appendChild(btn);
    }

    const toggleVisibility = () => {
        btn.classList.toggle('visible', window.scrollY > 480);
    };

    toggleVisibility();
    window.addEventListener('scroll', toggleVisibility, { passive: true });
}

// Category Page Rendering (supports /category/:slug and ?category=:slug)
function initCategoryPage() {
    const path = window.location.pathname;
    const catMatch = path.match(/^\/category\/([a-z0-9-]+)\/?$/);
    const params = new URLSearchParams(window.location.search);
    const category = catMatch ? catMatch[1] : params.get('category');
    if (!category) return;

    // Hide homepage-only sections if rendered dynamically on index
    const hero = document.getElementById('hero-section');
    const categoriesSection = document.getElementById('all-categories');
    if (hero) hero.style.display = 'none';
    if (categoriesSection) categoriesSection.style.display = 'none';

    const toolsSection = document.getElementById('all-tools');
    if (!toolsSection) return;

    // Update section title and hide the view-all link
    const titleEl = toolsSection.querySelector('.section-header h2');
    if (titleEl) {
        titleEl.textContent = category.charAt(0).toUpperCase() + category.slice(1) + ' Tools';
    }
    const viewLink = toolsSection.querySelector('.view-link');
    if (viewLink) viewLink.style.display = 'none';

    // If pre-rendered content is already present, don't overwrite unless empty
    const grid = toolsSection.querySelector('.tools-grid');
    if (!grid) return;

    // Filter tools by category (case-insensitive)
    let filteredTools = [];
    if (typeof TOOLS !== 'undefined') {
        filteredTools = Object.entries(TOOLS)
            .filter(([slug, tool]) => (tool.category || '').toLowerCase() === category.toLowerCase())
            .map(([slug, tool]) => ({ slug, ...tool }));
    }

    if (filteredTools.length === 0 && !grid.children.length) {
        grid.innerHTML = `
            <div class="tool-not-found" style="grid-column: 1 / -1;">
                <div class="not-found-icon" style="background:rgba(99,102,241,0.1); color:var(--primary-color);">
                    <i class="fa-solid fa-folder-open"></i>
                </div>
                <h2>We haven't added any ${category.charAt(0).toUpperCase() + category.slice(1)} tools just yet!</h2>
                <p>Check back soon.</p>
            </div>
        `;
    } else if (filteredTools.length > 0 && !grid.querySelector('.tool-card')) {
        grid.innerHTML = filteredTools.map(tool => `
            <a href="/tool/${tool.slug}" class="tool-card">
                <div class="tool-icon ${tool.iconClass || ''}"><i class="fa-solid ${tool.icon || 'fa-calculator'}"></i></div>
                <h3>${tool.name}</h3>
                <p>${tool.description || ''}</p>
                <span class="tag ${tool.tagClass || 'tag-finance'}">${tool.category}</span>
            </a>
        `).join('');
    }
}

// Theme Management Engine
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeColor(savedTheme);

    const themeSwitch = document.getElementById('theme-toggle-switch');
    if (themeSwitch) {
        themeSwitch.checked = savedTheme === 'dark';
        themeSwitch.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            updateThemeColor(theme);
        });
    }

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        updateThemeIcon(themeBtn, savedTheme);
        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            updateThemeIcon(themeBtn, next);
            updateThemeColor(next);
        });
    }
}

function updateThemeColor(theme) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#0F172A' : '#6366F1');
    }
}

function updateThemeIcon(btn, theme) {
    const icon = btn.querySelector('i');
    if (!icon) return;
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// Hero Search — opens modal and pre-fills query
function initHeroSearch() {
    const input = document.getElementById('hero-search-input');
    const btn = document.getElementById('hero-search-btn');
    if (!input && !btn) return;

    function triggerSearch() {
        const modal = document.getElementById('search-modal');
        const searchField = document.getElementById('modal-search-field');
        if (!modal || !searchField) return;
        modal.classList.remove('hidden');
        searchField.value = input ? input.value : '';
        searchField.dispatchEvent(new Event('input'));
        searchField.focus();
    }

    if (btn) btn.addEventListener('click', triggerSearch);
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') triggerSearch(); });
}

// Active Nav State
function initActiveNav() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    
    // Resolve active category
    let activeCategory = categoryParam;
    const catMatch = path.match(/^\/category\/([a-z0-9-]+)$/);
    if (catMatch) {
        activeCategory = catMatch[1];
    } else {
        const toolMatch = path.match(/^\/tool\/([a-z0-9-]+)$/);
        const slug = toolMatch ? toolMatch[1] : params.get('slug');
        if (slug && typeof TOOLS !== 'undefined' && TOOLS[slug]) {
            activeCategory = (TOOLS[slug].category || '').toLowerCase();
        }
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        if (!href) return;
        
        const itemUrl = new URL(href, window.location.origin);
        const itemPath = itemUrl.pathname.replace(/\/$/, '') || '/';
        const itemCategory = itemPath.match(/^\/category\/([a-z0-9-]+)$/)?.[1] 
            || new URLSearchParams(itemUrl.search).get('category');

        if (activeCategory && itemCategory && itemCategory.toLowerCase() === activeCategory.toLowerCase()) {
            item.classList.add('active');
        } else if (!activeCategory && path === '/' && itemPath === '/') {
            item.classList.add('active');
        } else if (path === itemPath && !activeCategory) {
            item.classList.add('active');
        }
    });
}

// Mobile Navigation
function initMobileNav() {
    const btn = document.getElementById('hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!btn || !sidebar) return;

    function openNav() {
        sidebar.classList.add('open');
        overlay && overlay.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
        btn.querySelector('i').className = 'fa-solid fa-xmark';
    }
    function closeNav() {
        sidebar.classList.remove('open');
        overlay && overlay.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
        btn.querySelector('i').className = 'fa-solid fa-bars';
    }

    btn.addEventListener('click', () => sidebar.classList.contains('open') ? closeNav() : openNav());
    overlay && overlay.addEventListener('click', closeNav);
    // Close on nav link tap on mobile
    sidebar.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', closeNav));
}

// Auth UI — header slot + history nav visibility
function initAuthUI() {
    if (typeof onAuthChange !== 'function') return;
    const slot = document.getElementById('auth-header-slot');
    const historyNav = document.querySelector('.nav-item.auth-only');
    const promoCard  = document.getElementById('sidebar-promo');

    onAuthChange(async (session) => {
        if (!slot) return;
        if (session) {
            const name = session.user.user_metadata?.full_name
                || session.user.email.split('@')[0];
            slot.innerHTML = `
                <div class="auth-user-menu">
                    <span class="auth-user-name">${name}</span>
                    <button class="btn btn-outline btn-sm" id="signout-btn">Sign out</button>
                </div>`;
            document.getElementById('signout-btn').addEventListener('click', async () => {
                await signOut();
                location.reload();
            });
            if (historyNav) historyNav.classList.remove('hidden');
            if (promoCard)  promoCard.style.display = 'none';
        } else {
            slot.innerHTML = `<a href="/auth" class="btn btn-primary btn-pill">Sign in</a>`;
            if (historyNav) historyNav.classList.add('hidden');
            if (promoCard)  promoCard.style.display = '';
        }
    });
}

// Global Search Overlay Logic
function initSearchModal() {
    const trigger = document.getElementById('cmd-k-trigger');
    const modal = document.getElementById('search-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const searchField = document.getElementById('modal-search-field');
    const resultsContainer = document.getElementById('search-results');

    const SYNONYMS = {
        'mortgage-calculator': ['piti', 'home loan', 'house payment', 'housing loan', 'property tax', 'down payment'],
        'auto-loan-calculator': ['car payment', 'car loan', 'vehicle financing', 'auto financing', 'trade in', 'car interest'],
        'salary-calculator': ['paycheck', 'take home pay', 'net salary', 'gross to net', 'income tax', 'fica', 'w2', 'hourly to salary', 'wage'],
        'tdee-calculator': ['bmr', 'daily calories', 'calorie deficit', 'macros', 'weight loss calories', 'macro split', 'maintenance calories'],
        'unit-converter': ['convert units', 'metric to imperial', 'inches to cm', 'kg to lbs', 'celsius to fahrenheit', 'gallons to liters', 'miles to km', 'grams to ounces', 'mb to gb'],
        'bmi-calculator': ['body mass index', 'weight category', 'overweight', 'healthy weight', 'obese'],
        'percentage-calculator': ['percent change', 'discount', 'percent of', 'percentage increase', 'percentage decrease'],
        'compound-interest-calculator': ['compound growth', 'interest growth', 'savings interest', 'hysa', 'future value'],
        'investment-calculator': ['stock growth', 'portfolio return', 'compound return', 'roth ira', 'reach 1m'],
        'retirement-calculator': ['nest egg', 'pension', '401k target', '4 percent rule', 'retirement age'],
        'credit-card-payoff-calculator': ['debt snowball', 'debt avalanche', 'credit card interest', 'payoff date', 'debt free'],
        'rent-vs-buy-calculator': ['buying vs renting', 'rent or buy', 'home equity vs rent', 'homeownership'],
        'tip-calculator': ['split bill', 'gratuity', 'restaurant tip', 'bill per person'],
        'concrete-calculator': ['cement', 'slab volume', 'concrete yards', 'bags of concrete'],
        'paint-calculator': ['paint gallons', 'room paint', 'wall area paint', 'coats of paint'],
        'tile-calculator': ['floor tile', 'bathroom tile', 'tile boxes', 'tile square feet'],
        'ohms-law-calculator': ['voltage', 'current', 'resistance', 'amperes', 'watts'],
        'beam-deflection-calculator': ['structural beam', 'bending stress', 'moment of inertia'],
        'currency-converter': ['exchange rate', 'usd to eur', 'usd to gbp', 'forex', 'convert money'],
        'net-worth-calculator': ['assets liabilities', 'wealth tracker', 'financial net worth'],
        'fire-calculator': ['financial independence', 'retire early', 'fire number', 'lean fire', 'fat fire'],
        'amortization-calculator': ['loan schedule', 'principal interest split', 'amortization table'],
        'house-affordability-calculator': ['how much house can i afford', 'max home price', 'debt to income', 'dti'],
        'inflation-calculator': ['purchasing power', 'inflation rate', 'future cost of living'],
        'date-calculator': ['days between dates', 'time duration', 'business days'],
        'loan-calculator': ['personal loan', 'bank loan', 'loan payments']
    };

    // Build search list from TOOLS registry
    const toolList = typeof TOOLS !== 'undefined'
        ? Object.entries(TOOLS).map(([slug, t]) => ({
            name: t.name,
            slug,
            cat: t.category,
            desc: t.description || '',
            synonyms: SYNONYMS[slug] || []
        }))
        : [];

    let selectedIndex = -1;

    function renderDefaultState() {
        if (!resultsContainer) return;
        const popular = [
            { name: 'Mortgage Calculator', slug: 'mortgage-calculator', cat: 'Finance' },
            { name: 'Auto Loan Calculator', slug: 'auto-loan-calculator', cat: 'Finance' },
            { name: 'Salary & Paycheck Calculator', slug: 'salary-calculator', cat: 'Finance' },
            { name: 'TDEE & Calorie Calculator', slug: 'tdee-calculator', cat: 'Health' },
            { name: 'Universal Unit Converter', slug: 'unit-converter', cat: 'Math' },
            { name: 'BMI Calculator', slug: 'bmi-calculator', cat: 'Health' },
            { name: 'Compound Interest Calculator', slug: 'compound-interest-calculator', cat: 'Finance' }
        ];

        resultsContainer.innerHTML = `
            <div style="padding:10px 14px;font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Popular Calculators</div>
            ${popular.map(p => `
                <a href="/tool/${p.slug}" class="search-item">
                    <strong>${p.name}</strong>
                    <span style="font-size:12px;color:var(--text-secondary);float:right;">${p.cat}</span>
                </a>
            `).join('')}
        `;
    }

    function openModal() {
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-modal', 'true');
        searchField.focus();
        selectedIndex = -1;
        if (!searchField.value.trim()) {
            renderDefaultState();
        }
        
        const trap = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        modal._focusTrap = trap;
        modal.addEventListener('keydown', trap);
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.add('hidden');
        modal.removeAttribute('aria-modal');
        if (modal._focusTrap) {
            modal.removeEventListener('keydown', modal._focusTrap);
            modal._focusTrap = null;
        }
        trigger && trigger.focus();
    }

    if (trigger) trigger.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                openModal();
            }
        });
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    function updateHighlight(items) {
        items.forEach((it, idx) => {
            if (idx === selectedIndex) {
                it.classList.add('search-item--selected');
                it.style.backgroundColor = 'var(--bg-card-hover, rgba(99,102,241,0.12))';
                it.scrollIntoView({ block: 'nearest' });
            } else {
                it.classList.remove('search-item--selected');
                it.style.backgroundColor = '';
            }
        });
    }

    if (searchField) {
        searchField.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            resultsContainer.innerHTML = '';
            selectedIndex = -1;

            if (!query) {
                renderDefaultState();
                return;
            }

            const filtered = toolList.filter(t => {
                if (t.name.toLowerCase().includes(query)) return true;
                if (t.cat.toLowerCase().includes(query)) return true;
                if (t.desc.toLowerCase().includes(query)) return true;
                if (t.synonyms.some(s => s.toLowerCase().includes(query))) return true;
                return false;
            });

            if (filtered.length === 0) {
                resultsContainer.innerHTML = `
                    <div style="padding:24px 16px;text-align:center;color:var(--text-secondary);">
                        <i class="fa-solid fa-magnifying-glass" style="font-size:24px;margin-bottom:8px;opacity:0.5;"></i>
                        <p>No calculators matching "<strong>${escapeHtml(query)}</strong>"</p>
                        <p style="font-size:12px;margin-top:4px;">Try searching for mortgage, salary, auto loan, tdee, or units.</p>
                    </div>
                `;
                return;
            }

            filtered.forEach(tool => {
                const item = document.createElement('a');
                item.className = 'search-item';
                item.href = `/tool/${tool.slug}`;
                const strong = document.createElement('strong');
                strong.textContent = tool.name;
                const span = document.createElement('span');
                span.style.cssText = 'font-size:12px;color:var(--text-secondary);float:right;';
                span.textContent = tool.cat;
                item.appendChild(strong);
                item.appendChild(span);
                resultsContainer.appendChild(item);
            });
        });

        searchField.addEventListener('keydown', (e) => {
            const items = resultsContainer.querySelectorAll('.search-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                updateHighlight(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
                updateHighlight(items);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                const target = items[selectedIndex];
                if (target && target.href) {
                    window.location.href = target.href;
                }
            }
        });
    }
}
