import puppeteer from 'puppeteer';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if Supabase is configured
const supabaseConfigured = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;
const STORE_ID = process.env.STORE_ID;

// Lazy-load Supabase helper only after config check
let saveToSupabase, loadOurProducts;
if (supabaseConfigured) {
  ({ saveToSupabase, loadOurProducts } = await import('./lib/supabase-storage.js'));
}

// Discover all subcategory URLs from Chaldal's navigation menu
async function discoverSubcategories(page) {
  console.log('Discovering subcategories from Chaldal navigation...');
  // Use a known subcategory page — the nav menu renders more reliably there than on the homepage
  await page.goto('https://chaldal.com/fresh-vegetable', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  // Wait for the nav menu to render
  try {
    await page.waitForSelector('div.topMenu.vertical ul li div.name a', { timeout: 15000 });
  } catch (e) {
    console.warn('  WARNING: Nav menu did not appear. Will fall back to known subcategory list.');
    return null;
  }

  const subcategories = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('div.topMenu.vertical ul li div.name a'));
    return links
      .map(a => ({
        name: a.textContent.trim(),
        url: a.href
      }))
      .filter(item =>
        item.url &&
        item.url.startsWith('https://chaldal.com/') &&
        item.name &&
        // Exclude non-product pages
        !item.url.includes('/invest') &&
        !item.url.includes('/pharmacy') &&
        !item.url.includes('/refer') &&
        !item.url.includes('/daily-deals') &&
        !item.url.includes('/egg-club')
      );
  });

  // Deduplicate by URL
  const seen = new Set();
  const unique = subcategories.filter(item => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  console.log(`  Discovered ${unique.length} subcategories from nav menu.`);
  return unique;
}

async function scrollPageToBottom(page) {
  let retries = 0;
  let previousHeight = 0;
  
  while (retries < 8) {
    const currentHeight = await page.evaluate('document.documentElement.scrollHeight');
    
    // Scroll down gradually
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2);
    });
    
    // Wait for lazy loading to fetch and render elements
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newHeight = await page.evaluate('document.documentElement.scrollHeight');
    // Also scroll to exact bottom once just in case
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    if (newHeight === previousHeight) {
      retries++;
    } else {
      retries = 0;
    }
    previousHeight = newHeight;
  }
}

