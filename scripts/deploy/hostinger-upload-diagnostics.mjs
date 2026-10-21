const MAX_LOGGED_RESPONSE_CHARS = 4_000;
const TRANSIENT_HTTP_STATUSES = new Set([403, 408, 409, 429, 500, 502, 503, 504]);
const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
]);

export function isTransientUploadFailure(error) {
  return TRANSIENT_HTTP_STATUSES.has(error?.statusCode)
    || TRANSIENT_NETWORK_CODES.has(error?.code);
}

export function formatUploadResponseFailure({
  phase,
  statusCode,
  statusMessage,
  headers = {},
  body = '',
  secrets = [],
}) {
  let safeBody = String(body || '<empty response body>');
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 0) {
      safeBody = safeBody.replaceAll(secret, '[REDACTED]');
    }
  }

  const truncated = safeBody.length > MAX_LOGGED_RESPONSE_CHARS;
  if (truncated) safeBody = `${safeBody.slice(0, MAX_LOGGED_RESPONSE_CHARS)}… [response body truncated]`;

  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const requestId = normalizedHeaders['x-request-id']
    || normalizedHeaders['request-id']
    || normalizedHeaders['trace-id'];
  const status = [statusCode, statusMessage].filter(Boolean).join(' ') || 'unknown status';

  return [
    `Hostinger ${phase} failed: HTTP ${status}`,
    requestId ? `request-id: ${requestId}` : null,
    `response body: ${safeBody}`,
  ].filter(Boolean).join('\n');
}
