import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Load env
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '');
    env[key] = val;
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Querying Supabase for products missing images...');
    
    // Fetch all items with NULL image_url
    const { data: items, error } = await supabase
      .from('items')
      .select('sku, name, brand, price')
      .is('image_url', null)
      .order('brand', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }
    
    console.log(`Found ${items.length} items missing images.`);

    // Group by brand
    const grouped = {};
    for (const item of items) {
      const brand = item.brand || 'No Brand';
      if (!grouped[brand]) grouped[brand] = [];
      grouped[brand].push(item);
    }

    // Build Markdown report
    let md = `# Products Missing Images\n\n`;
    md += `There are **${items.length}** products currently missing images in the catalog.\n\n`;
    
    md += `## Summary by Brand\n\n`;
    md += `| Brand | Count |\n`;
    md += `| :--- | :---: |\n`;
    
    // Sort brands by count descending
    const brandsSorted = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);
    for (const brand of brandsSorted) {
      md += `| **${brand}** | ${grouped[brand].length} |\n`;
    }
    md += `\n`;

    md += `## Detailed Product List\n\n`;
    for (const brand of brandsSorted) {
      md += `### ${brand} (${grouped[brand].length} products)\n\n`;
      md += `| SKU | Product Name | Price |\n`;
      md += `| :--- | :--- | :---: |\n`;
      for (const item of grouped[brand]) {
        md += `| \`${item.sku}\` | **${item.name}** | ৳${item.price} |\n`;
      }
      md += `\n`;
    }

    const reportPath = "/Users/mac.alvi/.gemini/antigravity-ide/brain/b357a69f-fa8d-48eb-99de-a7fe4e50eeb3/missing_images.md";
    writeFileSync(reportPath, md);
    console.log(`Saved report to ${reportPath}`);

  } catch (err) {
    console.error('Database query failed:', err.message);
  }
}

main();
