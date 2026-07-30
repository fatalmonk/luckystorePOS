---
name: Lucky Store Customer Storefront
description: Warm neighborhood grocery storefront for mobile-web, anchored in Deep Night and Saffron.
colors:
  deep-night: "#0B0B0D"
  saffron: "#f0c444"
  saffron-hover: "#e0b434"
  saffron-ghost: "rgba(240, 196, 68, 0.08)"
  saffron-muted: "#FFF8E1"
  saffron-dark: "#d4a820"
  paper: "#FDFBF7"
  surface: "#ffffff"
  surface-dark: "#241e1a"
  foreground: "#0B0B0D"
  foreground-dark: "#f5f0eb"
  muted: "#525252"
  dim: "#525252"
  dim-dark: "#8f877d"
  border: "#E8E4DC"
  border-dark: "rgba(245, 240, 235, 0.12)"
  success: "#16A34A"
  warning: "#b45309"
  danger: "#E34234"
  danger-dark: "#f87171"
  campaign-surface: "#0B0B0D"
  campaign-raised: "#171412"
  campaign-on-image: "#FFFFFF"
typography:
  display:
    fontFamily: "Bricolage Grotesque, var(--font-bengali), Trebuchet MS, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2vw + 0.5rem, 1.875rem)"
    fontWeight: 500
    lineHeight: 1.1
  body:
    fontFamily: "Manrope, var(--font-bengali), -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(0.875rem, 0.5vw + 0.5rem, 1rem)"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.saffron}"
    textColor: "{colors.deep-night}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.saffron-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0"
---

# Design System: Lucky Store Customer Storefront

## Overview

**Creative North Star: "The friendly neighborhood store, lit by saffron."**

The storefront is a warm, mobile-first grocery experience that borrows the familiarity of a local Chittagong kirana shop and translates it into a fast, trustworthy web interface. The visual system is intentionally simple: warm paper, deep-night text, and saffron as a rare, decisive accent. The design should never feel like a generic delivery app; every surface should signal a real store with real people behind it.

The experience is built for thumb-first navigation, persistent but unobtrusive cart access, and quick conversion. Motion is gentle and physical (scale, lift, soft shadows) rather than decorative. Typography favors clarity and personality in equal measure: Bricolage for display moments, Manrope for everything a customer reads.

**Key characteristics:**
- Mobile-web PWA with native-feeling shell (bottom nav, sheets, floating action)
- Warm neutral ground with rare saffron accent
- Rounded, tactile surfaces with soft top-left-light shadows
- Dark mode preserves accent warmth while flipping the ground to deep night
- Bangla-aware font stack for localized moments
- WhatsApp-forward support surfaced as a human safety net

## Colors

The palette is built around two brand-locked colors: Deep Night (`#0B0B0D`) and Saffron (`#f0c444`). Everything else supports legibility, hierarchy, and a warm neighborhood feeling.

### Primary
- **Deep Night** (`#0B0B0D`): Primary text, headings, dark surfaces, campaign overlays, and the dark theme ground. It is the visual anchor.
- **Saffron** (`#f0c444`): The brand accent and primary CTA color. Used sparingly so its presence means action. Appears on primary buttons, active nav states, badges, and highlights.

### Secondary
- **Saffron Hover** (`#e0b434`): Hover and pressed state for saffron surfaces.
- **Saffron Muted** (`#FFF8E1`): Tags, chips, ghost backgrounds, and low-priority accent washes.
- **Saffron Dark** (`#d4a820`): Dark-mode hover and richer saffron moments.

### Neutral
- **Warm Paper** (`#FDFBF7`): Default light-mode page background. Warmer than pure white to reduce glare and reinforce the physical-store metaphor.
- **Surface White** (`#ffffff`): Cards, inputs, modals, and raised containers in light mode.
- **Foreground** (`#0B0B0D`): Body text and icons in light mode.
- **Muted** (`#525252`): Secondary text, placeholders, and subdued labels.
- **Dim** (`#525252` light / `#8f877d` dark): Tertiary text and non-interactive metadata.
- **Border** (`#E8E4DC` light / `rgba(245, 240, 235, 0.12)` dark): Subtle dividers, card borders, and input strokes.

### Semantic
- **Success** (`#16A34A`): Positive states, stock available, order confirmed.
- **Warning** (`#b45309`): Low stock, pending actions, cautionary labels.
- **Danger** (`#E34234` light / `#f87171` dark): Errors, out-of-stock, destructive actions.

### Campaign experience
- **Campaign Surface** (`#0B0B0D`): Immersive campaign and hero regions; intentionally constant across light and dark themes.
- **Campaign Raised** (`#171412`): Elevated cards and controls inside campaign surfaces.
- **On-Image Text** (`#FFFFFF`): Text placed directly over hero/campaign imagery.