async function scrapeProductsFromPage(page, categoryName, categoryUrl) {
  console.log(`\nScraping ${categoryName}...`);
  
  try {
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000)); // Extra wait for React hydration
    
    // Wait for React to render at least one product card before proceeding
    console.log(`  Waiting for product cards to appear...`);
    try {
      await page.waitForSelector('div.productV2Catalog', { timeout: 20000 });
      console.log(`  Cards detected — starting scroll...`);
    } catch (e) {
      console.warn(`  WARNING: No product cards appeared after 20s — page may not have loaded correctly. Proceeding anyway.`);
    }
    
    // Scroll down to load all products via infinite scroll
    console.log(`  Scrolling to load all products in ${categoryName}... (this might take a minute)`);
    await scrollPageToBottom(page);
    
    const result = await page.evaluate((catName) => {
      const dbg = { cardsFound: 0, namesFound: 0, pricesFound: 0, passedValidation: 0, errors: [] };
      const productMap = new Map();
      
      // Confirmed DOM structure from chaldal-dump.txt:
      // div.productV2Catalog
      //   div.imageTextWrapper
      //     div.imageWrapperWrapper > img   (product image)
      //     div.textWrapper
      //       div.productV2discountedPrice  (if on sale: div.currency + span[discounted] + div.price > div.currency + span[original])
      //       div.price                     (if NOT on sale: div.currency + span[price])
      //       div.pvName > p.nameTextWithEllipsis
      //       div.subText                   (unit/quantity info, e.g. "1 kg")
      const cards = document.querySelectorAll('div.productV2Catalog');
      dbg.cardsFound = cards.length;
      
      cards.forEach(card => {
        try {
          // Name: lives in div.pvName > p.nameTextWithEllipsis
          const nameEl = card.querySelector('div.pvName p.nameTextWithEllipsis') ||
                         card.querySelector('div.pvName');

          // Price: prefer discounted price (sale price shown in red/pink)
          // Structure: div.productV2discountedPrice has [div.currency, span(discounted), div.price[div.currency, span(original)]]
          // The DISCOUNTED (current selling) price is the first <span> directly inside productV2discountedPrice
          const discountedPriceEl = card.querySelector('div.productV2discountedPrice');
          // For non-discounted items, the price is in div.price directly inside textWrapper
          const regularPriceEl = card.querySelector('div.textWrapper > div.price');

          // Unit/quantity shown below the name, e.g. "1 kg", "500 gm"
          const subTextEl = card.querySelector('div.subText');

          // Product image
          const imgEl = card.querySelector('div.imageWrapperWrapper > img') ||
                        card.querySelector('img');

          if (nameEl) dbg.namesFound++;
          if (discountedPriceEl || regularPriceEl) dbg.pricesFound++;

          if (nameEl && (discountedPriceEl || regularPriceEl)) {
            const name = (nameEl.textContent || '').trim();

            // Extract unit from subText — take only the first line/span to avoid long strings
            let unit = '';
            if (subTextEl) {
              // subText can contain delivery time info too — grab only the first text node or first child
              const firstSpan = subTextEl.querySelector('span');
              unit = (firstSpan ? firstSpan.textContent : subTextEl.childNodes[0]?.textContent || '').trim();
              if (unit.length > 25) unit = ''; // discard if it's delivery time text, not a unit
            }

            // Full display name with unit
            const fullName = (unit && !name.toLowerCase().includes(unit.toLowerCase()))
              ? `${name} (${unit})`
              : name;

            // Extract price number
            let price = NaN;
            if (discountedPriceEl) {
              // First <span> directly in productV2discountedPrice = discounted sale price
              const saleSpan = discountedPriceEl.querySelector(':scope > span');
              if (saleSpan) {
                price = parseFloat(saleSpan.textContent.replace(/[^\d.]/g, ''));
              }
            }
            if (isNaN(price) && regularPriceEl) {
              // First <span> in div.price = regular price
              const priceSpan = regularPriceEl.querySelector(':scope > span') ||
                                regularPriceEl.querySelector('span');
              if (priceSpan) {
                price = parseFloat(priceSpan.textContent.replace(/[^\d.]/g, ''));
              } else {
                // Fallback: strip all non-numeric from the whole element (minus currency symbol)
                price = parseFloat(regularPriceEl.textContent.replace(/[^\d.]/g, ''));
              }
            }

            // Extract image URL
            let imageUrl = '';
            if (imgEl) {
              imageUrl = imgEl.src || imgEl.getAttribute('data-src') || '';
              // Strip webp and resize params to get higher quality URL
              try {
                const u = new URL(imageUrl);
                const src = u.searchParams.get('src');
                if (src) imageUrl = decodeURIComponent(src); // raw original image
              } catch (_) {}
            }

            if (fullName && !isNaN(price) && price > 0) {
              dbg.passedValidation++;
              const key = `${fullName}_${price}`;
              if (!productMap.has(key)) {
                productMap.set(key, {
                  name: fullName,
                  price,
                  category: catName,
                  imageUrl
                });
              }
            } else {
              dbg.errors.push(`Validation failed: Name: "${fullName}", Price: ${price}`);
            }
          } else {
            dbg.errors.push(`Missing Element: Name: ${!!nameEl}, Price: ${!!(discountedPriceEl || regularPriceEl)}`);
          }
        } catch (e) {
          dbg.errors.push(`Exception: ${e.message}`);
        }
      });
      
      return { products: Array.from(productMap.values()), debug: dbg };
    }, categoryName);
    
    console.log(`  Found ${result.products.length} unique products in ${categoryName}`);
    console.log(`  DEBUG: Set= ${result.debug.cardsFound} cards | Names= ${result.debug.namesFound} | Prices= ${result.debug.pricesFound} | Valid= ${result.debug.passedValidation}`);
    if (result.products.length === 0 && result.debug.errors.length > 0) {
       console.log(`  DEBUG SAMPLE ERROR: ${result.debug.errors.slice(0, 3).join(' | ')}`);
    }
    return result.products;
    
  } catch (error) {
    console.error(`  Error scraping ${categoryName}:`, error.message);
    return [];
  }
}

