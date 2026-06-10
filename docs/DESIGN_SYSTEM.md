# Lucky Store Design System

> **For contributors:** This document describes the visual language, tokens, and component patterns used across all Lucky Store platforms (web storefront, admin web, mobile app). Read this before adding new UI.

---

## Philosophy

- **Warm minimal:** Soft ivory backgrounds, warm greys, terracotta accent (`#dc5f3b`). No cold blue-greys.
- **Human-readable:** Generous whitespace, rounded corners, gentle shadows.
- **Mobile-first:** Components scale smoothly from 320px to 1440px.
- **Cross-platform:** One token source → CSS variables (web) + Dart constants (Flutter).

---

## Color Tokens

All colors are exposed as CSS custom properties and mapped to Tailwind utilities.

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--color-paper` | `#faf8f5` | `bg-warm-bg` | Page background |
| `--color-surface` | `#ffffff` | `bg-warm-surface` | Cards, sheets |
| `--color-foreground` | `#1c1917` | `text-warm-fg` | Primary text |
| `--color-muted` | `#78716c` | `text-warm-muted` | Secondary text |
| `--color-dim` | `#a8a29e` | `text-warm-dim` | Disabled, hints |
| `--color-border` | `#e7e5e4` | `border-warm-border` | Card borders |
| `--color-border-light` | `#f5f5f4` | — | Subtle dividers |
| `--color-accent` | `#dc5f3b` | `bg-warm-accent` | CTAs, active states |
| `--color-accent-hover` | `#c4542e` | `hover:bg-warm-accent-hover` | Hover darker |
| `--color-accent-ghost` | `rgba(220,95,59,0.07)` | `bg-warm-accent-ghost` | Light highlight |
| `--color-success` | `#2d6a4f` | `text-warm-success` | Success text |
| `--color-success-bg` | `rgba(45,106,79,0.08)` | `bg-warm-success-bg` | Success badge bg |
| `--color-warning` | `#b45309` | `text-warm-warning` | Low stock, alert |
| `--color-warning-bg` | `rgba(180,83,9,0.08)` | `bg-warm-warning-bg` | Warning badge bg |
| `--color-danger` | `#c3312f` | `text-warm-danger` | Error text |
| `--color-danger-bg` | `rgba(195,49,47,0.07)` | `bg-warm-danger-bg` | Error badge bg |

### Platform Mapping

- **Web (Tailwind):** `bg-warm-bg`, `text-warm-fg`, `border-warm-border`, etc. Defined in `apps/customer_storefront/tailwind.config.js`.
- **Flutter:** `DesignTokens.warmBg`, `DesignTokens.warmFg`, etc. Defined in `apps/mobile_app/lib/core/theme/tokens.dart`.

---

## Typography

| Role | Font | Fallback | Size (mobile) | Size (desktop) |
|------|------|----------|---------------|----------------|
| Display | Inter | system-ui, sans-serif | `clamp(1.25rem, 2vw+0.5rem, 1.875rem)` | Same clamp |
| Body | Inter | system-ui, sans-serif | `16px` | `16px` |
| Bengali | Hind Siliguri | system-ui, sans-serif | — | — |
| Mono | JetBrains Mono | ui-monospace, monospace | — | — |

### Type Scale (Responsive Clamp)

Declared in `apps/customer_storefront/app/tokens.css`:

```css
--text-h1: clamp(1.25rem, 2vw + 0.5rem, 1.875rem);
--text-h2: clamp(1.125rem, 1.5vw + 0.5rem, 1.5rem);
--text-body: clamp(0.875rem, 0.5vw + 0.5rem, 1rem);
--text-small: clamp(0.75rem, 0.3vw + 0.5rem, 0.875rem);
```

Use utility classes:
- `text-h1`, `text-h2`, `text-h3` for headings
- `text-body`, `text-small`, `text-xs` for body copy
- `price` for monetary values (bold, tight tracking)

---

## Spacing Scale

| Token | Value | Tailwind Equivalent |
|-------|-------|---------------------|
| `space-1` | `4px` | `p-1` |
| `space-2` | `8px` | `p-2` |
| `space-3` | `12px` | `p-3` |
| `space-4` | `16px` | `p-4` |
| `space-5` | `20px` | `p-5` |
| `space-6` | `24px` | `p-6` |
| `space-8` | `32px` | `p-8` |
| `space-10` | `40px` | `p-10` |
| `space-12` | `48px` | `p-12` |
| `space-16` | `64px` | `p-16` |

---

## Radius Scale

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `radius-sm` | `10px` | `rounded-warm-sm` | Small chips, badges |
| `radius-md` | `14px` | `rounded-warm-md` | Cards, buttons, modals |
| `radius-lg` | `18px` | `rounded-warm-lg` | Large cards |
| `radius-xl` | `24px` | `rounded-warm-xl` | Banners, sheets |

