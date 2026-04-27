# POS Implementation Guide

## Overview

This guide covers the complete implementation of the POS (Point of Sale) system for Lucky Store. The POS is a full-featured billing interface with real-time inventory integration, receipt printing, and keyboard-first navigation.

## Features Implemented

### ✅ Phase 3.1: POS Layout & UI

- **3-Column Layout**: Items, Bill, Payment sections
- **Keyboard-First Navigation**: 
  - Barcode input auto-focuses on load
  - Enter key submits barcode
  - Arrow keys navigate suggestions
  - Escape closes suggestions
- **Barcode Input Field**: Always ready for scanning
- **Item Search with Autocomplete**: 
  - Debounced search (300ms)
  - Up to 10 suggestions
  - Keyboard navigation
- **Category Grid Display**: 
  - Browse by category
  - Click to view items in category
  - Back button to return to categories
- **Bill Table**: 
  - Editable quantities
  - Editable prices
  - Remove items
  - Real-time total calculation
- **Payment Summary Panel**: 
  - Subtotal
  - Discount input
  - Total
  - Cash payment input
  - Change calculation
- **Number Pad Component**: 
  - Digits 0-9, decimal point
  - Backspace
  - Works with any focused input

### ✅ Phase 3.2: POS Core Functions

- **Barcode Scanning**: Enter barcode → press Enter → item added to bill
- **Item Search by Name**: Type 2+ characters → suggestions appear
- **Add Item to Bill**: 
  - From barcode
  - From search
  - From category grid
  - Auto-increments quantity if item already in bill
- **Update Quantity/Price in Bill**: Direct editing in bill table
- **Remove Item from Bill**: Click remove button
- **Calculate Totals**: 
  - Real-time subtotal
  - Discount application
  - Final total
  - Change calculation
- **Payment Input**: Number pad or direct input

### ✅ Phase 3.3: Checkout & Sales Creation

- **Supabase Edge Function**: `create-sale`
  - Generates receipt number using `get_new_receipt()` function
  - Validates stock availability before sale
  - Atomic stock decrement with `decrement_stock()` function
  - Creates sale record
  - Creates sale_items records
  - Logs stock movements
  - Returns receipt data
  - Handles errors (insufficient stock, validation)
- **Receipt Generation**: 
  - Displays after successful checkout
  - Shows all items, totals, change
  - Auto-prints
  - Closes automatically after printing
- **Error Handling**: 
  - Insufficient stock warnings
  - Empty bill validation
  - Insufficient payment validation
  - Network error handling

## File Structure

```
apps/frontend/
├── src/
│   ├── pages/
│   │   └── POS.tsx              # Main POS component
│   ├── components/
│   │   └── Receipt.tsx          # Receipt modal/print component
│   └── App.tsx                  # Updated with POS route

supabase/
├── functions/
│   └── create-sale/
│       └── index.ts             # Edge function for sales
└── migrations/
    └── 20231118_add_stock_functions.sql  # Stock management functions

scripts/deploy/deploy-create-sale.sh            # Deployment script
```

## Components

### 1. POS Component (`apps/frontend/src/pages/POS.tsx`)

Main POS interface with three columns:

#### Column 1: Item Selection
- Barcode input (auto-focused)
- Name search with autocomplete
- Category/Item grid display
- Back button when viewing category

#### Column 2: Bill
- Table showing all items in current bill
- Editable quantity and price fields
- Remove button per item
- Serial number, name, price, qty, total columns

#### Column 3: Payment
- Payment summary (subtotal, discount, total, cash, change)
- Number pad for quick input
- Checkout button

### 2. Receipt Component (`apps/frontend/src/components/Receipt.tsx`)

Print-friendly receipt display:
- Header with store name
- Receipt number and date
- Itemized list
- Totals breakdown
- Thank you message
- Auto-print on mount
- Close button (hidden when printing)

### 3. Create Sale Edge Function

Located at: `supabase/functions/create-sale/index.ts`

