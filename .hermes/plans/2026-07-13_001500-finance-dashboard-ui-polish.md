# Finance Dashboard UI/UX Polish Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transform the finance dashboard from a functional but plain CRUD interface into a refined, editorial-quality "Lucky Store Financials" experience.

**Architecture:** Consolidate Daily Sales + Expenses into a unified Finance hub with tabbed navigation. Apply a cohesive dark-mode "Saffron on Deep Night" visual system with premium card enclosures, refined data tables, and a proper P&L overview.

**Tech Stack:** React 19, TailwindCSS 3.4, `lucide-react`, `recharts`, existing custom CSS design tokens (`var(--color-*)`).

---

## Current State (Visual Audit)

Files changed in this session:
- `apps/admin_web/src/features/finance/FinanceDashboardPage.tsx` — new finance hub shell
- `apps/admin_web/src/features/finance/ProfitAndLossTab.tsx` — new P&L overview
- `apps/admin_web/src/features/expenses/ExpensesTab.tsx` — refactored from standalone page to tab
- `apps/admin_web/src/features/sales/DailySalesTab.tsx` — refactored from standalone page to tab

**Issues Found:**

| Area | Problem | Severity |
|---|---|---|
| Tab Navigation | Text-only buttons, no pill/floating design, sits on a full-width border line | Medium |
| Date Filter Bar | Flat card with plain inputs, looks like a settings panel not a command bar | Medium |
| Metric Cards | `MetricCard` component uses light theme tokens (`bg-surface`, `border-border-default`) — looks flat and generic in the dark context | High |
| Quick Add Pinned | Ad-hoc `.bg-surface-secondary` cards with no enclosure, no hover lift | Medium |
| Expense Table | `table.expenses-table` has no visual enclosure header, sits inside a card with `padding: 0` hack | High |
| Charts | Recharts tooltips and grid lines use raw `var(--color-*)` that may not exist; `var(--color-primary)` in editable cell border likely broken | High |
| Daily Sales — Missing | The `DailySalesTab.tsx` appears to have lost all its original content during the refactor — only contains inline table editing logic, no charts, no stats | Critical |
| Chart Tooltips | Tooltip `contentStyle` references `var(--color-surface)` etc. but the design token layer may not resolve these correctly | Medium |
| Inline Edit Cell | Hardcoded `2px solid var(--color-primary)` — if `--color-primary` token missing, blue box becomes invisible | Medium |
| Responsive | No mobile considerations for the finance tab layout | Low |

**Design Token Risk:** `MetricCard` references classes like `bg-surface`, `border-border-default`, `shadow-level-1`. The project appears to use a custom CSS variable system, but `var(--color-primary)` (dash-prefixed) and `var(--primary)` (bare) conventions are mixed. Need to verify the actual token names.

---

## Proposed Visual System ("Lucky Financials")

