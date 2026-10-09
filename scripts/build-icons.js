/**
 * build-icons.js — LEGACY one-off asset generator (NOT part of the build).
 *
 * ⚠️ DEPRECATED as of the navy "G" rebrand. The canonical, committed brand
 * assets now live in the site root and are the source of truth:
 *   /logo.svg, /favicon.svg, /favicon-32x32.png, /favicon-48x48.png,
 *   /favicon-96x96.png, /icon-192.png, /icon-512.png, /apple-touch-icon.png,
 *   /og-image.png, /og-image.jpg
 *
 * Running this script re-derives raster icons from its external master files
 * (outside the repo) and previously overwrote the root assets, so it must not
 * be run as part of a normal build. `npm run build` only runs
 * scripts/minify-css.js + build-seo.js.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const primaryMasterIcon = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\66cf436f-7c05-4c4a-8905-fa67cd81a110\\getcalcu_icon_master_1787938881840.jpg';
const primaryMasterOg = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\66cf436f-7c05-4c4a-8905-fa67cd81a110\\getcalcu_og_image_1787938836256.jpg';

const rootDir = path.resolve(__dirname, '..');
const masterIconPath = fs.existsSync(primaryMasterIcon) ? primaryMasterIcon : path.join(rootDir, 'icon-512.png');
const masterOgPath = fs.existsSync(primaryMasterOg) ? primaryMasterOg : path.join(rootDir, 'og-image.png');

async function buildAssets() {
    console.log('Generating brand assets...');

    // 1. Process OpenGraph Social Banner (1200x630)
    await sharp(masterOgPath)
        .resize(1200, 630, { fit: 'cover' })
        .png({ quality: 95 })
        .toFile(path.join(rootDir, 'og-image.png'));
    console.log('✓ Created og-image.png (1200x630)');

    await sharp(masterOgPath)
        .resize(1200, 630, { fit: 'cover' })
        .jpeg({ quality: 90 })
        .toFile(path.join(rootDir, 'og-image.jpg'));
    console.log('✓ Created og-image.jpg (1200x630)');

    // 2. Process Favicon & Multi-resolution Icons
    // 512x512 Master Favicon
    await sharp(masterIconPath)
        .resize(512, 512)
        .png({ quality: 100 })
        .toFile(path.join(rootDir, 'favicon.png'));
    console.log('✓ Created favicon.png (512x512)');

    // 512x512 PWA Icon
    await sharp(masterIconPath)
        .resize(512, 512)
        .png({ quality: 100 })
        .toFile(path.join(rootDir, 'icon-512.png'));
    console.log('✓ Created icon-512.png (512x512)');

    // 192x192 PWA Icon
    await sharp(masterIconPath)
        .resize(192, 192)
        .png({ quality: 100 })
        .toFile(path.join(rootDir, 'icon-192.png'));
    console.log('✓ Created icon-192.png (192x192)');

    // 192x192 Google SERP Favicon
    await sharp(masterIconPath)
        .resize(192, 192)
        .png({ quality: 100 })
        .toFile(path.join(rootDir, 'favicon-192x192.png'));
    console.log('✓ Created favicon-192x192.png (192x192)');

    // 180x180 Apple Touch Icon
    await sharp(masterIconPath)
        .resize(180, 180)
        .png({ quality: 100 })
        .toFile(path.join(rootDir, 'apple-touch-icon.png'));
    console.log('✓ Created apple-touch-icon.png (180x180)');

    // 96x96 Desktop Favicon
    await sharp(masterIconPath)
        .resize(96, 96)
        .png({ quality: 100 })
        .toFile(path.join(rootDir, 'favicon-96x96.png'));
    console.log('✓ Created favicon-96x96.png (96x96)');

    // 32x32 Tab Favicon
    await sharp(masterIconPath)
        .resize(32, 32)
        .png({ quality: 100 })
        .toFile(path.join(rootDir, 'favicon-32x32.png'));
    console.log('✓ Created favicon-32x32.png (32x32)');

    // 72x72 UI Brand Logo (for 36x36 2x retina display in header/footer)
    await sharp(masterIconPath)
        .resize(72, 72)
        .png({ quality: 90 })
        .toFile(path.join(rootDir, 'logo.png'));
    console.log('✓ Created logo.png (72x72)');

    console.log('All brand assets successfully generated!');
}

buildAssets().catch(err => {
    console.error('Error generating assets:', err);
    process.exit(1);
});
