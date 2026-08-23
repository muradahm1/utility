/**
 * Phase 5.12: Replace the Font Awesome CDN stylesheet link with the
 * self-hosted minimal subset (css/icons.css) on every HTML page.
 *
 * Usage: node scripts/swap-fa-links.js
 */
const fs = require('fs');
const path = require('path');

const OLD = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">';
const NEW = '<link rel="stylesheet" href="/css/icons.css">';

let count = 0;

function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        const st = fs.statSync(p);
        if (st.isDirectory()) {
            if (f === 'node_modules' || f === '.git' || f === '.vercel') continue;
            walk(p);
        } else if (/\.html$/.test(f)) {
            const c = fs.readFileSync(p, 'utf8');
            if (c.includes(OLD)) {
                fs.writeFileSync(p, c.split(OLD).join(NEW));
                console.log('Updated:', p);
                count++;
            }
        }
    }
}

walk('.');

console.log(NL_OUT() + 'Updated ' + count + ' HTML file(s).');

function NL_OUT() { return String.fromCharCode(10); }