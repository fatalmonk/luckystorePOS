# Lucky Store — Project Organization & Cleanup Plan

> **Generated:** April 30, 2026  
> **Scope:** Full codebase audit, duplicate detection, redundancy analysis, and reorganization roadmap  
> **Codebase Scale:** ~5,000 files (excluding node_modules, build artifacts, .git)

---

## 1. Executive Summary

**Lucky Store** is an offline-capable retail POS (Point of Sale) system for small-to-medium retail stores. It consists of:

| Layer | Technology | Files |
|-------|-----------|-------|
| **Mobile POS** | Flutter 3.x + Drift ORM + Supabase Flutter | 95 `.dart` files |
| **Admin Web** | React 19 + TypeScript + Vite + Tailwind + TanStack Query | 29 `.ts/.tsx` files |
| **Backend** | Supabase (Postgres 17) + Edge Functions (Deno) | 58 migrations + 9 functions |
| **Scrapers** | Node.js + Puppeteer | ~4,400 files (mostly data) |
| **Scripts & Ops** | Shell, Python, SQL | 41 files |
| **Documentation** | Markdown | 62 files |

---

## 2. Critical Issues Found

### 🔴 P0 — Immediate Action Required

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Duplicate `complete_sale` RPC** defined in 3 migrations | `20260423201500_*`, `20260423213000_*`, `20260426213841_*` | **Runtime conflict** — last migration wins unpredictably |
| 2 | **Duplicate `record_purchase` RPC** in 2 migrations | `apply_purchase_receiving_v2.sql`, `20260426213841_*` | Same as above |
| 3 | **Duplicate `check_idempotency` function** in 2 migrations | `apply_purchase_receiving_v2.sql`, `20260426213841_*` | Same as above |
| 4 | **Duplicate `App.tsx`** — two entry points | `apps/admin_web/src/App.tsx` and `apps/admin_web/src/app/App.tsx` | Build ambiguity, stale code risk |
| 5 | **Duplicate `ledger_posting_queue_leases` migration** | Two timestamps: `20260423102252` and `20260423232000` | Migration conflict |
| 6 | **Duplicate `add_last_login_to_users` migration** | Two timestamps: `20260427064836` and `20260427124840` | Migration conflict |

### 🟡 P1 — High Priority Cleanup

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 7 | **Backup file `pubspec.yaml.bak`** | `apps/mobile_app/` | Clutter, 1 file |
| 8 | **Old DB backup in repo** | `archive/safe-cleanup-2026-03-25/supabasebakcup/` | Bloat, security risk |
| 9 | **Deprecated full frontend copy** | `archive/deprecated_apps/frontend/` | Complete duplicate of `apps/admin_web/` |
| 10 | **Duplicate planning doc** | `docs/chatgptplan.md` and `docs/architecture/chatgptplan.md` | Doc drift |
| 11 | **32 `.DS_Store` files** | Scattered across repo | macOS clutter |
| 12 | **Temp Excel file** | `apps/scraper/.~lucky-store-competitor-prices.xlsx` | Temp artifact |
| 13 | **Duplicate `README.md`** (7+ copies) | Root, apps/, docs/, scripts/, test/, archive/ | Information fragmentation |
| 14 | **Root `README.md` is QA doc, not project overview** | `/README.md` | Misleading for new devs |
| 15 | **IDE config files in repo** | `skills-lock.json`, `.iml` files, `.temp/` | Should be gitignored |
| 16 | **Scraper `node_modules/` committed** | `apps/scraper/node_modules/` | ~4,000 files of bloat |
| 17 | **Duplicate archive locations** | `archive/` and `docs/_archive/` | Redundant organization |

