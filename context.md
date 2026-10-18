[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Optimize GitHub Actions quota (Linux runners for Flutter & CI concurrency)
Done: PR #501 merged to main; PR #502 merged to main (offloaded robots monitor to Cloudflare Worker); PR #503 opened (migrate flutter-ci to ubuntu-latest + Java 17, add ci.yml concurrency & paths-ignore)
Branch: perf/ci-flutter-linux-runners
PR: https://github.com/fatalmonk/luckystorePOS/pull/503
Health: 100% test pass rate (docs:check:test 6/6), secret scan clean (0 leaked secrets)
Last Synced: 2026-10-18
ctx: CI quota optimization | done: PR #502 merged, rebased PR #503 | next: await PR #503 review & merge