### Named rules
**The Saffron Rarity Rule.** Saffron occupies ≤10% of any given screen. Its scarcity is the signal.

**The Warm Ground Rule.** Page backgrounds are warm paper in light mode and deep night in dark mode; avoid pure `#FFFFFF` page fills or `#1A1A1A` dark fills.

**The Banner Shape Rule.** Hero, promo, and campaign banners are always landscape (16:9 or 21:9). Never place a 1:1 image inside a wide banner container.

## Typography

**Display font:** Bricolage Grotesque (with Noto Sans Bengali fallback)
**Body font:** Manrope (with Noto Sans Bengali fallback)
**Mono / label font:** Geist Mono

The pairing is warm but modern. Bricolage gives display moments a friendly, human character without drifting into novelty. Manrope carries the bulk of the reading and UI. Geist Mono is reserved for prices, order IDs, and small technical labels.

### Hierarchy
- **Display** (500, `clamp(1.25rem, 2vw + 0.5rem, 1.875rem)`, line-height 1.1): Section and page headlines; used sparingly on mobile.
- **Headline / H2** (600, `clamp(1.125rem, 1.5vw + 0.5rem, 1.5rem)`, line-height 1.2): Card titles, modal titles, campaign headers.
- **Title / H3** (600, `clamp(0.9375rem, 0.8vw + 0.5rem, 1.125rem)`, line-height 1.3): Product names, filter group titles.
- **Body** (400, `clamp(0.875rem, 0.5vw + 0.5rem, 1rem)`, line-height 1.5): Descriptions, form copy, support text. Max line length 65–75ch when in reading passages.
- **Small** (400, `clamp(0.75rem, 0.3vw + 0.5rem, 0.875rem)`, line-height 1.4): Captions, metadata, timestamps, footer links.
- **Label** (600, `clamp(0.6875rem, 0.2vw + 0.5rem, 0.75rem)`, line-height 1.3, uppercase optional): Badges, tags, prices per unit.

### Named rules
**The One Display Font Rule.** Bricolage is the only display face. Do not introduce a second display serif or decorative face.

**The Bengali Fallback Rule.** Every type stack ends with Noto Sans Bengali so localized strings degrade gracefully without changing weight or rhythm.

## Layout

The layout is a fluid mobile app shell adapted for the web.

- **Container:** Fluid width with responsive max-width scaling; no rigid desktop container. The app fills the viewport on mobile and expands naturally on desktop.
- **Header:** Fixed top bar (`--header-h: 68px`) with logo, search, cart, and theme toggle.
- **Bottom navigation:** Fixed 60px bottom bar on mobile; hidden on desktop (`≥768px`) where navigation moves to the top or sidebar.
- **Safe areas:** Bottom nav reserves `env(safe-area-inset-bottom)`. Body padding-bottom is removed on desktop.
- **Spacing rhythm:** 16px is the base unit. Touch targets are ≥44px.
- **Grid:** Product grids are responsive, typically 2 columns on mobile, 3–4 on tablet, 5–6 on desktop, with 12–16px gutters.
- **Page sections:** 24–32px vertical section spacing; clear grouping with subtle borders or warm-bg bands rather than heavy dividers.

### Named rules
**The Mobile-Shell Rule.** Every screen must work as a single-column mobile viewport first; desktop layout is an upscale, not a redesign.

**The 44px Touch Rule.** All interactive elements have a minimum touch target of 44px.

## Elevation & Depth

Depth is communicated through a combination of soft diffuse shadows and tonal layering. The system avoids hard drop shadows and flat material monoculture.

### Shadow vocabulary
- **Rest** (`0 4px 24px rgba(11, 11, 13, 0.03), 0 1px 2px rgba(11, 11, 13, 0.02)`): Default card and surface shadow; barely perceptible, gives physical presence.
- **Hover** (`0 12px 32px rgba(11, 11, 13, 0.08), 0 4px 8px rgba(11, 11, 13, 0.04)`): Elevated hover state for product cards and panels.
- **Elevated** (`0 12px 40px rgba(11, 11, 13, 0.12), 0 4px 12px rgba(11, 11, 13, 0.06)`): Modals, sheets, and floating action menus.
- **Market Panel** (`0 24px 60px rgba(0, 0, 0, 0.34), 0 6px 16px rgba(0, 0, 0, 0.20)`): Dense promotional panels and campaign surfaces.
- **Campaign Card** (`0 24px 60px rgba(0, 0, 0, 0.42)`): Immersive campaign cards on dark surfaces.

### Dark mode shadows
Shadows become darker and more diffuse; tonal layering replaces some ambient shadows because surfaces are already deep.