Default card/button radius is `14px` everywhere.

---

## Shadows

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `shadow-sm` | `0 1px 3px rgba(28,25,23,0.04)` | `shadow-warm-sm` | Subtle elevation |
| `shadow-md` | `0 4px 16px rgba(28,25,23,0.06)` | `shadow-warm-md` | Card hover |
| `shadow-lg` | `0 16px 48px rgba(28,25,23,0.10)` | `shadow-warm-lg` | Modals, desktop container |

Shadows use warm black (`#1c1917`) tint for cohesion.

---

## Motion

| Property | Value |
|----------|-------|
| Duration | `180ms` |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out) |
| Active scale | `0.98` |
| Hover translate-y | `-2px` |

Use `transition-all duration-200` on interactive elements. Respect `prefers-reduced-motion`.

---

## Component Patterns

### Button

| Variant | BG | Text | Border | Hover |
|---------|----|------|--------|-------|
| Primary | `#dc5f3b` | White | — | `#c4542e` |
| Secondary | `#faf8f5` | `#1c1917` | `#e7e5e4` | `#f5f5f4` |
| Ghost | Transparent | `#1c1917` | — | `#faf8f5` |

Radius: `14px`. Height: `sm: 32px`, `md: 40px`, `lg: 48px`.

### Card

```
bg-white border border-[#e7e5e4] rounded-[14px] overflow-hidden
hover:shadow-md hover:border-[#d6d3d1] hover:-translate-y-0.5 transition-all duration-200
```

### Product Card

- Image area: `aspect-square sm:aspect-[4/3]` with `bg-[#f5f3f0]` placeholder
- Stock badge: top-left, `10px uppercase tracking-wide`
- Add button: `+` icon, `w-9 h-9 rounded-lg`, `#dc5f3b` bg
- Qty stepper: `−` / count / `+` inside `border-[#e7e5e4]` pill
- Out of stock: show `WishlistButton` ("Notify when available")

### Input

```
bg-white border border-[#e7e5e4] rounded-[14px]
padding: 12px 16px
focus: border-[#dc5f3b] outline-none
```

### Badge

```
px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide
```

Variants:
- In stock: `bg-[rgba(45,106,79,0.08)] text-[#2d6a4f]`
- Low stock: `bg-[rgba(180,83,9,0.08)] text-[#b45309]`
- Out of stock: `bg-[rgba(195,49,47,0.07)] text-[#c3312f]`

---

## Layout

### App Container

```css
.app-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-paper);
  position: relative;
}
```

Breakpoints:
- `≥1024px`: max-width `1280px`, centered, `shadow-lg`
- `≥1536px`: max-width `1440px`

### Safe Areas

- Header height: `60px`
- Bottom nav height: `68px`
- Main padding: `18px` mobile, `24px` tablet, `32px–40px` desktop

---

## Cross-Platform Token Sync

Canonical tokens live in `design-tokens/tokens.json`. Build generates:
- `output/tokens.css` → copied to `apps/customer_storefront/app/styles/tokens.css`
- `output/tokens.ts` → imported by web apps
- `output/tokens.dart` → copied to `apps/mobile_app/lib/core/theme/tokens.dart`

Run `npm run build` in `design-tokens/` after editing `tokens.json`.

**Important:** The web token prefix is `--color-*` in `tokens.css` but the Tailwind mapping uses `warm-*` names (e.g., `bg-warm-bg` maps to `var(--color-paper)`). Keep names in sync across platforms.

---

## Accessibility

- Minimum contrast ratio: `4.5:1` for body text (`#1c1917` on `#faf8f5` passes)
- Accent on white: `#dc5f3b` on `#ffffff` passes `3:1` for large text
- Focus ring: `2px solid #dc5f3b`, `2px` offset
- `prefers-reduced-motion`: reduce to `0.01ms`
- Tap targets: minimum `44×44px` on mobile

---

## Quick Reference Cheat Sheet

```tsx
// Backgrounds
<div className="bg-warm-bg"></div>        // page
<div className="bg-warm-surface"></div>   // card

// Text
<p className="text-warm-fg"></p>        // primary
<p className="text-warm-muted"></p>    // secondary

// Borders & Radius
<div className="border border-warm-border rounded-warm-md"></div>

// Shadow
<div className="shadow-warm-md"></div>

// Accent
<button className="bg-warm-accent hover:bg-warm-accent-hover text-white"></button>
```

---

## Contributing

1. **Add a new token?** Edit `design-tokens/tokens.json` and rebuild.
2. **New component?** Follow existing component patterns in `app/components/`.
3. **Custom color?** Map to nearest warm token. Avoid one-off hex values.
4. **Font size?** Use the clamp scale, never fixed `px` sizes without justification.
5. **Spacing?** Use the 4px step scale.

Questions? Ping the maintainers or open an issue with the `ui` tag.
