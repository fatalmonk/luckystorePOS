# Lucky Store POS 90-Day Execution Plan

**Goal:** Build a reliable, offline-capable POS that prioritizes inventory truth and accelerates cash recovery.

---

## Phase 0 – Codebase Lockdown (Days 1-7)

### Task 0.1: Feature-Based Architecture
- **Action:** Refactor `lib/` into a feature-centric structure. Create directories: `lib/features/sales/`, `lib/features/inventory/`, `lib/features/auth/`, `lib/features/reports/`, and `lib/core/`.
- **Files:** `pubspec.yaml`, `analysis_options.yaml`
- **Note:** Focus solely on file relocation; no logic changes.

### Task 0.2: Core Layer Implementation
- **Action:** Establish core modules: `lib/core/network/`, `lib/core/db/`, `lib/core/errors/`, `lib/core/utils/`.
- **Files:** Create `lib/core/network/network_config.dart`, `lib/core/db/database.dart`, `lib/core/errors/exceptions.dart`, `lib/core/utils/result.dart`.

### Task 0.3: Standard Error Handling
- **Action:** Define a `Result` type for consistent error handling across the app.
- **Files:** `lib/core/utils/result.dart`

### Task 0.4: Git Discipline
- **Action:** Implement Git branch rules: `main` (production), `develop` (staging), `feature/*` (new work), `hotfix/*` (urgent fixes).
- **Files:** `README.md`

---

## Phase 1 – Inventory Truth Engine (Days 8-21)

### Task 1.1: Supabase Inventory RPC
- **Action:** Write an RPC for stock deduction: `deduct_stock(product_id, quantity, store_id)`.
- **Files:** `supabase/migrations/XXXX_create_deduct_stock_rpc.sql`
- **Criteria:** Atomic transaction, FOR UPDATE lock, prevents negative stock, logs to stock ledger.

### Task 1.2: Stock Ledger Table
- **Action:** Create a `stock_ledger` table in Supabase.
- **Files:** `supabase/migrations/XXXX_create_stock_ledger.sql`

### Task 1.3: Replace Direct Stock Updates
- **Action:** Identify all client-side inventory updates and replace them with `InventoryRepository.deductStock()`.
- **Files:** `lib/features/inventory/inventory_repository.dart`, `lib/features/sales/sale_controller.dart`

### Task 1.4: Audit Trail Implementation
- **Action:** Log every inventory change with context.
- **Files:** `lib/features/inventory/audit_service.dart`

---

## Phase 2 – Offline Engine (Days 22-40)

### Task 2.1: Drift DB Integration
- **Action:** Implement a local SQLite database using Drift.
- **Files:** `lib/core/db/drift_database.dart`, `lib/core/db/tables.dart`

### Task 2.2: Sync Engine
- **Action:** Build a queue-based sync system with retry capabilities.
- **Files:** `lib/core/sync/sync_engine.dart`

### Task 2.3: Offline Sale Flow
- **Action:** Modify checkout to support offline operations.
- **Files:** `lib/features/sales/sale_repository.dart`, `lib/features/sales/offline_sale_service.dart`

### Task 2.4: Conflict Resolution Rules
- **Action:** Document and enforce the rule that the server is the single source of truth.
- **Files:** `docs/conflict_resolution_policy.md`

---

## Phase 3 – Cashier Speed System (Days 41-55)

### Task 3.1: Barcode Instant Add
- **Action:** Optimize barcode scanning for instant product addition to cart.
- **Files:** `lib/features/sales/barcode_scanner_service.dart`

### Task 3.2: One-Tap Checkout
- **Action:** Simplify checkout flow to Scan → Add → Pay → Print.
- **Files:** `lib/features/sales/checkout_screen.dart`

### Task 3.3: Cart State Optimization
- **Action:** Centralize cart state management in a single controller.
- **Files:** `lib/features/sales/cart_controller.dart`

---

## Phase 4 – Printer Reliability (Days 56-65)

### Task 4.1: Unified Printer Interface
- **Action:** Create a standardized `PrinterService`.
- **Files:** `lib/core/services/printer/printer_service.dart`

### Task 4.2: Print Retry Queue
- **Action:** Implement a retry mechanism for failed print jobs.
- **Files:** `lib/core/services/printer/print_retry_queue.dart`

---

## Phase 5 – Owner Retention Engine (Days 66-80)

### Task 5.1: Daily WhatsApp Report
- **Action:** Automate daily sales summaries via WhatsApp.
- **Files:** `lib/features/reports/whatsapp_report_service.dart`

### Task 5.2: Due Reminder System
- **Action:** Send automated reminders for overdue payments.
- **Files:** `lib/features/collections/due_reminder_service.dart`

### Task 5.3: Low Stock Alerts
- **Action:** Notify users when inventory is low.
- **Files:** `lib/features/inventory/low_stock_alert_service.dart`

---

## Phase 6 – Go-To-Market (Days 81-90)

### Task 6.1: Landing Page
- **Action:** Develop a simple landing page for product marketing.
- **Files:** `landing/index.html`

### Task 6.2: Demo Script
- **Action:** Create a sales demonstration script focused on speed and reliability.
- **Files:** `docs/sales_demo_script.md`

### Task 6.3: Pilot Stores
- **Action:** Engage 10 pilot stores for early user feedback.
- **Files:** `docs/pilot_program_criteria.md`

### Task 6.4: Referral System
- **Action:** Design a referral program to incentivize user acquisition.
- **Files:** `docs/referral_system.md`

---

## Non-Negotiable Rules

1. **Stability First:** No new features until Phase 1 and 2 are complete and stable.
2. **Testing:** Every feature must pass offline, crash, and duplicate transaction tests.
3. **Inventory Integrity:** Pause all work if inventory accuracy is compromised.

---

## Success Criteria

- **Week 2:** Feature-based architecture complete, core modules established
- **Week 4:** Inventory RPC working, stock ledger implemented
- **Week 6:** Offline mode functional, sync engine operational
- **Week 8:** Cashier speed optimized, barcode scanning instant
- **Week 9:** Printer reliability guaranteed with retry mechanism
- **Week 10-12:** Owner retention features live, go-to-market initiated
- **Week 13:** First 10 pilot stores onboarded, feedback collected
