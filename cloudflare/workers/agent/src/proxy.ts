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

  // Size guard (Workers limit: 50 MB, we enforce 10 MB) - early exit check
  const contentLengthHeader = upstreamRes.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (contentLength > MAX_RESPONSE_BYTES) {
      return new Response('Upstream response too large', { status: 502 });
    }
  }

  // Dynamic byte counter for streamed/chunked responses to prevent bypass
  if (!upstreamRes.body) {
    return upstreamRes;
  }

  let bytesRead = 0;
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytesRead += chunk.byteLength;
      if (bytesRead > MAX_RESPONSE_BYTES) {
        controller.error(new Error('Upstream response too large'));
      } else {
        controller.enqueue(chunk);
      }
    },
  });

  // Pipe body in the background, catch errors gracefully
  upstreamRes.body.pipeTo(writable).catch(() => {});

  return new Response(readable, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: upstreamRes.headers,
  });
}