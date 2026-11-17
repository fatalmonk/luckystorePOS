# DNS-AID Records Setup — Cloudflare

## Status
DNS-AID records cannot be created programmatically with the current `cfat_` wrangler token
(which doesn't have DNS edit permissions for REST API). These records need to be created
via the Cloudflare dashboard.

**Audit warning (2026-11-17):** This is an unverified historical draft, not a
ready-to-apply DNS change. Its endpoint examples still target the former
`lucky-store-six.vercel.app` preview and must not be copied unchanged. Current
storefront discovery resources are served from `luckystore1947.com`; the agent
worker's OAuth metadata is served from `agent.luckystore1947.com`. Reconfirm the
DNS-AID record syntax, endpoint ownership, and live targets before any dashboard
write.

## Zone
- **Domain:** luckystore1947.com
- **Zone ID:** cadbf71f2c3aee47e0c299319cba570d

## Historical Record Draft — Do Not Apply Unchanged

### 1. Agent Index Record (TXT)
```
Type:   TXT
Name:   _index._agents
Content: "v=1; endpoints=https://lucky-store-six.vercel.app/.well-known/api-catalog,https://lucky-store-six.vercel.app/.well-known/mcp/server-card.json"
TTL:    3600
```

### 2. A2A Agent Endpoint (SVCB/HTTPS)
```
Type:   HTTPS
Name:   _a2a._agents
Content: 1 . alpn=h2 endpoint=https://lucky-store-six.vercel.app/api/mcp
TTL:    3600
```

### 3. Service Discovery (SVCB)
```
Type:   SVCB
Name:   _api._agents
Content: 1 . alpn=h2 endpoint=https://lucky-store-six.vercel.app/.well-known/api-catalog
TTL:    3600
```

## DNSSEC
Ensure DNSSEC is enabled for the luckystore1947.com zone so that
validating resolvers return authenticated data.
- Cloudflare Dashboard → DNS → DNSSEC → Enable

## References
- https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/
- https://www.rfc-editor.org/rfc/rfc9460
