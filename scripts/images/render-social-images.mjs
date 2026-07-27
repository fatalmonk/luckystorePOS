import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('apps/customer_storefront/public');
const logoSvgPath = path.resolve('apps/customer_storefront/public/lucky-store-est1947.svg');

async function renderSocialImages() {
  if (!fs.existsSync(logoSvgPath)) {
    console.error('❌ lucky-store-est1947.svg not found');
    process.exit(1);
  }

  // 1. Generate 1200x630 (Landscape for Open Graph & Twitter)
  const width = 1200;
  const height = 630;

  // Render SVG logo centered
  const logoWidth = 720;
  const logoHeight = 405;
  const logoBuffer = await sharp(logoSvgPath, { density: 300 })
    .resize(logoWidth, logoHeight, { fit: 'contain' })
    .toBuffer();

  // Create SVG card overlay with brand colors #0B0B0D and #f0c444
  const overlaySvg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0B0B0D" />
        <stop offset="100%" stop-color="#141419" />
      </linearGradient>
      <radialGradient id="glow" cx="85%" cy="15%" r="65%">
        <stop offset="0%" stop-color="#f0c444" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#0B0B0D" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <rect width="${width}" height="${height}" fill="url(#glow)" />

    <!-- Outer Frame Border -->
    <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="24" fill="none" stroke="#f0c444" stroke-opacity="0.25" stroke-width="2" />

    <!-- Top Badge -->
    <g transform="translate(60, 56)">
      <rect width="140" height="32" rx="16" fill="#f0c444" />
      <text x="70" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" fill="#0B0B0D" text-anchor="middle" letter-spacing="1.5">SINCE 1947</text>
    </g>

    <!-- Bottom Tagline -->
    <text x="${width / 2}" y="${height - 68}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#E4E4E7" text-anchor="middle" letter-spacing="0.5">Your Friendly Neighborhood Grocer in Chittagong</text>
    <text x="${width / 2}" y="${height - 44}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#f0c444" text-anchor="middle" letter-spacing="1">FRESH PRODUCTS • FAIR PRICES • SAME-DAY DELIVERY</text>
  </svg>
  `;

  const overlayBuffer = Buffer.from(overlaySvg);

  const cardBuffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#0B0B0D',
    },
  })
    .composite([
      { input: overlayBuffer, top: 0, left: 0 },
      { input: logoBuffer, top: Math.round((height - logoHeight) / 2) - 16, left: Math.round((width - logoWidth) / 2) },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'twitter-image.png'), cardBuffer);
  fs.writeFileSync(path.join(publicDir, 'opengraph-image.png'), cardBuffer);
  console.log('✓ Rendered twitter-image.png (1200x630)');
  console.log('✓ Rendered opengraph-image.png (1200x630)');

  // 2. Generate 1200x1200 (Square for opengraph-image-square.png)
  const sqWidth = 1200;
  const sqHeight = 1200;
  const sqLogoWidth = 900;
  const sqLogoHeight = 506;

  const sqLogoBuffer = await sharp(logoSvgPath, { density: 300 })
    .resize(sqLogoWidth, sqLogoHeight, { fit: 'contain' })
    .toBuffer();

  const sqOverlaySvg = `
  <svg width="${sqWidth}" height="${sqHeight}" viewBox="0 0 ${sqWidth} ${sqHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0B0B0D" />
        <stop offset="100%" stop-color="#141419" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#f0c444" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#0B0B0D" stop-opacity="0" />
      </radialGradient>
    </defs>

    <rect width="${sqWidth}" height="${sqHeight}" fill="url(#bg)" />
    <rect width="${sqWidth}" height="${sqHeight}" fill="url(#glow)" />
    <rect x="36" y="36" width="${sqWidth - 72}" height="${sqHeight - 72}" rx="36" fill="none" stroke="#f0c444" stroke-opacity="0.25" stroke-width="3" />

    <g transform="translate(${sqWidth / 2 - 70}, 80)">
      <rect width="140" height="36" rx="18" fill="#f0c444" />
      <text x="70" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#0B0B0D" text-anchor="middle" letter-spacing="1.5">SINCE 1947</text>
    </g>

    <text x="${sqWidth / 2}" y="${sqHeight - 110}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" fill="#E4E4E7" text-anchor="middle">Your Friendly Neighborhood Grocer</text>
    <text x="${sqWidth / 2}" y="${sqHeight - 70}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#f0c444" text-anchor="middle" letter-spacing="1.5">CHITTAGONG, BANGLADESH</text>
  </svg>
  `;

  const sqOverlayBuffer = Buffer.from(sqOverlaySvg);

  const sqCardBuffer = await sharp({
    create: {
      width: sqWidth,
      height: sqHeight,
      channels: 4,
      background: '#0B0B0D',
    },
  })
    .composite([
      { input: sqOverlayBuffer, top: 0, left: 0 },
      { input: sqLogoBuffer, top: Math.round((sqHeight - sqLogoHeight) / 2) - 20, left: Math.round((sqWidth - sqLogoWidth) / 2) },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'opengraph-image-square.png'), sqCardBuffer);
  console.log('✓ Rendered opengraph-image-square.png (1200x1200)');

  console.log('\n✨ All social preview images generated successfully!');
}

renderSocialImages().catch(console.error);
