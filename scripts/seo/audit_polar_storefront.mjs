#!/usr/bin/env node
/**
 * audit_polar_storefront.mjs
 * 
 * Comprehensive automated browser & TypeSafe System One audit of Polar products on www.luckystore1947.com.
 * Uses Playwright, TypeSafe System One (Jev), and strict SEO / Brand validation rules.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TARGET_HOST = 'https://www.luckystore1947.com';
const R2_BASE = 'https://images.luckystore1947.com/products/polar';

// Load TypeSafe API Key
function loadTypeSafeKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  const credPath = path.join(os.homedir(), '.config/jev/credentials');
  if (fs.existsSync(credPath)) {
    const lines = fs.readFileSync(credPath, 'utf8').split('\n');
    for (const line of lines) {
      if (line.startsWith('TYPESAFE_API_KEY=')) {
        return line.split('=')[1].trim();
      }
    }
  }
  return null;
}

const TYPESAFE_KEY = loadTypeSafeKey();

// TypeSafe System One helper
async function callTypeSafeSystemOne(state, questions) {
  if (!TYPESAFE_KEY) return null;
  try {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TYPESAFE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state,
        questions,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.answers || null;
  } catch {
    return null;
  }
}

async function dismissModalIfPresent(page) {
  try {
    const modalBtn = page.locator('.cf_modal_container button:has-text("Accept all"), button:has-text("Accept all")').first();
    await modalBtn.waitFor({ state: 'visible', timeout: 3500 });
    await modalBtn.click({ force: true });
    await page.waitForTimeout(500);
  } catch {
    // If modal not clickable or absent, cleanly remove container from DOM if present
    await page.evaluate(() => {
      const container = document.querySelector('.cf_modal_container');
      if (container) container.remove();
    }).catch(() => {});
  }
}


async function checkImageHttp(url) {
  if (!url) return { ok: false, status: 0 };
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 Starting Lucky Store Polar Storefront Audit (/jev-browser-use)');
  console.log(`🌐 Target: ${TARGET_HOST}`);
  console.log(`🔑 TypeSafe System One: ${TYPESAFE_KEY ? 'Active (jev-latest)' : 'Disabled (Key missing)'}`);
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 LuckyStoreBot/1.0',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log('1️⃣ Navigating to Homepage...');
  await page.goto(`${TARGET_HOST}/`, { timeout: 20000, waitUntil: 'domcontentloaded' });
  await dismissModalIfPresent(page);

  console.log('2️⃣ Interacting with Search Bar for "Polar"...');
  await dismissModalIfPresent(page);
  const searchInput = page.locator('input[placeholder*="search" i]').first();
  await searchInput.click({ force: true });
  await searchInput.fill('Polar');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await dismissModalIfPresent(page);


  console.log(`📍 Search navigated to: ${page.url()}`);

  // Collect Polar product URLs from search results and brand page
  console.log('3️⃣ Collecting Polar Product URLs...');
  const productUrls = new Set();

  async function harvestLinks(url) {
    await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });
    await dismissModalIfPresent(page);
    const links = await page.locator('a[href*="/product/"]').evaluateAll((anchors) =>
      anchors.map((a) => a.href).filter((h) => h.includes('/product/polar-'))
    );
    for (const l of links) {
      const clean = l.split('?')[0].split('#')[0];
      productUrls.add(clean);
    }
  }

  await harvestLinks(`${TARGET_HOST}/category?q=Polar`);
  await harvestLinks(`${TARGET_HOST}/brand/polar`);

  const uniqueUrls = Array.from(productUrls).sort();
  console.log(`✅ Discovered ${uniqueUrls.length} unique Polar product pages to verify.\n`);

  const results = [];
  let index = 0;

  for (const prodUrl of uniqueUrls) {
    index++;
    const slug = prodUrl.split('/product/')[1] || '';
    const prefix = slug.split('--')[1]?.slice(0, 8)?.toLowerCase() || '';
    console.log(`------------------------------------------------------------------------`);
    console.log(`[${index}/${uniqueUrls.length}] Auditing: ${slug}`);

    const item = {
      url: prodUrl,
      slug,
      prefix,
      httpStatus: 0,
      canonical: null,
      title: null,
      titleLength: 0,
      metaDescription: null,
      metaDescriptionLength: 0,
      h1: null,
      visiblePrice: null,
      visibleVolume: null,
      manufacturerText: null,
      imageSrc: null,
      imageAlt: null,
      isR2Image: false,
      imageHttpOk: false,
      hasProductSchema: false,
      schemaDetails: null,
      typeSafeJudgment: null,
      discrepancies: [],
    };

    try {
      const response = await page.goto(prodUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
      item.httpStatus = response?.status() || 0;
      await dismissModalIfPresent(page);

      if (item.httpStatus !== 200) {
        item.discrepancies.push({
          level: 'CRITICAL',
          type: 'HTTP_STATUS',
          message: `Page returned HTTP ${item.httpStatus}`,
        });
      }

      // Extract DOM SEO elements
      const seoData = await page.evaluate(() => {
        const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;
        const h1 = document.querySelector('h1')?.textContent?.trim() || null;
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null;
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;

        // Structured data
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        let productSchema = null;
        for (const s of scripts) {
          try {
            const parsed = JSON.parse(s.textContent || '{}');
            if (parsed['@type'] === 'Product') {
              productSchema = parsed;
              break;
            } else if (Array.isArray(parsed['@graph'])) {
              const p = parsed['@graph'].find((g) => g['@type'] === 'Product');
              if (p) {
                productSchema = p;
                break;
              }
            }
          } catch {
            // Ignore parse errors
          }
        }

        // Target exact product price and volume from hero buying panel
        const heroPriceEl = document.querySelector('main .text-4xl.font-extrabold, main [class*="text-4xl"]');
        const heroPrice = heroPriceEl?.textContent?.trim() || null;

        const heroUnitEl = document.querySelector('main h1 + p, main p.text-warm-muted');
        const heroUnit = heroUnitEl?.textContent?.split('·')[0]?.trim() || null;

        const bodyText = document.body.innerText || '';
        const priceMatch = heroPrice || (bodyText.match(/৳\s*([0-9]+(?:\.[0-9]+)?)/)?.[0] ?? null);
        const volumeMatch = heroUnit || (bodyText.match(/\b(1\s*(?:liter|l)|500\s*ml|100\s*ml|70\s*ml|65\s*ml|60\s*ml|50\s*ml|45\s*ml|40\s*ml)\b/i)?.[0] ?? null);
        const mfgMatch = bodyText.match(/(Dhaka Ice Cream Industries|Polar Ice Cream|Dhaka Ice Cream)/i);

        // Main product image in viewport/gallery
        const mainImg = document.querySelector('img[src*="/products/polar/"], img[src*="polar"], main img');
        const imgSrc = mainImg?.getAttribute('src') || null;
        const imgAlt = mainImg?.getAttribute('alt') || null;

        return {
          title: document.title,
          canonical,
          metaDesc,
          h1,
          ogTitle,
          ogImage,
          productSchema,
          visiblePrice: priceMatch,
          visibleVolume: volumeMatch,
          manufacturerText: mfgMatch ? mfgMatch[0] : null,
          imgSrc,
          imgAlt,
        };
      });

      item.title = seoData.title;
      item.titleLength = seoData.title?.length || 0;
      item.canonical = seoData.canonical;
      item.metaDescription = seoData.metaDesc;
      item.metaDescriptionLength = seoData.metaDesc?.length || 0;
      item.h1 = seoData.h1;
      item.visiblePrice = seoData.visiblePrice;
      item.visibleVolume = seoData.visibleVolume;
      item.manufacturerText = seoData.manufacturerText;
      item.imageSrc = seoData.imgSrc;
      item.imageAlt = seoData.imgAlt;
      item.isR2Image = !!seoData.imgSrc?.includes('images.luckystore1947.com/products/polar');
      item.hasProductSchema = !!seoData.productSchema;
      item.schemaDetails = seoData.productSchema;

      // Image HTTP check
      if (item.imageSrc) {
        const fullImgUrl = item.imageSrc.startsWith('http') ? item.imageSrc : `${TARGET_HOST}${item.imageSrc}`;
        const imgCheck = await checkImageHttp(fullImgUrl);
        item.imageHttpOk = imgCheck.ok;
        if (!imgCheck.ok) {
          item.discrepancies.push({
            level: 'CRITICAL',
            type: 'IMAGE_BROKEN',
            message: `Product image URL ${item.imageSrc} failed with HTTP ${imgCheck.status}`,
          });
        }
      } else {
        item.discrepancies.push({
          level: 'CRITICAL',
          type: 'IMAGE_MISSING',
          message: 'No product image found on page',
        });
      }

      // Check Alt text
      if (!item.imageAlt || item.imageAlt.trim().length === 0) {
        item.discrepancies.push({
          level: 'WARNING',
          type: 'ALT_TEXT_MISSING',
          message: 'Product image is missing descriptive alt text',
        });
      }

      // Title tag checks
      if (!item.title) {
        item.discrepancies.push({
          level: 'CRITICAL',
          type: 'TITLE_MISSING',
          message: 'Page title is missing',
        });
      } else {
        if (!item.title.includes('Lucky Store Chittagong') && !item.title.includes('Lucky Store')) {
          item.discrepancies.push({
            level: 'WARNING',
            type: 'TITLE_BRANDING',
            message: `Page title missing brand suffix: "${item.title}"`,
          });
        }
        if (item.titleLength < 30 || item.titleLength > 65) {
          item.discrepancies.push({
            level: 'SEO_OPPORTUNITY',
            type: 'TITLE_LENGTH',
            message: `Title length (${item.titleLength} chars) outside optimal 30-65 range`,
          });
        }
      }

      // Meta Description checks
      if (!item.metaDescription) {
        item.discrepancies.push({
          level: 'WARNING',
          type: 'META_DESC_MISSING',
          message: 'Meta description tag is missing',
        });
      } else if (item.metaDescriptionLength < 110 || item.metaDescriptionLength > 160) {
        item.discrepancies.push({
          level: 'SEO_OPPORTUNITY',
          type: 'META_DESC_LENGTH',
          message: `Meta description length (${item.metaDescriptionLength} chars) outside optimal 110-160 range`,
        });
      }

      // H1 checks
      if (!item.h1) {
        item.discrepancies.push({
          level: 'CRITICAL',
          type: 'H1_MISSING',
          message: 'Missing H1 heading on product page',
        });
      }

      // Canonical checks
      if (!item.canonical) {
        item.discrepancies.push({
          level: 'WARNING',
          type: 'CANONICAL_MISSING',
          message: 'Missing canonical URL link tag',
        });
      } else if (!item.canonical.startsWith('https://www.luckystore1947.com')) {
        item.discrepancies.push({
          level: 'WARNING',
          type: 'CANONICAL_HOST',
          message: `Canonical host is not www.luckystore1947.com (${item.canonical})`,
        });
      }

      // Schema checks
      if (!item.hasProductSchema) {
        item.discrepancies.push({
          level: 'CRITICAL',
          type: 'SCHEMA_MISSING',
          message: 'Missing Schema.org Product structured data',
        });
      } else {
        const schema = item.schemaDetails;
        if (!schema.offers?.price) {
          item.discrepancies.push({
            level: 'WARNING',
            type: 'SCHEMA_OFFER_PRICE',
            message: 'Schema Product offer is missing price',
          });
        }
        if (schema.offers?.priceCurrency !== 'BDT') {
          item.discrepancies.push({
            level: 'WARNING',
            type: 'SCHEMA_CURRENCY',
            message: `Schema currency is ${schema.offers?.priceCurrency || 'missing'}, expected BDT`,
          });
        }
        if (!schema.brand || (typeof schema.brand === 'object' && schema.brand.name !== 'Polar')) {
          item.discrepancies.push({
            level: 'SEO_OPPORTUNITY',
            type: 'SCHEMA_BRAND',
            message: `Schema brand is not explicitly "Polar"`,
          });
        }
      }

      // Cloudflare R2 Curated Packshot check
      if (!item.isR2Image) {
        item.discrepancies.push({
          level: 'WARNING',
          type: 'NON_R2_IMAGE',
          message: `Image is served from uncurated source instead of Cloudflare R2 (${item.imageSrc})`,
        });
      }

      // TypeSafe System One (Jev) semantic evaluation
      if (TYPESAFE_KEY) {
        const state = {
          product_slug: slug,
          title: item.title,
          h1: item.h1,
          visible_price: item.visiblePrice,
          volume: item.visibleVolume,
          manufacturer: item.manufacturerText,
          image_alt: item.imageAlt,
          schema_name: item.schemaDetails?.name,
          schema_price: item.schemaDetails?.offers?.price,
        };

        const questions = {
          claims_fidelity: {
            type: 'choice',
            instructions: 'Evaluate if the buyer-facing product information accurately reflects official Polar ice cream standards (Dhaka Ice Cream Industries Ltd).',
            criteria: {
              supported: 'Claims, volume, and branding are accurate and supported.',
              unsupported: 'Claims or volume specifications lack backing or are vague.',
              contradicted: 'Packaging, volume, or brand information contradicts Polar specifications.',
              unknown: 'Information is insufficient to determine accuracy.',
            },
          },
          image_variant_match: {
            type: 'choice',
            instructions: 'Does the image packshot and alt text match the exact variant and package size stated in title?',
            criteria: {
              exact_match: 'Image and alt text clearly depict the correct variant and tub/stick/cone format.',
              mismatch: 'Image shows a different flavor, different volume (e.g. 500ml vs 1L), or wrong format.',
              missing_packshot: 'No clear packshot available.',
            },
          },
        };

        const typeSafeAns = await callTypeSafeSystemOne(state, questions);
        item.typeSafeJudgment = typeSafeAns;

        if (typeSafeAns?.claims_fidelity?.choice === 'contradicted') {
          item.discrepancies.push({
            level: 'CRITICAL',
            type: 'TYPESAFE_CLAIMS_CONTRADICTED',
            message: `TypeSafe Jev flagged product claims as contradicted (confidence: ${typeSafeAns.claims_fidelity.confidence?.toFixed(2)})`,
          });
        } else if (typeSafeAns?.claims_fidelity?.choice === 'unsupported') {
          item.discrepancies.push({
            level: 'WARNING',
            type: 'TYPESAFE_CLAIMS_UNSUPPORTED',
            message: `TypeSafe Jev flagged product claims as unsupported (confidence: ${typeSafeAns.claims_fidelity.confidence?.toFixed(2)})`,
          });
        }

        if (typeSafeAns?.image_variant_match?.choice === 'mismatch') {
          item.discrepancies.push({
            level: 'WARNING',
            type: 'TYPESAFE_IMAGE_MISMATCH',
            message: `TypeSafe Jev detected potential mismatch between image alt/format and variant`,
          });
        }
      }

      // Print live status
      const critCount = item.discrepancies.filter((d) => d.level === 'CRITICAL').length;
      const warnCount = item.discrepancies.filter((d) => d.level === 'WARNING').length;
      const oppCount = item.discrepancies.filter((d) => d.level === 'SEO_OPPORTUNITY').length;

      console.log(`  Title: "${item.title}"`);
      console.log(`  H1: "${item.h1}" | Price: ${item.visiblePrice} | Vol: ${item.visibleVolume}`);
      console.log(`  Image: ${item.isR2Image ? '✅ Curated R2' : '⚠️ Fallback/Uncurated'} (${item.imageSrc ? 'HTTP 200' : 'Missing'})`);
      console.log(`  Schema: ${item.hasProductSchema ? '✅ Product JSON-LD' : '❌ Missing'}`);
      if (item.typeSafeJudgment) {
        console.log(`  TypeSafe Jev: Claims=${item.typeSafeJudgment.claims_fidelity?.choice} (${item.typeSafeJudgment.claims_fidelity?.confidence?.toFixed(2)}) | ImgMatch=${item.typeSafeJudgment.image_variant_match?.choice}`);
      }
      console.log(`  Discrepancies: ${critCount} Critical, ${warnCount} Warnings, ${oppCount} Opportunities`);
      if (item.discrepancies.length > 0) {
        for (const d of item.discrepancies) {
          console.log(`    [${d.level}] ${d.type}: ${d.message}`);
        }
      }
    } catch (err) {
      console.error(`  ❌ Error inspecting ${slug}:`, err.message);
      item.discrepancies.push({
        level: 'CRITICAL',
        type: 'INSPECTION_ERROR',
        message: err.message,
      });
    }

    results.push(item);
  }

  await browser.close();

  // Save report
  const reportPath = path.join(process.cwd(), 'scripts/seo/polar_storefront_discrepancies.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log('\n========================================================================');
  console.log('📊 AUDIT SUMMARY REPORT');
  console.log('========================================================================');
  const totalChecked = results.length;
  const allCritical = results.flatMap((r) => r.discrepancies.filter((d) => d.level === 'CRITICAL'));
  const allWarnings = results.flatMap((r) => r.discrepancies.filter((d) => d.level === 'WARNING'));
  const allOpps = results.flatMap((r) => r.discrepancies.filter((d) => d.level === 'SEO_OPPORTUNITY'));

  console.log(`Total Polar Products Audited: ${totalChecked}`);
  console.log(`🚨 Critical Discrepancies: ${allCritical.length}`);
  console.log(`⚠️ Warnings: ${allWarnings.length}`);
  console.log(`💡 SEO Opportunities: ${allOpps.length}`);
  console.log(`📁 Report Saved: ${reportPath}`);
  console.log('========================================================================\n');
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
