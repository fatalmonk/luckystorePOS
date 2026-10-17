# SEO Autopilot — PR Description Template

Use this template for every PR opened by the SEO Autopilot.

---

## PR Title
`seo: [YYYY-MM-DD] — [one-line description of the main change]`

## Labels
`seo`, `autopilot`

---

## PR Body Template

```markdown
## SEO Autopilot Run — [YYYY-MM-DD]

**Run phase:** [Technical / Content / Maintenance / State Update]
**Priority implemented:** [e.g., Bengali delivery footer localization]
**Primary business objective:** Completed grocery orders within 1 km Chawkbazar delivery area

### What changed
- [Bullet list of files changed]
- [What was added / removed / modified]

### Evidence & Rationale
- **Observed source defect / gap:** [Specific issue identified from code, audit artifact, or runbook]
- **Customer / business impact:** [How this impacts grocery discovery, eligibility clarity, or conversion]

### Verification Checklist
- [ ] Deterministic diff policy satisfied (max 12 files, within allowlisted paths)
- [ ] ESLint & TypeScript clean (`npm run typecheck`)
- [ ] Tests pass (`npm run test -- --run`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Rendered verification completed on local fixture runner
- [ ] `seo/state.md` updated with run metrics and changelog

### Verification Limitations
- Local verification uses published snapshots and mock catalog fixtures.
- Live Hostinger routing, production Supabase data, and Google indexing remain unverified until deployment.
- No authenticated order conversion lift or ranking gain is claimed without production measurement.

### Rollback Guidance
- Revert commit on `main`. No database migrations or persistent storage changes are introduced.

### Do not merge until
- [ ] Automated CI workflows pass
- [ ] Human reviewer has inspected rendered pages and verified source diff
```
