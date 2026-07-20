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

// All Food subcategories
const categories = [
  { name: 'Eggs', url: 'https://www.shwapno.com/eggs' },
  { name: 'Frozen', url: 'https://www.shwapno.com/Frozen' },
  { name: 'Ice Cream', url: 'https://www.shwapno.com/ice-cream' },
  { name: 'Candy & Chocolate', url: 'https://www.shwapno.com/candy-chocolate' },
  { name: 'Baking Needs', url: 'https://www.shwapno.com/baking-needs' },
  { name: 'Fruits & Vegetables', url: 'https://www.shwapno.com/fruits-and-vegetables' },
  { name: 'Meat & Fish', url: 'https://www.shwapno.com/meat-and-fish' },
  { name: 'Sauces & Pickles', url: 'https://www.shwapno.com/sauces-and-pickles' },
  { name: 'Cooking', url: 'https://www.shwapno.com/cooking' },
  { name: 'Canned Food', url: 'https://www.shwapno.com/canned-food' },
  { name: 'Breakfast', url: 'https://www.shwapno.com/breakfast' },
  { name: 'Dairy', url: 'https://www.shwapno.com/dairy' },
  { name: 'Drinks', url: 'https://www.shwapno.com/beverages' },
  { name: 'Snacks', url: 'https://www.shwapno.com/snacks' }
];

async function scrapeProductsFromPage(page, categoryName, categoryUrl) {
  console.log(`\nScraping ${categoryName}...`);
  
  try {
    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for dynamic content to load
    
    const products = await page.evaluate((catName) => {
      const productMap = new Map();
      
      // Strategy: Find all divs that contain both an image and a price
      const allDivs = Array.from(document.querySelectorAll('div'));
      
      allDivs.forEach(div => {
        try {
          // Check if this div contains both image and price
          const hasImage = div.querySelector('img');
          const text = div.textContent || '';
          const hasPrice = text.includes('৳') && text.match(/৳\s*(\d+[.,]?\d*)/);
          
          if (hasImage && hasPrice) {
            // Extract price
            const priceMatch = text.match(/৳\s*(\d+[.,]?\d*)/);
            const price = priceMatch ? priceMatch[1].replace(/,/g, '') : '';
            
            // Extract product name - look for link with meaningful text
            let name = '';
            const links = div.querySelectorAll('a[href^="/"]');
            for (const link of links) {
              const linkText = link.textContent.trim();
              const href = link.getAttribute('href');
              
              // Skip navigation links
              if (href && !href.includes('contact') && !href.includes('about') && 
                  !href.includes('Office') && !href.includes('Shipping') &&
                  !href.includes('deals') && !href.includes('brands') &&
                  linkText.length > 2 && linkText.length < 200 &&
                  !linkText.includes('Delivery') && !linkText.includes('Per') &&
                  !linkText.includes('Add to Bag') && !linkText.includes('Min.')) {
                name = linkText;
                break;
              }
            }
            
            // If no name from link, try to extract from text content
            if (!name || name.length < 2) {
              const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              for (const line of lines) {
                if (line.length > 2 && line.length < 200 && 
                    !line.includes('৳') && !line.includes('Delivery') && 
                    !line.includes('Per') && !line.includes('Add to Bag') &&
                    !line.includes('Min.') && !line.includes('Sort By') &&
                    !line.includes('Price Range') && !line.includes('Express Delivery')) {
                  name = line;
                  break;
                }
              }
            }
            
            // Extract image URL
            let imageUrl = '';
            const img = div.querySelector('img');
            if (img) {
              imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = 'https://www.shwapno.com' + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
              }
            }
            
            // Validate and add product
            if (name && name.length > 2 && name.length < 200 && price && parseFloat(price) > 0) {
              const key = `${name}_${price}`;
              if (!productMap.has(key)) {
                productMap.set(key, {
                  name: name,
                  price: parseFloat(price),
                  category: catName,
                  imageUrl: imageUrl || ''
                });
              }
            }
          }
        } catch (e) {
          // Skip errors
        }
      });
      
      return Array.from(productMap.values());
    }, categoryName);
    
    console.log(`  Found ${products.length} products in ${categoryName}`);
    return products;
    
  } catch (error) {
    console.error(`  Error scraping ${categoryName}:`, error.message);
    return [];
  }
}

async function scrapeAllCategories() {
  console.log('Starting Shwapno product scraper...\n');
  
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
    console.error('\nTrying alternative method...');
    throw error;
  }
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  const allProducts = [];
  
  try {
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      console.log(`Processing category ${i + 1}/${categories.length}: ${category.name}`);
      
      try {
        const products = await scrapeProductsFromPage(page, category.name, category.url);
        allProducts.push(...products);
        console.log(`  ✓ Successfully scraped ${products.length} products`);
      } catch (error) {
        console.error(`  ✗ Failed to scrape ${category.name}:`, error.message);
        // Continue with next category
      }
      
      // Small delay between categories to avoid overwhelming the server
      if (i < categories.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
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
      supabaseResult = await saveToSupabase(STORE_ID, 'shwapno', allProducts, ourProductsMap);
      console.log(`✓ Saved to Supabase: ${supabaseResult.saved} products`);
    } catch (error) {
      console.error('✗ Failed to save to Supabase:', error.message);
    }
  } else {
    console.log('Supabase not configured (SUPABASE_URL, SUPABASE_SERVICE_KEY, STORE_ID) — skipping DB save');
  }
  
  // Format data for Excel (matching Lucky Store import format)
  const excelData = [
    ['Barcode', 'Name', 'Category', 'Cost', 'Price', 'Image URL'] // Header row
  ];
  
  allProducts.forEach(product => {
    excelData.push([
      '', // Barcode - empty, can be filled later
      product.name,
      product.category,
      '', // Cost - empty, can be filled later
      product.price,
      product.imageUrl
    ]);
  });
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  
  // Write to file
  const outputPath = path.join(__dirname, 'shwapno-products.xlsx');
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

