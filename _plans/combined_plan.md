# Combined Plan: Lucky Store POS

This plan combines the remaining tasks from `kimik2plan.md` (Product/Single-Store focus) and `claudeplan.md` (Technical/Full-stack roadmap).

---

## 🛑 Priority 1: Critical Fixes & Unblocking
*Tasks that block builds, deployments, or have compilation errors.*

- [ ] **Fix bKash Checkout Compilation Errors**: Resolve invalid constant values in `apps/mobile_app/lib/features/checkout/presentation/screens/bkash_checkout.dart`.
- [ ] **Fix iOS Build Pipeline**: Resolve Clangd errors and `Flutter/Flutter.h` missing issue in iOS directory.
- [ ] **Resolve Android Resource Warnings**: Fix `@android:style/Theme.Light.NoTitleBar` resolution in Android SDK.
- [ ] **Add Missing HTML Attributes**: Fix `web/index.html` by adding `lang="en"` and charset.

---

## 🛒 Priority 2: Core POS Features (Counter Speed)
*Features from Kimik Plan focused on making the POS faster than pen and paper.*

- [ ] **Quick-add favorites grid**: Implement a grid of top 15-20 items pinned to POS home.
- [ ] **Customer phone lookup**: Auto-fill name/balance from last 4 digits of phone number using SQLite index.
- [ ] **Stock adjustment fraud prevention**: Require manager PIN for stock adjustments >5%.
- [ ] **Voice search (Bangla)**: Resolve `speech_to_text` dependency incompatibility or find an alternative.

---

## 🛡️ Priority 3: Infrastructure Hardening
*Deepening technical capabilities for offline resilience and device integration.*

### 1. Offline Sync & Resilience
- [ ] **Offline Sync Hardening**: Implement merge logic for conflict resolution and exponential backoff for sync failures.
- [ ] **Offline Sale Queue Visibility**: Complete the UI badge/indicator for "Sales Queued" (infrastructure is mostly ready).

### 2. Device Integration
- [ ] **Printer Hardening**:
    - [ ] Add connection auto-retry and print queue persistence (SQLite).
    - [ ] Add Bluetooth + battery indicator in header (Printer health).
    - [ ] Create label template editor UI.

### 3. Payments
- [ ] **Complete bKash Integration**:
    - [ ] Implement `pending_payments` table and offline queue processing.
    - [ ] Test sandbox integration end-to-end and add polling/receipts.

### 4. Scraper
- [ ] **Competitor Price Monitoring**: Schedule daily scraper via GitHub Actions and build admin UI for price comparison.

---

## 🧪 Priority 4: QA, Security & Launch
*Preparation for production release.*

- [ ] **Integration Test Suite**: Write 20+ tests covering core flows (Sale, Offline Sync, bKash).
- [ ] **Performance Profiling**: Optimize large catalog load times (<2 sec for 5000 items).
- [ ] **Security Audit**: Verify RLS isolation and sensitive data redaction in logs.
- [ ] **APK Release & Google Play Store Submission**: Generate signed APK and submit.
- [ ] **Documentation & User Guides**: Create video tutorials and user manual.
