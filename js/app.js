document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSearchModal();
    initHeroSearch();
    initActiveNav();
    initMobileNav();
    initAuthUI();
});

// Theme Management Engine
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeSwitch = document.getElementById('theme-toggle-switch');
    if (themeSwitch) {
        themeSwitch.checked = savedTheme === 'dark';
        themeSwitch.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
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
        });
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
    const path = window.location.pathname; // e.g., '/', '/tool', '/history'
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const slug = params.get('slug');

    // On tool pages, resolve the category from the TOOLS registry
    let activeCategory = category;
    if (path === '/tool' && slug && typeof TOOLS !== 'undefined' && TOOLS[slug]) {
        activeCategory = TOOLS[slug].category.toLowerCase();
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        if (!href) return; // Should not happen
        const itemUrl = new URL(href, window.location.origin);
        const itemPath = itemUrl.pathname;
        const itemQuery = itemUrl.search;
        const itemCategory = new URLSearchParams(itemQuery || '').get('category');

        if (path === '/tool') {
            if (itemPath === '/' && itemCategory && itemCategory === activeCategory) {
                item.classList.add('active');
            }
            return;
        }
        const pathMatch = (itemPath === path);
        if (pathMatch && itemCategory === category || (path === '/' && itemPath === '/' && !category)) {
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
            { name: 'Loan Calculator',              slug: 'loan-calculator',        cat: 'Finance' },
            { name: 'Compound Interest Calculator', slug: 'compound-interest',      cat: 'Finance' },
            { name: 'Date Calculator',              slug: 'date-calculator',        cat: 'Math'    },
        ];

    function openModal() {
        if (!modal) return;
        modal.classList.remove('hidden');
        searchField.focus();
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.add('hidden');
    }

    if (trigger) trigger.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openModal();
        }
        if (e.key === 'Escape') closeModal();
    });

    if (searchField) {
        searchField.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            resultsContainer.innerHTML = '';
            if (!query) return;

            const filtered = toolList.filter(t => t.name.toLowerCase().includes(query) || t.cat.toLowerCase().includes(query));
            filtered.forEach(tool => {
                const item = document.createElement('a');
                item.className = 'search-item';
                item.href = `/tool?slug=${tool.slug}`;
                item.innerHTML = `<strong>${tool.name}</strong> <span style="font-size:12px; color:var(--text-secondary); float:right;">${tool.cat}</span>`;
                resultsContainer.appendChild(item);
            });
        });
    }
}