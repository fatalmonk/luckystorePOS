[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Expo SDK 57 (customer_mobile), Supabase, Cloudflare Workers/R2
Current: Supabase migrations 100% synced with remote database; Databricks AI Functions preflight guardrail enforced
Done: All 264 Git migrations verified and synced in schema_migrations; advisory_report added to purchase_receipts; eliminated 44 auth_rls_initplan warnings; pinned search_path on 8 functions; edge function verify_jwt matrix configured; Databricks AI Dev Kit guardrails updated in GEMINI.md, AGENTS.md, databricks-ai-functions SKILL.md; 133/133 admin_web vitest tests passing
Branch: feat/receipt-inspector-and-supabase-hardening
PR: #513 (https://github.com/fatalmonk/luckystorePOS/pull/513)
Health: 100% test pass rate in admin_web; 0 missing migrations between Git & DB; 0 advisor performance warnings
Last Synced: 2026-10-19
ctx: Supabase Migration Sync & Databricks Pre-flight Gate | done: 264 migrations synced, databricks guardrail, advisory_report | next: review git diff and submit PR

