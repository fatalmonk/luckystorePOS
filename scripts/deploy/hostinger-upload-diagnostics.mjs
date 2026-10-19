const MAX_LOGGED_RESPONSE_CHARS = 4_000;

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
