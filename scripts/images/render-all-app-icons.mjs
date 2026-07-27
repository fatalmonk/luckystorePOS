import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgSourcePath = path.resolve('apps/customer_storefront/public/favicon.svg');

async function renderAllAppIcons() {
  if (!fs.existsSync(svgSourcePath)) {
    console.error(`❌ Source SVG not found at ${svgSourcePath}`);
    process.exit(1);
  }

  const svgContent = fs.readFileSync(svgSourcePath, 'utf-8');

  // --- 1. Admin Web ---
  const adminPublic = path.resolve('apps/admin_web/public');
  if (fs.existsSync(adminPublic)) {
    fs.writeFileSync(path.join(adminPublic, 'favicon.svg'), svgContent);
    console.log('✓ Updated admin_web/public/favicon.svg');

    // Remove legacy files if exist
    ['favicon-inverse.svg', 'lucky-store-icon.svg'].forEach(f => {
      const p = path.join(adminPublic, f);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`  - Removed obsolete admin_web file: ${f}`);
      }
    });

    const adminTargets = [
      { name: 'pwa-192x192.png', size: 192, padding: 24 },
      { name: 'pwa-512x512.png', size: 512, padding: 64 },
    ];

    for (const { name, size, padding } of adminTargets) {
      await renderIconWithPadding(svgSourcePath, path.join(adminPublic, name), size, padding);
      console.log(`✓ Generated admin_web/public/${name}`);
    }
  }

  // --- 2. Mobile App (Android & iOS) ---
  const mobileRes = path.resolve('apps/mobile_app/android/app/src/main/res');
  if (fs.existsSync(mobileRes)) {
    const androidTargets = [
      { folder: 'mipmap-mdpi', size: 48, padding: 6 },
      { folder: 'mipmap-hdpi', size: 72, padding: 9 },
      { folder: 'mipmap-xhdpi', size: 96, padding: 12 },
      { folder: 'mipmap-xxhdpi', size: 144, padding: 18 },
      { folder: 'mipmap-xxxhdpi', size: 192, padding: 24 },
    ];

    for (const { folder, size, padding } of androidTargets) {
      const dir = path.join(mobileRes, folder);
      if (fs.existsSync(dir)) {
        await renderIconWithPadding(svgSourcePath, path.join(dir, 'ic_launcher.png'), size, padding);
        console.log(`✓ Generated Android launcher: ${folder}/ic_launcher.png (${size}x${size})`);
      }
    }
  }

  const iosAppIconSet = path.resolve('apps/mobile_app/ios/Runner/Assets.xcassets/AppIcon.appiconset');
  if (fs.existsSync(iosAppIconSet)) {
    const iosTargets = [
      { name: 'Icon-App-1024x1024@1x.png', size: 1024, padding: 128 },
      { name: 'Icon-App-83.5x83.5@2x.png', size: 167, padding: 20 },
      { name: 'Icon-App-76x76@2x.png', size: 152, padding: 19 },
      { name: 'Icon-App-76x76@1x.png', size: 76, padding: 9 },
      { name: 'Icon-App-60x60@3x.png', size: 180, padding: 22 },
      { name: 'Icon-App-60x60@2x.png', size: 120, padding: 15 },
      { name: 'Icon-App-40x40@3x.png', size: 120, padding: 15 },
      { name: 'Icon-App-40x40@2x.png', size: 80, padding: 10 },
      { name: 'Icon-App-40x40@1x.png', size: 40, padding: 5 },
      { name: 'Icon-App-29x29@3x.png', size: 87, padding: 10 },
      { name: 'Icon-App-29x29@2x.png', size: 58, padding: 7 },
      { name: 'Icon-App-29x29@1x.png', size: 29, padding: 3 },
      { name: 'Icon-App-20x20@3x.png', size: 60, padding: 7 },
      { name: 'Icon-App-20x20@2x.png', size: 40, padding: 5 },
      { name: 'Icon-App-20x20@1x.png', size: 20, padding: 2 },
    ];

    for (const { name, size, padding } of iosTargets) {
      await renderIconWithPadding(svgSourcePath, path.join(iosAppIconSet, name), size, padding);
      console.log(`✓ Generated iOS AppIcon: ${name}`);
    }
  }

  console.log('\n✨ All app icons across admin_web and mobile_app rendered successfully!');
}

async function renderIconWithPadding(sourceSvg, targetPng, size, padding) {
  const innerSize = Math.max(1, size - padding * 2);

  const renderedBuffer = await sharp(sourceSvg, { density: 300 })
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: renderedBuffer, top: padding, left: padding }])
    .png()
    .toFile(targetPng);
}

renderAllAppIcons().catch(console.error);
