# Scheduled Codex SEO Autopilot — operator setup

The daily deterministic monitor remains separate at 08:00 Asia/Dhaka. The Codex coding job runs at 08:45 Asia/Dhaka and creates **draft PRs only** when an actual storefront change is produced and checks pass.

## One-time setup
1. Merge the implementation PR after review.
2. GitHub repository Settings → Environments → New environment: `seo-autopilot`. Do **not** require manual approval for this environment if unattended daily runs are desired; PR merges still require review.
3. Add environment secret `OPENAI_API_KEY` (an OpenAI API platform key with budget limits, not a ChatGPT subscription). Never paste it into source, workflow YAML or issue comments.
4. GitHub Settings → Actions → General → Workflow permissions: allow GitHub Actions to create pull requests. Use the narrowest practical permission settings.
5. Recommended: configure `SEO_PR_TOKEN` as a fine-grained GitHub App installation token or dedicated automation token with repository Contents and Pull requests read/write only. This ensures ordinary PR CI can trigger. Without it, the workflow uses GITHUB_TOKEN, whose PR events typically do not trigger other workflows. Do not grant workflow-editing permissions to this bot.
6. Run the workflow manually on main and inspect the draft PR, CI and Actions logs. Confirm the agent cannot change protected paths. Configure branch protection to require independent CI and human review.
7. Keep deployment secrets, production database keys and privileged cloud tokens out of this job environment. Rotate compromised tokens promptly.

## Boundaries
- Agent works in the built-in `:workspace` permission profile with `drop-sudo` on an ephemeral GitHub-hosted Linux runner.
- Codex cannot receive checkout-persisted Git credentials. A scoped token is used later by the PR action, not supplied as an agent input.
- The diff guard is a second control, not a substitute for isolation or review. The agent must not run production deployment or alter business logic.
- Storefront build may require public build-time environment variables or a network dependency. If missing, the job fails closed; supply only non-sensitive test values where possible.
- GitHub Actions schedules are best-effort and may be delayed. Cost depends on API usage and Actions minutes.
- The workflow does not automatically connect Search Console, GA4, competitor API access or an AI answer tracker.
