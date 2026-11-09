const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcCssPath = path.join(rootDir, 'css', 'style.css');
const distCssPath = path.join(rootDir, 'css', 'style.min.css');

function minifyCss(css) {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove space around selectors and blocks
    .replace(/\s*([\{\}\:\;\,])\s*/g, '$1')
    // Remove duplicate semicolons
    .replace(/\;+/g, ';')
    // Remove leading zeros (.5 instead of 0.5 where safe) or trailing zeros
    // Remove semicolon before closing brace
    .replace(/\;(\})/g, '$1')
    // Clean remaining redundant whitespace / newlines
    .replace(/\s+/g, ' ')
    .trim();
}

const source = fs.readFileSync(srcCssPath, 'utf8');
const minified = minifyCss(source);
fs.writeFileSync(distCssPath, minified, 'utf8');

const originalSize = (Buffer.byteLength(source, 'utf8') / 1024).toFixed(2);
const minifiedSize = (Buffer.byteLength(minified, 'utf8') / 1024).toFixed(2);
const savings = (((1 - minifiedSize / originalSize)) * 100).toFixed(1);

console.log(`✓ CSS Minification Complete:`);
console.log(`  Source: ${originalSize} KB -> Minified: ${minifiedSize} KB (${savings}% savings)`);
console.log(`  Output: css/style.min.css`);
