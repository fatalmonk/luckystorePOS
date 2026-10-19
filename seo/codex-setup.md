# Scheduled Codex SEO Autopilot — operator setup

The daily deterministic monitor remains separate at 08:00 Asia/Dhaka. The Codex coding job runs at 08:45 Asia/Dhaka and creates **draft PRs only** when an actual storefront change is produced and checks pass.

## One-time setup
1. Merge the implementation PR after review.
2. GitHub repository Settings → Environments → New environment: `seo-autopilot`. Do **not** require manual approval for this environment if unattended daily runs are desired; PR merges still require review.
3. Add environment secret `OPENROUTER_API_KEY` (a key created at https://openrouter.ai/settings/keys; set a budget and usage limits). The action passes it as a bearer token to `https://openrouter.ai/api/v1/responses`, not to OpenAI. Never paste it into source, workflow YAML or issue comments.
4. GitHub Settings → Actions → General → Workflow permissions: allow GitHub Actions to create pull requests. Use the narrowest practical permission settings.
5. Configure `OPENROUTER_CODEX_MODEL`: set repository or `seo-autopilot` environment variable `OPENROUTER_CODEX_MODEL` to a tested, production-grade model on OpenRouter suitable for unattended code synthesis (e.g., `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`, `openai/o3-mini`). The default fallback in the workflow is `openai/gpt-5.6-luna`. Always verify Responses API endpoint compatibility, tool invocation capability, and token expenditure limits before enabling unattended schedules.
6. Recommended: configure `SEO_PR_TOKEN` as a fine-grained GitHub App installation token or dedicated automation token with repository Contents and Pull requests read/write only. This ensures ordinary PR CI can trigger. Without it, the workflow uses GITHUB_TOKEN, whose PR events typically do not trigger other workflows. Do not grant workflow-editing permissions to this bot.
7. Run the workflow manually on main and inspect the draft PR, CI and Actions logs. Confirm the agent cannot change protected paths. Configure branch protection to require independent CI and human review.
8. Keep deployment secrets, production database keys and privileged cloud tokens out of this job environment. Rotate compromised tokens promptly.

## Boundaries
- Agent works in the built-in `:workspace` permission profile with `drop-sudo` on an ephemeral GitHub-hosted Linux runner.
- Codex cannot receive checkout-persisted Git credentials. A scoped token is used later by the PR action, not supplied as an agent input.
- The diff guard is a second control, not a substitute for isolation or review. The agent must not run production deployment or alter business logic.
- Storefront build may require public build-time environment variables or a network dependency. If missing, the job fails closed; supply only non-sensitive test values where possible.
- GitHub Actions schedules are best-effort and may be delayed. Cost depends on API usage and Actions minutes.
- The workflow does not automatically connect Search Console, GA4, competitor API access or an AI answer tracker.

## OpenRouter compatibility verification
The workflow uses the official Codex Action's `responses-api-endpoint` override with a full `/responses` URL, and `openai-api-key` as the action's **generic bearer-token input**. No OpenAI Platform API key is needed. This uses the Action's proxy rather than a user-level Codex custom-provider config. Provider compatibility and successful tool calls must be established by a manual Actions run; this PR does not prove the selected model works end to end. A missing key fails preflight. Do not use a model that only supports chat completions. The environment should contain **only** the OpenRouter key and, optionally, the model variable.
