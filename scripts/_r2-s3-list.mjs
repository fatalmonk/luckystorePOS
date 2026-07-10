/**
 * AWS Signature V4 signing + listing for R2 S3-compatible API.
 * Used by ops scripts (Node.js, not browser).
 */

import { createHmac, createHash } from 'crypto';

export async function signRequest(method, endpoint, bucket, path, query, accessKey, secretKey, body = '') {
  const url = new URL(`${endpoint}/${bucket}${path}${query ? '?' + query : ''}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const bodyHash = createHash('sha256').update(Buffer.from(body)).digest('hex');

  const canonicalHeaders = `host:${url.hostname}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `${method}\n${url.pathname}\n${url.search.slice(1)}\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${createHash('sha256').update(canonicalRequest).digest('hex')}`;

  const kDate = createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update('auto').digest();
  const kService = createHmac('sha256', kRegion).update('s3').digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: url.toString(),
    headers: {
      'Authorization': authorization,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': bodyHash,
    },
  };
}

export async function listR2Objects(endpoint, bucket, { prefix = '', maxKeys = 1000 } = {}) {
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKey || !secretKey) {
    throw new Error('Missing R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY');
  }

  let continuationToken = null;
  const keys = [];

  do {
    const params = new URLSearchParams({
      'list-type': '2',
      'max-keys': String(maxKeys),
      prefix,
    });
    if (continuationToken) params.set('continuation-token', continuationToken);

    const query = params.toString();
    const { url, headers } = await signRequest('GET', endpoint, bucket, '/', query, accessKey, secretKey);

    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`R2 list failed: ${res.status} ${text.slice(0, 200)}`);
    }

    const xml = await res.text();
    const keyMatches = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)];
    keys.push(...keyMatches.map(m => m[1]));

    const trunc = xml.match(/<IsTruncated>(true|false)<\/IsTruncated>/);
    const nextTokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    continuationToken = trunc?.[1] === 'true' && nextTokenMatch ? nextTokenMatch[1] : null;
  } while (continuationToken);

  return keys;
}
