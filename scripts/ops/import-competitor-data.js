/**
 * Import Shwapno competitor data and products
 * 
 * This script:
 * 1. Imports all products from Shwapno CSV files
 * 2. Stores competitor prices in competitor_prices table
 * 
 * Usage: node scripts/ops/import-competitor-data.js
 */

import { createSupabaseClient, getSupabaseUrl } from '../lib/supabase-client.js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found!');
  console.error('');
  console.error('Please create .env or .env.local at the repo root with:');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-full-service-role-key-here');
  console.error('');
  const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
  console.error(`Get the key from: https://app.supabase.com/project/${projectRef}/settings/api`);
  process.exit(1);
}

const supabase = createSupabaseClient(SUPABASE_SERVICE_KEY);
const COMPETITOR_NAME = 'Shwapno';

// CSV files directory
const CSV_DIR = join(__dirname, '..', '..', 'data', 'competitors', 'shwapno');

/**
 * Parse CSV file (handles quoted fields with commas)
 */
function parseCSV(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').trim();
    });
    
    // Skip empty rows
    if (!row.Name || row.Name.length === 0) continue;
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current);
  
  return values;
}

/**
 * Find or create item by name
 */
async function findOrCreateItem(row) {
  const name = row.Name.trim();
  const categoryName = row.Category?.trim() || 'Food';
  const price = parseFloat(row.Price || 0) || 0;
  const cost = parseFloat(row.Cost || 0) || 0;
  const barcode = row.Barcode?.trim() || null;
  const imageUrl = row['Image URL']?.trim() || null;

  // Find or create category
  let categoryId = null;
  if (categoryName) {
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .maybeSingle();

    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({ name: categoryName })
        .select('id')
        .single();

      if (error) {
        console.error(`Error creating category ${categoryName}:`, error.message);
      } else {
        categoryId = newCategory.id;
      }
    }
  }

  // Find existing item by name or barcode
  let itemId = null;
  const conditions = [];
  if (barcode) conditions.push(`barcode.eq.${barcode}`);
  conditions.push(`name.eq.${name.replace(/'/g, "''")}`); // Escape single quotes

  const { data: existingItem } = await supabase
    .from('items')
    .select('id')
    .or(conditions.join(','))
    .maybeSingle();

  if (existingItem) {
    itemId = existingItem.id;
    // Update item if needed
    await supabase
      .from('items')
      .update({
        category_id: categoryId,
        image_url: imageUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
  } else {
    // Create new item
    const { data: newItem, error } = await supabase
      .from('items')
      .insert({
        name,
        barcode: barcode || null,
        category_id: categoryId,
        cost: cost || 0,
        price: price || 0,
        image_url: imageUrl || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Error creating item ${name}:`, error.message);
      return null;
    }
    itemId = newItem.id;
  }

  return itemId;
}

/**
 * Store competitor price
 */
async function storeCompetitorPrice(itemId, competitorPrice) {
  if (!itemId || !competitorPrice || competitorPrice <= 0) return;

  const { error } = await supabase
    .from('competitor_prices')
    .upsert({
      item_id: itemId,
      competitor_name: COMPETITOR_NAME,
      competitor_price: competitorPrice,
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'item_id,competitor_name',
    });

  if (error) {
    console.error(`Error storing competitor price:`, error.message);
  }
}

/**
 * Process a single CSV file
 */
async function processCSVFile(filePath, fileName) {
  console.log(`\n📄 Processing: ${fileName}`);
  
  try {
    const rows = parseCSV(filePath);
    console.log(`   Found ${rows.length} products`);

    let itemsCreated = 0;
    let itemsUpdated = 0;
    let pricesStored = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const itemId = await findOrCreateItem(row);
        
        if (itemId) {
          // Check if this is a new item or existing
          const { data: existing } = await supabase
            .from('items')
            .select('created_at')
            .eq('id', itemId)
            .single();
          
          if (existing && new Date(existing.created_at) > new Date(Date.now() - 5000)) {
            itemsCreated++;
          } else {
            itemsUpdated++;
          }

          // Store competitor price
          const competitorPrice = parseFloat(row.Price || 0);
          if (competitorPrice > 0) {
            await storeCompetitorPrice(itemId, competitorPrice);
            pricesStored++;
          }
        } else {
          errors++;
        }
      } catch (err) {
        console.error(`   Error processing ${row.Name}:`, err.message);
        errors++;
      }
    }

    console.log(`   ✅ Items created: ${itemsCreated}`);
    console.log(`   ✅ Items updated: ${itemsUpdated}`);
    console.log(`   ✅ Prices stored: ${pricesStored}`);
    if (errors > 0) {
      console.log(`   ⚠️  Errors: ${errors}`);
    }

    return { itemsCreated, itemsUpdated, pricesStored, errors };
  } catch (err) {
    console.error(`   ❌ Error processing file:`, err.message);
    return { itemsCreated: 0, itemsUpdated: 0, pricesStored: 0, errors: 1 };
  }
}

/**
 * Main import function
 */
async function importAllData() {
  console.log('🚀 Starting Shwapno Competitor Data Import');
  console.log(`📁 CSV Directory: ${CSV_DIR}\n`);

  // Get all CSV files
  const files = readdirSync(CSV_DIR)
    .filter(file => file.endsWith('.csv'))
    .sort();

  console.log(`Found ${files.length} CSV files:`);
  files.forEach(file => console.log(`  - ${file}`));

  let totalItemsCreated = 0;
  let totalItemsUpdated = 0;
  let totalPricesStored = 0;
  let totalErrors = 0;

  // Process each file
  for (const file of files) {
    const filePath = join(CSV_DIR, file);
    const result = await processCSVFile(filePath, file);
    
    totalItemsCreated += result.itemsCreated;
    totalItemsUpdated += result.itemsUpdated;
    totalPricesStored += result.pricesStored;
    totalErrors += result.errors;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary');
  console.log('='.repeat(50));
  console.log(`✅ Items created: ${totalItemsCreated}`);
  console.log(`✅ Items updated: ${totalItemsUpdated}`);
  console.log(`✅ Competitor prices stored: ${totalPricesStored}`);
  console.log(`⚠️  Errors: ${totalErrors}`);
  console.log(`📁 Files processed: ${files.length}`);
  console.log('='.repeat(50));
}

// Run import
importAllData().catch(console.error);

