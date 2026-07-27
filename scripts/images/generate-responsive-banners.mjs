import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dir = path.resolve('apps/customer_storefront/public/banners');
const sizes = [400, 600, 800, 1200];

async function generateAll() {
  const files = fs.readdirSync(dir);
  const bases = new Set();
  
  files.forEach(f => {
    // Only capture root banner filenames, e.g., promo_buldak.avif -> promo_buldak
    if (!f.match(/_\d+\.(avif|webp|png)$/)) {
      const base = f.replace(/\.(avif|webp|png)$/, '');
      bases.add(base);
    }
  });

  console.log('Found banner bases:', Array.from(bases));

  for (const base of bases) {
    let srcFile = null;
    if (fs.existsSync(path.join(dir, `${base}.png`))) srcFile = `${base}.png`;
    else if (fs.existsSync(path.join(dir, `${base}.webp`))) srcFile = `${base}.webp`;
    else if (fs.existsSync(path.join(dir, `${base}.avif`))) srcFile = `${base}.avif`;

    if (!srcFile) continue;
    const srcPath = path.join(dir, srcFile);
    console.log(`Processing: ${base} (source: ${srcFile})`);

    for (const width of sizes) {
      const avifName = `${base}_${width}.avif`;
      const webpName = `${base}_${width}.webp`;
      const avifPath = path.join(dir, avifName);
      const webpPath = path.join(dir, webpName);

      try {
        const metadata = await sharp(srcPath).metadata();
        const targetWidth = Math.min(width, metadata.width || width);

        // Generate AVIF
        const avifBuf = await sharp(srcPath)
          .resize(targetWidth)
          .avif({ quality: 65, effort: 6 })
          .toBuffer();
        fs.writeFileSync(avifPath, avifBuf);

        // Generate WebP
        const webpBuf = await sharp(srcPath)
          .resize(targetWidth)
          .webp({ quality: 80, effort: 6 })
          .toBuffer();
        fs.writeFileSync(webpPath, webpBuf);

        console.log(`  ✓ ${width}w: AVIF ${(avifBuf.length / 1024).toFixed(1)}KB | WebP ${(webpBuf.length / 1024).toFixed(1)}KB`);
      } catch (err) {
        console.error(`  ❌ Failed ${width}w for ${base}:`, err.message);
      }
    }
  }

  console.log('\n✨ All responsive banner variants generated successfully!');
}

generateAll().catch(console.error);
