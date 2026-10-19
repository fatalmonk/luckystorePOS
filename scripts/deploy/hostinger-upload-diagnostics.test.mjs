import assert from 'node:assert/strict';
import test from 'node:test';
import { formatUploadResponseFailure } from './hostinger-upload-diagnostics.mjs';

test('formats Hostinger upload status and response body without exposing upload credentials', () => {
  const message = formatUploadResponseFailure({
    phase: 'TUS PATCH',
    statusCode: 413,
    statusMessage: 'Payload Too Large',
    headers: { 'x-request-id': 'request-123' },
    body: 'upload rejected; auth=secret-auth; rest=secret-rest; url=https://files.test/signed-path',
    secrets: ['secret-auth', 'secret-rest', 'https://files.test/signed-path'],
  });

  assert.match(message, /TUS PATCH failed: HTTP 413 Payload Too Large/);
  assert.match(message, /request-id: request-123/);
  assert.match(message, /upload rejected/);
  assert.doesNotMatch(message, /secret-auth|secret-rest|signed-path/);
});

test('bounds an oversized Hostinger response body in logs', () => {
  const message = formatUploadResponseFailure({
    phase: 'TUS creation',
    statusCode: 500,
    body: 'x'.repeat(10_000),
  });

  assert.ok(message.length < 5_000);
  assert.match(message, /response body truncated/);
});