### 🟢 P2 — Medium Priority Refactoring

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 18 | **Multiple `package.json` files** (4) | Root, admin_web, scraper, deprecated_apps | Dependency sprawl |
| 19 | **Multiple `tsconfig*.json` files** (7+) | admin_web (3), deprecated_apps (3), functions (1) | Config duplication |
| 20 | **Multiple `pubspec.yaml` files** (2) | Live + archive copy | Config drift risk |
| 21 | **Scraper data files committed** | `chaldal_*_products.json`, image directories | Data bloat |
| 22 | **Documentation overlap** | `implementation-plan.md` vs `architecture/01-EXECUTION-PLAN.md` | Out-of-sync docs |
| 23 | **Migration naming inconsistency** | Some use `YYYYMMDDHHMMSS_`, others use descriptive names | Hard to order |
| 24 | **Flutter `screens/` vs `ui/pages/` split** | `lib/screens/` (25+) and `lib/ui/pages/` | Inconsistent screen organization |
| 25 | **Service layer split across 3 directories** | `lib/services/`, `lib/features/*/service.dart`, `lib/core/services/` | Hard to find services |
| 26 | **Provider layer split** | `lib/providers/` and `lib/controllers/` | Pattern inconsistency |

---

## 3. Code-Level Duplicates & Redundancies

### 3.1 Supabase RPC Duplicates

The following functions are defined **multiple times** across migrations. This is a **critical issue** because Supabase migrations run in order, and the last definition wins. If earlier migrations had different signatures or logic, they are silently overwritten.

```
complete_sale          → 3 definitions (20260423201500, 20260423213000, 20260426213841)
record_purchase        → 2 definitions (apply_purchase_receiving_v2, 20260426213841)
check_idempotency      → 2 definitions (apply_purchase_receiving_v2, 20260426213841)
get_expected_cash      → 2 definitions (20260423213000, 20260426213841)
record_cash_closing    → 2 definitions (20260423213000, 20260426213841)
```

**Root Cause:** Developers created new migrations instead of editing existing ones, likely because migrations were already applied to the dev database.

**Fix Strategy:**
1. Identify the "canonical" version (usually the latest, `20260426213841_domain_rpcs_trust_engine.sql`)
2. Remove the `CREATE OR REPLACE` from older migrations (keep `DROP IF EXISTS` for idempotency)
3. Or: consolidate all RPCs into a single `rpc/` file and have migrations only call it

### 3.2 Flutter Service Duplication

Services are scattered across **three locations** with overlapping responsibilities:

```
lib/services/                    (14 files)
├── auth_service.dart
├── bkash_service.dart
├── sslcommerz_service.dart
├── printer.dart                 ← ThermalPrinterService
├── receipt_printer_service.dart ← Another printer service
├── offline_transaction_sync_service.dart
├── startup_guard_service.dart
├── ...

lib/features/*/                  (feature-scoped services)
├── collections/due_reminder_service.dart
├── inventory/inventory_service.dart
├── inventory/inventory_repository.dart
├── sales/offline_sale_service.dart
├── sales/checkout_service.dart
├── reports/whatsapp_report_service.dart

lib/core/services/               (2 files)
├── base_service.dart
└── printer/printer_service.dart  ← Third printer service!
```

**Issues:**
- **3 printer-related services** (`printer.dart`, `receipt_printer_service.dart`, `core/services/printer/printer_service.dart`)
- **2 offline sale services** (`offline_sale_service.dart` in features, `offline_transaction_sync_service.dart` in services)
- **No clear rule** for what goes in `services/` vs `features/*/`

### 3.3 Admin Web Component Duplicates

```
src/app/App.tsx      ← Root router component
src/App.tsx          ← DUPLICATE (likely stale)
```

### 3.4 Duplicate Filenames (Cross-Directory)

The following filenames appear in multiple directories (not necessarily identical content, but potential confusion):

```
README.md          → 7+ locations
api.py             → 2+ locations (scripts/)
auth.py            → 2+ locations
base.py            → 2+ locations
.env / .env.local  → Multiple locations
```

### 3.5 Model/Type Duplication Risk

The mobile app uses Drift ORM (`lib/core/db/tables.dart`) but also has manual model classes (`lib/models/`). There may be drift between:
- `lib/models/product.dart` and the Drift `products` table definition
- `lib/models/sale_transaction_snapshot.dart` and the Supabase `sales` table schema

**Recommendation:** Generate models from Drift/Superbase schema or use a single source of truth.

---

## 4. Organizational Issues

### 4.1 Directory Structure Inconsistencies

