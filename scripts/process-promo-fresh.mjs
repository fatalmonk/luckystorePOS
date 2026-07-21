import { writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = '/Users/mac.alvi/Desktop/Projects/Lucky Store/apps/customer_storefront/public/images/promo_fresh_banner.webp';
const OUT_DIR = 'apps/customer_storefront/public/banners';
const BASE = 'promo_fresh_banner';

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const img = sharp(SRC).rotate();

  for (const width of [400, 600, 800, 1200]) {
    const resized = img.clone().resize(width, null, { withoutEnlargement: true });
    const [webp, avif] = await Promise.all([
      resized.webp({ quality: 85, effort: 4 }).toBuffer(),
      resized.avif({ quality: 65, effort: 4 }).toBuffer(),
    ]);
    await Promise.all([
      writeFile(`${OUT_DIR}/${BASE}_${width}.webp`, webp),
      writeFile(`${OUT_DIR}/${BASE}_${width}.avif`, avif),
    ]);
  }

  // Base AVIF (600w) referenced by PromoGrid's responsiveBanner helper.
  const baseAvif = await sharp(SRC)
    .rotate()
    .resize(600, null, { withoutEnlargement: true })
    .avif({ quality: 65, effort: 4 })
    .toBuffer();
  await writeFile(`${OUT_DIR}/${BASE}.avif`, baseAvif);

  console.log(`✓ ${BASE}`);
})();