**Vibe Archetype:** Deep Night + Saffron (not the default Ethereal Glass from the skill — this is a store admin tool, not a SaaS landing page. We adapt the skill's principles to a data-dense dashboard context).

**Brand Lock:**
- Deep Night: `#0B0B0D`
- Saffron Accent: `#f0c444`

**Adapted Principles from High-End Skill:**
- **Double-Bezel** for major stat cards and chart containers (outer shell `rounded-[1.5rem]` + inner core `rounded-[calc(1.5rem-0.375rem)]`)
- **Macro-Whitespace** increased: sections use `gap-6` minimum, cards use `p-6`
- **Custom Transitions**: `transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]` on interactive elements
- **No banned fonts** in this context — the admin web already uses system fonts. We won't switch fonts.
- **Lucide icons** are acceptable here (admin tool, not marketing site). We'll keep them.
- **Tab bar** becomes a floating pill group, detached from the edge, with active state having saffron accent

---

## Step-by-Step Plan

**Execution Order (Hard Rule):** Task 1 runs FIRST before any code changes, even though it may commit LAST. Subagents must not skip this audit.

### Task 1: Audit & Fix CSS Design Token Resolution

**Objective:** Verify the actual CSS custom properties available so our polish doesn't reference missing tokens. **THIS TASK RUNS FIRST — before any code changes.**

**Execution Rule:** Subagent must run the verification steps below before touching any other file. The findings from this task must be documented and passed as context to all subsequent tasks. If any assumed token is missing or resolves differently, the subagent must halt and report back before proceeding.

**Files:**
- Inspect: `apps/admin_web/src/styles/tokens.css`
- Inspect: `apps/admin_web/src/index.css`
- Inspect: `apps/admin_web/src/components/data-display/MetricCard.tsx`

**Verified Findings (from live audit):**
- `var(--color-primary)` → `var(--color-primary-default)` → `var(--color-accent)` → `#f0c444` ✅
- `var(--color-primary-subtle)` → `var(--color-accent-ghost)` → `rgba(240, 196, 68, 0.12)` ✅
- `var(--color-surface)` → `#ffffff` (light) / `#141417` (dark) ✅
- `var(--color-border-default)` → `var(--color-border)` → `#e7e5e4` (light) / `#3d3630` (dark) ✅
- **BUG FOUND:** `DailySalesTab.tsx:378` uses fallback `rgba(59, 130, 246, 0.1)` (blue) instead of saffron — cleanup during Task 7.

**Subagent Verification Steps:**
1. Run `grep -n "\-\-color-primary" apps/admin_web/src/styles/tokens.css` to confirm resolution chain.
2. Run `grep -rn "var(--color-primary\b" src/features/finance/ src/features/sales/ src/features/expenses/` to find all usages in changed files.
3. Document any discrepancy between assumed and actual token names.

**Verification:** `grep -r "\-\-color-" apps/admin_web/src/styles/ || grep -r "\-\-surface" apps/admin_web/src/`

---

### Task 2: Fix the DailySalesTab Content Loss (Critical)

**Objective:** The `DailySalesTab.tsx` was gutted during the rename/refactor. Charts, stats, and the full dashboard view are gone. Restore them as a tab component that accepts `startDate`/`endDate` props.

**Files:**
- Read: git history of `DailySalesPage.tsx` (pre-rename version on `main` or `origin/main`)
- Modify: `apps/admin_web/src/features/sales/DailySalesTab.tsx`

**Steps:**
1. `git show HEAD:apps/admin_web/src/features/sales/DailySalesPage.tsx` to recover the original full component.
   1b. **Fallback:** If that fails (file was git-mv'd), run `git log --all --full-history -- "**/DailySalesPage.tsx"` to find the blob's last commit and path. Then `git show <commit>:<old-path>` to recover it. Document the recovered SHA and path in a comment.
2. Wrap the original content into the `DailySalesTab` component shape with `interface DailySalesTabProps { startDate: string; endDate: string; }`.
3. Wire the existing data queries to use the prop-based date range instead of internal state.
4. Remove duplicate `PageHeader` (the parent `FinanceDashboardPage` already has one).
5. Keep the inline editing table functionality that was added during the refactor — it's actually a good improvement. But restore the charts and stat cards above it.

**Verification:**
- Run dev server, navigate to `/finance` → Sales tab.
- Confirm: metric cards, pie chart, monthly trend bar chart, daily trend line chart, top 5 days table, and inline-editable entries table all render.
- **Explicit diff check:** Run `git diff` on `DailySalesTab.tsx` after recovery. The chart data logic (`monthlyTrend`, `dailyTrend`, `paymentBreakdown`, `topSalesDays` useMemo blocks), query params (`queryKey: ['dailySales', storeId, startDate, endDate]`), and aggregation math must match the original `DailySalesPage.tsx` line-for-line (excluding the prop interface wrapper). No aggregation behavior changes permitted.
- Confirm: date filter changes in the parent bar correctly reload the data.

---

### Task 3: Redesign the Date Filter Bar

**Objective:** Make the date filter feel like a control strip, not a form card.

**File:**
- Modify: `apps/admin_web/src/features/finance/FinanceDashboardPage.tsx` lines 33-107

**Design Spec:**
- Replace the `.card.p-4.expenses-filters` wrapper with a **floating pill bar**.
- Background: `bg-[#0B0B0D]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2` (dark, frosted, pill-shaped).
- Date inputs: compact, dark-themed, `bg-transparent border-b border-white/20 focus:border-[#f0c444]` with saffron focus glow.
- Quick-select buttons: tiny pill badges, `bg-white/5 hover:bg-[#f0c444]/20 text-[#f0c444]`, `rounded-full px-3 py-1 text-xs font-medium`.
- Layout: flex row on desktop, vertical stack on mobile (<768px).

**Code Sketch:**
```tsx
<div className="flex flex-wrap items-center gap-3 px-6 mb-8">
  <div className="flex items-center gap-2 bg-[#0B0B0D]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2">
    <Calendar size={14} className="text-[#f0c444]" />
    <input type="date" value={startDate} ... className="bg-transparent border-none text-sm text-white focus:outline-none" />
    <span className="text-white/30">→</span>
    <input type="date" value={endDate} ... className="bg-transparent border-none text-sm text-white focus:outline-none" />
  </div>
  <div className="flex gap-2">
    {['This Month','Last Month','Last 3 Months','All Time'].map(label => (
      <button className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium text-[#f0c444] hover:bg-[#f0c444]/20 transition-all duration-300">
        {label}
      </button>
    ))}
  </div>
</div>
```

**Verification:** Visual check in browser — bar should look like a cohesive control strip, not a card.

---

### Task 4: Redesign the Tab Navigation

**Objective:** Convert the full-width border tab bar into a centered floating pill group.

**File:**
- Modify: `apps/admin_web/src/features/finance/FinanceDashboardPage.tsx` lines 109-140

**Design Spec:**
- Remove the `.bg-surface.border-b` container entirely.
- Replace with a centered flex row of pill buttons.
- Active tab: `bg-[#f0c444] text-[#0B0B0D] rounded-full px-5 py-2 font-semibold text-sm`
- Inactive tab: `bg-white/5 text-white/60 rounded-full px-5 py-2 font-medium text-sm hover:bg-white/10 hover:text-white transition-all duration-300`
- Icon + label inside each pill.
- Add `mb-8` below the pills.

**Verification:** Active tab is visually dominant (saffron fill). Inactive tabs recede.

---

### Task 5: Upgrade MetricCard Appearance in Finance Context

**Objective:** The `MetricCard` component is too generic. For the finance dashboard, wrap it or create a `FinanceMetricCard` variant with the double-bezel enclosure.

**File:**
- Create: `apps/admin_web/src/components/data-display/FinanceMetricCard.tsx`
- Modify: `ProfitAndLossTab.tsx` and `DailySalesTab.tsx` (wherever `MetricCard` is used)

**Design Spec (Double-Bezel for Data):**
- Outer shell: `bg-[#0B0B0D] rounded-[1.25rem] p-1.5 border border-white/10`
- Inner core: `bg-[#111113] rounded-[calc(1.25rem-0.375rem)] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]`
- Icon badge inside: `w-10 h-10 rounded-xl bg-[#f0c444]/10 flex items-center justify-center text-[#f0c444]`
- Value: `text-2xl font-bold text-white font-mono`
- Label: `text-xs uppercase tracking-wider text-white/40`
- Hover: `hover:border-[#f0c444]/30 transition-all duration-500`

**Steps:**
1. Create `FinanceMetricCard.tsx` with the above structure.
2. Replace all `MetricCard` usages in `ProfitAndLossTab.tsx` and `DailySalesTab.tsx` with `FinanceMetricCard`.
3. Verify the `ExpensesTab.tsx` metric cards also use it.

**Verification:** Cards should look like machined hardware — concentric radii, subtle inner highlight, saffron accent icon.

---

### Task 6: Polish the Expenses Dashboard Cards

**File:** `apps/admin_web/src/features/expenses/ExpensesTab.tsx` lines 356-544

**Issues:**
- Overview stats use `.bg-surface-secondary.rounded-lg` — flat, no enclosure.
- Category breakdown pie chart lacks the double-bezel container.
- Payment types list is plain text with no visual bars.

**Changes:**
1. Wrap each 2x2 stat block and the charts in the double-bezel container.
2. For the payment type breakdown, add **mini horizontal bar tracks** behind each row:
   ```tsx
   <div className="w-full bg-white/5 rounded-full h-1.5 mt-1">
     <div className="h-1.5 rounded-full bg-[#f0c444]" style={{ width: `${pt.percentage}%` }} />
   </div>
   ```
3. For category pie chart: wrap in double-bezel, add a subtle radial gradient behind the chart container (not on the chart itself) for depth.

---

### Task 7: Polish the Expenses Table Enclosure

**File:** `apps/admin_web/src/features/expenses/ExpensesTab.tsx` lines 610-675

**Issues:**
- `style={{ padding: 0, overflow: 'hidden' }}` is a hack.
- No table header strip, no column dividers.

**Changes:**
1. Replace the padding hack with a proper double-bezel wrapper:
   ```tsx
   <div className="bg-[#0B0B0D] rounded-[1.25rem] p-1.5 border border-white/10">
     <div className="bg-[#111113] rounded-[calc(1.25rem-0.375rem)] overflow-hidden">
       <table className="w-full">
         <thead className="bg-white/5 border-b border-white/10">
           ...
         </thead>
         ...
       </table>
     </div>
   </div>
   ```
2. Add sticky header behavior: `sticky top-0 z-10` on `<thead>`.
3. Row hover: `hover:bg-white/[0.03]` instead of `hover:bg-surface-secondary`.
4. Inline edit cell border: change `var(--color-primary)` to `#f0c444` (saffron) for visual consistency.

---

### Task 8: Fix Recharts Tooltip & Grid Token References

**File:** All chart-containing files: `ProfitAndLossTab.tsx`, `ExpensesTab.tsx`, `DailySalesTab.tsx`

**Token Conflict Resolution (Explicit Decision — CONDITIONAL on Task 1):**
**Default assumption:** The project has a comprehensive token system in `tokens.css`. For the Finance Dashboard, we will use **hardcoded hex values** as an intentional localized exception. **HOWEVER**, the subagent MUST first re-confirm the Task 1 findings before implementing. If the audit reveals tokens are missing or resolve differently, the decision must be re-evaluated:

- **If tokens resolve correctly (expected):** Proceed with hardcoded hex. Rationale:
  1. The Finance Dashboard should render with a consistent Deep Night aesthetic regardless of the app's global light/dark theme toggle.
  2. Recharts tooltips are HTML-based and CAN resolve CSS vars, but forcing the Deep Night palette ensures visual consistency.
  3. This is a localized, documented override — not a rejection of the token system.

- **If tokens are broken/missing (unexpected):** STOP. Report to parent agent. Do not proceed with hardcoded values until the token system is fixed or an alternative is approved.

**Exception Note:** All other non-Finance components should continue using the token system. This override is scoped strictly to the three finance tabs.

If the project later adds a formal "dark section" token namespace, these hardcoded values can be migrated.

**Changes:**
1. Replace all tooltip `contentStyle` with hardcoded dark values that match the Deep Night theme:
   ```tsx
   contentStyle={{ backgroundColor: '#0B0B0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
   labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
   ```
2. Replace `CartesianGrid` stroke with `rgba(255,255,255,0.05)`.
3. Replace `XAxis`/`YAxis` stroke with `rgba(255,255,255,0.3)`.
4. Verify each chart renders correctly after token swap.

**Exception Note:** All other non-Finance components should continue using the token system. This override is scoped strictly to the three finance tabs.

---

### Task 9: Add Empty State Polish

**File:** `apps/admin_web/src/components/PageState.tsx` or wherever `EmptyState` is defined

**Changes:**
- Ensure `EmptyState` icon wrapper uses `text-white/20` not `text-text-muted` when inside the dark finance dashboard.
- Description text: `text-white/40`.
- If `EmptyState` is used globally, pass a `theme` prop or use context. Alternatively, create a `DarkEmptyState` wrapper.

---

### Task 10: Mobile Collapse for Finance Dashboard

**File:** `apps/admin_web/src/features/finance/FinanceDashboardPage.tsx`

**Changes:**
1. Date filter bar: `flex-col` below `md`, `flex-row` above.
2. Tab pills: allow horizontal scroll on small screens (`overflow-x-auto pb-2`).
3. Card grids: `grid-cols-1` below `lg`, `grid-cols-2` above.
4. Tables: `overflow-x-auto` wrapper on all tables.

---

### Task 11: Add Scroll Entry Animation

**File:** `apps/admin_web/src/features/finance/FinanceDashboardPage.tsx` or a new wrapper

**Changes:**
- Add a subtle fade-up on tab content switch.
- Since tabs conditionally render (`{activeTab === 'pnl' && <... />}`), wrap the content in a transition container.
- Use CSS keyframes or Framer Motion (if available) for `opacity 0→1, translateY(8px→0)` over 400ms with `cubic-bezier(0.32,0.72,0,1)`.
- Simplest implementation: add a `.finance-tab-enter` CSS class with `@keyframes` and toggle it when `activeTab` changes.

---

### Task 12: Final Verification

**Commands:**
```bash
cd apps/admin_web
npm run build
npm run lint
```

**Accessibility Contrast Check:**
Run a computed-contrast verification for the two highest-risk combinations:
1. `#f0c444` (Saffron) text on `rgba(255,255,255,0.05)` (`bg-white/5`) background at 12px size:
   - Background effective color ≈ `#0B0B0D` (almost black), contrast ratio ≈ 10.5:1. **Passes WCAG AA**.
2. `#f0c444` text on `#111113` (inner double-bezel core) at 14px size:
   - Contrast ratio ≈ 10.3:1. **Passes WCAG AA**.
3. `rgba(255,255,255,0.6)` (inactive pill label) on `#0B0B0D`: contrast ratio ≈ 7.8:1. **Passes WCAG AA**.

If any computed value falls below 4.5:1 for text <18px, darken the text or brighten the background before proceeding.

**Manual checks:**
1. `/finance` loads without crash.
2. Switching tabs: P&L → Sales → Expenses. All render.
3. Date range "This Month" / "Last Month" / "All Time" buttons work.
4. Charts have visible grid lines and readable tooltips.
5. Inline editing in Sales table still works (Tab navigation, Enter save, Escape cancel).
6. No console errors about missing CSS variables.
7. Export CSV buttons still work.

---

## Risks & Open Questions

| Risk | Mitigation |
|---|---|
| CSS token names may be completely different from assumptions | Task 1 is a hard blocker — verify before any styling changes |
| `DailySalesTab` content loss may be deeper than surface | Task 2 must fetch the original file from git to restore |
| Recharts theme changes may break other pages using charts | Scope changes to finance tabs only; other pages untouched |
| Inline editing border color change may affect accessibility | Keep border thickness at 2px, just swap color to saffron |
| Double-bezel adds DOM nesting depth | Acceptable for visual quality; ensure no layout shift |

---

## Commit Strategy

1. `git stash` current uncommitted work (or commit as WIP)
2. Create branch: `git checkout -b polish/finance-dashboard-ui`
3. **Commit mapping (intentional squashing by logical group):**

| Commit | Tasks Included | Rationale |
|---|---|---|
| `fix: restore DailySalesTab charts and stats` | Task 2 | Standalone recovery from broken refactor — deserves its own commit for bisect clarity |
| `feat: redesign date filter bar and tab nav` | Tasks 3 + 4 | Both modify `FinanceDashboardPage.tsx` shell; atomic UI change |
| `feat: add FinanceMetricCard with double-bezel + polish expenses cards` | Tasks 5 + 6 | Both touch card enclosures and data-display components; closely related |
| `polish: expenses table enclosure and tooltips` | Tasks 7 + 8 + 9 | All table/chart polish in ExpensesTab; scope is tight |
| `feat: mobile responsive and scroll animations` | Tasks 10 + 11 | Both are layout/animation finishing touches; related |
| `chore: audit CSS tokens and document exceptions` | Task 1 | Last — documents the token verification findings and the Task 8 hardcoded-hex exception for future maintainers |

**Note:** Task 1 is intentionally last because it's a documentation/verification commit, not a code change. If the token audit reveals missing tokens that need adding, Task 1 becomes a code commit and moves to the start of the sequence.

---

## Handoff Note

After this plan is saved, execute using **subagent-driven-development** skill:
- One subagent per task
- Context must include: verified CSS token names, the recovered `DailySalesPage.tsx` source, and this plan
- Two-stage review after each task: spec compliance, then code quality

**Plan saved to:** `.hermes/plans/2026-07-13_001500-finance-dashboard-ui-polish.md`