**Flutter App (`apps/mobile_app/lib/`):**
```
❌ screens/          ← 25+ screen files (flat)
❌ ui/pages/        ← Additional pages (why separate?)
❌ widgets/         ← Only 3 widget files (underused)
❌ features/        ← Has services but no screens/widgets
❌ services/        ← 14 files (flat)
❌ core/services/   ← 2 more services
```

**Recommended structure:**
```
lib/
├── main.dart
├── app.dart
├── config/
├── core/
│   ├── db/              ← Drift setup only
│   ├── network/
│   ├── sync/
│   └── utils/
├── features/            ← One folder per feature
│   ├── auth/
│   │   ├── data/        ← Repositories, models
│   │   ├── domain/      ← Entities, use cases
│   │   └── presentation/ ← Screens, widgets, providers
│   ├── pos/
│   ├── inventory/
│   ├── sales/
│   ├── collections/
│   └── reports/
└── shared/              ← Cross-cutting widgets, services
    ├── widgets/
    ├── services/
    └── providers/
```

### 4.2 Documentation Sprawl

```
docs/
├── chatgptplan.md                    ← Duplicate of architecture/chatgptplan.md
├── implementation-plan.md            ← Overlaps with architecture/01-EXECUTION-PLAN.md
├── REPO-MIGRATION-MAP-2026-03-25.md  ← Outdated (March)
├── _archive/2026-04-27/              ← Very recent, review before keeping
├── 01-getting-started/
├── 02-setup/
├── 03-import-system/
├── 06-deployment/
├── 07-reference/
├── architecture/
├── audits/
└── runbooks/
```

**Issues:**
- Numbered folders (`01-`, `02-`) skip numbers (no `04`, `05`)
- Root-level docs overlap with subfolder docs
- `_archive/` inside `docs/` duplicates purpose of root `archive/`

### 4.3 Archive Bloat

```
archive/
├── deprecated_apps/          ← Full old frontend (~30 files)
│   └── backend/              ← Old backend code
├── safe-cleanup-2026-03-25/  ← 2 months old
│   └── supabasebakcup/       ← DB backup (should not be in git)
└── safe-cleanup-2026-03-25-pass2/
    ├── .claude/              ← IDE configs
    ├── .continue/            ← IDE configs
    ├── .trae/                ← IDE configs
    └── functions/            ← Old edge functions
```

**Issues:**
- IDE configs in archive (`.claude/`, `.continue/`, `.trae/`) — these are personal
- DB backup in git repo — security and size concern
- Two "safe-cleanup" passes suggest previous cleanup was incomplete

---

## 5. Action Plan

### Phase 1: Critical Fixes (P0) — Do First

**Goal:** Fix runtime risks and migration conflicts

| Task | File(s) | Action |
|------|---------|--------|
| 1.1 | `supabase/migrations/20260423201500_*` | Remove `CREATE OR REPLACE FUNCTION complete_sale(...)` — keep only `DROP IF EXISTS` |
| 1.2 | `supabase/migrations/20260423213000_*` | Remove `CREATE OR REPLACE FUNCTION complete_sale(...)` — keep only `DROP IF EXISTS` |
| 1.3 | `supabase/migrations/apply_purchase_receiving_v2.sql` | Remove `CREATE OR REPLACE FUNCTION record_purchase_v2(...)` and `check_idempotency(...)` — keep only `DROP IF EXISTS` |
| 1.4 | `apps/admin_web/src/App.tsx` | Delete (stale duplicate of `src/app/App.tsx`) |
| 1.5 | `supabase/migrations/20260423232000_*` | Delete (duplicate of `20260423102252_*`) |
| 1.6 | `supabase/migrations/20260427124840_*` | Delete (duplicate of `20260427064836_*`) |

**Verification:** Run `supabase db reset` locally to ensure migrations apply cleanly.

---

### Phase 2: Quick Wins (P1) — Fast Cleanup

**Goal:** Remove obvious clutter and bloat

