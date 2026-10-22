# Supabase Log Query spike and Cloudflare attribution

**Investigation date:** 2026-10-22
**Scope:** Read-only review of the 2026-10-19 Supabase usage spike, project usage totals, project request logs, connected Cloudflare account, and deployed Worker code.

## Findings

### The chart measures log-query scans, not API traffic

The Supabase usage chart shown in the user's screenshot reports 1.919 TB of **Log Query** usage on 19 Oct 2026. The current dashboard defines this metric as logs scanned through Studio, the Management API, the CLI, or another interface; it labels Log Query “UPCOMING” and says enforcement starts after the grace period at the start of 2027. The dashboard also says the Free plan is not billed for overages. The current-cycle view is 03 Oct–03 Nov 2026.

Source: [Supabase: Manage Logs Query usage](https://supabase.com/docs/guides/platform/manage-your-usage/logs-query)

### Project attribution from the live Usage dashboard

The live dashboard's first captured organization total for the current cycle was 2,131.309 GB Log Query. Filtering to `Lucky Store` showed 2,124.355 GB; filtering to `Lucky Store Security Tests` showed 6.954 GB. These project values sum exactly to the organization total, and production Lucky Store accounts for 99.67% of it. This attributes nearly all of the scan volume to the production project, but does not reveal the caller or the content of the searches.

A later dashboard refresh during this investigation showed 2,149.827 GB for `Lucky Store` and 6.954 GB for `Lucky Store Security Tests` (2,156.781 GB combined); Log Ingestion was 0.975 GB and 0.258 GB respectively, and Egress was 8.024 GB and 0.102 GB. Production Log Query therefore rose 25.472 GB between the two captures. Supabase's current guidance says each Logs Explorer query rescans data. This investigation made repeated read-only queries against project logs, so those queries **may have contributed to some of the increase after the first capture**; the available data cannot attribute the change per query. Those later reads cannot explain the already-recorded 19 Oct spike. Further Supabase log queries were stopped to avoid adding scan usage.

The organization banner says it exceeded quota in the previous billing cycle and warns of restrictions from 17 Nov 2026 if still over quota. The live usage page identifies **Egress Exceeded** as the prior-cycle quota issue. That warning is separate from the current-cycle Log Query spike.

### Supabase request-log findings

The Supabase organization contained two projects: `Lucky Store` (`hvmyxyccfnkrbxqbhlnm`) and `Lucky Store Security Tests` (`grxxenvdhfwzafzyykgo`). On 19 Oct, the production Lucky Store project's unified logs contained 12,477 `edge_logs` rows. The security-test project had 4,468 `edge_logs` rows that day.

In the Lucky Store project, `88.223.84.66` was the most frequent IP in the sampled edge-log aggregates. It appeared on requests to `search_storefront_catalog`, `item_translations`, `categories`, `items`, `stock_levels`, and `search_storefront_catalog_v2`. The log metadata labeled this source `HOSTINGER-HOSTING`; requests used `node` or `Next.js Middleware` user agents, and the Node requests included `supabase-js/2.110.7` running on Node.js 22. A representative request was a successful REST read of `/rest/v1/items`.

These observations indicate server-side Supabase API traffic. They do not identify the operator and do not show that these requests performed log searches. The daily edge-log row count was lower on 19 Oct than on 18 Oct (12,477 versus 15,641), so the edge-log count does not explain the Log Query chart spike.

### Cloudflare account and Worker inspection

The connected Cloudflare account was `Lucky Store` and contained the active `luckystore1947.com` zone. Its Worker inventory included:

- `agent-luckystore1947`, routed at `agent.luckystore1947.com/*`. Its deployed code uses Supabase for JWT/JWKS validation and an Auth health check. Its application proxy routes to Neon and an images Worker, not to Supabase REST endpoints.
- `lucky-store-competitor-scraper`, a scheduled Worker deployed on 17 Oct. Its deployed code loads inventory from Supabase and calls the `ingest_competitor_scrape_batch` RPC in chunks. It is therefore a plausible source of some Supabase API traffic in general.

Cloudflare's account API listed only two workflow instances for `lucky-store-competitor-scrape`, both triggered by API on 21 Oct 2026 and both terminated. There were no workflow instances on 19 Oct. This rules out that workflow's recorded executions as the cause of the 19 Oct request activity. A separate Worker observability query for 19 Oct returned no events, but its dataset/filter semantics were not independently confirmed and are not used as primary evidence.

The Supabase request source was labeled `HOSTINGER-HOSTING`, which does not support direct attribution to a Cloudflare Worker. A proxy or another indirect path cannot be ruled out from these records. No Cloudflare request analytics tying that IP to this account or Worker was obtained.

Cloudflare source inspected through the read-only account API: account Worker inventory, `agent-luckystore1947` deployed script content, and `lucky-store-competitor-scraper` deployed script content. These are account-specific observations, not public documentation.

### Attribution conclusion and remaining gap

The connected Cloudflare account is **not supported as the source** of the spike: the competitor scraper has no recorded workflow execution on 19 Oct, the agent Worker code does not make Supabase REST data calls, and the observed Supabase request IP was labeled `HOSTINGER-HOSTING`. Project request traffic is not itself Log Query usage, so these findings do not identify the actor behind the scan volume.

The exact person, process, or query that generated the 1.919 TB point remains **unidentified**. Supabase project request logs do not expose Studio/Management API log-search history or per-query bytes scanned. The organization is on the Free plan; Supabase's Platform Audit Logs documentation limits that feature to Team and Enterprise plans. Even those audit logs describe platform actions, and availability of detailed Log Query scan attribution was not established. The current dashboard provides the project-level attribution above, not query/actor history.

## Safety and evidence limits

- No database, Worker, DNS, or traffic configuration was changed.
- Supabase log aggregation reports request counts, not the Log Query scan volume.
- Cloudflare IP/ASN labels identify network attribution as reported in logs; they do not identify a human operator.
- Current-cycle dashboard totals are periodically refreshed and are a snapshot captured on 22 Oct 2026.
