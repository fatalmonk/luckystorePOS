# POS Quick Start Guide

## 🎉 Phase 3 Complete!

All POS features have been implemented. Here's how to get started.

## What's Been Built

✅ **3-Column POS Layout**
- Items selection (barcode, search, categories)
- Bill table (editable quantities/prices)
- Payment panel (number pad, totals, checkout)

✅ **All Core Functions**
- Barcode scanning
- Name search with autocomplete
- Category browsing
- Add/update/remove items
- Real-time calculations
- Number pad for quick input

✅ **Checkout & Sales**
- Edge function for sale creation
- Atomic stock decrement
- Receipt generation
- Stock movement logging
- Error handling

## Setup Steps (5 minutes)

### 1. Apply Database Migration

In Supabase Dashboard → SQL Editor, run:

```bash
# Contents of: supabase/migrations/20231118_add_stock_functions.sql
```

Or use CLI:
```bash
cd /path/to/project
supabase db push
```

### 2. Initialize Data

In Supabase Dashboard → SQL Editor, run:

```bash
# Contents of: scripts/db/setup-pos-data.sql
```

This will:
- Create a main store
- Link users to store
- Initialize stock levels
- Add sample stock

### 3. Deploy Edge Function

```bash
# Make executable
chmod +x deploy-create-sale.sh

# Deploy
./scripts/deploy/deploy-create-sale.sh
```

Or manually:
```bash
supabase functions deploy create-sale --no-verify-jwt
```

### 4. Start Frontend

```bash
cd apps/frontend
npm run dev
```

Open: http://localhost:5173/pos

## Quick Test

1. **Login** as any user (admin/manager/cashier)
2. **Navigate** to POS from dashboard
3. **Scan/Enter** a barcode or search by name
4. **Add items** to bill
5. **Enter payment** amount
6. **Click Checkout**
7. **Receipt prints** automatically

## File Structure

```
Lucky_Store/JU79O/
├── apps/frontend/src/
│   ├── pages/
│   │   └── POS.tsx                    # Main POS component
│   ├── components/
│   │   └── Receipt.tsx                # Receipt component
│   └── App.tsx                        # Updated with POS route
│
├── supabase/
│   ├── functions/
│   │   └── create-sale/
│   │       └── index.ts               # Sale creation edge function
│   └── migrations/
│       └── 20231118_add_stock_functions.sql
│
├── scripts/
│   └── db/
│       └── setup-pos-data.sql         # Initial data setup
│
├── docs/
│   └── 05-frontend-pos/
│       └── 12-POS-IMPLEMENTATION.md   # Full documentation
│
├── deploy-create-sale.sh              # Deployment script
└── POS-QUICK-START.md                 # This file
```

## Features Showcase

### Keyboard-First Design
- Barcode input auto-focused
- Enter to submit barcode
- Tab to navigate
- Arrow keys for suggestions
- Number pad for payment

### Real-Time Calculations
- Subtotal updates instantly
- Discount applies immediately
- Change calculated automatically
- No page refresh needed

### Category Browsing
- Click category → view items
- Click item → add to bill
- Back button → return to categories

### Smart Autocomplete
- Type 2+ characters
- Shows up to 10 matches
- Keyboard navigation (↑↓)
- Enter to select

### Bill Management
- Edit quantity inline
- Edit price inline
- Remove items
- Line totals update automatically

### Payment Flow
1. Review bill
2. Add discount if any
3. Enter cash amount
4. Click checkout
5. Receipt prints
6. Bill clears automatically

## Database Functions

### `get_new_receipt(store_id)`
Generates unique receipt numbers:
- Format: `store-uuid-date-counter`
- Atomic/thread-safe
- Counter resets daily

### `decrement_stock(store_id, item_id, quantity)`
Decrements stock atomically:
- Only if sufficient stock
- Prevents negative stock
- Throws error if insufficient

### `upsert_stock_level(store_id, item_id, quantity)`
Adds or updates stock:
- Creates if doesn't exist
- Increments if exists

## Edge Function API

**Endpoint**: `POST /functions/v1/create-sale`

**Request**:
```json
{
  "store_id": "uuid",
  "items": [
    {"item_id": "uuid", "quantity": 2, "price": 120.50}
  ],
  "discount": 10.00,
  "payment_method": "cash",
  "payment_meta": {
    "cash_paid": 250.00,
    "change": 9.00
  }
}
```

**Response**:
```json
{
  "success": true,
  "receipt_number": "...",
  "sale_id": "...",
  "total": 241.00,
  "items": 2
}
```

## Common Issues & Solutions

### Receipt doesn't print
- Check browser pop-up blocker
- Allow print dialogs in browser settings
- Test with `window.print()` in console

### Stock not decrementing
- Verify migration applied: Check for `decrement_stock` function
- Check stock_levels table has rows for items
- Check stock_movements for logs

### Checkout fails
- Check edge function logs: `supabase functions logs create-sale`
- Verify user has store_id set
- Check RLS policies

### Barcode input loses focus
- Check for open modals/dialogs
- Verify no JavaScript errors in console
- Try clicking barcode input manually

## Testing Checklist

- [ ] Barcode scanning works
- [ ] Name search shows results
- [ ] Category browsing works
- [ ] Items add to bill
- [ ] Quantities editable
- [ ] Prices editable
- [ ] Remove works
- [ ] Totals calculate correctly
- [ ] Discount applies
- [ ] Payment accepts input
- [ ] Change calculates
- [ ] Checkout with empty bill errors
- [ ] Checkout with low payment errors
- [ ] Successful checkout shows receipt
- [ ] Receipt prints
- [ ] Bill clears after checkout
- [ ] Stock decrements

## Next Steps (Optional)

### Immediate Improvements
1. Add store selector in POS header
2. Add keyboard shortcut for checkout (F12)
3. Add customer display view
4. Add recent sales list

### Phase 4: Realtime Sync
- Multi-counter sync
- Stock updates in real-time
- Sales visible across devices

### Phase 5: Offline Support
- Queue sales offline
- Sync when online
- Conflict resolution

### Phase 7: Advanced Features
- Returns & refunds
- Hold & resume bills
- Reports & analytics

## Support

📚 **Full Documentation**: `docs/05-frontend-pos/12-POS-IMPLEMENTATION.md`

🔧 **Database Setup**: `scripts/db/setup-pos-data.sql`

⚙️ **Edge Function**: `supabase/functions/create-sale/index.ts`

💻 **POS Component**: `apps/frontend/src/pages/POS.tsx`

## Summary

You now have a **fully functional POS system** with:
- Keyboard-first interface
- Barcode scanning
- Smart search
- Category browsing
- Editable bill
- Payment processing
- Receipt printing
- Stock management
- Audit trail

**All Phase 3 objectives completed! 🎯**

Ready to test and deploy!

