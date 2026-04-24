# Remove Duplicate Items - Guide

## Overview

This script finds and removes duplicate items from your database. It identifies duplicates by:
- **Exact name match** (case-insensitive)
- **Same barcode**

## How It Works

1. **Finds duplicates** - Groups items by name and barcode
2. **Keeps the best** - Retains the item with the most complete data (has barcode, image, category, etc.)
3. **Transfers data** - Moves related data (stock levels, competitor prices, batches) to the kept item
4. **Deletes duplicates** - Removes the duplicate items (except protected historical-sale records)

## Usage

### Dry Run (Recommended First)

See what would be deleted without actually deleting:

```bash
npm run remove-duplicates:dry-run
# or
node scripts/ops/remove-duplicate-items.js --dry-run
```

### Actually Delete Duplicates

After reviewing the dry run, delete duplicates:

```bash
npm run remove-duplicates
# or
node scripts/ops/remove-duplicate-items.js
```

## What Gets Transferred

When a duplicate is deleted, the following data is transferred to the kept item:

- ✅ **Stock levels** - Quantities are merged
- ✅ **Competitor prices** - Moved to kept item
- ✅ **Batches** - Reassigned to kept item
- ⏭️ **Sale items** - **Conservative policy**: if linked `sale_items` rows exist, the duplicate is skipped (not deleted).


## sale_items Deletion Policy (Conservative)

The script explicitly checks `sale_items` before deleting each duplicate item.

- If `sale_items.item_id = fromItemId` exists, deletion is skipped and the script logs a clear reason.
- This matches `supabase/migrations/20260420100000_pos_transactions.sql`, where `sale_items.item_id` is defined with `ON DELETE RESTRICT`.
- Result: historical sale line items keep their original item linkage, and cleanup continues for other duplicates.

## Item Selection Logic

The script keeps the item with the highest "completeness" score:

- Barcode: +10 points
- SKU: +5 points
- Image URL: +3 points
- Category: +2 points
- Price > 0: +1 point
- Cost > 0: +1 point

## Example Output

```
🧹 Duplicate Items Cleanup Script
==================================================
⚠️  DRY RUN MODE - No items will be deleted

🔍 Finding duplicates by name...
Found 15 groups of duplicate names

🔍 Finding duplicates by barcode...
Found 3 groups of duplicate barcodes

📊 Summary:
   Items to keep: 18
   Items to remove: 25

📋 Items to be removed:
   1. Herman Chilly Mayonnaise 500ml (no barcode)
   2. Crown Peanut Butter Chunky 510gm (1234567890123)
   ...

✅ Dry run complete. Run without --dry-run to actually delete.
```

## Safety Features

- ✅ **Dry run mode** - Test before deleting
- ✅ **Data transfer** - Related data is preserved
- ✅ **Score-based selection** - Keeps the most complete item
- ✅ **Detailed logging** - Shows what will be deleted and what is skipped

## Important Notes

⚠️ **This action cannot be undone!** Always run dry-run first.

⚠️ **Backup recommended** - Consider backing up your database before running.

⚠️ **Sale history** - Historical sales remain linked to the original item ID for audit purposes.

## Troubleshooting

### "No duplicates found"
- Your database is clean! ✅

### "Error: SUPABASE_SERVICE_ROLE_KEY not found"
- Make sure you have a `.env` file with the service role key
- See `docs/runbooks/SETUP-SERVICE-KEY.md` for setup instructions

### Items not being deleted
- Check if items have related data that prevents deletion
- If items are linked in `sale_items`, they are counted under **Skipped** (not **Errors**)

## Related Scripts

- `import-competitor-data.js` - Import competitor data (may create duplicates)
- `remove-duplicate-items.js` - This script (removes duplicates)