async function scrapeAllCategories() {
  console.log('Starting Chaldal product scraper...\n');
  
  let browser;
  try {
    const isCI = !!process.env.CI;
    const defaultChromePath = process.env.CHROME_BIN
      || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : undefined);
    const hasChrome = !!defaultChromePath;
    
    browser = await puppeteer.launch({
      headless: isCI ? true : false,
      executablePath: hasChrome ? defaultChromePath : undefined,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security'
      ],
      timeout: 60000
    });
  } catch (error) {
    console.error('Failed to launch browser:', error.message);
    throw error;
  }
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // --- Step 1: Discover subcategories ---
  let subcategories = await discoverSubcategories(page);

  // Fallback: known working subcategory URLs if nav discovery fails
  if (!subcategories || subcategories.length === 0) {
    console.log('  Using fallback subcategory list...');
    subcategories = [
      // Fruits & Vegetables
      { name: 'Fresh Vegetables', url: 'https://chaldal.com/fresh-vegetable' },
      { name: 'Fresh Fruits', url: 'https://chaldal.com/fresh-fruit' },
      // Meat & Fish
      { name: 'Fish', url: 'https://chaldal.com/fish' },
      { name: 'Chicken & Poultry', url: 'https://chaldal.com/chicken-poultry' },
      { name: 'Mutton', url: 'https://chaldal.com/mutton' },
      // Cooking essentials
      { name: 'Rice', url: 'https://chaldal.com/rices' },
      { name: 'Oil', url: 'https://chaldal.com/oil' },
      { name: 'Salt & Sugar', url: 'https://chaldal.com/salt-sugar' },
      { name: 'Spices', url: 'https://chaldal.com/spices' },
      { name: 'Tomato Sauces', url: 'https://chaldal.com/tomato-sauces' },
      // Beverages
      { name: 'Tea', url: 'https://chaldal.com/beverages-tea' },
      { name: 'Coffee', url: 'https://chaldal.com/coffees' },
      { name: 'Soft Drinks', url: 'https://chaldal.com/soft-drinks' },
      { name: 'Juice', url: 'https://chaldal.com/juice' },
      { name: 'Water', url: 'https://chaldal.com/water' },
      // Household & Cleaning
      { name: 'Dish Wash', url: 'https://chaldal.com/dish-wash' },
    ];
  }

  console.log(`\nScraping ${subcategories.length} subcategories...\n`);

  const allProducts = [];
  
  try {
    for (let i = 0; i < subcategories.length; i++) {
        const cat = subcategories[i];
        // Derive a clean name from the URL slug if no name available
        const displayName = cat.name || cat.url.split('/').pop().replace(/-/g, ' ');
        console.log(`[${i + 1}/${subcategories.length}] ${displayName}`);
        
        try {
            const products = await scrapeProductsFromPage(page, displayName, cat.url);
            if (products.length > 0) {
              allProducts.push(...products);
              console.log(`  ✓ ${products.length} products`);
            } else {
              console.log(`  — 0 products (skipping — may be a top-level page)`);
            }
        } catch (error) {
            console.error(`  ✗ Failed: ${error.message}`);
        }
        
        // Small delay between subcategories
        if (i < subcategories.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
  } catch (error) {
    console.error('Fatal error during scraping:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log(`\nTotal products scraped: ${allProducts.length}`);
  
  // Save to Supabase if configured
  let supabaseResult = null;
  if (supabaseConfigured && STORE_ID) {
    try {
      console.log('Loading our product catalog for matching...');
      const ourProductsMap = await loadOurProducts(STORE_ID);
      console.log(`Loaded ${ourProductsMap.size} products from our catalog`);
      
      console.log('Saving to Supabase...');
      supabaseResult = await saveToSupabase(STORE_ID, 'chaldal', allProducts, ourProductsMap);
      console.log(`✓ Saved to Supabase: ${supabaseResult.saved} products`);
    } catch (error) {
      console.error('✗ Failed to save to Supabase:', error.message);
    }
  } else {
    console.log('Supabase not configured (SUPABASE_URL, SUPABASE_SERVICE_KEY, STORE_ID) — skipping DB save');
  }
  
  // Format data for Excel
  const excelData = [
    ['Barcode', 'Name', 'Category', 'Cost', 'Price', 'Image URL'] // Header row
  ];
  
  allProducts.forEach(product => {
    excelData.push([
      '', // Barcode
      product.name,
      product.category,
      '', // Cost 
      product.price,
      product.imageUrl
    ]);
  });
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  
  // Write to file
  const outputPath = path.join(__dirname, 'chaldal-products.xlsx');
  XLSX.writeFile(workbook, outputPath);
  
  console.log(`\nExcel file created: ${outputPath}`);
  console.log(`Total rows: ${excelData.length - 1} products + 1 header row`);
  
  return outputPath;
}

// Run the scraper
scrapeAllCategories()
  .then(outputPath => {
    console.log('\nScraping completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nScraping failed:', error);
    process.exit(1);
  });

