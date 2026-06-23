/**
 * R2 image storage client — Cloudflare R2 via S3-compatible API.
 * 
 * Uses fetch with AWS Signature V4 signing (no AWS SDK needed).
 * Env vars:
 *   VITE_R2_PUBLIC_URL        — public R2 endpoint for reading images
 *   VITE_R2_ACCOUNT_ID        — Cloudflare account ID
 *   VITE_R2_ACCESS_KEY_ID     — R2 S3 access key
 *   VITE_R2_SECRET_ACCESS_KEY — R2 S3 secret key
 *   VITE_R2_BUCKET_NAME       — R2 bucket name
 */

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';
const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || 'lucky-store-images';

const S3_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── Crypto helpers ──────────────────────────────────────────────────────────

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufToHex(hash);
}

async function hmacSha256(key: ArrayBuffer, data: ArrayBuffer): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, data);
}

// ── AWS Signature V4 ────────────────────────────────────────────────────────

async function signV4(
  method: string,
  url: URL,
  bodyHash: string,
  accessKey: string,
  secretKey: string,
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders = `host:${url.hostname}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `${method}\n${url.pathname}\n${url.search.slice(1)}\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(new TextEncoder().encode(canonicalRequest).buffer as ArrayBuffer)}`;

  const enc = new TextEncoder();
  const kDate = await hmacSha256(enc.encode(`AWS4${secretKey}`).buffer as ArrayBuffer, enc.encode(dateStamp).buffer as ArrayBuffer);
  const kRegion = await hmacSha256(kDate, enc.encode('auto').buffer as ArrayBuffer);
  const kService = await hmacSha256(kRegion, enc.encode('s3').buffer as ArrayBuffer);
  const kSigning = await hmacSha256(kService, enc.encode('aws4_request').buffer as ArrayBuffer);
  const signature = bufToHex(await hmacSha256(kSigning, enc.encode(stringToSign).buffer as ArrayBuffer));

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Authorization': authorization,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': bodyHash,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Upload image to R2. Returns the public URL.
 */
export async function uploadToR2(file: File, key: string): Promise<string> {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }

  const body = await file.arrayBuffer();
  const bodyHash = await sha256(body);
  const url = new URL(`${S3_ENDPOINT}/${R2_BUCKET_NAME}/${key}`);

  const signedHeaders = await signV4(
    'PUT', url, bodyHash, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  );

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      ...signedHeaders,
      'Content-Type': file.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R2 upload failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete image from R2.
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }

  const url = new URL(`${S3_ENDPOINT}/${R2_BUCKET_NAME}/${key}`);
  const signedHeaders = await signV4(
    'DELETE', url, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  );

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: signedHeaders,
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 delete failed: ${response.status}`);
  }
}

/**
 * Check if R2 is configured.
 */
export function isR2Configured(): boolean {
  return !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCOUNT_ID);
}