| Task | File(s) | Action |
|------|---------|--------|
| 2.1 | `apps/mobile_app/pubspec.yaml.bak` | Delete |
| 2.2 | `apps/scraper/.~lucky-store-competitor-prices.xlsx` | Delete |
| 2.3 | All `.DS_Store` files (32) | Delete and add to `.gitignore` |
| 2.4 | `skills-lock.json` | Delete and add to `.gitignore` |
| 2.5 | `apps/mobile_app/*.iml` | Delete and add to `.gitignore` |
| 2.6 | `supabase/.temp/` | Delete and add to `.gitignore` |
| 2.7 | `deno.lock` (at root) | Review — if generated, add to `.gitignore` |
| 2.8 | `docs/chatgptplan.md` | Delete (keep `docs/architecture/chatgptplan.md`) |
| 2.9 | `archive/deprecated_apps/` | Move to external backup, then delete from repo |
| 2.10 | `archive/safe-cleanup-2026-03-25/supabasebakcup/` | Move to external backup, then delete |
| 2.11 | `archive/safe-cleanup-2026-03-25-pass2/` | Review contents, then delete (contains only IDE configs and old functions) |
| 2.12 | `docs/_archive/` | Merge into `archive/` or delete if superseded |

---

### Phase 3: Git Hygiene

**Goal:** Prevent future clutter

Update `.gitignore` at root:

```gitignore
# macOS
.DS_Store

# IDE
*.iml
.idea/
.vscode/
*.swp
*.swo
.claude/
.continue/
.trae/
skills-lock.json

# Supabase
supabase/.temp/
supabase/.branches/

# Node
node_modules/
*.lock
!package-lock.json
!yarn.lock
!pnpm-lock.yaml

# Flutter/Dart
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
pubspec.lock
build/

# Scrapers
data/
*.xlsx
*.xls
*.csv
!data/samples/

# Backups
*.bak
*.backup
supabasebakcup/

# Temp files
*~
.~*
```

---

### Phase 4: Scraper Cleanup

**Goal:** Separate code from data

| Task | Action |
|------|--------|
| 4.1 | Add `apps/scraper/node_modules/` to `.gitignore` and remove from git |
| 4.2 | Move scraped JSON files (`chaldal_*_products.json`) to `data/competitors/` or external storage |
| 4.3 | Move scraped images (`chaldal_*_images/`) to `data/competitors/images/` or external storage |
| 4.4 | Keep only the scraper **code** in `apps/scraper/` |

**Expected reduction:** ~4,000 files → ~10 files

---

### Phase 5: Documentation Consolidation

**Goal:** Single source of truth for docs

