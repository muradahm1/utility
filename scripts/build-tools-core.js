const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const toolsSource = fs.readFileSync(path.join(rootDir, 'js', 'tools.js'), 'utf8');

// Execute tools.js in a sandbox to get TOOLS object
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
vm.runInContext(toolsSource, sandbox, { filename: 'tools.js' });
const rawTools = sandbox.window.TOOLS || {};

// Build lean client tools dictionary
// We retain: name, category, icon, iconClass, tagClass, presets, fields, calculate, customRenderer, related, formula
// We strip: article, faqs, howTo, examples (already rendered in static HTML)
const slugs = Object.keys(rawTools);
let outputCode = `// ── GetCalcu Lean Interactive Client Tools Engine ──\n`;
outputCode += `// Generated automatically by scripts/build-tools-core.js\n`;
outputCode += `// Contains operational calculation logic & input schemas without duplicate static prose.\n\n`;
outputCode += `(function () {\n`;
outputCode += `    if (typeof document !== 'undefined' && document.head &&\n`;
outputCode += `        typeof Chart === 'undefined' &&\n`;
outputCode += `        document.getElementById('tool-runner-container') &&\n`;
outputCode += `        document.querySelector('#result-chart, #result-chart-2, #result-chart-3, #result-chart-4, .chart-container canvas, #budget-chart, .chart-wrapper canvas')) {\n`;
outputCode += `        var s = document.createElement('script');\n`;
outputCode += `        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';\n`;
outputCode += `        s.async = true;\n`;
outputCode += `        document.head.appendChild(s);\n`;
outputCode += `    }\n`;
outputCode += `})();\n\n`;
outputCode += `const TOOLS = {};\n\n`;

slugs.forEach(slug => {
  const t = rawTools[slug];
  const clientObj = {
    name: t.name,
    category: t.category,
    icon: t.icon,
    iconClass: t.iconClass,
    tagClass: t.tagClass,
    formula: t.formula,
    presets: t.presets || [],
    fields: t.fields || [],
    related: t.related || [],
  };

  const jsonStr = JSON.stringify(clientObj);
  const calcStr = t.calculate ? t.calculate.toString() : 'function() { return {}; }';
  const customStr = t.customRenderer ? t.customRenderer.toString() : 'null';

  outputCode += `TOOLS['${slug}'] = Object.assign(${jsonStr}, { calculate: ${calcStr}${t.customRenderer ? `, customRenderer: ${customStr}` : ''} });\n`;
});

outputCode += `if (typeof window !== 'undefined') { window.TOOLS = TOOLS; }\n`;
outputCode += `if (typeof module !== 'undefined' && module.exports) { module.exports = TOOLS; }\n`;

const outPath = path.join(rootDir, 'js', 'tools-core.js');
fs.writeFileSync(outPath, outputCode, 'utf8');

const origSize = (Buffer.byteLength(toolsSource, 'utf8') / 1024).toFixed(2);
const coreSize = (Buffer.byteLength(outputCode, 'utf8') / 1024).toFixed(2);
const savings = (((1 - coreSize / origSize)) * 100).toFixed(1);

console.log(`✓ Tools Core Build Complete:`);
console.log(`  Source: ${origSize} KB -> tools-core.js: ${coreSize} KB (${savings}% savings)`);
