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

**Run phase:** [Technical / Content / AI Visibility / State Update]
**Priority implemented:** [e.g., FAQPage schema on /delivery]

### What changed
- [Bullet list of files changed]
- [What was added / removed / modified]

### Why
[1-2 sentences on the SEO opportunity this addresses, from the priority list in `seo/state.md`]

### Verification
- [ ] Schema validates at https://validator.schema.org
- [ ] robots.txt still passes AI bot check
- [ ] Sitemap URL count unchanged (run: `curl -s https://www.luckystore1947.com/sitemap.xml | grep -c '<loc>'`)
- [ ] No TypeScript errors (`cd apps/customer_storefront && npm run typecheck`)
- [ ] `seo/state.md` updated with run metrics

### AI visibility impact expected
[Expected citation gains and timeline]

### Do not merge until
- [ ] PR author (SEO agent) has reviewed automated test results
- [ ] Reviewer has checked schema output in browser DevTools
```
