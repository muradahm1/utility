// generate-sitemap.js
// Run with: node generate-sitemap.js
// Reads TOOLS slugs and writes sitemap.xml automatically.
// Add this to your deploy step so sitemap stays in sync with tools.js.

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const BASE_URL = 'https://www.getcalcu.com';

// Load tool registry by executing tools.js in sandbox
const toolsSource = fs.readFileSync(path.join(__dirname, 'js', 'tools.js'), 'utf8');
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
vm.runInContext(toolsSource, sandbox);
const primarySlugs = Object.keys(sandbox.window.TOOLS || {});

// Localized salary tools
const localizedSlugs = [
  'salary-calculator/et',
  'salary-calculator/ke',
  'salary-calculator/ng',
  'salary-calculator/za'
];

const allSlugs = [...new Set([...primarySlugs, ...localizedSlugs])];

const categories = ['finance', 'health', 'math', 'business', 'education', 'construction', 'engineering'];
const categoryUrls = categories.map(cat => `${BASE_URL}/category/${cat}`);

const staticUrls = [
  `${BASE_URL}/`,
  ...categoryUrls,
  `${BASE_URL}/about`,
  `${BASE_URL}/contact`,
];

const toolUrls = allSlugs.map(slug => `${BASE_URL}/tool/${slug}`);

const allUrls = [...staticUrls, ...toolUrls];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u}</loc>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml.trimStart());
console.log(`✓ sitemap.xml generated with ${allUrls.length} URLs (${allSlugs.length} tools, ${staticUrls.length} static pages)`);
