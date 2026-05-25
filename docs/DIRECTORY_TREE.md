# Lucky Store POS - Complete Directory Tree

This document provides a comprehensive overview of the current project structure.

---

```text
luckystorePOS/
├── .agent-state/
├── .ai/
│   ├── context/
│   ├── memory/
│   │   └── sessions/
│   └── skills/
│       └── token-optimizer/
│           └── scripts/
├── .antigravity/
├── .gemini/
│   └── skills/
│       └── token-optimizer/
│           ├── assets/
│           ├── examples/
│           ├── references/
│           └── scripts/
├── .github/
│   └── workflows/
├── .hermes/
│   ├── memory-hub/
│   │   ├── architecture/
│   │   ├── debugging/
│   │   ├── evals/
│   │   ├── forensics/
│   │   ├── governance/
│   │   ├── lineage/
│   │   ├── operations/
│   │   ├── orchestrator/
│   │   ├── repairs/
│   │   ├── replay/
│   │   ├── runbooks/
│   │   ├── sync/
│   │   ├── topology/
│   │   └── validation/
│   └── plans/
├── .husky/
│   └── _/
├── .venv/
│   ├── bin/
│   ├── include/
│   ├── lib/
│   │   └── python3.14/
│   │       └── site-packages/
├── .vercel/
├── _plans/
│   ├── redesign/
├── apps/
│   ├── admin_web/
│   │   ├── .storybook/
│   │   ├── .vercel/
│   │   ├── public/
│   │   ├── scripts/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── styles/
│   │   │   ├── sw/
│   │   │   ├── types/
│   ├── customer_storefront/
│   │   ├── .claude/
│   ├── mobile_app/
│   │   ├── assets/
│   │   │   ├── fonts/
│   │   ├── coverage/
│   │   ├── lib/
│   │   │   ├── config/
│   │   │   ├── core/
│   │   │   ├── demo/
│   │   │   ├── features/
│   │   │   ├── l10n/
│   │   │   ├── models/
│   │   │   ├── offline/
│   │   │   ├── shared/
│   │   │   ├── theme/
│   │   ├── test/
│   │   │   ├── e2e/
│   │   │   ├── integration/
│   │   │   ├── load/
│   │   │   ├── offline/
│   │   │   ├── performance/
│   │   │   ├── unit/
│   ├── scraper/
│   │   ├── lib/
├── artifacts/
│   ├── certification/
│   ├── cleanup_archived_logs/
│   ├── governance/
│   ├── lineage/
│   ├── migration-replay/
│   ├── schema/
├── data/
│   ├── Accounts/
│   ├── competitors/
│   │   ├── chaldal/
│   │   │   ├── images/
│   │   └── shwapno/
│   ├── inventory/
│   │   ├── Images/
│   ├── samples/
├── docker/
│   ├── seed-db/
├── docs/
│   ├── 01-getting-started/
│   ├── 02-setup/
│   ├── 03-import-system/
│   ├── 06-deployment/
│   ├── 07-reference/
│   ├── audits/
│   ├── design-system/
│   ├── root-docs/
│   ├── runbooks/
│   ├── screenshots/
│   ├── testing/
├── landing/
├── lib/
│   └── features/
│       └── inventory/
│           ├── models/
│           ├── providers/
│           ├── screens/
│           └── widgets/
├── scripts/
│   ├── data/
│   ├── db/
│   ├── deploy/
│   ├── dev/
│   ├── git/
│   ├── lib/
│   ├── offline/
│   ├── ops/
│   ├── replay-certification/
│   │   ├── artifacts/
│   ├── seed/
│   ├── test/
│   ├── tools/
│   │   ├── price_tags/
├── skills/
│   └── self-improving-agent/
│       ├── assets/
│       ├── hooks/
│       │   └── openclaw/
│       ├── references/
│       └── scripts/
├── supabase/
│   ├── .branches/
│   ├── .temp/
│   ├── diagnostics/
│   ├── functions/
│   │   ├── .types/
│   │   ├── _shared/
│   │   ├── adjust-stock/
│   │   ├── create-card-checkout/
│   │   ├── create-sale/
│   │   ├── import-inventory/
│   │   ├── payment-ipn/
│   │   ├── payment-return-cancel/
│   │   ├── payment-return-fail/
│   │   ├── payment-return-success/
│   │   └── send-whatsapp-message/
│   ├── migrations/
│   ├── public/
│   │   └── policies/
│   ├── rpc/
│   ├── views/
├── test/
│   ├── integration/
│   ├── load/
│   └── unit/
│
├── [ROOT FILES]
│
├── .DS_Store
├── .dockerignore
├── .editorconfig
├── .env
├── .env.ai
├── .env.certify.local
├── .env.certify.staging
├── .env.example
├── .env.local
├── .gitattributes
├── .gitignore
├── .supabase-migration-sync
├── .vercelignore
├── ADMIN-LOGIN.md
├── AGENTS.md
├── ARCHITECTURE.md
├── CLAUDE.md
├── Dockerfile
├── GEMINI.md
├── LICENSE
├── README.md
├── RESTORE_POINT.md
├── SECURITY_RECOMMENDATIONS.md
├── STOREFRONT_ARCHITECTURE.md
├── context.md
├── docker-compose.yml
├── googledd38bcebed6ae845.html
├── index.html
├── package-lock.json
├── package.json
├── privacy-policy.html
├── prod-ca-2021.crt
├── schema_dump.sql
├── skills-lock.json
├── terms-of-service.html
├── test_out.txt
├── token-saver.md
├── vercel.json
```

---

*Generated: 2026-05-24*
