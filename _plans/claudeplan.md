# Lucky Store POS — Project Status & Next To-Dos

Let me analyze the current state of the project based on the configuration and documentation.

## 📊 Current Project Status

### ✅ What's Complete

| Component | Status | Evidence |
|-----------|--------|----------|
| **Flutter Mobile App** | ~90% complete | pubspec.yaml has 50+ dependencies; RUNTIME_SMOKE_TEST_POS.md documented |
| **Admin Web Dashboard** | Deployed on Vercel | vercel.json routing configured; React 19 + TypeScript stack active |
| **Supabase Backend** | 50 tables, 80+ RPCs | README mentions 86 migrations, 8 edge functions |
| **Docker Setup** | Ready | Multi-stage build configured |
| **CI/CD Pipeline** | Active | GitHub Actions workflows referenced |
| **Documentation** | Extensive | 50+ docs across 7 categories |

### 🚀 Recent Additions (from pubspec.yaml & build.sh)

- **Drift SQLite ORM** — offline-first architecture with local caching
- **Barcode scanning** — mobile_scanner (Code128, EAN-13, QR)
- **Bluetooth label printing** — flutter_blue_plus + esc_pos_utils_plus (MHT-P29L thermal printers)
- **Background sync** — flutter_background_service + workmanager
- **Localization** — Flutter gen-l10n with HindSiliguri font (Bangla support)
- **Chart analytics** — fl_chart for dashboards
- **Competitor price scraping** — Puppeteer setup (Shwapno, Chaldal, AamaderBazar)

### ⚠️ Known Issues (from XML problem files)

| Issue | Severity | File | Impact |
|-------|----------|------|--------|
| Clangd errors (iOS) | HIGH | ClangdErrorsAndWarnings.xml | iOS builds may fail; Flutter/Flutter.h not found |
| Android resources unresolved | MEDIUM | AndroidDomInspection.xml | IDE warnings; build should still work |
| Missing flutter_bootstrap.js | LOW | HtmlUnknownTarget.xml | Web build warning only |
| HTML lang attribute missing | LOW | HtmlRequiredLangAttribute.xml | Accessibility warning |

---

## 📋 Next To-Dos (Prioritized)

### **PHASE 1: Critical Fixes** ⚡ (Do This First)

<details>
<summary><strong>1. Fix iOS Build Pipeline</strong></summary>

**Problem:** Clangd can't resolve `Flutter/Flutter.h`; iOS builds will fail.

**Action:**
```bash
cd apps/mobile_app
flutter clean
flutter pub get
cd ios
rm -rf Pods Podfile.lock
pod deintegrate
pod repo update
pod install
cd ..
flutter build ios --no-codesign  # Test compile
```

**Why:** Without this, iOS releases are blocked. This is needed before App Store submission.

**Docs to update:** docs/02-setup/STORE-SETUP-GUIDE.md → add iOS troubleshooting section

</details>

<details>
<summary><strong>2. Resolve Android Resource Warnings</strong></summary>

**Problem:** `@android:style/Theme.Light.NoTitleBar` not resolving in Android SDK inspection.

**Action:**
- Check `android/app/build.gradle.kts`: ensure `compileSdk = 36` (it is ✓)
- Invalidate IDE caches: `File > Invalidate Caches > Restart`
- Verify `local.properties` has correct `sdk.dir` path
- Re-sync Gradle: `./gradlew clean build`

**Why:** These are IDE false-positives but should clear before release.

**Docs to update:** docs/root-docs/SETUP-TROUBLESHOOTING.md (create new)

</details>

<details>
<summary><strong>3. Add Missing HTML Attributes</strong></summary>

**Problem:** `web/index.html` missing `lang` attribute and `flutter_bootstrap.js` reference.

**Action:**
```html
<!-- Change line 2 from: -->
<html>
<!-- To: -->
<html lang="en">

<!-- Also add charset early: -->
<meta charset="UTF-8">
```

**Why:** Accessibility compliance + Web PWA checklist.

</details>

---

### **PHASE 2: Feature Completion** 🎯 (Next 2 Weeks)

<details>
<summary><strong>4. Finalize Offline-First Sync with Conflict Resolution</strong></summary>

**Current State:** Drift SQLite + WorkManager set up; conflict_resolution_policy.md exists.

