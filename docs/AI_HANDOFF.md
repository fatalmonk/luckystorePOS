# Lucky Store AI Handoff — Repository Context

> This file is the canonical repository-owned source for durable engineering context synchronized to the Notion AI Handoff. Do not put live branch, HEAD SHA, worktree state, temporary PR status, or deployment URLs here.

## Repository Source of Truth

- Canonical repository: `fatalmonk/luckystorePOS`.
- Canonical production branch: `main`.
- Repository and deployment state are live data. Read current `main`, open PRs, relevant files, CI, and Vercel directly before implementation work.
- This document stores durable context only: architecture, stable paths, shipped capabilities, operating constraints, and supported workflows.

## Stack

- Storefront: Next.js App Router on Vercel at `luckystore1947.com`.
- Admin Web: Vite + React on Vercel.
- Mobile App: Flutter.
- Database & Auth: Supabase Postgres + RLS + Supabase Auth.
- Edge/CDN: Cloudflare Workers + R2.
- Analytics replica: Neon Postgres, accessed by admin web through the `neon-proxy` Worker.

## Locked Brand & UI Constraints

- Brand accent: Saffron `#f0c444`.
- Primary dark: Deep Night `#0B0B0D`.
- Canvas: Warm Bone `#FDFBF7`.
- Border: Warm Border `#E8E4DC`.
- Typography: Geist + Geist Mono; Noto Sans Bengali fallback for Bangla.
- Do not use legacy v1 terracotta/Inter/Stone tokens for new work.
- Do not generate fake product packaging, sales, or reviews.
- Hero/banner imagery uses approved wide merchandising compositions rather than square hero art.
- Use approved logo assets rather than recreating the logo from memory.

## Stable Architecture Rules

- One production store; do not introduce multi-tenancy without an explicit architecture decision.
- Web UI uses the `warm-*` Tailwind token system.
- Mobile UI uses Dart `DesignTokens` under `apps/mobile_app/lib/core/theme/tokens.dart`.
- Do not modify `PosProvider`, `supabase/migrations/`, or the core authentication flow without explicit approval and appropriate validation.
- Production storefront product cards are consolidated into `GridProductCard`; do not reintroduce parallel card implementations without a documented reason.

## Major Shipped Storefront Capabilities

- Unified production product-card rendering through `GridProductCard`, including cart and wishlist behavior.
- Storefront card/layout polish and commerce-surface consolidation.
- Storefront coverage and SEO fixes.
- Contact/maps fallback behavior.
- bKash QR payment support.
- Header performance and social-preview improvements.

## Common Repository Commands

- Storefront dev: `cd apps/customer_storefront && npm run dev`.
- Admin web dev: `cd apps/admin_web && npm run dev`.
- Root typecheck: `npm run typecheck`.
- Secret scan: `npm run scan:secrets`.
- Secret-scan self-test: `npm run scan:secrets:self-test`.
- Image migration: `npm run migrate:images`.
- Image migration dry-run: `npm run migrate:images:dry-run`.
- Deploy image Worker: `npm run deploy:worker`.
- Competitor import: `npm run import-competitor`.
- Duplicate cleanup: `npm run remove-duplicates` or `npm run remove-duplicates:dry-run`.
- Scraper: `npm run scrape`.

## Documentation Sync Policy

Update this file in the same PR when a change materially alters:

- architecture or platform ownership;
- locked brand/design-system rules;
- production application structure;
- a major shipped capability;
- canonical paths or supported workflows;
- operational or safety constraints.

Do not update it for routine commits, feature-branch names, temporary bugs, individual PR numbers, HEAD SHAs, worktree status, or one-off deployment URLs.

On merge to `main`, `.github/workflows/sync-notion-handoff.yml` synchronizes this document into the repository-managed section of the Notion AI Handoff page.