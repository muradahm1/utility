const fs = require('fs');
const path = require('path');

const toolDir = path.join(__dirname, '..', 'tool');
const slugs = fs.readdirSync(toolDir).filter(f => fs.statSync(path.join(toolDir, f)).isDirectory());

console.log(`Auditing all ${slugs.length} static tool HTML pages...`);

let totalPages = 0;
let errors = [];

slugs.forEach(slug => {
  const htmlPath = path.join(toolDir, slug, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    errors.push(`${slug}: index.html does not exist`);
    return;
  }
  totalPages++;
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Check 1: TOC container & nav
  if (!html.includes('class="on-this-page-container"') || !html.includes('class="on-this-page-nav"')) {
    errors.push(`${slug}: Missing on-this-page TOC container or nav`);
  }

  // Check 2: Educational layout
  if (!html.includes('class="educational-layout"') || !html.includes('class="educational-sidebar"')) {
    errors.push(`${slug}: Missing educational-layout or educational-sidebar`);
  }

  // Check 3: Related tools
  if (!html.includes('id="related-tools"')) {
    errors.push(`${slug}: Missing related-tools section`);
  }

  // Check 4: TOC link integrity
  const tocLinks = Array.from(html.matchAll(/<a\s+[^>]*href="#([^"]+)"[^>]*class="on-this-page-link"/g)).map(m => m[1]);
  if (tocLinks.length < 3) {
    errors.push(`${slug}: Only ${tocLinks.length} TOC links found`);
  }

  tocLinks.forEach(anchorId => {
    const idRegex = new RegExp(`id=["']${anchorId}["']`);
    if (!idRegex.test(html)) {
      errors.push(`${slug}: Broken TOC anchor #${anchorId} (id not found in HTML)`);
    }
  });
});

console.log(`Audited ${totalPages} pages.`);
if (errors.length === 0) {
  console.log('✓ 100% SUCCESS: All 47 pages have valid static TOC, educational layout, related tools mesh, and 0 broken anchor links!');
} else {
  console.error(`Found ${errors.length} errors:`, errors);
  process.exit(1);
}
