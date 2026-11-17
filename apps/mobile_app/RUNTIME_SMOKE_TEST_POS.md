# POS Runtime Smoke Test

Use this checklist before each pilot deployment.

## Preconditions

- Supabase has at least 1 active item for the cashier store.
- A build/runtime configuration supplies `SUPABASE_URL` and
  `SUPABASE_ANON_KEY` via Dart defines; this app does not load credentials from
  a checked-in `.env` file.
- Mobile app starts and reaches login screen.

## Test Steps

1. **Login cashier**
   - Enter cashier PIN and verify navigation to POS.
   - Expected: POS loads catalog or shows explicit empty/error state.

2. **Load catalog**
   - Wait for product panel load.
   - Expected: products visible or message `No products found for store {store_id}`.

3. **Search item**
   - Search by name/SKU/barcode fragment.
   - Expected: filtered products display; clearing search restores catalog.

4. **Add to cart**
   - Tap one product tile.
   - Expected: cart count increases.

5. **Complete sale**
   - Go to charge flow and complete sale.
   - Expected: sale succeeds, cart clears, no live-validation errors.

6. **Disconnect RPC path**
   - Temporarily revoke RPC execute permissions OR force RPC failure.
   - Trigger catalog reload.
   - Expected: app auto-switches to direct mode, banner shows `DIRECT MODE ACTIVE`.

7. **Verify direct fallback**
   - Search and add product while in direct mode.
   - Expected: products still load from tables.

8. **Reconnect RPC path**
   - Restore RPC permissions/connectivity.
   - Toggle back to RPC mode and reload.
   - Expected: normal RPC loading works; no fallback error.

9. **Hard failure guard**
   - Force both RPC and direct table access to fail.
   - Expected:
     - explicit `Data load failed: ...` state with retry button
     - adding new products is blocked
     - cart stays usable for already-added items

## Pass Criteria

- No silent blank grid.
- Fallback is automatic when RPC fails.
- Live cart validation blocks stale/inactive/out-of-stock sale lines.
- Direct-mode badge appears during fallback.
