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
      { name: 'pwa-192x192.png', size: 192 },
      { name: 'pwa-512x512.png', size: 512 },
    ];

    for (const { name, size } of adminTargets) {
      await renderIconFullBleed(svgSourcePath, path.join(adminPublic, name), size);
      console.log(`✓ Generated admin_web/public/${name}`);
    }
  }

  // --- 2. Mobile App (Android & iOS) ---
  const mobileRes = path.resolve('apps/mobile_app/android/app/src/main/res');
  if (fs.existsSync(mobileRes)) {
    const androidTargets = [
      { folder: 'mipmap-mdpi', size: 48 },
      { folder: 'mipmap-hdpi', size: 72 },
      { folder: 'mipmap-xhdpi', size: 96 },
      { folder: 'mipmap-xxhdpi', size: 144 },
      { folder: 'mipmap-xxxhdpi', size: 192 },
    ];

    for (const { folder, size } of androidTargets) {
      const dir = path.join(mobileRes, folder);
      if (fs.existsSync(dir)) {
        await renderIconFullBleed(svgSourcePath, path.join(dir, 'ic_launcher.png'), size);
        console.log(`✓ Generated Android launcher: ${folder}/ic_launcher.png (${size}x${size})`);
      }
    }
  }

  const iosAppIconSet = path.resolve('apps/mobile_app/ios/Runner/Assets.xcassets/AppIcon.appiconset');
  if (fs.existsSync(iosAppIconSet)) {
    const iosTargets = [
      { name: 'Icon-App-1024x1024@1x.png', size: 1024 },
      { name: 'Icon-App-83.5x83.5@2x.png', size: 167 },
      { name: 'Icon-App-76x76@2x.png', size: 152 },
      { name: 'Icon-App-76x76@1x.png', size: 76 },
      { name: 'Icon-App-60x60@3x.png', size: 180 },
      { name: 'Icon-App-60x60@2x.png', size: 120 },
      { name: 'Icon-App-40x40@3x.png', size: 120 },
      { name: 'Icon-App-40x40@2x.png', size: 80 },
      { name: 'Icon-App-40x40@1x.png', size: 40 },
      { name: 'Icon-App-29x29@3x.png', size: 87 },
      { name: 'Icon-App-29x29@2x.png', size: 58 },
      { name: 'Icon-App-29x29@1x.png', size: 29 },
      { name: 'Icon-App-20x20@3x.png', size: 60 },
      { name: 'Icon-App-20x20@2x.png', size: 40 },
      { name: 'Icon-App-20x20@1x.png', size: 20 },
    ];

    for (const { name, size } of iosTargets) {
      await renderIconFullBleed(svgSourcePath, path.join(iosAppIconSet, name), size);
      console.log(`✓ Generated iOS AppIcon: ${name}`);
    }
  }

  console.log('\n✨ All app icons rendered at 100% full-bleed maximum size!');
}

async function renderIconFullBleed(sourceSvg, targetPng, size) {
  await sharp(sourceSvg, { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(targetPng);
}

renderAllAppIcons().catch(console.error);
