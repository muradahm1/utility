const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const masterIconPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\66cf436f-7c05-4c4a-8905-fa67cd81a110\\getcalcu_icon_master_1787938881840.jpg';
const masterOgPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\66cf436f-7c05-4c4a-8905-fa67cd81a110\\getcalcu_og_image_1787938836256.jpg';

const rootDir = path.resolve(__dirname, '..');

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

    console.log('All brand assets successfully generated!');
}

buildAssets().catch(err => {
    console.error('Error generating assets:', err);
    process.exit(1);
});
