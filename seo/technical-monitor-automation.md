# Automated technical SEO monitoring

The canonical daily monitor is `.github/workflows/seo-technical-monitor.yml`. It runs at 02:00 UTC (08:00 Bangladesh time) and supports manual dispatch.

## Autonomous workflow

1. Run the offline Python monitor tests.
2. Fetch production robots.txt, sitemap XML and a small deterministic sample of pages.
3. Always upload the JSON evidence as a GitHub Actions artifact retained for 90 days.
4. Open a single GitHub incident when there are monitor issues, verification limitations or an audit execution failure.
5. Update the existing incident on subsequent failing runs; do not create daily duplicates.
6. Close the incident only after a successful report with zero issues and zero limitations.
7. Include a direct Actions run link in the incident so a maintainer can inspect evidence.

The incident workflow uses only the repository's built-in `GITHUB_TOKEN`, with `contents: read` and `issues: write`. It does not need external API keys, modify the production website, deploy, commit monitoring results or merge PRs.

Warnings are informational and do not create incidents by themselves. In particular, `no_hreflang_alternates` is not automatically a defect unless an alternate language version is confirmed to exist and be indexable. The monitor only samples pages and only checks the presence of JSON-LD types; it does not validate all schema properties, Google indexing, ranking or conversions.

## Operations

- Run manually from **Actions → Lucky Store Technical SEO Monitor → Run workflow** on main.
- Inspect the **seo-technical-report** artifact and workflow summary.
- Search open issues for **SEO technical monitor: production checks need attention**.
- If the GitHub API fails, the workflow step fails and the artifact remains available for debugging.
- GitHub Actions scheduled runs may start later than the exact cron minute.

## Next phases (not silently enabled)

Full-sitemap HTTP sampling, reciprocal hreflang validation, Google Search Console and order-conversion reporting require separate implementation and access. Automatic code fixes should remain pull requests requiring human review, never unattended merges.
