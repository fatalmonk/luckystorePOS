/**
 * OAuth Protected Resource Metadata (RFC 9728)
 * Served by Cloudflare Workers at api.luckystore1947.com
 *
 * The authorization server is Supabase Auth (OIDC-compliant).
 * Cloudflare Access is listed as an additional authorization server
 * when configured.
 */

const RESOURCE = "https://api.luckystore1947.com";
const AUTH_SERVERS = [
  "https://hvmyxyccfnkrbxqbhlnm.supabase.co",
];

const METADATA = {
  resource: RESOURCE,
  authorization_servers: AUTH_SERVERS,
  bearer_methods_supported: ["header"],
  scopes_supported: [
    "openid",
    "read:products",
    "read:orders",
    "write:orders",
    "read:profile",
    "write:profile",
  ],
  resource_name: "Lucky Store API",
  resource_documentation: "https://luckystore1947.com/.well-known/agent-skills/index.json",
  jwks_uri: "https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1/.well-known/jwks.json",
};

const WWW_AUTHENTICATE = `Bearer resource_metadata="${RESOURCE}/.well-known/oauth-protected-resource"`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      ...CORS_HEADERS,
      ...extra,
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Only respond to the well-known path
    if (url.pathname === "/.well-known/oauth-protected-resource") {
      return jsonResponse(METADATA);
    }

    // 401 for all other paths, with WWW-Authenticate pointing to metadata
    return jsonResponse(
      { error: "invalid_request", error_description: "This resource requires OAuth authentication." },
      401,
      { "WWW-Authenticate": WWW_AUTHENTICATE },
    );
  },
};