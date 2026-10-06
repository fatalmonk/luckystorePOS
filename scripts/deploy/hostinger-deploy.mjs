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

function apiRequest(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `https://api.hostinger.com${endpoint}`);
    const req = https.request(url, {
      method,
      headers: {
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

function uploadTus(uploadUrl, authKey, restAuth, filePath, fileSize) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(uploadUrl.startsWith('http') ? uploadUrl : `https://srv1621-files.hstgr.io${uploadUrl}`);
    const postReq = https.request(`${targetUrl.origin}${targetUrl.pathname}/app.zip?override=true`, {
      method: 'POST',
      headers: {
        'X-Auth': authKey,
        'X-Auth-Rest': restAuth,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Offset': '0'
      }
    }, (postRes) => {
      if (postRes.statusCode !== 201 && postRes.statusCode !== 200) {
        return reject(new Error(`TUS creation failed with status ${postRes.statusCode}`));
      }

      console.log('Streaming archive via TUS PATCH...');
      const patchReq = https.request(`${targetUrl.origin}${targetUrl.pathname}/app.zip?override=true`, {
        method: 'PATCH',
        headers: {
          'X-Auth': authKey,
          'X-Auth-Rest': restAuth,
          'Tus-Resumable': '1.0.0',
          'Content-Type': 'application/offset+octet-stream',
          'Upload-Offset': '0',
          'Content-Length': String(fileSize)
        }
      }, (patchRes) => {
        if (patchRes.statusCode === 204 || patchRes.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`TUS upload failed with status ${patchRes.statusCode}`));
        }
      });

      patchReq.on('error', reject);
      fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 }).pipe(patchReq);
    });

    postReq.on('error', reject);
    postReq.end();
  });
}

async function run() {
  try {
    // 1. Generate TUS upload credentials
    console.log('1. Requesting upload URL from Hostinger API...');
    const uploadRes = await apiRequest('POST', `/hosting/v1/websites/${domain}/files/upload-url`);
    if (uploadRes.status !== 200) {
      throw new Error(`Failed to generate upload URL: ${JSON.stringify(uploadRes.body)}`);
    }

    const { url: tusUrl, auth_key: authKey, rest_auth_key: restAuth } = uploadRes.body;
    console.log('✅ Upload credentials generated.');

    // 2. Upload archive
    console.log('2. Uploading standalone release package to Hostinger...');
    await uploadTus(tusUrl, authKey, restAuth, archivePath, size);
    console.log('✅ Standalone package uploaded successfully.');

    // 3. Start Node.js build process
    console.log('3. Triggering Node.js archive build pipeline...');
    const buildRes = await apiRequest('POST', `/hosting/nodejs/v1/websites/${domain}/builds`, {
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
    });

    if (buildRes.status !== 200 && buildRes.status !== 201) {
      throw new Error(`Failed to trigger Node.js build: ${JSON.stringify(buildRes.body)}`);
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
      const pollRes = await apiRequest('GET', `/hosting/nodejs/v1/websites/${domain}/builds/${uuid}`);
      state = pollRes.body?.state;
      console.log(`   [${attempts * 4}s] Build state: ${state}`);

      if (state === 'completed') {
        console.log('🎉 Deployment succeeded! Application restarted and ready.');
        process.exit(0);
      } else if (state === 'failed') {
        const logRes = await apiRequest('GET', `/hosting/nodejs/v1/websites/${domain}/builds/${uuid}/logs`);
        console.error('❌ Build failed with logs:');
        console.error(logRes.body?.logs || 'No logs available');
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('❌ Deployment error:', err.message);
    process.exit(1);
  }
}

run();