**Flow:**
1. Authenticate user
2. Validate input (items, store_id)
3. Generate receipt number
4. Check stock availability
5. Create sale record
6. Create sale_items records
7. Update stock levels (atomic decrement)
8. Log stock movements
9. Return success response

**Error Handling:**
- Unauthorized access
- Missing user profile
- Empty items list
- Missing store_id
- Insufficient stock
- Database errors

## Database Functions

### `get_new_receipt(store_id uuid)`

Atomically generates unique receipt numbers:
- Format: `{store_id}-{date}-{counter}`
- Counter resets daily per store
- Thread-safe using `ON CONFLICT`

### `decrement_stock(p_store_id uuid, p_item_id uuid, p_quantity integer)`

Atomically decrements stock:
- Updates `stock_levels` table
- Only decrements if sufficient stock exists (`qty >= p_quantity`)
- Throws exception if insufficient stock
- Prevents negative stock

### `upsert_stock_level(p_store_id uuid, p_item_id uuid, p_quantity integer)`

Adds or increments stock:
- Inserts new stock level if doesn't exist
- Increments existing stock level
- Used for receiving inventory

## Database Schema Updates

Added in migration `20231118_add_stock_functions.sql`:

1. **Functions**: `decrement_stock`, `upsert_stock_level`
2. **Column**: `users.store_id` (cashier's default store)
3. **Indexes**:
   - `idx_stock_levels_store_item`
   - `idx_sale_items_sale_id`
   - `idx_sale_items_item_id`
   - `idx_sales_store_id`
   - `idx_sales_created_at`
   - `idx_sales_receipt_number`
   - `idx_stock_movements_store_id`
   - `idx_stock_movements_item_id`
   - `idx_stock_movements_created_at`

## Deployment Steps

### 1. Apply Database Migration

```bash
# Using Supabase CLI
cd /path/to/project
supabase db push
```

Or manually run the SQL in Supabase Dashboard → SQL Editor:
```sql
-- Contents of supabase/migrations/20231118_add_stock_functions.sql
```

### 2. Deploy Edge Function

```bash
# Make script executable
chmod +x deploy-create-sale.sh

# Deploy function
./scripts/deploy/deploy-create-sale.sh
```

Or manually:
```bash
supabase functions deploy create-sale --no-verify-jwt
```

### 3. Set Up Environment Variables

Ensure your `.env.local` file has:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Update User Profiles

Add store_id to user profiles:
```sql
-- Set default store for cashiers
UPDATE users 
SET store_id = (SELECT id FROM stores LIMIT 1)
WHERE role IN ('cashier', 'manager');
```

### 5. Initialize Stock Levels

For existing items, create initial stock levels:
```sql
-- Insert initial stock for all items at main store
INSERT INTO stock_levels (store_id, item_id, qty)
SELECT 
  (SELECT id FROM stores LIMIT 1) as store_id,
  id as item_id,
  0 as qty
FROM items
ON CONFLICT DO NOTHING;
```

### 6. Run Frontend

```bash
cd apps/frontend
npm run dev
```

Navigate to: `http://localhost:5173/pos`

## Usage Guide

### For Cashiers

1. **Start a Sale**:
   - Barcode input is auto-focused
   - Scan items or type barcode + Enter
   - Or search by name
   - Or browse categories and click items

2. **Modify Bill**:
   - Click on quantity/price to edit
   - Click Remove to delete item
   - Changes update totals in real-time

3. **Checkout**:
   - Enter bill discount if any
   - Enter cash payment amount
   - Verify change is correct
   - Click Checkout
   - Receipt will print automatically

4. **After Sale**:
   - Receipt closes after printing
   - Bill is cleared
   - Ready for next customer

### Keyboard Shortcuts

- **Barcode Input**: Always focused, press Enter to submit
- **Name Search**: Type 2+ characters
  - `↓`: Next suggestion
  - `↑`: Previous suggestion
  - `Enter`: Select suggestion
  - `Esc`: Close suggestions
- **Number Pad**: Click to append to focused input
- **Tab**: Navigate between inputs

## Testing Checklist

### Manual Testing

- [ ] Barcode scanning adds item to bill
- [ ] Name search shows suggestions
- [ ] Clicking category shows items
- [ ] Clicking item adds to bill
- [ ] Quantity increase when adding same item
- [ ] Edit quantity updates line total
- [ ] Edit price updates line total
- [ ] Remove item works
- [ ] Subtotal calculates correctly
- [ ] Discount applies correctly
- [ ] Cash payment accepts input
- [ ] Change calculates correctly
- [ ] Checkout with empty bill shows error
- [ ] Checkout with insufficient payment shows error
- [ ] Successful checkout shows receipt
- [ ] Receipt prints automatically
- [ ] Bill clears after receipt close
- [ ] Stock decrements after sale

### Edge Cases

- [ ] Item not found by barcode
- [ ] No search results
- [ ] Empty category
- [ ] Insufficient stock
- [ ] Negative quantity entry
- [ ] Zero price entry
- [ ] Network error during checkout
- [ ] Multiple concurrent checkouts

## Known Limitations

1. **Store Selection**: Currently uses `profile.store_id` - need to add store selector UI
2. **Offline Mode**: Not yet implemented (Phase 5)
3. **Hold Bills**: Not yet implemented (Phase 7.3)
4. **Returns**: Not yet implemented (Phase 7.1)
5. **Multiple Payment Methods**: Only cash supported currently

## Next Steps

### Immediate Priorities

1. Add store selector dropdown in POS header
2. Add "Hold Bill" functionality
3. Add receipt printing via thermal printer (WebUSB or local agent)
4. Add sales history view

### Phase 4: Realtime Sync

- Subscribe to stock_levels changes
- Subscribe to sales changes
- Update UI when changes occur
- Multi-counter synchronization

### Phase 5: Offline Support

- IndexedDB queue for offline sales
- Sync worker
- Conflict resolution

### Phase 7: Advanced Features

- Returns & refunds
- Reports & analytics
- Hold & resume bills

## Troubleshooting

### Receipt Not Printing

**Issue**: Receipt modal shows but doesn't print

**Solution**: 
- Check browser print settings
- Ensure pop-ups are allowed
- Try manually: `window.print()` in console

### Stock Not Decrementing

**Issue**: Sale completes but stock unchanged

**Solution**:
1. Check if `decrement_stock` function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'decrement_stock';
   ```
2. Check if stock_levels row exists:
   ```sql
   SELECT * FROM stock_levels WHERE item_id = 'your-item-id';
   ```
3. Check stock_movements for logs:
   ```sql
   SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 10;
   ```

### Edge Function Errors

**Issue**: Checkout fails with 500 error

**Solution**:
1. Check function logs:
   ```bash
   supabase functions logs create-sale
   ```
2. Verify environment variables in Supabase Dashboard
3. Check RLS policies on tables
4. Verify user profile exists with store_id

### Barcode Input Not Auto-Focusing

**Issue**: Must manually click barcode input

**Solution**:
- Check if other modals/dialogs are open
- Check for JavaScript errors in console
- Verify ref is properly connected
- Add manual focus in useEffect

## API Reference

### Edge Function: `create-sale`

**Endpoint**: `POST /functions/v1/create-sale`

**Headers**:
```
Authorization: Bearer {user-token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "store_id": "uuid",
  "items": [
    {
      "item_id": "uuid",
      "quantity": 2,
      "price": 120.50
    }
  ],
  "discount": 10.00,
  "payment_method": "cash",
  "payment_meta": {
    "cash_paid": 250.00,
    "change": 9.00
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "receipt_number": "store-uuid-2023-11-18-00001",
  "sale_id": "sale-uuid",
  "total": 241.00,
  "items": 2
}
```

**Error Response** (400):
```json
{
  "success": false,
  "error": "Insufficient stock for Parachute Oil. Available: 5, Required: 10"
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review edge function logs
3. Check Supabase dashboard for RLS policy issues
4. Verify database migrations applied correctly

## Credits

Built following Phase 3 of the Lucky POS Execution Plan.

