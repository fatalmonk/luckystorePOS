# DNS-AID Records Setup — Cloudflare

## Status
DNS-AID records cannot be created programmatically with the current `cfat_` wrangler token
(which doesn't have DNS edit permissions for REST API). These records need to be created
via the Cloudflare dashboard.

## Zone
- **Domain:** luckystore1947.com
- **Zone ID:** cadbf71f2c3aee47e0c299319cba570d

## Records to Create

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