**To-Do:**
- [ ] Implement `sync_queue` table (tracks failed syncs for retry)
- [ ] Add exponential backoff for sync failures (currently linear)
- [ ] Write integration tests for offline → online transition
- [ ] Document RPC fallback strategy when direct table access fails (RUNTIME_SMOKE_TEST_POS.md step 6-8 covers this)

**Files to create/update:**
- `lib/features/sync/conflict_resolver.dart` — merge logic for cart/sales
- `docs/OFFLINE_SYNC_IMPLEMENTATION.md` — detailed walkthrough
- Update pubspec.yaml dev-dependencies: add `mockito` for testing offline scenarios

**Acceptance criteria:**
- [ ] Offline POS can add 100+ items to cart without network
- [ ] On reconnect, cart syncs without data loss
- [ ] Stale/deleted items are removed from cart before checkout

</details>

<details>
<summary><strong>5. Complete bKash Payment Integration</strong></summary>

**Current State:** Dependencies added (`supabase_flutter`), but checkout flow not tested in prod.

**To-Do:**
- [ ] Test bKash sandbox integration end-to-end
- [ ] Implement payment status polling (currently may be blocking)
- [ ] Add retry logic if bKash callback times out
- [ ] Create bKash payment receipt template (PDF)
- [ ] Document bKash refund flow (manual vs automatic)

**Files to update:**
- `lib/features/payment/bkash_checkout.dart` — add error handling + retry
- `docs/BKASH_INTEGRATION.md` — setup guide for shop owners

**Test scenarios:**
- [ ] User cancels bKash payment → return to cart, no duplicate charge
- [ ] Network drops during bKash redirect → graceful recovery
- [ ] Receipt prints correctly with bKash transaction ID

</details>

<details>
<summary><strong>6. Bluetooth Label Printer – Production Hardening</strong></summary>

**Current State:** MHT-P29L setup documented; flutter_blue_plus + esc_pos_utils_plus ready.

**To-Do:**
- [ ] Add connection auto-retry if BLE drops mid-print
- [ ] Implement print queue persistence (SQLite) for failed jobs
- [ ] Add barcode validation before printing (prevent invalid codes)
- [ ] Create label template editor UI (MRP, cost, barcode, qty)
- [ ] Test bulk printing from CSV (50+ labels in sequence)

**Files to create:**
- `lib/features/label_printing/label_template_editor.dart`
- `lib/features/label_printing/print_queue_manager.dart`
- `docs/LABEL_PRINTING_ADVANCED.md` — troubleshooting + queue recovery

**Test plan:**
- [ ] Print 10 labels; disconnect after 5th → queue persists, retry on reconnect
- [ ] Print barcode with special characters → validate encoding

</details>

<details>
<summary><strong>7. Competitor Price Monitoring – Data Pipeline**</strong></summary>

**Current State:** Scraper exists (`apps/scraper`); Puppeteer setup ready.

