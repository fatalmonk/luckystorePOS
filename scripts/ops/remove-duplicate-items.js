/**
 * Remove Duplicate Items Script
 * 
 * Finds and removes duplicate items based on:
 * - Exact name match
 * - Same barcode
 * 
 * Keeps the item with the most complete data (has barcode, image, etc.)
 * 
 * Usage: node scripts/ops/remove-duplicate-items.js [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from repo root (.env then .env.local)
const repoRoot = join(__dirname, '..', '..');
for (const name of ['.env', '.env.local']) {
  const envPath = join(repoRoot, name);
  if (existsSync(envPath)) {
    config({ path: envPath });
  }
}

const SUPABASE_URL = 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error(
    '❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in repo root .env or .env.local'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-d');

/**
 * Calculate item "completeness" score
 * Higher score = more complete data
 */
function getItemScore(item) {
  let score = 0;
  if (item.barcode) score += 10;
  if (item.sku) score += 5;
  if (item.image_url) score += 3;
  if (item.category_id) score += 2;
  if (item.price > 0) score += 1;
  if (item.cost > 0) score += 1;
  return score;
}

/**
 * Find duplicates by name - Only matches truly identical items
 * Items are duplicates only if:
 * - Same exact name AND same barcode (if both have barcodes)
 * - OR same exact name AND same price AND same category (if no barcodes)
 */
async function findDuplicatesByName() {
  console.log('🔍 Finding duplicates by name (strict matching)...\n');
  
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, barcode, sku, image_url, category_id, price, cost, created_at')
    .order('name');

  if (error) {
    console.error('❌ Error fetching items:', error.message);
    return [];
  }

  // Group by name (case-insensitive, trimmed)
  const nameGroups = {};
  items.forEach(item => {
    const key = item.name.trim().toLowerCase();
    if (!nameGroups[key]) {
      nameGroups[key] = [];
    }
    nameGroups[key].push(item);
  });

  // Find groups with duplicates - but only if they're truly identical
  const duplicates = [];
  Object.entries(nameGroups).forEach(([nameKey, group]) => {
    if (group.length > 1) {
      // Further filter: only consider items duplicates if they match on additional criteria
      const strictGroups = {};
      
      group.forEach(item => {
        // Create a unique key based on name + barcode + price + category
        const barcode = (item.barcode || '').trim();
        const price = item.price || 0;
        const category = item.category_id || 'no-category';
        
        // If both items have barcodes, they must match to be duplicates
        // If no barcodes, they must have same price and category
        let matchKey;
        if (barcode) {
          matchKey = `${nameKey}::barcode:${barcode}`;
        } else {
          matchKey = `${nameKey}::price:${price}::cat:${category}`;
        }
        
        if (!strictGroups[matchKey]) {
          strictGroups[matchKey] = [];
        }
        strictGroups[matchKey].push(item);
      });
      
      // Only add groups that have actual duplicates (more than 1 item)
      Object.entries(strictGroups).forEach(([matchKey, subGroup]) => {
        if (subGroup.length > 1) {
          // Sort by score (most complete first)
          subGroup.sort((a, b) => getItemScore(b) - getItemScore(a));
          duplicates.push({
            name: subGroup[0].name,
            keep: subGroup[0],
            remove: subGroup.slice(1)
          });
        }
      });
    }
  });

  return duplicates;
}

/**
 * Find duplicates by barcode
 */
async function findDuplicatesByBarcode() {
  console.log('🔍 Finding duplicates by barcode...\n');
  
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, barcode, sku, image_url, category_id, price, cost, created_at')
    .not('barcode', 'is', null)
    .order('barcode');

  if (error) {
    console.error('❌ Error fetching items:', error.message);
    return [];
  }

  // Group by barcode
  const barcodeGroups = {};
  items.forEach(item => {
    const barcode = item.barcode.trim();
    if (!barcode) return;
    
    if (!barcodeGroups[barcode]) {
      barcodeGroups[barcode] = [];
    }
    barcodeGroups[barcode].push(item);
  });

  // Find groups with duplicates
  const duplicates = [];
  Object.entries(barcodeGroups).forEach(([barcode, group]) => {
    if (group.length > 1) {
      // Sort by score (most complete first)
      group.sort((a, b) => getItemScore(b) - getItemScore(a));
      duplicates.push({
        barcode,
        keep: group[0],
        remove: group.slice(1)
      });
    }
  });

  return duplicates;
}

/**
 * Check for related data before deletion
 */
async function checkRelatedData(itemId) {
  const [stockLevels, competitorPrices, batches, saleItems] = await Promise.all([
    supabase.from('stock_levels').select('id').eq('item_id', itemId).limit(1),
    supabase.from('competitor_prices').select('id').eq('item_id', itemId).limit(1),
    supabase.from('batches').select('id').eq('item_id', itemId).limit(1),
    supabase.from('sale_items').select('id').eq('item_id', itemId).limit(1),
  ]);

  return {
    hasStock: (stockLevels.data?.length || 0) > 0,
    hasCompetitorPrices: (competitorPrices.data?.length || 0) > 0,
    hasBatches: (batches.data?.length || 0) > 0,
    hasSales: (saleItems.data?.length || 0) > 0,
  };
}

/**
 * Transfer related data from duplicate to kept item
 */
