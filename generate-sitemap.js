// generate-sitemap.js
// Run with: node generate-sitemap.js
// Reads TOOLS slugs and writes sitemap.xml automatically.
// Add this to your deploy step so sitemap stays in sync with tools.js.

const fs   = require('fs');
const path = require('path');

const BASE_URL = 'https://www.getcalcu.com';
const TODAY    = new Date().toISOString().split('T')[0];

// Parse slugs directly from tools.js without executing it
const toolsSource = fs.readFileSync(path.join(__dirname, 'js', 'tools.js'), 'utf8');
const slugs = [...toolsSource.matchAll(/'([a-z0-9-]+)':\s*\{/g)].map(m => m[1]);

const staticUrls = [
    { loc: `${BASE_URL}/`,            priority: '1.0', changefreq: 'weekly'  },
    { loc: `${BASE_URL}/about`,       priority: '0.8', changefreq: 'monthly' },
    { loc: `${BASE_URL}/contact`,     priority: '0.7', changefreq: 'monthly' },
    { loc: `${BASE_URL}/privacy`,     priority: '0.6', changefreq: 'monthly' },
    { loc: `${BASE_URL}/terms`,       priority: '0.6', changefreq: 'monthly' },
    { loc: `${BASE_URL}/cookie-policy`, priority: '0.6', changefreq: 'monthly' },
];

const toolUrls = slugs.map(slug => ({
    loc:        `${BASE_URL}/tool?slug=${slug}`,
    priority:   '0.9',
    changefreq: 'monthly',
}));

const allUrls = [...staticUrls, ...toolUrls];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('')}
</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml.trimStart());
console.log(`✓ sitemap.xml generated with ${allUrls.length} URLs (${slugs.length} tools, ${staticUrls.length} static pages)`);
