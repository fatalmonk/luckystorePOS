import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.ts';

const secret = 'test-upload-signing-secret';

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

async function tokenFor({ key, operation = 'upload', expiresAt = Math.floor(Date.now() / 1000) + 60 }) {
  const payload = JSON.stringify({
    v: 1,
    op: operation,
    sub: 'auth-user-1',
    key,
    contentType: 'image/webp',
    maxBytes: 1_000,
    exp: expiresAt,
    nonce: 'test-nonce',
  });
  const encoded = encode(payload);
  const signingKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    signingKey,
    new TextEncoder().encode(encoded),
  );
  return `${encoded}.${Buffer.from(signature).toString('base64url')}`;
}

function makeEnv(writes = []) {
  const consumed = new Set();
  return {
    ALLOWED_ORIGINS: 'http://localhost:3000',
    PUBLIC_BASE_URL: 'https://images.example',
    UPLOAD_SIGNING_SECRET: secret,
    INTERNAL_UPLOAD_SECRET: 'internal-secret',
    TICKET_NONCES: {
      idFromName: (name) => name,
      get: (id) => ({ fetch: async () => {
        if (consumed.has(id)) return new Response(null, { status: 409 });
        consumed.add(id);
        return new Response(null, { status: 204 });
      } }),
    },
    IMAGES: {
      put: async (key) => writes.push(key),
      get: async () => null,
      delete: async () => undefined,
    },
  };
}

function requestWith({ key, token, fileKey = key, headers = {} }) {
  const form = new FormData();
  form.append('file', new File([new Uint8Array([1, 2, 3])], 'product.webp', { type: 'image/webp' }));
  form.append('key', fileKey);
  return new Request('https://images.example/upload', {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '127.0.0.1', ...headers, ...(token ? { 'X-Upload-Token': token } : {}) },
    body: form,
  });
}

test('rejects browser uploads without a signed capability', async () => {
  const response = await worker.fetch(requestWith({ key: 'products/t/item.webp' }), makeEnv());
  assert.equal(response.status, 401);
});

test('accepts a valid capability only for its exact key', async () => {
  const key = 'products/tenant-a/item.webp';
  const token = await tokenFor({ key });
  const writes = [];
  const accepted = await worker.fetch(requestWith({ key, token }), makeEnv(writes));
  const mismatched = await worker.fetch(requestWith({ key, token, fileKey: 'products/tenant-a/other.webp' }), makeEnv(writes));

  assert.equal(accepted.status, 200);
  assert.equal(mismatched.status, 400);
  assert.deepEqual(writes, [key]);
});

test('rejects expired and wrong-operation capabilities', async () => {
  const key = 'products/tenant-a/item.webp';
  const expired = await tokenFor({ key, expiresAt: Math.floor(Date.now() / 1000) - 1 });
  const deleteToken = await tokenFor({ key, operation: 'delete' });
  const expiredResponse = await worker.fetch(requestWith({ key, token: expired }), makeEnv());
  const wrongOperationResponse = await worker.fetch(requestWith({ key, token: deleteToken }), makeEnv());

  assert.equal(expiredResponse.status, 401);
  assert.equal(wrongOperationResponse.status, 401);
});

test('consumes a capability nonce and rejects replay', async () => {
  const key = 'products/tenant-a/item.webp';
  const token = await tokenFor({ key });
  const env = makeEnv();
  const first = await worker.fetch(requestWith({ key, token }), env);
  const replay = await worker.fetch(requestWith({ key, token }), env);

  assert.equal(first.status, 200);
  assert.equal(replay.status, 401);
});

test('keeps internal upload separate from browser capabilities', async () => {
  const key = 'products/tenant-a/canva/session.webp';
  const form = new FormData();
  form.append('file', new File([new Uint8Array([1])], 'session.webp', { type: 'image/webp' }));
  form.append('key', key);

  const unauthorized = await worker.fetch(new Request('https://images.example/internal-upload', {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '127.0.0.1' },
    body: form,
  }), makeEnv());
  const authorized = await worker.fetch(new Request('https://images.example/internal-upload', {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '127.0.0.1', 'X-Internal-Upload-Secret': 'internal-secret' },
    body: form,
  }), makeEnv());

  assert.equal(unauthorized.status, 401);
  assert.equal(authorized.status, 200);
});
