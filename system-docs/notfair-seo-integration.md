# NotFair SEO Blog Integration

## 1. Overview

This document specifies the integration of NotFair-powered SEO articles into the Lucky Store customer storefront (`apps/customer_storefront`). The integration adds programmatic SEO content while preserving existing branding, performance, accessibility, and security controls.

### Integrated Routes
- **`/blog`** (Index): Lists published NotFair articles with responsive cover images, titles, descriptions, and reading time estimates. Uses Incremental Static Regeneration (ISR) with a 3600-second revalidation cadence.
- **`/blog/[slug]`** (Article Detail): Dynamic server-rendered route displaying article hero (`NotFairPostHero`), breadcrumbs, and sanitized remote HTML content styled via design tokens.

---

## 2. Dependencies & Tooling

- **`notfair-nextjs-blog` (`^0.4.1`)**: Official SDK for fetching remote SEO articles and rendering the post hero component.
- **`sanitize-html` (`^2.18.0`)**: Rigorous server-side HTML sanitizer preventing XSS, unwanted scripts, inline styles, and unapproved external embeds.
- **Node Engine**: Configured to `>=22.12.0` in `apps/customer_storefront/package.json` to align with modern ESM/CJS compatibility and sanitizer dependencies.

---

## 3. Security & HTML Sanitization

Remote NotFair HTML is treated as untrusted third-party content and sanitized through [`sanitizeNotFairArticleHtml`](../apps/customer_storefront/src/lib/notfair-article.ts) before injection into the DOM:

### Allowed Tags & Attributes
The sanitizer inherits `sanitizeHtml.defaults.allowedTags` and extends it with explicit structure tags:
- **Inherited Default Tags**: Includes standard formatting and inline tags (`div`, `span`, `p`, `b`, `i`, `strong`, `em`, `strike`, `code`, `pre`, `blockquote`, `hr`, `a`, `ul`, `ol`, `li`, `table`, etc.).
- **Explicit Additional Tags**: Extended with `'figure'`, `'figcaption'`, `'h1'`, `'h2'`, `'h3'`, `'h4'`, `'img'`, `'nav'`, `'table'`, `'thead'`, `'tbody'`, `'tr'`, `'th'`, `'td'`.
- **Allowed Attributes**:
  - `a`: `href`, `title`, `target`, `rel` (automatically transformed to enforce `rel="noopener noreferrer"`).
  - `img`: `src`, `alt`, `title`, `width`, `height`, `loading`.
  - `div`: `class` (restricted to `.nf-tablewrap`).
  - `nav`: `aria-label`, `class` (restricted to `.nf-toc`).
  - `li`: `class` (restricted to `.nf-toc-l2`, `.nf-toc-l3`).
  - `p`: `class` (restricted to `.nf-attribution`, `.nf-toc-title`).
  - `h1`-`h4`: `id` (for TOC anchor jumping).
- **Strictly Stripped**: `<script>`, `<iframe>`, `<style>`, `<form>`, `<input>`, inline CSS `style` attributes, `javascript:` or `data:` URLs, and arbitrary unwhitelisted CSS classes.

### Accessibility (WCAG 2.1 AA)
- **Single `<h1>` Hierarchy**: Remote `<h1>` elements inside article content are automatically transformed into `<h2>` headings while preserving their `id` attributes for table-of-contents jump links. The page hero renders the single top-level `<h1>`.
- **Keyboard Skip Navigation**: The blog layout provides an explicit skip link target (`id="main-content"`).
- **Decorative Image Alt Text**: Images with explicit empty `alt=""` are preserved as decorative images per WCAG guidelines. Images with missing `alt` attributes fall back to `attribs.title` or `'Article image'`.

### Third-Party Origin Restrictions
- Remote article images must originate from verified domains:
  - `notfair.co`
  - `images.luckystore1947.com`
  - `luckystore1947.com`
- Any external third-party images outside this allowlist are replaced with `<span class="hidden"></span>` to prevent tracking beacons and mixed content issues.
- `next.config.js` authorizes `notfair.co/api/seo/**` in `images.remotePatterns`.

---

## 4. Error Handling & Caching Model

### Incremental Static Regeneration (ISR)
- Both index and article routes are set to `export const revalidate = 3600;`.
- **Error Bubbling for Stale Cache Preservation**:
  - When upstream API calls to NotFair fail (e.g. temporary 503 outage or rate limiting), `getSeoPosts()` and `getPost(slug)` propagate the error rather than swallowing it as an empty response or `notFound()`.
  - In Next.js ISR, thrown errors instruct the server to retain the existing stale cached version of the page, ensuring visitors continue seeing real content during transient upstream outages.
- **Accurate HTTP Status Codes**:
  - `notFound()` is invoked **only** when `getSeoPost(slug)` returns `null` for a confirmed non-existent slug.
  - Upstream network or authentication failures result in standard 500 server errors, avoiding false 404 indexing by search engines.

---

## 5. Environment Configuration

### Secret Management
- **`NOTFAIR_SEO_API_KEY`**: Server-only API credential.
  - Local development: Defined in `apps/customer_storefront/.env.local` (gitignored).
  - Vercel: Configured as a server-side secret across Preview and Production environments.
  - CI / GitHub Actions: Provided via repository secrets (`${{ secrets.NOTFAIR_SEO_API_KEY }}`) for automated build and verification steps.
  - **Rule**: Never expose with `NEXT_PUBLIC_` prefix and never commit into version control.

---

## 6. Domain Routing & Cloudflare Subdomain Integration

- **Primary Canonical Routing**: All blog routes are canonicalized to `https://www.luckystore1947.com/blog` and `https://www.luckystore1947.com/blog/[slug]`. NotFair crawls and validates published articles against these URLs.
- **Subdomain (`blog.luckystore1947.com`)**:
  - Cloudflare DNS configures `blog.luckystore1947.com` CNAME targeting `cname.vercel-dns.com`.
  - For maximum domain authority and consolidated SEO juice, `blog.luckystore1947.com` can be aliased in Vercel with a permanent 301 redirect to `https://www.luckystore1947.com/blog`.

---

## 7. Verification & Testing

### Test Suites
- **[`lib/notfair-article.test.ts`](../apps/customer_storefront/lib/notfair-article.test.ts)**: Unit tests verifying tag allowlisting, XSS stripping, heading normalization (`h1` → `h2`), decorative image `alt=""` preservation, and origin filtering.
- **[`app/(english)/blog/blog.test.tsx`](../apps/customer_storefront/app/(english)/blog/blog.test.tsx)**: Route component tests verifying breadcrumbs, featured images, metadata generation, error propagation, and 404 behavior.

### Build Verification
Execute the standard test and build commands prior to release:
```bash
# Run unit and route tests
npm --prefix apps/customer_storefront test

# Verify Next.js production build and static page generation
npm --prefix apps/customer_storefront run build
```
