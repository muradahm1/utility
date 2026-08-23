/**
 * Phase 5.12: Extract all Font Awesome icons used across the project.
 * Scans HTML, JS, and CSS files for fa-solid / fa-regular / fa-brands icon classes,
 * including dynamically constructed ones (e.g. 'fa-solid ' + variable).
 */
const fs = require('fs');
const path = require('path');

const icons = new Set();
const dynamicUsages = [];

function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        const st = fs.statSync(p);
        if (st.isDirectory()) {
            if (f === 'node_modules' || f === '.git' || f === '.vercel') continue;
            walk(p);
        } else if (/\.(html|js|css)$/.test(f)) {
            const c = fs.readFileSync(p, 'utf8');
            let m;
            // Static usage: fa-solid fa-xxx
            const re = /fa-(?:solid|regular|brands)\s+(fa-[a-z0-9-]+)/g;
            while ((m = re.exec(c)) !== null) icons.add(m[1]);
            // Quoted literals: icon: 'fa-xxx' (covers dynamic tool.icon / field.icon / insight.icon)
            const litRe = /['"](fa-[a-z0-9-]+)['"]/g;
            while ((m = litRe.exec(c)) !== null) {
                if (m[1] !== 'fa-xxx') icons.add(m[1]);
            }
        }
    }
}

walk('.');

const NL = String.fromCharCode(10);
const sorted = [...icons].sort();
console.log(sorted.join(NL));
console.log(NL + 'TOTAL STATIC ICONS: ' + sorted.length);

if (dynamicUsages.length) {
    console.log(NL + 'DYNAMIC USAGES (need manual review):');
    dynamicUsages.forEach(u => console.log(' ', u));
}
