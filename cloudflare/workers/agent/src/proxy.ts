// src/proxy.ts
// Proxy logic per Phase 8

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB guard

export async function proxyRequest(
  upstream: string,
  request: Request,
  neonProxyApiKey: string,
  requestId: string
): Promise<Response> {
  // Only forward safe headers — do NOT spread all client headers.
  // Spreading Host causes upstream domain mismatch; CF-* headers are internal.
  const safeHeaders: Record<string, string> = {
    'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
    'x-request-id': requestId,
  };
  // Add neon-proxy auth key only when routing to neon-proxy
  if (upstream.includes('neon-proxy') || upstream.includes('luckystore-1947')) {
    safeHeaders['x-api-key'] = neonProxyApiKey;
  }

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers: safeHeaders,
    body: request.body,
  });

  // Size guard (Workers limit: 50 MB, we enforce 10 MB)
  const contentLength = parseInt(upstreamRes.headers.get('content-length') ?? '0');
  if (contentLength > MAX_RESPONSE_BYTES) {
    return new Response('Upstream response too large', { status: 502 });
  }

  return upstreamRes;
}