### Named rules
**The Top-Left Light Rule.** Shadows assume a top-left light source, giving surfaces a consistent lift direction.

**The Rest-Flat Rule.** At rest, surfaces sit nearly flat; elevation appears as a response to state (hover, focus, elevation) rather than as default decoration.

## Shapes

The form language is softly rounded and friendly, matching the neighborhood-store warmth.

- **Small corners:** 10px (`--radius-sm`) for chips, tags, small buttons.
- **Medium corners:** 14px (`--radius-md`) for buttons, inputs, standard cards.
- **Large corners:** 18px (`--radius-lg`) for product cards, larger containers.
- **Extra large corners:** 24px (`--radius-xl`) for modals, sheets, market panels, and bottom-sheet tops.
- **Borders:** 1px subtle borders are preferred over heavy outlines. Inputs and cards use `var(--color-border)`.
- **Circular elements:** Avatars, icon buttons, and floating action use full radius where appropriate.

### Named rules
**The Family Radius Rule.** Surfaces sharing a parent container use the same radius family (sm/md/lg/xl) so adjacent shapes harmonize.

## Components

### Buttons
- **Shape:** Rounded 14px, inline-flex, centered content, gap-2 between icon and text.
- **Primary:** Saffron background (`--color-accent`), deep-night text, font-semibold, 44px min-height. Hover shifts to saffron-hover. Active scale 0.98.
- **Secondary:** Warm-paper background, deep-night text, 1px border. Hover fills border-light.
- **Ghost:** Transparent background, deep-night text. Hover fills warm-bg.
- **Sizes:** `sm`/`md`/`lg` all maintain 44px min-height; padding increases from 12px to 16px horizontal.
- **Disabled:** 50% opacity, not-allowed cursor.

### Inputs
- **Shape:** 14px radius, full width, 48px height (`h-12`), 16px horizontal padding.
- **Background:** White in light mode; transparent-ish dark surface in dark mode.
- **Border:** `var(--color-border)`; on focus, border shifts to saffron and a soft saffron glow ring appears (`0 0 0 3px rgba(255,243,77,0.15)`).
- **Label:** 13px bold, 6px bottom margin, deep-night/dark-foreground.
- **Placeholder:** Muted text color.
- **Search variant:** Pill-shaped (`rounded-full`), 38px height, search icon left-aligned.

### Product card
- **Shape:** 18px radius, white background (light) or dark gradient (dark), subtle border, rest shadow.
- **Hover:** Lift shadow + optional border shift.
- **Content:** Image top, title + price below, add-to-cart action. Keep vertical rhythm tight for grid scanning.
- **Dark mode:** Radial saffron tint at top-right plus near-black body, inset top highlight.

### Navigation
- **Header:** Logo left, search center/flex, cart and theme toggle right. Sticky, warm-bg with glassmorphism on scroll (`--glass-bg`).
- **Bottom nav (mobile):** 5-item icon bar with labels, saffron active state, subtle top border.
- **Active states:** Saffron for primary selection; muted for inactive.

### Sheets and modals
- **Sheets:** Slide from bottom on mobile, from right on desktop. 24px top radius on mobile bottom sheet. Close via swipe/drag or backdrop tap.
- **Modals:** Centered, 24px radius, elevated shadow, darkened scrim. Focus trapped, close with X or Escape.

### Campaign / hero surfaces
- **Shape:** Full-bleed or market-panel containers, often dark (`--color-campaign-surface`) regardless of theme.
- **Image treatment:** Wide landscape images with gradient overlays for text legibility.
- **Controls:** Subtle translucent controls that brighten on hover.

### WhatsApp float
- **Shape:** Circular pill/fab, saffron or dark surface, fixed bottom-right above bottom nav.
- **Behavior:** Persistent but dismissible; used as human support fallback.

## Do's and Don'ts

### Do:
- **Do** anchor every screen to warm paper (light) or deep night (dark).
- **Do** use saffron as the single accent for primary actions and active states.
- **Do** keep mobile touch targets at 44px or larger.
- **Do** use wide landscape (16:9/21:9) imagery for hero and promo banners.
- **Do** load the Bengali fallback in every text stack.
- **Do** prefer soft shadows and tonal layering over harsh borders and dividers.
- **Do** test dark mode for every new surface or component.

### Don't:
- **Don't** use `#1A1A1A` or `#F5C518`; these are superseded brand colors.
- **Don't** place square 1:1 images in wide banner slots.
- **Don't** scatter saffron across more than ~10% of a screen.
- **Don't** introduce a second display typeface; Bricolage owns display moments.
- **Don't** design desktop-first; the mobile shell is the canonical viewport.
- **Don't** use decorative motion that delays the task; motion should be physical and fast (≈180ms base transition).
