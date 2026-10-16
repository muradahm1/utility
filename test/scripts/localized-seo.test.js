import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('Localized Tool & International SEO Architecture', () => {
    const root = process.cwd();

    it('generates static localized page for /tool/salary-calculator/et', () => {
        const etPath = resolve(root, 'tool/salary-calculator/et/index.html');
        expect(existsSync(etPath), 'Ethiopian salary calculator page should exist').toBe(true);
        
        const content = readFileSync(etPath, 'utf-8');
        
        // Self-referencing canonical
        expect(content).toContain('<link rel="canonical" href="https://www.getcalcu.com/tool/salary-calculator/et">');
        
        // Reciprocal hreflang tags
        expect(content).toContain('<link rel="alternate" hreflang="x-default" href="https://www.getcalcu.com/tool/salary-calculator">');
        expect(content).toContain('<link rel="alternate" hreflang="en-US" href="https://www.getcalcu.com/tool/salary-calculator">');
        expect(content).toContain('<link rel="alternate" hreflang="en-ET" href="https://www.getcalcu.com/tool/salary-calculator/et">');
        expect(content).toContain('<link rel="alternate" hreflang="en-KE" href="https://www.getcalcu.com/tool/salary-calculator/ke">');
        
        // Active jurisdiction pill
        expect(content).toContain('country-switcher-bar');
        expect(content).toContain('class="country-pill active">');
        expect(content).toContain('Ethiopia (ETB)');
        
        // Structured data with ETB currency
        expect(content).toContain('"priceCurrency":"ETB"');
        expect(content).toContain('"name":"Ethiopia Salary & Tax Calculator"');
        expect(content).toContain('Federal Income Tax Proclamation No. 979/2016');
    });

    it('generates static localized page for /tool/salary-calculator/ke', () => {
        const kePath = resolve(root, 'tool/salary-calculator/ke/index.html');
        expect(existsSync(kePath), 'Kenyan salary calculator page should exist').toBe(true);
        
        const content = readFileSync(kePath, 'utf-8');
        
        // Self-referencing canonical
        expect(content).toContain('<link rel="canonical" href="https://www.getcalcu.com/tool/salary-calculator/ke">');
        
        // Reciprocal hreflang tags
        expect(content).toContain('<link rel="alternate" hreflang="x-default" href="https://www.getcalcu.com/tool/salary-calculator">');
        expect(content).toContain('<link rel="alternate" hreflang="en-US" href="https://www.getcalcu.com/tool/salary-calculator">');
        expect(content).toContain('<link rel="alternate" hreflang="en-ET" href="https://www.getcalcu.com/tool/salary-calculator/et">');
        expect(content).toContain('<link rel="alternate" hreflang="en-KE" href="https://www.getcalcu.com/tool/salary-calculator/ke">');
        
        // Active jurisdiction pill
        expect(content).toContain('country-switcher-bar');
        expect(content).toContain('class="country-pill active">');
        expect(content).toContain('Kenya (KES)');
        
        // Structured data with KES currency
        expect(content).toContain('"priceCurrency":"KES"');
        expect(content).toContain('"name":"Kenya Salary & PAYE Tax Calculator"');
        expect(content).toContain('Income Tax Act (Cap. 470), Finance Act');
    });

    it('includes reciprocal hreflang and country switcher on US /tool/salary-calculator', () => {
        const usPath = resolve(root, 'tool/salary-calculator/index.html');
        expect(existsSync(usPath), 'US salary calculator page should exist').toBe(true);
        
        const content = readFileSync(usPath, 'utf-8');
        
        // Self-referencing canonical
        expect(content).toContain('<link rel="canonical" href="https://www.getcalcu.com/tool/salary-calculator">');
        
        // Reciprocal hreflang tags
        expect(content).toContain('<link rel="alternate" hreflang="x-default" href="https://www.getcalcu.com/tool/salary-calculator">');
        expect(content).toContain('<link rel="alternate" hreflang="en-US" href="https://www.getcalcu.com/tool/salary-calculator">');
        expect(content).toContain('<link rel="alternate" hreflang="en-ET" href="https://www.getcalcu.com/tool/salary-calculator/et">');
        expect(content).toContain('<link rel="alternate" hreflang="en-KE" href="https://www.getcalcu.com/tool/salary-calculator/ke">');
        
        // Country switcher with links to localized variants
        expect(content).toContain('country-switcher-bar');
        expect(content).toContain('href="/tool/salary-calculator/et"');
        expect(content).toContain('href="/tool/salary-calculator/ke"');
    });

    it('indexes localized calculators in sitemap.xml', () => {
        const sitemapPath = resolve(root, 'sitemap.xml');
        expect(existsSync(sitemapPath)).toBe(true);
        
        const sitemap = readFileSync(sitemapPath, 'utf-8');
        expect(sitemap).toContain('<loc>https://www.getcalcu.com/tool/salary-calculator/et</loc>');
        expect(sitemap).toContain('<loc>https://www.getcalcu.com/tool/salary-calculator/ke</loc>');
        expect(sitemap).toContain('<loc>https://www.getcalcu.com/tool/salary-calculator</loc>');
    });

    it('configures vercel rewrite for localized subpaths', () => {
        const vercelPath = resolve(root, 'vercel.json');
        expect(existsSync(vercelPath)).toBe(true);
        
        const vercelConfig = JSON.parse(readFileSync(vercelPath, 'utf-8'));
        const rewrite = vercelConfig.rewrites.find(r => r.source === '/tool/:slug/:country');
        expect(rewrite).toBeDefined();
        expect(rewrite.destination).toBe('/tool/:slug/:country/index.html');
    });
});
