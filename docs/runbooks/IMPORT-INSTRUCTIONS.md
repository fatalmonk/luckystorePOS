# Import Competitor Data - Instructions

## Issue: Invalid API Key

The service role key in the script appears to be incomplete. The key you provided might be truncated or needs to be the full JWT token.

## Solution 1: Get the Full Service Role Key

1. Go to Supabase Dashboard: https://app.supabase.com/project/hvmyxyccfnkrbxqbhlnm/settings/api
2. Find the **service_role** key (it's a secret key, much longer than what's in the script)
3. Copy the **entire** key
4. Update the script or set it as an environment variable

## Solution 2: Use Environment Variable

Set the service role key as an environment variable:

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-full-service-role-key-here"
node scripts/ops/import-competitor-data.js
```

## Solution 3: Update Script Directly

Edit `scripts/ops/import-competitor-data.js` and replace the `SUPABASE_SERVICE_KEY` constant with your full service role key.

## What the Script Does

1. **Reads all CSV files** from `data/competitors/shwapno/`
2. **Creates/updates items** in the `items` table
3. **Creates categories** if they don't exist
4. **Stores competitor prices** in the `competitor_prices` table

## Expected Output

```
🚀 Starting Shwapno Competitor Data Import
📁 CSV Directory: ...

Found 9 CSV files:
  - shwapno-bakingneeds.csv
  - shwapno-beverage.csv
  ...

📄 Processing: shwapno-bakingneeds.csv
   Found 107 products
   ✅ Items created: 50
   ✅ Items updated: 57
   ✅ Prices stored: 107

...

📊 Import Summary
✅ Items created: 500
✅ Items updated: 1200
✅ Competitor prices stored: 1700
```

## After Import

You can query competitor prices:

```sql
SELECT 
  i.name,
  i.price as your_price,
  cp.competitor_price as shwapno_price,
  (cp.competitor_price - i.price) as price_difference
FROM items i
JOIN competitor_prices cp ON cp.item_id = i.id
WHERE cp.competitor_name = 'Shwapno'
ORDER BY price_difference DESC;
```

