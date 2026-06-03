# admin_web Bug Report — 2025-06-01

**Scope:** `apps/admin_web/src/` (113 files scanned)

---

## P1 — Critical (Security / Data Loss)

| File | Line | Issue | Impact |
|------|------|-------|--------|
| `lib/debug.ts` | 1 | `(import.meta as any).env` | Type-safe bypass + potential SSR leak |
| `features/inventory/ProductUpdateDrawer.tsx` | 156, 174 | Error typed `any` | Silent failures unreported |
| `features/pos/PaymentModal.tsx` | 78 | `document.activeElement` in modal | Focus trap escape, accessibility risk |

---

## P2 — Important (Reliability / Type Safety)

| File | Line | Issue |
|------|------|-------|
| `features/inventory/ProductUpdateDrawer.tsx` | 10 | `product: any \| null` |
| `features/products/ProductAddModal.tsx` | 17 | `useState<any>` |
| `features/products/ProductEditDrawer.tsx` | 33, 50 | `useState<any>`, mutation `updates: any` |
| `features/products/ProductListPage.tsx` | 31 | `editingProduct: any` |
| `features/oauth/OAuthConsentPage.tsx` | 10 | `authDetails: any` |
| `features/dashboard/DashboardPage.tsx` | 139, 148 | `kpis: any`, `s: any` |
| `features/sales/DailySalesPage.tsx` | 138, 160, 250 | Multiple `any` in parse logic |
| `features/otherIncome/OtherIncomePage.tsx` | 51, 80, 93 | `err: any` |
| `features/staff/StaffDashboardPage.tsx` | 50 | `err: any` |
| `features/inventory/InventoryProductCard.tsx` | 108 | `err: any` |

---

## P3 — Nit (Code Quality)

| File | Line | Issue |
|------|------|-------|
| `lib/debug.ts` | 5 | `console.log` in prod |
| `features/inventory/InventoryListPage.tsx` | 363-365 | Placeholder `console.log` handlers |
| `features/sales/SalesHistoryPage.tsx` | 57 | DOM element creation for export |
| `TopHeader.tsx` | 37, 43 | DOM access without hydration guard |
| `ReceiptPreview.tsx` | 58 | Event listener on document |
| `StockUpdateDrawer.tsx` | 56, 75 | Focus trap + escape key |
| `ProductUpdateDrawer.tsx` | 89, 105 | Event listener + focus check |

---

## Summary

- **P1: 3 items** (type safety bypass, modal focus trap)
- **P2: 11 items** (wide `any` usage — type safety erosion)
- **P3: 7 items** (cleanup, DOM safety)

---
Report generated: 2025-06-01T00:00:00Z
