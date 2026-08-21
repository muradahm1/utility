// Vitest test setup — provides minimal globals for legacy script loading
// tools.js is a classic (non-module) script that populates window.TOOLS.
// This setup ensures the jsdom environment has the globals it expects.

// Minimal APP_CONFIG stub (tools.js may reference it at load time)
if (typeof globalThis.APP_CONFIG === 'undefined') {
    globalThis.APP_CONFIG = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON: 'test-anon-key',
        SITE_URL: 'https://www.getcalcu.com',
    };
}

// Ensure window.TOOLS exists before legacy scripts populate it
if (typeof window !== 'undefined' && !window.TOOLS) {
    window.TOOLS = {};
}
