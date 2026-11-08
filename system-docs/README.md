# System Documentation

This directory contains internal documentation, audits, plans, and operational guides for Lucky Store. These documents are **not** customer-facing.

## Directory Structure

```
system-docs/
├── agents/              # Agent configurations and prompts
├── audits/              # Technical audits (see audits/README.md for register)
├── competitive/         # Competitor research and market intelligence
├── design/              # Design system and UI specifications
├── development/         # Development guides and standards
├── integrations/        # Third-party integration documentation
├── migrations/          # Database migration guides and history
├── plans/               # Implementation plans and proposals
├── releases/            # Release documentation and rollout records
├── env-security.md      # Environment and security guidelines
└── notfair-seo-integration.md  # SEO integration notes
```

## Documentation Policy

### Audit Tracking Rules

**Principle:** Commit only audits that document **completed, implemented work with verified fixes**. Keep investigations, ongoing work, and competitive intelligence local (gitignored).

#### Category A — Tracked (Committed to Git)
- Audits with **implemented fixes** and **verified test results**
- Release evidence (deployment runs, smoke checks, merged PRs)
- Policy decisions and architectural records
- **Current tracked files:**
  - `audits/2026-10-08-customer-mobile-ux-audit.md` — 17 findings, fixes applied
  - `audits/2026-10-23-customer-storefront-and-seo-audit.md` — 6 findings, fixes applied

#### Category B — Gitignored (Investigation Evidence)
- Ongoing investigations with **unresolved findings**
- Proposed work not yet executed (PR proposals, migration plans)
- Incomplete reconciliation (migration history, schema parity)
- Evidence with **sensitivity**: internal IPs, unvalidated measurements, pending security gates
- **Current gitignored files:**
  - `audits/lucky-store-phase-5-supabase-egress.md` — Phase 5 synthesis, 7 proposed PRs (A–G), migration history incomplete
  - `audits/2026-11-06-supabase-egress-phase2-measurement.md` — Verification only, no deployment
  - `audits/2026-11-06-supabase-egress-phase3-results.md` — Deployed but production egress unmeasured, test history divergent
  - `audits/2026-11-06-supabase-egress-phase4-report.md` — Deployed but production telemetry confounded
  - `audits/2026-10-22-supabase-log-query-attribution.md` — Attribution gap remains

#### Category C — Gitignored (Competitive Intelligence)
- External research, competitor analysis, market intelligence
- **Current gitignored file:**
  - `competitive/competitor-seo-audit-2026.md` — 4 Bangladesh competitors analyzed

### Gitignore Rule

Line 411 of `.gitignore`:
```
/system-docs/audits/*.md
```

This ignores all `.md` files in `system-docs/audits/`. The two tracked audits were committed **before** this rule was added and remain tracked.

### Moving Files Between Categories

**To promote Category B → A (track an audit):**
1. All proposed work must be **implemented, tested, and deployed**
2. All unresolved findings must be **resolved or explicitly deferred with tracking**
3. **Sanitize** the document: remove IP addresses, internal hostnames, unvalidated measurements, pending PR proposals
4. Update `audits/README.md` register
5. Stage and commit the file

**To demote Category A → B (stop tracking):**
1. If an audit becomes obsolete or superseded
2. Move to gitignored location (or add exception to `.gitignore`)
3. Update `audits/README.md` register

### Audit Register

See [`audit-register.md`](audit-register.md) for the complete register with status, outcomes, and unresolved findings. This file is **tracked in Git** and accessible to remote reviewers.

The local-only register at `audits/README.md` (gitignored per policy) contains the same classification plus raw finding lists from each investigation audit.

---

## Related Documentation

- `AGENTS.md` (repo root) — Agent instructions, GitHub auth, deployment environments
- `context.md` (repo root) — Current task, decisions, blockers
- `tasks/todo.md` — Backlog and follow-up work items
- `tasks/plan.md` — Implementation plans