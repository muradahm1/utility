const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');

async function testPage(filePath) {
    const relPath = path.relative(ROOT, filePath);
    const html = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    const warnings = [];

    const virtualConsole = new VirtualConsole();
    virtualConsole.on('error', (err) => {
        errors.push(typeof err === 'object' ? (err.stack || err.message || JSON.stringify(err)) : String(err));
    });
    virtualConsole.on('warn', (warn) => {
        warnings.push(typeof warn === 'object' ? (warn.message || JSON.stringify(warn)) : String(warn));
    });
    virtualConsole.on('jsdomError', (err) => {
        errors.push(err.message || String(err));
    });

    try {
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            url: 'https://www.getcalcu.com/' + relPath.replace(/\\/g, '/').replace(/index\.html$/, ''),
            virtualConsole,
            beforeParse(window) {
                // Mock Supabase / external CDN if not loaded in node
                window.supabase = {
                    createClient: () => ({
                        auth: {
                            getSession: async () => ({ data: { session: null } }),
                            getUser: async () => ({ data: { user: null } }),
                            onAuthStateChange: () => {},
                            signOut: async () => ({ error: null }),
                        },
                        from: () => ({
                            select: () => ({
                                order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
                                eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
                                single: () => Promise.resolve({ data: null, error: null })
                            }),
                            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 1 }, error: null }) }) }),
                            delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
                        })
                    })
                };
                window.Chart = class MockChart {
                    constructor() {}
                    destroy() {}
                    update() {}
                };
            }
        });

        // Wait a tick for inline and deferred scripts
        await new Promise(resolve => setTimeout(resolve, 50));

        return { page: relPath, errors, warnings };
    } catch (e) {
        return { page: relPath, errors: [e.message], warnings };
    }
}

async function main() {
    console.log('Testing root HTML pages...');
    const rootFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
    
    let totalErrors = 0;
    for (const f of rootFiles) {
        const res = await testPage(path.join(ROOT, f));
        if (res.errors.length > 0 || res.warnings.length > 0) {
            console.log(`\nPage: ${res.page}`);
            if (res.errors.length) console.log('  ERRORS:', res.errors);
            if (res.warnings.length) console.log('  WARNINGS:', res.warnings);
            totalErrors += res.errors.length;
        } else {
            console.log(`✓ ${res.page} - OK (no console errors)`);
        }
    }

    console.log('\nTesting tool pages in /tool/...');
    const toolDir = path.join(ROOT, 'tool');
    if (fs.existsSync(toolDir)) {
        const toolSlugs = fs.readdirSync(toolDir);
        for (const slug of toolSlugs.slice(0, 10)) {
            const toolIndex = path.join(toolDir, slug, 'index.html');
            if (fs.existsSync(toolIndex)) {
                const res = await testPage(toolIndex);
                if (res.errors.length > 0 || res.warnings.length > 0) {
                    console.log(`\nTool: ${slug}`);
                    if (res.errors.length) console.log('  ERRORS:', res.errors);
                    if (res.warnings.length) console.log('  WARNINGS:', res.warnings);
                    totalErrors += res.errors.length;
                } else {
                    console.log(`✓ tool/${slug} - OK`);
                }
            }
        }
    }
    console.log(`\nDiagnostics finished. Total errors encountered: ${totalErrors}`);
}

main().catch(console.error);
