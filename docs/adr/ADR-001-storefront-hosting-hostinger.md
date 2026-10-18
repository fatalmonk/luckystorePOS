# ADR-001: Migrate Customer Storefront from Vercel to Hostinger behind Cloudflare

## Status
Proposed

## Date
2026-10-07

## Context
The customer storefront (`apps/customer_storefront`) is built with Next.js 15.5 (App Router, Node >= 22) and was deployed on Vercel Hobby tier. The project exhausted the free tier limits on `vercel-functions-fluid-cpu-duration`.

The organisation already holds a prepaid **Hostinger Business Web Hosting** plan (account `u859872680`, order `1009156396`) active through July 2030 with zero incremental hosting cost.

Authoritative DNS for `luckystore1947.com` is managed in **Cloudflare** (`carter.ns.cloudflare.com` / `kayleigh.ns.cloudflare.com`). Product images are already offloaded to Cloudflare Worker + Cloudflare R2 (`images.luckystore1947.com`).

## Decision
Migrate `apps/customer_storefront` from Vercel to Hostinger Business Web Hosting:
1. Run Next.js 15 standalone server (`output: 'standalone'`) on Hostinger's managed Node.js 22 runtime.
2. Route traffic through Cloudflare edge proxy with SSL mode **Full (strict)** using Cloudflare Origin CA certificates on Hostinger.
3. Build deterministically in **GitHub Actions** via a promotion pipeline (Build once $\to$ Immutable Release Artifact $\to$ Deploy Staging $\to$ Validate $\to$ Deploy identical artifact to Production).
4. For initial cutover: **Bypass edge HTML caching** by default; cache only static assets (`/_next/static/*`, media, web fonts).
5. Maintain Vercel deployment untouched for 14+ days as an instant DNS rollback target.

## Alternatives Considered

### 1. Upgrade Vercel to Pro ($20/month + usage)
- **Pros**: Zero migration effort, keeps preview branch deployments.
- **Cons**: Recurring monthly cost when multi-year hosting is already pre-paid.
- **Rejected**: Goal is cost optimization using existing prepaid infrastructure.

### 2. Hostinger VPS / Docker Container
- **Pros**: Full container isolation, dedicated CPU/RAM, uses existing `Dockerfile`.
- **Cons**: Requires purchasing and managing a separate VPS instance, OS maintenance, security updates.
- **Rejected**: Business Web Hosting plan is already prepaid and supports Node 22 applications natively.

### 3. Cloudflare Workers / OpenNext
- **Pros**: Global serverless edge distribution.
- **Cons**: Additional build complexity, cold-start / binding maintenance.
- **Rejected**: Unnecessary architectural divergence when standalone Node.js satisfies requirements.

## Consequences

- **Cost**: Hosting infrastructure cost reduced to $0 incremental (prepaid to 2030).
- **Compute Model**: Shifts from Vercel serverless functions to a persistent Node.js background process on CloudLinux (~3 GB RAM, 2 vCPU shared account-wide).
- **Latency & TTFB**: Persistent Node process eliminates serverless cold starts. Database query latency to Supabase (`us-east-1`) remains identical from Boston datacenter.
- **Edge Caching**: Edge HTML caching is disabled on migration day to protect session-bearing dynamic requests; static assets are cached globally at Cloudflare edge.
- **Rollback Window**: 14-day zero-risk rollback to Vercel via Cloudflare DNS record restore.
