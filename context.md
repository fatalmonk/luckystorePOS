# Lucky Store POS

## Stack
- Flutter: 3.19 mobile app (POS + inventory)
- Supabase: Backend, auth, PostgreSQL
- Python: Scraper scripts (competitor prices)
- MHT-P29L: Bluetooth label printer

## Current Task
Complete Phase A2: Duplicate sale protection (idempotency key)

## Completed This Session
- ✅ Stock adjustment fraud protection: Manager PIN required for adjustments >5%
  - Edge function checks adjustment % against current stock
  - Returns MANAGER_AUTH_REQUIRED error code when threshold exceeded
  - Flutter retries with PIN after manager authentication
  - Fraud threshold: 5% (configurable in edge function)

## Decisions
- 20240514-1: Singleton for offline sync (single queue guarantee)
- 20240514-2: Drift for offline storage (SQLite, no deps)
- 20240514-3: 50 BD SKUs for demo mode (top 20 favorites)
- 20240514-4: speech_to_text with bn_BD locale (Bangla voice)
- 20240514-5: PyJWT not python-jose (lighter, sufficient)
- 20240514-6: Conflict resolver with last-write-wins + merge strategies
- 20240514-7: Competitor prices table with 90-day retention
- 20240514-8: Quick-add favorites grid (sales velocity sort)
- 20240514-9: Customer phone lookup (last 4 digits → auto-fill)
- 20240514-10: Offline queue badge (green/yellow/red status)
- 20240514-11: Printer health indicator (BT + battery)

## Blockers
- None active

## Resolved
- 20240514-A: Integration test compilation errors (fixed scope issues)
- 20240514-B: Merge conflict in search_tab.dart (requestId parameter)

## Completed This Session
- ✅ Offline sync service with conflict resolver
- ✅ 111 tests passing (flutter test)
- ✅ Competitor price monitoring (daily scraper + alerts)
- ✅ A1 POS speed: voice search, phone lookup, queue badge, printer status
- ✅ 50 BD demo products with favorites

## Next
Implement pending_payments table + process-bkash-queue edge function

---
Context updated: A2 bKash offline queue prep complete
File: context.md (38 lines)
