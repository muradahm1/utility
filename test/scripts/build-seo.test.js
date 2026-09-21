import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('TASK-001: Build SEO & Category Pages Generator', () => {
    const root = process.cwd();
    const categories = ['finance', 'health', 'math', 'business', 'education', 'construction', 'engineering'];

    it('generates index.html for each category', () => {
        categories.forEach(cat => {
            const catPath = resolve(root, `category/${cat}/index.html`);
            expect(existsSync(catPath), `Category page for ${cat} should exist`).toBe(true);
            const content = readFileSync(catPath, 'utf-8');
            expect(content).toContain(`https://www.getcalcu.com/category/${cat}`);
            expect(content).toContain('BreadcrumbList');
            expect(content).toContain('ItemList');
        });
    });

    it('includes category URLs in sitemap.xml', () => {
        const sitemapPath = resolve(root, 'sitemap.xml');
        expect(existsSync(sitemapPath)).toBe(true);
        const sitemap = readFileSync(sitemapPath, 'utf-8');
        categories.forEach(cat => {
            expect(sitemap).toContain(`https://www.getcalcu.com/category/${cat}`);
        });
    });

    it('robots.txt points to sitemap.xml', () => {
        const robotsPath = resolve(root, 'robots.txt');
        expect(existsSync(robotsPath)).toBe(true);
        const robots = readFileSync(robotsPath, 'utf-8');
        expect(robots).toContain('Sitemap: https://www.getcalcu.com/sitemap.xml');
    });
});
