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

    // Build search list from TOOLS registry if available, otherwise use fallback
    const toolList = typeof TOOLS !== 'undefined'
        ? Object.entries(TOOLS).map(([slug, t]) => ({ name: t.name, slug, cat: t.category }))
        : [
            { name: 'Mortgage Calculator',          slug: 'mortgage-calculator',   cat: 'Finance' },
            { name: 'BMI Calculator',               slug: 'bmi-calculator',         cat: 'Health'  },
            { name: 'Percentage Calculator',        slug: 'percentage-calculator',  cat: 'Math'    },
            { name: 'Investment Calculator',        slug: 'investment-calculator',            cat: 'Finance' },
            { name: 'Loan Calculator',              slug: 'loan-calculator',        cat: 'Finance' },
            { name: 'Compound Interest Calculator', slug: 'compound-interest-calculator',      cat: 'Finance' },
            { name: 'Date Calculator',              slug: 'date-calculator',        cat: 'Math'    },
            { name: 'Budget Planner & Expense Tracker', slug: 'budget-planner',     cat: 'Finance' },
            { name: 'Retirement Calculator',        slug: 'retirement-calculator',           cat: 'Finance' },
            { name: 'Rent vs. Buy Calculator',      slug: 'rent-vs-buy-calculator',          cat: 'Finance' },
        ];

    function openModal() {
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-modal', 'true');
        searchField.focus();
        // Focus trap
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
        trigger.focus();
    }

    if (trigger) trigger.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Close modal on click outside the card
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Only add Cmd+K shortcut on non-touch devices
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

    if (searchField) {
        searchField.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            resultsContainer.innerHTML = '';
            if (!query) return;

            const filtered = toolList.filter(t => t.name.toLowerCase().includes(query) || t.cat.toLowerCase().includes(query));
            filtered.forEach(tool => {
                const item = document.createElement('a');
                item.className = 'search-item';
                item.href = `/tool?slug=${encodeURIComponent(tool.slug)}`;
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
    }
}
