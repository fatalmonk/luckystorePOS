#!/usr/bin/env node
/*
 * Bulk import stock-purchase suppliers into the `parties` table.
 *
 * Source: Lucky Store Expenses spreadsheet (Expense Category = "Stock Purchase")
 * Target:  supabase.public.parties (type = 'supplier' for tenant 00000000-0000-0000-0000-000000000001)
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL in .env.local (admin client).
 */
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Resolve .env.local relative to this script's location inside the repo
const repoRoot = path.resolve(__dirname, '../..');
const adminEnv = path.join(repoRoot, 'apps', 'admin_web', '.env.local');
dotenv.config({ path: adminEnv });

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Unique Stock Purchase vendors from the Expenses sheet
// (gid=0, 1154 rows / 749 Stock Purchase). Junk/typo rows excluded:
// empty vendor, "Stock Purchase", "Returned goods", "Nazirshail return",
// "M/S JIisan Enterprise..." (typo of already-imported Jisan),
// "Maggi Masala", "Dairy Milk, Tang,", "Snacks", "Bread",
// "Litchee Drink", "Fried (Korean Ramen)".
const STOCK_SUPPLIERS = [
  'A Group',
  'Aarong',
  'Abhay Distribution',
  'Abu Bakar & Co',
  'ACI',
  'Acnol Poly',
  'Ahmed',
  'AK Agro & Dairy',
  'Ames Distribution',
  'Ansar',
  'Arc Trading',
  'Army Enterprise',
  'AS Enterprise',
  'Atlantic Distribution',
  'Aura Milk',
  'Bashundhara',
  'Bengal Bakers',
  'Bismillah Enterprise',
  'Bismillah Family Food',
  'Bismillah Trading',
  'Bokkor Milk',
  'Bombay Sweets',
  'Coca-Cola',
  'Dabur',
  'Dan Cake',
  'Dano',
  'Dhakaiya Koreana',
  'Diploma',
  'Distributional House',
  'Drinko',
  'E-Village Enterprise',
  'East Baker',
  'Eggs',
  'Fair Green Distribution',
  'Farhad Store',
  'FM Distribution',
  'Fresh',
  'Fulkoli',
  'Godrej',
  'Golden Corner',
  'Green Distribution',
  'Group Star',
  'Hamdard Departmental Store',
  'Haque & Sons',
  'Harpic',
  'Hithium',
  'Hoque Food Industries Limited',
  'IDC BD',
  'Igloo',
  'Incepta',
  'Islam (Mama)',
  'Islam Trading',
  'Ispahani',
  'J Traders',
  'JAK Food Enterprise',
  'Jamal Trading',
  'Janany Trading',
  'Jawad Trading',
  'JK Enterprise',
  'K K Enterprise',
  'Kaazi Farms',
  'Kabir Showdagor Store',
  'Kafil',
  'Karim Trading',
  'Kashem Drycell',
  'Kazi & Kazi Tea',
  'Kazi Cuisine',
  'Keya',
  'KGM Enterprise',
  'Khedman',
  'Kishwan',
  'Kohinoor Chemicals',
  'Lily',
  'M Network Ltd',
  'M/S Mostafa Industries',
  'M/s Shah Amanat Enterprise',
  'Maggi',
  'Marks - Bismillah Enterprise',
  'Masala',
  'Meghna',
  'Meridian',
  'Mim Enterprise',
  'Mishti Lonka',
  'Mojo',
  'Mostafa & Trading',
  'Mostofa Enterprise',
  'Mostofa Store (Pahartali)',
  'Mr. Noodles',
  'Mutual Trading',
  'Naba Shopno Trading',
  'Nahar Agro',
  'Nestle',
  'New Singapore Electronics',
  'New Zealand Dairy',
  'Olympic Industries',
  'Orchids International',
  'Pahartali',
  'Pahartali - EGG',
  'PaiMart',
  'Parachute',
  'Paragon',
  'Perfetti',
  'Pitstop',
  'Polar',
  'Potata',
  'Pran Agro Limited',
  'Prestige Bengal Ltd.',
  'Pusti',
  'Q&Q Trading Ltd',
  'Rahma Enterprise',
  'Rani Food Industries',
  'Razzak Store',
  'Rupchanda',
  'S. B. Distribution',
  'Sajeeb',
  'Savoy',
  'Seven Star Telecom',
  'Shaad',
  'Shah Amanat Corporation',
  'Simon Art and Mettalic',
  'SM Enterprise',
  'Smart Distribution',
  'SQUARE',
  'SS Enterprise',
  'SS Trade International',
  'Sumi Akter',
  'Taaza',
  'Taposh Traders',
  'Tarin Enterprise',
  'Tibbet',
  'Transtec',
  'Trustlink Distribution',
  'Tylox',
  'Unilever',
  'Well Group',
  'Z.H. Enterprise',
  'M/S Jisan Enterprise - Tang/Cadbury',
  'Noyon',
  'Kamrul',
  'Electrician Zidan',
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE URL or SERVICE_ROLE_KEY in', adminEnv);
  console.error('  NEXT_PUBLIC_SUPABASE_URL =', url ? 'set' : 'UNSET');
  console.error('  SUPABASE_SERVICE_ROLE_KEY =', key ? 'set' : 'UNSET');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

(async () => {
  // 1. Load existing supplier names for this tenant to prevent duplicates
  const existingNames = new Set();
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('parties')
      .select('name', { count: 'exact' })
      .eq('tenant_id', TENANT_ID)
      .eq('type', 'supplier')
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('Failed to fetch existing suppliers:', error.message);
      process.exit(1);
    }
    data.forEach((r) => existingNames.add(String(r.name).trim().toLowerCase()));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  // 2. Filter out already present (case-insensitive) suppliers
  const toInsert = STOCK_SUPPLIERS.filter(
    (name) => !existingNames.has(name.trim().toLowerCase())
  ).map((name) => ({
    tenant_id: TENANT_ID,
    type: 'supplier',
    name: name.trim(),
  }));

  console.log(`Existing suppliers fetched: ${existingNames.size}`);
  console.log(`New suppliers to insert: ${toInsert.length} / ${STOCK_SUPPLIERS.length}`);

  if (toInsert.length === 0) {
    console.log('No new suppliers to import. Done.');
    return;
  }

  // 3. Insert in batches (100 rows)
  let inserted = 0;
  for (const batch of chunk(toInsert, 100)) {
    const { data: rows, error } = await supabase.from('parties').insert(batch).select();
    if (error) {
      console.error('Batch insert error:', error.message);
      process.exit(1);
    } else {
      const affected = rows?.length ?? 0;
      inserted += affected;
      console.log(`  inserted ${affected} suppliers`);
    }
  }

  console.log(`Import complete. Inserted ${inserted} new suppliers.`);
})()
  .catch((err) => {
    console.error('Unexpected error:', err?.message ?? err);
    process.exit(1);
  });
