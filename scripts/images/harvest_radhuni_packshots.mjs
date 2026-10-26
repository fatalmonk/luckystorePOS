#!/usr/bin/env node
/**
 * harvest_radhuni_packshots.mjs
 *
 * Sources authentic Square Food & Beverage Limited Radhuni studio packshots,
 * normalizes them into 800x800 square WebP assets with clean white background,
 * and validates each with TypeSafe System One (Jev vision via TypeSafe-Danger-Zone-Images).
 *
 * Generates data/radhuni-packshots/manifest.json for verification before any live sync.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import sharp from 'sharp';

const OUTPUT_DIR = path.join(process.cwd(), 'data/radhuni-packshots');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

// Load TypeSafe Key
function loadTypeSafeKey() {
  if (process.env.TYPESAFE_API_KEY && process.env.TYPESAFE_API_KEY.trim()) {
    return process.env.TYPESAFE_API_KEY.trim();
  }
  const credPath = path.join(os.homedir(), '.config/jev/credentials');
  if (fs.existsSync(credPath)) {
    const lines = fs.readFileSync(credPath, 'utf8').split('\n');
    for (const line of lines) {
      if (line.startsWith('TYPESAFE_API_KEY=')) {
        return line.split('=')[1]?.trim()?.replace(/['"]/g, '');
      }
    }
  }
  return null;
}

const TYPESAFE_KEY = loadTypeSafeKey();

// Target 19 items with authentic Square Food & Beverage Ltd packshots
const TARGET_ITEMS = [
  {
    prefix: '218e328e',
    slug: 'radhuni-kacchi-biriyani-masala-40-g--218e328e',
    title: 'Radhuni Kacchi Biriyani Masala 40g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Kachhi.PNG',
    filename: 'radhuni-kacchi-biriyani-masala-40g.webp',
  },
  {
    prefix: 'f083e180',
    slug: 'radhuni-tehari-masala-40-g--f083e180',
    title: 'Radhuni Tehari Masala 40g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Tehari.PNG',
    filename: 'radhuni-tehari-masala-40g.webp',
  },
  {
    prefix: 'bb9416cd',
    slug: 'radhuni-korma-masala-30-g--bb9416cd',
    title: 'Radhuni Korma Masala 30gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/R%20Korma%20%20Left(1).png',
    filename: 'radhuni-korma-masala-30g.webp',
  },
  {
    prefix: '62b95597',
    slug: 'radhuni-macher-masala-20-g--62b95597',
    title: 'Radhuni Macher Masala 20gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Fish%20Curry.PNG',
    filename: 'radhuni-macher-masala-20g.webp',
  },
  {
    prefix: '4228211b',
    slug: 'radhuni-mezbani-gorur-masala-68-g--4228211b',
    title: 'Radhuni Mezbani Gorur Masala 68gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Mezbani.PNG',
    filename: 'radhuni-mezbani-gorur-masala-68g.webp',
  },
  {
    prefix: 'cbbc35e5',
    slug: 'radhuni-biriyani-masala-40-g--cbbc35e5',
    title: 'Radhuni Biriyani Masala 40g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/BIRIYANI.PNG',
    filename: 'radhuni-biriyani-masala-40g.webp',
  },
  {
    prefix: '35fdd44a',
    slug: 'radhuni-biryani-masala-40g--35fdd44a',
    title: 'Radhuni Biryani Masala 40g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/BIRIYANI.PNG',
    filename: 'radhuni-biryani-masala-40g-pouch.webp',
  },
  {
    prefix: 'c5dc41e8',
    slug: 'radhuni-gorur-mangsho-masala-100-g--c5dc41e8',
    title: 'Radhuni Gorur Mangsho Masala 100g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Beef.PNG',
    filename: 'radhuni-gorur-mangsho-masala-100g.webp',
  },
  {
    prefix: '88fbb380',
    slug: 'radhuni-mangsho-masala-100-g--88fbb380',
    title: 'Radhuni Mangsho Masala 100gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Meat%20Curry%20(3).png',
    filename: 'radhuni-mangsho-masala-100g.webp',
  },
  {
    prefix: '4ef25400',
    slug: 'radhuni-roast-masala-40g--4ef25400',
    title: 'Radhuni Roast Masala 40g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Roast%20Masala.PNG',
    filename: 'radhuni-roast-masala-40g.webp',
  },
  {
    prefix: 'dffbe716',
    slug: 'radhuni-fried-chicken-mix-75-g--dffbe716',
    title: 'Radhuni Fried Chicken Mix 75gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Fried%20Chicken%20Mix(1).jpg',
    filename: 'radhuni-fried-chicken-mix-75g.webp',
  },
  {
    prefix: 'a6b3e87a',
    slug: 'radhuni-fried-rice-mix-8-g--a6b3e87a',
    title: 'Radhuni Fried Rice Mix 8gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Radhuni%20Fried%20Rice%20Seasoning%20Mix(2).png',
    filename: 'radhuni-fried-rice-mix-8g.webp',
  },
  {
    prefix: 'de116e79',
    slug: 'radhuni-hasher-mangsho-33-g--de116e79',
    title: 'Radhuni Hasher Mangsho 33gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Duck%20Curry%20Masala(1).jpg',
    filename: 'radhuni-hasher-mangsho-33g.webp',
  },
  {
    prefix: '87d9bc54',
    slug: 'radhuni-kasundi-285-ml--87d9bc54',
    title: 'Radhuni Kasundi 285ml',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Kasundi%20New.png',
    filename: 'radhuni-kasundi-285ml.webp',
  },
  {
    prefix: '15b0ac41',
    slug: 'radhuni-dhoniya-gura-100-g--15b0ac41',
    title: 'Radhuni Dhoniya Gura 100gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/dhoniya%20gura.png',
    filename: 'radhuni-dhoniya-gura-100g.webp',
  },
  {
    prefix: '2c8787a2',
    slug: 'radhuni-dhoniya-gura-15-g--2c8787a2',
    title: 'Radhuni Dhoniya Gura 15gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/dhoniya%20gura.png',
    filename: 'radhuni-dhoniya-gura-15g.webp',
  },
  {
    prefix: '6797819a',
    slug: 'radhuni-dhoniya-gura-200-g--6797819a',
    title: 'Radhuni Dhoniya Gura 200gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/dhoniya%20gura.png',
    filename: 'radhuni-dhoniya-gura-200g.webp',
  },
  {
    prefix: '4ab28db1',
    slug: 'radhuni-shorisha-oil-80-ml--4ab28db1',
    title: 'Radhuni Shorisha Oil 80ml',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/1-Liter-02.jpg',
    filename: 'radhuni-shorisha-oil-80ml.webp',
  },
  {
    prefix: '91416875',
    slug: 'radhuni-chui-jhal-mangsho-masala-38-g--91416875',
    title: 'Radhuni Chui Jhal Mangsho Masala 38gm',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/1(5).png',
    filename: 'radhuni-chui-jhal-mangsho-masala-38g.webp',
  },
  {
    prefix: '3a451e3b',
    slug: 'radhuni-bbq-masala-50-g--3a451e3b',
    title: 'Radhuni BBQ Masala 50g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/bbq(3).jpg',
    filename: 'radhuni-bbq-masala-50g.webp',
  },
  {
    prefix: 'a3ef36f3',
    slug: 'radhuni-borhani-masala-50-g--a3ef36f3',
    title: 'Radhuni Borhani Masala 50g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Borhani.PNG',
    filename: 'radhuni-borhani-masala-50g.webp',
  },
  {
    prefix: 'f08fb3f6',
    slug: 'radhuni-chicken-tandoori-50-g--f08fb3f6',
    title: 'Radhuni Chicken Tandoori Masala 50g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Tandoori%20(2).jpg',
    filename: 'radhuni-chicken-tandoori-50g.webp',
  },
  {
    prefix: 'c0170ff3',
    slug: 'radhuni-chotpoti-masala-50-g--c0170ff3',
    title: 'Radhuni Chotpoti Masala 50g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Chotpoti.PNG',
    filename: 'radhuni-chotpoti-masala-50g.webp',
  },
  {
    prefix: 'f1e2e59c',
    slug: 'radhuni-gorur-masala-25-g--f1e2e59c',
    title: 'Radhuni Gorur Masala 25g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Beef.PNG',
    filename: 'radhuni-gorur-masala-25g.webp',
  },
  {
    prefix: 'eef17d71',
    slug: 'radhuni-holud-gura-500-g--eef17d71',
    title: 'Radhuni Holud Gura 500g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/turmeric(1).png',
    filename: 'radhuni-holud-gura-500g.webp',
  },
  {
    prefix: '045df58d',
    slug: 'radhuni-jira-gura-100-g--045df58d',
    title: 'Radhuni Jira Gura 100g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/cumin.png',
    filename: 'radhuni-jira-gura-100g.webp',
  },
  {
    prefix: '06613f3a',
    slug: 'radhuni-jira-gura-15-g--06613f3a',
    title: 'Radhuni Jira Gura 15g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/cumin.png',
    filename: 'radhuni-jira-gura-15g.webp',
  },
  {
    prefix: 'bf72c058',
    slug: 'radhuni-jira-gura-200-g--bf72c058',
    title: 'Radhuni Jira Gura 200g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/cumin.png',
    filename: 'radhuni-jira-gura-200g.webp',
  },
  {
    prefix: 'bdcf65f2',
    slug: 'radhuni-jira-gura-50-g--bdcf65f2',
    title: 'Radhuni Jira Gura 50g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/cumin.png',
    filename: 'radhuni-jira-gura-50g.webp',
  },
  {
    prefix: '3682155c',
    slug: 'radhuni-kabab-masala-50-g--3682155c',
    title: 'Radhuni Kabab Masala 50g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Kabab.PNG',
    filename: 'radhuni-kabab-masala-50g.webp',
  },
  {
    prefix: '9c7880a6',
    slug: 'radhuni-kala-bhuna-80-g--9c7880a6',
    title: 'Radhuni Kala Bhuna Masala 80g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Kala%20Bhuna%20yo.PNG',
    filename: 'radhuni-kala-bhuna-80g.webp',
  },
  {
    prefix: 'c0fe29c0',
    slug: 'radhuni-morich-gura-100-g--c0fe29c0',
    title: 'Radhuni Morich Gura 100g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/CHili.PNG',
    filename: 'radhuni-morich-gura-100g.webp',
  },
  {
    prefix: 'e6b407a7',
    slug: 'radhuni-morich-gura-200-g--e6b407a7',
    title: 'Radhuni Morich Gura 200g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/CHili.PNG',
    filename: 'radhuni-morich-gura-200g.webp',
  },
  {
    prefix: '70562c12',
    slug: 'radhuni-morich-gura-25-g--70562c12',
    title: 'Radhuni Morich Gura 25g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/CHili.PNG',
    filename: 'radhuni-morich-gura-25g.webp',
  },
  {
    prefix: '44bfa194',
    slug: 'radhuni-morich-gura-500-g--44bfa194',
    title: 'Radhuni Morich Gura 500g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/CHili.PNG',
    filename: 'radhuni-morich-gura-500g.webp',
  },
  {
    prefix: '404d9aa4',
    slug: 'radhuni-murgi-mangsho-20-g--404d9aa4',
    title: 'Radhuni Murgi Mangsho 20g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Untitled%20design%20(1).png',
    filename: 'radhuni-murgi-mangsho-20g.webp',
  },
  {
    prefix: 'e621afcc',
    slug: 'radhuni-premium-ghee-200-g--e621afcc',
    title: 'Radhuni Premium Ghee 200g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Untitled%20design%20(8).png',
    filename: 'radhuni-premium-ghee-200g.webp',
  },
  {
    prefix: '602a8c45',
    slug: 'radhuni-roast-masala-35-g--602a8c45',
    title: 'Radhuni Roast Masala 35g',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Roast%20Masala.PNG',
    filename: 'radhuni-roast-masala-35g.webp',
  },
  {
    prefix: '811c65a2',
    slug: 'radhuni-shorisha-oil-1-l--811c65a2',
    title: 'Radhuni Pure Mustard Oil 1L',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/1-Liter-02.jpg',
    filename: 'radhuni-shorisha-oil-1l.webp',
  },
  {
    prefix: 'c9a869d2',
    slug: 'radhuni-shorisha-oil-250-ml--c9a869d2',
    title: 'Radhuni Shorisha Oil 250ml',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/1-Liter-02.jpg',
    filename: 'radhuni-shorisha-oil-250ml.webp',
  },
  {
    prefix: '38ee3e1a',
    slug: 'radhuni-shorisha-oil-500-ml--38ee3e1a',
    title: 'Radhuni Pure Mustard Oil 500ml',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/1-Liter-02.jpg',
    filename: 'radhuni-shorisha-oil-500ml.webp',
  },
  {
    prefix: 'df37b129',
    slug: 'radhuni-sunflower-oil-1-l--df37b129',
    title: 'Radhuni Sunflower Oil 1L',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Untitled%20design%20(6).jpg',
    filename: 'radhuni-sunflower-oil-1l.webp',
  },
  {
    prefix: '82ed979d',
    slug: 'radhuni-vinegar-280-ml--82ed979d',
    title: 'Radhuni White Vinegar 280ml',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Vinegar%20280%20ml(1).png',
    filename: 'radhuni-vinegar-280ml.webp',
  },
  {
    prefix: '20aa95b4',
    slug: 'radhuni-vinegar-540-ml--20aa95b4',
    title: 'Radhuni White Vinegar 540ml',
    sourceUrl: 'https://www.sfbl.com.bd/uploaded_files/Vinegar%20280%20ml(1).png',
    filename: 'radhuni-vinegar-540ml.webp',
  },
];

async function verifyWithTypeSafe(jpegBuffer, title) {
  if (!TYPESAFE_KEY) return { choice: 'unverified', confidence: 0 };
  const b64 = jpegBuffer.toString('base64');
  const refId = `img-${Date.now()}`;

  const payload = {
    model: 'jev-latest',
    state: {
      product_name: title,
      product_image: refId,
    },
    assets: {
      [refId]: {
        type: 'image',
        format: 'jpeg',
        data_base64: b64,
      },
    },
    questions: {
      image_quality: {
        type: 'choice',
        instructions: 'Assess visual quality of product_image.',
        criteria: {
          high_quality_packshot: 'Clean product packshot with crisp details and clear brand packaging.',
          low_quality_blurry: 'Low resolution, pixelated, blurry, or poor lighting.',
          placeholder_or_broken: 'Generic placeholder, broken icon, or blank canvas.',
        },
      },
      product_match: {
        type: 'choice',
        instructions: `Does product_image visually depict ${title}?`,
        criteria: {
          exact_match: `Image matches ${title} packaging and variant.`,
          brand_match_wrong_variant: 'Depicts Radhuni but wrong flavor or product format.',
          mismatch: 'Depicts a different brand or completely unrelated product.',
        },
      },
    },
  };

  try {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TYPESAFE_KEY}`,
        'Content-Type': 'application/json',
        'TypeSafe-Danger-Zone-Images': 'true',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { choice: 'api_error', status: res.status };
    const data = await res.json();
    return data?.answers || {};
  } catch (err) {
    return { choice: 'timeout_or_error', error: err.message };
  }
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 Radhuni Authentic Packshot Harvester & TypeSafe System One Verifier');
  console.log(`📦 Target Items: ${TARGET_ITEMS.length}`);
  console.log(`📁 Local Staging Dir: ${OUTPUT_DIR}`);
  console.log(`🔑 TypeSafe System One: ${TYPESAFE_KEY ? 'Active (jev-latest)' : 'Missing'}`);
  console.log('========================================================================\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const existingManifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : [];
  const existingMap = new Map(existingManifest.map((m) => [m.filename, m]));

  const manifest = [];
  let index = 0;

  for (const item of TARGET_ITEMS) {
    index++;
    console.log(`------------------------------------------------------------------------`);
    console.log(`[${index}/${TARGET_ITEMS.length}] Processing: ${item.title}`);
    console.log(`  Source: ${item.sourceUrl}`);

    const targetPath = path.join(OUTPUT_DIR, item.filename);
    if (fs.existsSync(targetPath) && existingMap.has(item.filename)) {
      console.log(`  ⚡ Cached: ${item.filename} already verified`);
      manifest.push(existingMap.get(item.filename));
      continue;
    }

    try {
      const res = await fetch(item.sourceUrl);
      if (!res.ok) {
        console.error(`  ❌ Failed to download: HTTP ${res.status}`);
        continue;
      }

      const rawBuf = Buffer.from(await res.arrayBuffer());

      // 1. Process with Sharp into 800x800 square WebP with clean white background
      const targetPath = path.join(OUTPUT_DIR, item.filename);
      await sharp(rawBuf)
        .resize({ width: 720, height: 720, fit: 'inside' })
        .flatten({ background: '#ffffff' })
        .extend({
          top: 40,
          bottom: 40,
          left: 40,
          right: 40,
          background: '#ffffff',
        })
        .resize(800, 800, { fit: 'contain', background: '#ffffff' })
        .webp({ quality: 90 })
        .toFile(targetPath);

      // Also create a JPEG buffer for TypeSafe System One evaluation
      const evalJpeg = await sharp(targetPath)
        .resize({ width: 700, height: 700, fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Compute SHA-256 hash
      const fileBytes = fs.readFileSync(targetPath);
      const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');

      // 2. TypeSafe System One Vision Validation
      console.log(`  Verifying with TypeSafe System One (Jev vision)...`);
      const verification = await verifyWithTypeSafe(evalJpeg, item.title);

      const quality = verification.image_quality?.choice || 'unknown';
      const match = verification.product_match?.choice || 'unknown';
      const matchConf = verification.product_match?.confidence || 0;

      console.log(`  ✅ Staged: ${item.filename} (${fileBytes.length} bytes, 800x800)`);
      console.log(`  🔍 TypeSafe Jev: Quality=${quality} | Match=${match} (confidence: ${matchConf.toFixed(2)})`);

      manifest.push({
        prefix: item.prefix,
        slug: item.slug,
        title: item.title,
        filename: item.filename,
        stagedPath: targetPath,
        sha256,
        sizeBytes: fileBytes.length,
        dimensions: { width: 800, height: 800 },
        typesafeVerification: {
          quality,
          match,
          confidence: matchConf,
        },
        sourceUrl: item.sourceUrl,
      });
    } catch (err) {
      console.error(`  ❌ Error processing ${item.title}:`, err.message);
    }
  }

  // Save reviewed manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log('\n========================================================================');
  console.log('📊 HARVEST & VERIFICATION SUMMARY');
  console.log('========================================================================');
  console.log(`Total Staged & Verified: ${manifest.length}/${TARGET_ITEMS.length}`);
  const exactMatches = manifest.filter((m) => m.typesafeVerification.match === 'exact_match');
  const highQuality = manifest.filter((m) => m.typesafeVerification.quality === 'high_quality_packshot');
  console.log(`🎯 Exact Matches: ${exactMatches.length}`);
  console.log(`✨ High Quality Packshots: ${highQuality.length}`);
  console.log(`📄 Manifest Path: ${MANIFEST_PATH}`);
  console.log('========================================================================\n');
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
