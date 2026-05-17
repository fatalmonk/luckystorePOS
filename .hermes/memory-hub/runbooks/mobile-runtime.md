# Runbook: Mobile Runtime

## Startup Checklist

1. Bluetooth enabled
2. Printer paired (MHT-P29L)
3. Network available (or offline mode active)
4. Staging Supabase URL configured
5. App points to staging project

## Verification

| Feature | Test | Expected |
|---|---|---|
| Login | Enter credentials | Dashboard loads |
| Scan | Scan barcode | Item found |
| Sale | Add item, checkout | Queue created or sale completed |
| Print | Print receipt | Bluetooth printer responds |
| Sync | Queue screen | Pending items visible |

## Offline Mode

1. Disconnect network
2. Complete sale
3. Check queue file: `offline_transaction_queue.json`
4. Reconnect, trigger sync
5. Verify sale appears server-side

## Debugging

```bash
# View app logs
adb logcat | grep flutter

# Inspect local database (requires debug build)
# Use Flutter DevTools or custom probe
```

## Critical Paths

- `lib/shared/providers/auth_provider.dart` - Auth state
- `lib/shared/providers/pos_provider.dart` - POS state (contains legacy fields)
- `lib/features/sales/offline_transaction_sync_service.dart` - Sync queue
- `lib/offline/sync_engine.dart` - Drift sync

## Known Issues

- Legacy field references in `pos_provider.dart` (`qty`, `product_id`, `active`)
- Dual queue system (transaction queue + drift event queue)
- Audit log persistence incomplete
