import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('apps/customer_storefront/public/favicon.svg');
const publicDir = path.resolve('apps/customer_storefront/public');

async function renderIcons() {
  if (!fs.existsSync(svgPath)) {
    console.error('❌ favicon.svg not found');
    process.exit(1);
  }

  // Render full-bleed (0 padding) so favicons fill 100% of available viewport / tab / snippet space
  const targets = [
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'icon.png', size: 48 },
    { name: 'favicon.ico', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
  ];

  for (const { name, size } of targets) {
    const targetPath = path.join(publicDir, name);

    await sharp(svgPath, { density: 300 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(targetPath);

    console.log(`✓ Generated ${name} (${size}x${size} full-bleed max size)`);
  }

  console.log('\n✨ Favicons updated to maximum size!');
}

renderIcons().catch(console.error);
