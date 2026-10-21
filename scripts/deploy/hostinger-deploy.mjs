#!/usr/bin/env node
/**
 * Hostinger Next.js Release Deployment Script
 * Uploads standalone archive to Hostinger Node.js Application and polls build status.
 *
 * Usage:
 *   node scripts/deploy/hostinger-deploy.mjs <archive-file.zip>
 *
 * Required Environment Variables:
 *   HOSTINGER_API_TOKEN   Hostinger API Access Token
 *   HOSTINGER_DOMAIN      Target domain (e.g. luckystore1947.com or next.luckystore1947.com)
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { formatUploadResponseFailure, isTransientUploadFailure } from './hostinger-upload-diagnostics.mjs';

const archivePath = process.argv[2];
const token = process.env.HOSTINGER_API_TOKEN;
const domain = process.env.HOSTINGER_DOMAIN;

if (!archivePath || !fs.existsSync(archivePath)) {
  console.error(`ERROR: Deployment archive not found: ${archivePath}`);
  process.exit(1);
}

if (!domain) {
  console.error(`ERROR: Missing required HOSTINGER_DOMAIN environment variable.`);
  process.exit(1);
}

if (!token) {
  console.error(`ERROR: Missing required HOSTINGER_API_TOKEN environment variable.`);
  process.exit(1);
}

const size = fs.statSync(archivePath).size;

console.log(`======================================================`);
console.log(`🚀 Hostinger Storefront Deployment`);
console.log(`📦 Archive: ${archivePath} (${(size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`🌐 Target Domain: ${domain}`);
console.log(`======================================================`);

const apiBaseUrl = (process.env.HOSTINGER_API_BASE_URL || 'https://developers.hostinger.com').replace(/\/+$/, '');

function apiRequest(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    let cleanPath = endpoint;
    if (!cleanPath.startsWith('http')) {
      if (!cleanPath.startsWith('/api/')) {
        cleanPath = `/api${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
      }
      cleanPath = `${apiBaseUrl}${cleanPath}`;
    }

    const url = new URL(cleanPath);
    const req = https.request(url, {
      method,
      headers: {
        'User-Agent': 'LuckyStore-Deploy/1.0',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function readResponseText(response, maxBytes = 8_192) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let capturedBytes = 0;
    let truncated = false;

    response.on('data', (chunk) => {
      const buffer = Buffer.from(chunk);
      const remaining = maxBytes - capturedBytes;
      if (remaining > 0) {
        const captured = buffer.subarray(0, remaining);
        chunks.push(captured);
        capturedBytes += captured.length;
      }
      if (buffer.length > remaining) truncated = true;
    });
    response.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      resolve(truncated ? `${text}… [response body truncated]` : text);
    });
    response.on('error', reject);
  });
}

function uploadTusOnce(uploadUrl, authKey, restAuth, filePath, fileSize) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(uploadUrl.startsWith('http') ? uploadUrl : `https://srv1621-files.hstgr.io${uploadUrl}`);
    const uploadEndpoint = `${targetUrl.origin}${targetUrl.pathname}/app.zip?override=true`;
    const uploadSecrets = [token, authKey, restAuth, uploadUrl, uploadEndpoint];
    console.log(`   Upload endpoint host: ${targetUrl.host}; archive size: ${fileSize} bytes`);

    const postReq = https.request(uploadEndpoint, {
      method: 'POST',
      headers: {
        'User-Agent': 'LuckyStore-Deploy/1.0',
        'X-Auth': authKey,
        'X-Auth-Rest': restAuth,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Offset': '0'
      }
    }, (postRes) => {
      if (postRes.statusCode !== 201 && postRes.statusCode !== 200) {
        readResponseText(postRes).then((body) => {
          const formatted = formatUploadResponseFailure({
            phase: 'TUS creation',
            statusCode: postRes.statusCode,
            statusMessage: postRes.statusMessage,
            headers: postRes.headers,
            body,
            secrets: uploadSecrets,
          });
          const err = new Error(formatted);
          err.statusCode = postRes.statusCode;
          reject(err);
        }, reject);
        return;
      }

      postRes.resume();
      console.log('Streaming archive via TUS PATCH...');
      const patchReq = https.request(uploadEndpoint, {
        method: 'PATCH',
        headers: {
          'User-Agent': 'LuckyStore-Deploy/1.0',
          'X-Auth': authKey,
          'X-Auth-Rest': restAuth,
          'Tus-Resumable': '1.0.0',
          'Content-Type': 'application/offset+octet-stream',
          'Upload-Offset': '0',
          'Content-Length': String(fileSize)
        }
      }, (patchRes) => {
        if (patchRes.statusCode === 204 || patchRes.statusCode === 200) {
          patchRes.resume();
          resolve();
        } else {
          readResponseText(patchRes).then((body) => {
            const formatted = formatUploadResponseFailure({
              phase: 'TUS PATCH upload',
              statusCode: patchRes.statusCode,
              statusMessage: patchRes.statusMessage,
              headers: patchRes.headers,
              body,
              secrets: uploadSecrets,
            });
            const err = new Error(formatted);
            err.statusCode = patchRes.statusCode;
            reject(err);
          }, reject);
        }
      });

      patchReq.on('error', reject);
      const archiveStream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
      archiveStream.on('error', reject);
      archiveStream.pipe(patchReq);
    });

    postReq.on('error', reject);
    postReq.end();
  });
}


async function uploadTus(uploadUrl, authKey, restAuth, filePath, fileSize, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await uploadTusOnce(uploadUrl, authKey, restAuth, filePath, fileSize);
      return;
    } catch (err) {
      if (attempt === maxRetries || !isTransientUploadFailure(err)) {
        throw err;
      }
      const backoffSec = attempt * 2;
      const failureReason = err.code || err.statusCode || err.message || 'unknown error';
      console.warn(`⚠️  TUS upload attempt ${attempt}/${maxRetries} failed (${failureReason}). Retrying in ${backoffSec}s...`);
      await new Promise(r => setTimeout(r, backoffSec * 1000));
    }
  }
}

async function resolveAccountUsername(targetDomain) {
  try {
    const res = await apiRequest('GET', '/hosting/v1/websites');
    if (res.status === 200 && Array.isArray(res.body?.data)) {
      const match = res.body.data.find(w => w.domain === targetDomain || w.domain === targetDomain.replace(/^next\./, ''));
      if (match?.username) return match.username;
      if (res.body.data[0]?.username) return res.body.data[0].username;
    }
  } catch (err) {
    console.warn('Could not auto-resolve username from API:', err.message);
  }
  return process.env.HOSTINGER_USERNAME || 'u859872680';
}

async function run() {
  try {
    const username = await resolveAccountUsername(domain);
    console.log('Hostinger account configuration resolved.');

    // 1. Generate TUS upload credentials
    console.log('1. Requesting upload URL from Hostinger API...');
    let uploadRes = await apiRequest('POST', '/hosting/v1/files/upload-urls', { username, domain });
    if (uploadRes.status !== 200) {
      uploadRes = await apiRequest('POST', `/hosting/v1/accounts/${username}/websites/${domain}/files/upload-url`, { username, domain });
    }

    if (uploadRes.status !== 200) {
      throw new Error(`Failed to generate upload URL (status ${uploadRes.status}): ${JSON.stringify(uploadRes.body)}`);
    }

    const { url: tusUrl, auth_key: authKey, rest_auth_key: restAuth } = uploadRes.body;
    console.log('✅ Upload credentials generated.');

    // 2. Upload archive
    console.log('2. Uploading standalone release package to Hostinger...');
    await uploadTus(tusUrl, authKey, restAuth, archivePath, size);
    console.log('✅ Standalone package uploaded successfully.');

    // 3. Start Node.js build process
    console.log('3. Triggering Node.js archive build pipeline...');
    const buildPayload = {
      app_type: 'other',
      node_version: 22,
      root_directory: '.',
      output_directory: '.next',
      build_script: 'build',
      entry_file: 'apps/customer_storefront/server.js',
      package_manager: 'npm',
      source_type: 'archive',
      source_options: {
        archive_path: 'app.zip'
      }
    };

    let buildRes = await apiRequest('POST', `/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds`, buildPayload);
    if (buildRes.status !== 200 && buildRes.status !== 201) {
      buildRes = await apiRequest('POST', `/hosting/nodejs/v1/websites/${domain}/builds`, buildPayload);
    }

    if (buildRes.status !== 200 && buildRes.status !== 201) {
      throw new Error(`Failed to trigger Node.js build (status ${buildRes.status}): ${JSON.stringify(buildRes.body)}`);
    }

    const uuid = buildRes.body.uuid;
    console.log(`✅ Build process initiated (UUID: ${uuid}).`);

    // 4. Poll build status
    console.log('4. Monitoring build execution...');
    let state = 'running';
    let attempts = 0;
    while (state === 'running' || state === 'pending') {
      await new Promise(r => setTimeout(r, 4000));
      attempts++;
      let pollRes = await apiRequest('GET', `/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/${uuid}`);
      if (pollRes.status !== 200) {
        pollRes = await apiRequest('GET', `/hosting/nodejs/v1/websites/${domain}/builds/${uuid}`);
      }
      state = pollRes.body?.state;
      console.log(`   [${attempts * 4}s] Build state: ${state}`);

      if (state === 'completed') {
        console.log('🎉 Deployment succeeded! Application restarted and ready.');
        process.exit(0);
      } else if (state === 'failed') {
        let logRes = await apiRequest('GET', `/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/${uuid}/logs`);
        if (logRes.status !== 200) {
          logRes = await apiRequest('GET', `/hosting/nodejs/v1/websites/${domain}/builds/${uuid}/logs`);
        }
        console.error('❌ Build failed with logs:');
        console.error(logRes.body?.logs || 'No logs available');
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('❌ Deployment error:', err.stack || err);
    process.exit(1);
  }

}

run();
