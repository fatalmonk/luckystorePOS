# Customer Storefront Review Fixes

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Address review findings from PR #184 (`42ff3d9`) — remove lint issues, replace alert with toast, clarify prototype intent, and harden currency formatting.

**Architecture:** Small, independent fixes in the new `apps/customer_storefront` Next app. No shared-state coupling with `admin_web` yet; this plan treats the storefront as a prototype boundary and makes that explicit.

**Tech Stack:** Next 15, React 19, TypeScript, Tailwind CSS, local state + localStorage.

---

### Task 1: Remove unused `Link` import from cart page

**Objective:** Fix lint/build failure caused by unused import.

**Files:**
- Modify: `apps/customer_storefront/app/cart/page.tsx:5`

**Step 1: Remove dead import**

Remove the line:
```tsx
import Link from 'next/link';
```

**Step 2: Verify lint passes**

Run: `cd apps/customer_storefront && npm run lint`
Expected: No "no-unused-vars" error on cart page.

**Step 3: Commit**

```bash
git add apps/customer_storefront/app/cart/page.tsx
git commit -m "fix: remove unused Link import from cart page"
```

---

### Task 2: Replace `alert()` with toast in order page

**Objective:** Remove native `alert()` and use existing `ToastProvider`.

**Files:**
- Modify: `apps/customer_storefront/app/order/OrderContent.tsx:129-132`

**Step 1: Add toast import**

```tsx
import { useToast } from '../components/Toast';
```

**Step 2: Use toast inside `OrderContent`**

Add:
```tsx
const { showToast } = useToast();
```

Replace:
```tsx
navigator.clipboard.writeText(window.location.href);
alert('Order link copied');
```

With:
```tsx
navigator.clipboard.writeText(window.location.href).then(
  () => showToast('Order link copied'),
  () => showToast('Failed to copy link')
);
```

**Step 3: Verify behavior**

Run: `cd apps/customer_storefront && npm run dev`
Manual: open `/order`, click Share Order, confirm toast appears.

**Step 4: Commit**

```bash
git add apps/customer_storefront/app/order/OrderContent.tsx
git commit -m "fix: replace alert with toast in order page"
```

---

### Task 3: Add currency formatter and use in cart/checkout totals

**Objective:** Replace raw `৳{val}` interpolation with locale-safe formatting.

**Files:**
- Create: `apps/customer_storefront/app/lib/format.ts`
- Modify: `apps/customer_storefront/app/cart/page.tsx`
- Modify: `apps/customer_storefront/app/checkout/page.tsx`
- Modify: `apps/customer_storefront/app/page.tsx`
- Modify: `apps/customer_storefront/app/order/OrderContent.tsx`

**Step 1: Add formatter utility**

`apps/customer_storefront/app/lib/format.ts`:
```ts
export const fmtMoney = (n: number) =>
  new Intl.NumberFormat('bn-BD', {
    maximumFractionDigits: 0,
  }).format(n);
```

**Step 2: Update cart page**

In `apps/customer_storefront/app/cart/page.tsx`, replace:
- `৳{item.price}` → `৳{fmtMoney(item.price)}`
- `৳{item.price * item.qty}` → `৳{fmtMoney(item.price * item.qty)}`
- `৳{subtotal}` → `৳{fmtMoney(subtotal)}`
- `৳${deliveryFee}` → `৳{fmtMoney(deliveryFee)}`
- `−৳{discount}` → `−৳{fmtMoney(discount)}`
- `৳{total}` → `৳{fmtMoney(total)}`

Import: `import { fmtMoney } from '../lib/format';`

**Step 3: Update checkout page**

Same replacements for `subtotal`, `deliveryFee`, `total`, and line-item `item.price * item.qty`.

Import: `import { fmtMoney } from '../lib/format';`

**Step 4: Update home page**

Replace `৳{totalPrice}` with `৳{fmtMoney(totalPrice)}`.

Import: `import { fmtMoney } from './lib/format';`

**Step 5: Update order page**

Replace `৳{order.total}` and `Pay ৳${order.total}` with `fmtMoney`.

Import: `import { fmtMoney } from '../lib/format';`

**Step 6: Verify build**

Run: `cd apps/customer_storefront && npm run build`
Expected: build succeeds.

**Step 7: Commit**

```bash
git add apps/customer_storefront/app/lib/format.ts \
      apps/customer_storefront/app/cart/page.tsx \
      apps/customer_storefront/app/checkout/page.tsx \
      apps/customer_storefront/app/page.tsx \
      apps/customer_storefront/app/order/OrderContent.tsx
git commit -m "refactor: use Intl currency formatter across storefront"
```

---

### Task 4: Add prototype status note to storefront README

**Objective:** Make it explicit that customer storefront is a prototype and not yet wired to live inventory/orders.

**Files:**
- Modify: `apps/customer_storefront/README.md` (create if absent)

**Step 1: Write README**

Create `apps/customer_storefront/README.md`:
```md
# Customer Storefront

Prototype. Not connected to `admin_web` inventory or Supabase orders yet.
Data is local + in-memory sample catalog for demo purposes.

## Run
cd apps/customer_storefront && npm install && npm run dev
```

**Step 2: Commit**

```bash
git add apps/customer_storefront/README.md
git commit -m "docs: mark customer storefront as prototype"
```

---

### Task 5: Smoke-test the core customer flow

**Objective:** Manual verification that Home → Cart → Checkout → Order confirmation renders.

**Files:** none

**Step 1: Start dev server**

Run: `cd apps/customer_storefront && npm run dev`

**Step 2: Verify pages**
- `/` renders categories and products
- `/category` renders category listing
- `/product/p1` renders product detail
- Add item, `/cart` shows qty controls
- `/checkout` form submits to `/order?num=...`

**Step 3: Record result**

If any page 500s, capture error and add a follow-up task.

---

### Open Questions
- Should the storefront consume real product/stock from `admin_web` Supabase tables? If yes, plan a data fetch layer.
- Should orders persist to the shared database, or remain local-only?
- Are there test requirements for the new app in CI?