| Task | Action |
|------|--------|
| 5.1 | Rewrite root `README.md` to be a proper project overview (currently it's a QA doc) |
| 5.2 | Move `docs/implementation-plan.md` content into `docs/architecture/01-EXECUTION-PLAN.md` and delete |
| 5.3 | Consolidate setup docs: merge `docs/02-setup/` and `docs/runbooks/` |
| 5.4 | Rename numbered folders to be sequential or use descriptive names |
| 5.5 | Delete `REPO-MIGRATION-MAP-2026-03-25.md` (outdated) or move to `archive/` |
| 5.6 | Ensure each `apps/*/README.md` only covers app-specific setup |

---

### Phase 6: Flutter Code Reorganization

**Goal:** Consistent feature-based architecture

| Task | Action |
|------|--------|
| 6.1 | Merge `lib/screens/` into `lib/features/*/presentation/screens/` |
| 6.2 | Merge `lib/ui/pages/` into `lib/features/*/presentation/screens/` |
| 6.3 | Move `lib/widgets/` into `lib/shared/widgets/` |
| 6.4 | Consolidate printer services: merge `printer.dart`, `receipt_printer_service.dart`, and `core/services/printer/printer_service.dart` into a single `lib/shared/services/printer_service.dart` |
| 6.5 | Consolidate offline sale services: merge `offline_sale_service.dart` and `offline_transaction_sync_service.dart` |
| 6.6 | Move `lib/services/` files into appropriate `lib/features/*/data/` or `lib/shared/services/` |
| 6.7 | Move `lib/providers/` into `lib/features/*/presentation/providers/` |
| 6.8 | Move `lib/controllers/` into `lib/features/*/presentation/providers/` or `lib/shared/providers/` |
| 6.9 | Ensure `lib/core/` only contains infrastructure (DB, network, sync engine) |

---

### Phase 7: Admin Web Cleanup

**Goal:** Lean, consistent React structure

| Task | Action |
|------|--------|
| 7.1 | Verify `src/app/App.tsx` is the canonical entry point |
| 7.2 | Ensure `src/lib/supabase.ts` is the only Supabase client instance |
| 7.3 | Review `src/features/` for any dead code (unused imports, commented code) |
| 7.4 | Consolidate styles: `src/styles/` has 3 CSS files — consider moving to Tailwind-only |

---

### Phase 8: Supabase Backend Consolidation

**Goal:** Clean migration history and organized functions

| Task | Action |
|------|--------|
| 8.1 | Establish migration naming convention: `YYYYMMDDHHMMSS_descriptive_name.sql` |
| 8.2 | Rename non-timestamped migrations (`apply_purchase_receiving_v2.sql`, `FIX-RLS-POLICY.sql`) to follow convention |
| 8.3 | Move all RPC definitions from `migrations/` to `supabase/rpc/` as standalone files |
| 8.4 | Have migrations reference `rpc/` files using `\i` or inline them consistently |
| 8.5 | Review `supabase/functions/` for dead code (9 functions — verify all are deployed and used) |
| 8.6 | Consolidate `supabase/views/` — only 1 view, consider if more are needed |

---

### Phase 9: Root-Level Config Consolidation

**Goal:** Single config per concern

| Task | Action |
|------|--------|
| 9.1 | Root `package.json` — verify it's a workspace root (monorepo) or remove if not needed |
| 9.2 | Remove `archive/deprecated_apps/frontend/package.json` (when archive is deleted) |
| 9.3 | Ensure `tsconfig.json` files don't duplicate settings — use `extends` where possible |
| 9.4 | Review `vercel.json` — ensure it only references `apps/admin_web/` |

---

## 6. Expected Outcomes

| Metric | Before | After (Target) |
|--------|--------|----------------|
| Total files (excl. node_modules) | ~5,000 | ~500-800 |
| `.dart` files | 95 | 95 (reorganized) |
| `.ts/.tsx` files | 29 | ~25 (after dedup) |
| SQL migrations | 58 | ~55 (after dedup) |
| Edge functions | 9 | 9 (reviewed) |
| Documentation files | 62 | ~40 (consolidated) |
| Backup/temp files | 32 | 0 |
| `.DS_Store` files | 32 | 0 |
| Archive directories | 3 | 0-1 (minimal) |
| Duplicate RPC definitions | 5+ | 0 |

---

## 7. Verification Checklist

After each phase, verify:

- [ ] `supabase db reset` runs without errors
- [ ] `flutter analyze` passes with no issues
- [ ] `npm run build` (admin_web) succeeds
- [ ] `supabase functions serve` starts all functions
- [ ] Git repo size is under 50MB (check with `du -sh .git`)
- [ ] No `.DS_Store` or temp files in `git ls-files`
- [ ] All tests pass (`flutter test`, `npm test`)

---

## 8. Tools & Scripts

### Find duplicate content (not just filenames)
```bash
# Find duplicate files by content hash
find . -type f -not -path './.git/*' -not -path '*/node_modules/*' -exec md5 -q {} + | sort | uniq -d

# Find large files
find . -type f -not -path './.git/*' -not -path '*/node_modules/*' -exec ls -lh {} + | awk '{ print $5 ": " $9 }' | sort -n

# Find unused imports in Flutter
dart run import_sorter:main --exit-if-changed
```

### Migration audit
```bash
# List all CREATE OR REPLACE FUNCTION statements
grep -r "CREATE OR REPLACE FUNCTION" supabase/migrations/ | sort

# Find duplicate function names
grep -oP "CREATE OR REPLACE FUNCTION \K\w+\.?\w+" supabase/migrations/*.sql | sort | uniq -d
```

---

## 9. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Deleting wrong `App.tsx` | Low | Verify which is imported by `main.tsx` first |
| Breaking migrations by removing old RPC defs | Medium | Keep `DROP IF EXISTS`, test `db reset` |
| Losing important archive data | Low | Move to external backup before deleting |
| Flutter import paths break during reorg | Medium | Use IDE refactor tools, test build |
| Doc consolidation loses information | Low | Merge rather than delete; use git history |

---

*End of Plan*
