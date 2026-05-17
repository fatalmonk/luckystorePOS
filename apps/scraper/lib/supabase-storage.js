/**
 * Supabase storage helper for competitor price data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Save scraped products to Supabase
 * @param {string} storeId - Store ID
 * @param {string} competitor - Competitor name (chaldal, shwapno, etc.)
 * @param {Array} products - Array of scraped products
 * @param {Map} ourProductsMap - Map of our products by name for matching
 */
export async function saveToSupabase(storeId, competitor, products, ourProductsMap = new Map()) {
  const batchId = crypto.randomUUID();
  const scrapedAt = new Date().toISOString();
  
  const records = products.map(product => {
    // Try to match with our product catalog
    const ourProduct = findMatchingProduct(product.name, ourProductsMap);
    
    return {
      store_id: storeId,
      product_id: ourProduct?.id || null,
      product_name: product.name,
      product_sku: ourProduct?.sku || null,
      competitor_name: competitor,
      competitor_product_id: product.id || null,
      competitor_product_url: product.url || null,
      competitor_price: parseFloat(product.price) || 0,
      competitor_original_price: parseFloat(product.originalPrice) || null,
      our_price: ourProduct?.price || null,
      price_gap_percent: ourProduct?.price && product.price 
        ? ((ourProduct.price - parseFloat(product.price)) / parseFloat(product.price))
        : null,
      scraped_at: scrapedAt,
      scrape_batch_id: batchId,
      scrape_status: 'success',
      raw_data: product
    };
  });
  
  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('competitor_prices')
      .upsert(batch, {
        onConflict: 'store_id,competitor_name,product_name,scraped_at',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error(`Error saving batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`  Saved batch ${i / batchSize + 1} (${batch.length} products)`);
    }
  }
  
  return { batchId, saved: records.length };
}

/**
 * Find matching product in our catalog using fuzzy matching
 */
function findMatchingProduct(name, ourProductsMap) {
  // Exact match
  if (ourProductsMap.has(name.toLowerCase())) {
    return ourProductsMap.get(name.toLowerCase());
  }
  
  // Try normalized name (remove special chars, extra spaces)
  const normalized = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (ourProductsMap.has(normalized)) {
    return ourProductsMap.get(normalized);
  }
  
  // Partial match - check if our product name is contained in competitor name
  for (const [ourName, ourProduct] of ourProductsMap) {
    if (normalized.includes(ourName) || ourName.includes(normalized)) {
      return ourProduct;
    }
  }
  
  return null;
}

/**
 * Load our product catalog for matching
 */
export async function loadOurProducts(storeId) {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, sku, price')
    .eq('store_id', storeId);
  
  if (error) {
    console.error('Error loading our products:', error);
    return new Map();
  }
  
  const map = new Map();
  for (const item of data || []) {
    // Index by various name formats
    map.set(item.name.toLowerCase(), item);
    map.set(item.sku?.toLowerCase(), item);
    map.set(
      item.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(),
      item
    );
  }
  
  return map;
}

export { supabase };
