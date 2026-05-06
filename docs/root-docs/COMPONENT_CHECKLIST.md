# Component Checklist

## Base UI Primitives (src/components/ui)
- [x] `Button` – variants: primary (yellow), secondary (black), tertiary (green), danger, outline, ghost
- [x] `Card`
- [x] `Input`
- [x] `Select`
- [x] `Modal`
- [x] `Drawer`
- [x] `Badge`
- [x] `Avatar`
- [x] `Skeleton`
- [x] `Toast`

## Layout Components (src/components/layout)
- [x] `Layout` – app shell with sidebar, top header, content area
- [x] `Sidebar` – dark navigation, uses `--bg-sidebar` and active state `--color-primary`
- [x] `TopHeader` – global search, notifications, profile dropdown
- [x] `PageHeader` – page title, subtitle, action buttons

## Data‑Display Components (src/components/data-display)
- [x] `MetricCard` – dashboard stat widget, supports color prop (primary/secondary/tertiary)
- [x] `DataTable` – sortable, filterable table
- [x] `TableFilters` – search + dropdown filters
- [x] `EmptyState`

## POS Components (src/components/pos)
- [x] `ProductCard`
- [x] `BillingPanel`
- [x] `QuantityStepper`
- [x] `CategoryPill`

## Additional Tasks
- Ensure all components use the new CSS variables (`--color-primary`, `--color-secondary`, `--color-tertiary`).
- Add Storybook stories for each component.
- Write unit tests with Vitest.
- Add integration tests for key flows.
