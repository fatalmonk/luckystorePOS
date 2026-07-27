import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('apps/customer_storefront/public/favicon-inverse.svg');
const publicDir = path.resolve('apps/customer_storefront/public');

async function renderIcons() {
  if (!fs.existsSync(svgPath)) {
    console.error('❌ favicon-inverse.svg not found');
    process.exit(1);
  }

  // Update favicon.svg with inverse dark handles content
  const svgContent = fs.readFileSync(svgPath, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  console.log('✓ Updated public/favicon.svg from favicon-inverse.svg');

  // Sizes to render with padding
  const targets = [
    { name: 'favicon-32x32.png', size: 32, padding: 4 },
    { name: 'apple-touch-icon.png', size: 180, padding: 24 },
    { name: 'icon-192x192.png', size: 192, padding: 24 },
    { name: 'icon-512x512.png', size: 512, padding: 64 },
  ];

  for (const { name, size, padding } of targets) {
    const targetPath = path.join(publicDir, name);
    const innerSize = size - padding * 2;

    // Render SVG at high res then fit in padded canvas
    const renderedBuffer = await sharp(svgPath, { density: 300 })
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
      .toFile(targetPath);

    console.log(`✓ Generated ${name} (${size}x${size} with ${padding}px padding)`);
  }

  console.log('\n✨ Favicons updated successfully!');
}

renderIcons().catch(console.error);