async function transferRelatedData(fromItemId, toItemId) {
  console.log(`   📦 Transferring related data from ${fromItemId} to ${toItemId}...`);
  
  // Transfer stock levels
  const { data: stockLevels } = await supabase
    .from('stock_levels')
    .select('*')
    .eq('item_id', fromItemId);

  if (stockLevels && stockLevels.length > 0) {
    for (const stock of stockLevels) {
      // Check if stock already exists for kept item
      const { data: existing } = await supabase
        .from('stock_levels')
        .select('qty')
        .eq('store_id', stock.store_id)
        .eq('item_id', toItemId)
        .maybeSingle();

      if (existing) {
        // Merge quantities
        await supabase
          .from('stock_levels')
          .update({ qty: existing.qty + stock.qty })
          .eq('store_id', stock.store_id)
          .eq('item_id', toItemId);
      } else {
        // Create new stock level
        await supabase
          .from('stock_levels')
          .insert({
            store_id: stock.store_id,
            item_id: toItemId,
            qty: stock.qty,
            reserved: stock.reserved,
          });
      }

      // Delete old stock level
      await supabase
        .from('stock_levels')
        .delete()
        .eq('item_id', fromItemId);
    }
  }

  // Transfer competitor prices
  const { data: competitorPrices } = await supabase
    .from('competitor_prices')
    .select('*')
    .eq('item_id', fromItemId);

  if (competitorPrices && competitorPrices.length > 0) {
    for (const price of competitorPrices) {
      // Upsert to kept item (will overwrite if exists)
      await supabase
        .from('competitor_prices')
        .upsert({
          item_id: toItemId,
          competitor_name: price.competitor_name,
          competitor_price: price.competitor_price,
          competitor_url: price.competitor_url,
        }, {
          onConflict: 'item_id,competitor_name',
        });

      // Delete old competitor price
      await supabase
        .from('competitor_prices')
        .delete()
        .eq('id', price.id);
    }
  }

  // Transfer batches
  await supabase
    .from('batches')
    .update({ item_id: toItemId })
    .eq('item_id', fromItemId);

  // Note: sale_items are historical data, we'll keep them linked to original item
  // or you can update them if needed
}

/**
 * Delete duplicate item
 */
async function deleteDuplicate(itemId, keptItemId) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would delete item ${itemId}`);
    return;
  }

  // Transfer related data first
  await transferRelatedData(itemId, keptItemId);

  // Delete the duplicate item
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error(`   ❌ Error deleting item ${itemId}:`, error.message);
    return false;
  }

  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('🧹 Duplicate Items Cleanup Script');
  console.log('='.repeat(50));
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No items will be deleted\n');
  } else {
    console.log('⚠️  LIVE MODE - Items will be deleted!\n');
  }

  // Find duplicates by name
  const nameDuplicates = await findDuplicatesByName();
  console.log(`Found ${nameDuplicates.length} groups of duplicate names\n`);

  // Find duplicates by barcode
  const barcodeDuplicates = await findDuplicatesByBarcode();
  console.log(`Found ${barcodeDuplicates.length} groups of duplicate barcodes\n`);

  // Combine and deduplicate (avoid processing same item twice)
  const itemsToRemove = new Set();
  const itemsToKeep = new Map();

  // Process name duplicates
  for (const group of nameDuplicates) {
    itemsToKeep.set(group.keep.id, group.keep);
    group.remove.forEach(item => itemsToRemove.add(item.id));
  }

  // Process barcode duplicates
  for (const group of barcodeDuplicates) {
    if (!itemsToKeep.has(group.keep.id)) {
      itemsToKeep.set(group.keep.id, group.keep);
    }
    group.remove.forEach(item => {
      // Only remove if not already marked as keep
      if (!itemsToKeep.has(item.id)) {
        itemsToRemove.add(item.id);
      }
    });
  }

  // Remove items that are marked as keep from remove list
  itemsToKeep.forEach((item, id) => {
    itemsToRemove.delete(id);
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Items to keep: ${itemsToKeep.size}`);
  console.log(`   Items to remove: ${itemsToRemove.size}\n`);

  if (itemsToRemove.size === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  // Show what will be removed
  console.log('📋 Items to be removed:');
  const itemsToRemoveArray = Array.from(itemsToRemove);
  const { data: itemsData } = await supabase
    .from('items')
    .select('id, name, barcode')
    .in('id', itemsToRemoveArray);

  itemsData?.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.name} (${item.barcode || 'no barcode'})`);
  });

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. Run without --dry-run to actually delete.');
    return;
  }

  // Confirm deletion
  console.log('\n⚠️  About to delete the above items...');
  console.log('   Related data (stock, competitor prices, batches) will be transferred to kept items.');

  // Delete duplicates
  let deleted = 0;
  let errors = 0;

  for (const itemId of itemsToRemove) {
    // Find which item to keep (the one with highest score)
    let keptItem = null;
    let maxScore = -1;
  
    for (const item of itemsToKeep.values()) {
      // Check if this kept item has the same name or barcode
      const { data: currentItem } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();
  
      if (currentItem) {
        const { data: candidateItem } = await supabase
          .from('items')
          .select('*')
          .eq('id', item.id)
          .single();
  
        if (candidateItem) {
          const nameMatch = currentItem.name.trim().toLowerCase() === candidateItem.name.trim().toLowerCase();
          const barcodeMatch = currentItem.barcode && candidateItem.barcode && 
                               currentItem.barcode === candidateItem.barcode;
  
          if (nameMatch || barcodeMatch) {
            const score = getItemScore(candidateItem);
            if (score > maxScore) {
              maxScore = score;
              keptItem = candidateItem;
            }
          }
        }
      }
    }
    if (keptItem) {
      const success = await deleteDuplicate(itemId, keptItem.id);
      if (success) {
        deleted++;
        console.log(`   ✅ Deleted: ${itemsData?.find(i => i.id === itemId)?.name || itemId}`);
      } else {
        errors++;
      }
    } else {
      console.log(`   ⚠️  Could not find matching kept item for ${itemId}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Cleanup Summary:');
  console.log(`   ✅ Deleted: ${deleted}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

// Run the script
main().catch(console.error);

