# robots.txt Skill

## Description
Crawl rules for AI agents visiting lucky-store-six.vercel.app.

## Location
`https://lucky-store-six.vercel.app/robots.txt`

## Rules Summary
- **Allowed for search indexing:** GPTBot, OAI-SearchBot, ChatGPT-User, Google-Extended, PerplexityBot, Amazonbot, Applebot
- **Blocked (training only):** CCBot, ClaudeBot, Claude-Web, anthropic-ai, Bytespider, Diffbot, ImagesiftBot, omgili, omgilibot
- **Content Signals:** `ai-train=no, search=yes, ai-input=no`

## Disallowed Paths (all agents)
- `/api/` — internal API endpoints
- `/order/` — order tracking pages
- `/checkout/` — checkout flow
- `/cart/` — cart page

## Sitemap
`https://lucky-store-six.vercel.app/sitemap.xml`