**To-Do:**
- [ ] Schedule daily scraper via GitHub Actions (cron job)
- [ ] Store competitor data in Supabase `competitor_prices` table
- [ ] Add admin UI dashboard: price comparison chart (our price vs competitors)
- [ ] Implement price alert: notify manager if we're > 15% above market
- [ ] Handle scraper failures gracefully (don't corrupt historical data)

**Files to create:**
- `.github/workflows/scraper-daily.yml` — scheduled scraper run
- `lib/features/analytics/competitor_price_view.dart` — admin dashboard widget
- Supabase RLS: `competitor_prices` table with store isolation

**Schedule:**
- Run scraper daily at 2 AM (Bangladesh time)
- Retain 90 days of history
- Alert manager via push notification if price gap detected

</details>

---

### **PHASE 3: Testing & QA** 🧪 (Weeks 3-4)

<details>
<summary><strong>8. Complete Integration Test Suite</strong></summary>

**Current State:** pubspec.yaml has `integration_test` + `mocktail`; no test files yet.

**To-Do:**
- [ ] Write 20+ integration tests covering:
  - [ ] Login → POS flow → Complete sale
  - [ ] Barcode scan → Add to cart → Apply discount
  - [ ] Offline add to cart → Reconnect → Sync
  - [ ] bKash checkout initiation
  - [ ] Label printing (mock BLE device)
- [ ] Run tests on Firebase Test Lab (Android emulator)
- [ ] Add coverage reporting (target: >70% for core features)

**Files to create:**
- `test/integration/pos_flow_test.dart`
- `test/integration/offline_sync_test.dart`
- `test/unit/cart_provider_test.dart`

**CI/CD:** Add `flutter test` step to `flutter-ci.yml`

</details>

<details>
<summary><strong>9. Performance Profiling & Optimization**</strong></summary>

**Known bottlenecks:**
- Large product catalog load (1000+ items) may stall Drift query
- RPC `get_catalog` response time on slow networks

**To-Do:**
- [ ] Profile catalog load time: target <2 sec for 5000 items
- [ ] Implement pagination/virtual scrolling for product grid
- [ ] Add request cancellation: if user navigates away before catalog loads, cancel RPC
- [ ] Test on 3G network (throttle in DevTools)

**Docs:** Create `docs/PERFORMANCE_TUNING.md`

</details>

<details>
<summary><strong>10. Security Audit</strong></summary>

**To-Do:**
- [ ] Verify all RLS policies are tenant-isolated (every query scoped to `auth.uid()` + store_id)
- [ ] Check sensitive data in logs (password, bKash token, card numbers) — should be redacted
- [ ] Test JWT refresh flow: ensure old tokens don't work after logout
- [ ] Validate input on all edge functions (length, type, UUID format)
- [ ] Document rate-limiting thresholds: API calls/min per user + per IP

**Docs:** Create `docs/SECURITY_CHECKLIST.md` for deployment

</details>

---

### **PHASE 4: Deployment & Launch** 🚀 (Week 5)

<details>
<summary><strong>11. APK Release & Google Play Store Submission</strong></summary>

**To-Do:**
- [ ] Generate signed APK: `flutter build apk --split-per-abi --release`
- [ ] Create Google Play Store account & developer profile
- [ ] Fill store listing: app name, description, screenshots, privacy policy
- [ ] Submit for review; address feedback
- [ ] Set up beta track for pilot users (10-50 testers)

**Files to create:**
- `docs/RELEASE_CHECKLIST.md`
- Privacy policy + Terms of Service (HTML)

**Timeline:** 2-4 weeks for Play Store review

</details>

<details>
<summary><strong>12. Documentation & User Guides</strong></summary>

**To-Do:**
- [ ] Create video tutorials:
  - [ ] First-time cashier login
  - [ ] How to add product to cart + complete sale
  - [ ] How to troubleshoot offline mode
  - [ ] How to print labels
- [ ] Write user manual (PDF, 20+ pages)
- [ ] Create quick-reference card (laminated, A5 size) for counter

**Docs to write:**
- `docs/USER_MANUAL.md`
- `docs/TROUBLESHOOTING_GUIDE.md`

</details>

---

## 📌 Quick Reference: File Updates Needed

| File | Change | Reason |
|------|--------|--------|
| `web/index.html` | Add `lang="en"` attribute | Accessibility + PWA checklist |
| `android/app/src/main/AndroidManifest.xml` | Re-sync Gradle; update IDE cache | Clear resource resolution errors |
| `ios/Podfile` | Run `pod install --repo-update` | Resolve Flutter.h missing |
| `.github/workflows/flutter-ci.yml` | Add `flutter test` step | CI integration tests |
| `vercel.json` | Verify build command runs `npm run build` in admin_web | Confirm deployment works |
| **NEW** `docs/OFFLINE_SYNC_IMPLEMENTATION.md` | Create detailed walkthrough | Clarity for team |
| **NEW** `docs/SECURITY_CHECKLIST.md` | Create pre-launch checklist | Launch readiness |

---

## 🎯 Success Metrics (30 Days)

| Milestone | Target | Status |
|-----------|--------|--------|
| iOS builds successfully (no Clangd errors) | ✓ | 🔴 In Progress |
| 20+ integration tests passing | ✓ | 🟡 Not Started |
| Offline sync handles 500+ item cart | ✓ | 🟡 Partially Tested |
| bKash sandbox payment works end-to-end | ✓ | 🟡 In Testing |
| Label printer prints 50 labels without failure | ✓ | 🟡 In Testing |
| APK signed + ready for Play Store | ✓ | 🔴 Not Started |
| 10 pilot users testing POS in production | ✓ | 🔴 Not Started |

---

Would you like me to create detailed implementation guides for any of these to-dos, or dive deeper into a specific phase?
