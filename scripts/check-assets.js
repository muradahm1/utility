const fs = require('fs');
const path = require('path');

const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const toolDir = './tool';
const toolFiles = fs.existsSync(toolDir) 
    ? fs.readdirSync(toolDir)
        .map(d => path.join(toolDir, d, 'index.html'))
        .filter(f => fs.existsSync(f))
    : [];

const allHtml = [...rootFiles, ...toolFiles];
const missingAssets = new Set();

allHtml.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const srcMatches = [...content.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1]);
    const hrefMatches = [...content.matchAll(/<link[^>]+href=["']([^"']+)["']/g)].map(m => m[1]);
    
    [...srcMatches, ...hrefMatches].forEach(ref => {
        if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('//') || ref.startsWith('#') || ref.startsWith('data:')) return;
        const cleanRef = ref.split('?')[0].split('#')[0];
        const localPath = cleanRef.startsWith('/') ? '.' + cleanRef : path.join(path.dirname(file), cleanRef);
        if (!fs.existsSync(localPath)) {
            missingAssets.add(`${file} -> ${ref} (resolved: ${localPath})`);
        }
    });
});

console.log('Total HTML files checked:', allHtml.length);
console.log('Missing local assets count:', missingAssets.size);
missingAssets.forEach(m => console.log('MISSING:', m));
