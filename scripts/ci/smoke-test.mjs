#!/usr/bin/env node
/**
 * Storefront Post-Deployment Smoke Test Suite
 * Validates Next.js standalone server routes, Supabase DB connectivity, and cache headers.
 * 
 * Usage:
 *   node scripts/ci/smoke-test.mjs --url https://next.luckystore1947.com [--expected-sha <sha>]
 */

import https from 'node:https';
import http from 'node:http';

function parseArgs() {
  const args = process.argv.slice(2);
  let url = 'http://localhost:3000';
  let expectedSha = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      url = args[i + 1].replace(/\/$/, '');
      i++;
    } else if (args[i] === '--expected-sha' && args[i + 1]) {
      expectedSha = args[i + 1];
      i++;
    }
  }
  return { url, expectedSha };
}

function request(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(parsed, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'LuckyStore-SmokeTest/2.0',
        ...(options.headers || {})
      },
      timeout: 15000,
      rejectUnauthorized: false
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after 15s: ${targetUrl}`));
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const { url: baseUrl, expectedSha } = parseArgs();
  console.log(`\n======================================================`);
  console.log(`🔍 Running Storefront Smoke Tests against: ${baseUrl}`);
  if (expectedSha) console.log(`🎯 Expected Commit SHA: ${expectedSha}`);
  console.log(`======================================================\n`);

  const tests = [
    {
      name: '1. Health Check Endpoint (/api/health)',
      fn: async () => {
        const res = await request(`${baseUrl}/api/health`);
        if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
        const data = JSON.parse(res.body);
        if (data.status !== 'ok') throw new Error(`Expected status 'ok', got: ${res.body}`);
        return 'Status 200 OK';
      }
    },
    {
      name: '2. Homepage (English: /)',
      fn: async () => {
        const res = await request(`${baseUrl}/`);
        if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
        if (!res.body.includes('<!DOCTYPE html>') && !res.body.includes('<html')) {
          throw new Error('Response did not contain valid HTML');
        }
        return 'HTML 200 OK';
      }
    },
    {
      name: '3. Homepage (Bengali: /bn)',
      fn: async () => {
        const res = await request(`${baseUrl}/bn`);
        if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
        return 'HTML 200 OK';
      }
    },
    {
      name: '4. Supabase DB Query Endpoint (/api/products)',
      fn: async () => {
        const res = await request(`${baseUrl}/api/products`);
        if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode} body: ${res.body.slice(0, 100)}`);
        const data = JSON.parse(res.body);
        if (!Array.isArray(data) && !Array.isArray(data?.items) && !Array.isArray(data?.products)) {
          throw new Error(`Expected product array, got: ${typeof data}`);
        }
        const count = Array.isArray(data) ? data.length : (data?.products?.length || data?.items?.length || 0);
        return `Supabase query successful (${count} products returned)`;
      }
    },
    {
      name: '5. Sitemap XML (/sitemap.xml)',
      fn: async () => {
        const res = await request(`${baseUrl}/sitemap.xml`);
        if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
        if (!res.body.includes('<?xml') && !res.body.includes('<urlset')) {
          throw new Error('Response does not appear to be valid XML sitemap');
        }
        return 'Sitemap XML 200 OK';
      }
    },
    {
      name: '6. Cache Header Assertions (HTML not cached at edge)',
      fn: async () => {
        const res = await request(`${baseUrl}/`);
        const cfCache = res.headers['cf-cache-status'];
        if (cfCache && cfCache === 'HIT') {
          throw new Error(`SECURITY WARNING: Cloudflare returned HIT on HTML route! Expected DYNAMIC/BYPASS.`);
        }
        return `cf-cache-status: ${cfCache || 'origin (direct)'}`;
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    process.stdout.write(`• ${t.name} ... `);
    try {
      const detail = await t.fn();
      console.log(`✅ PASS (${detail})`);
      passed++;
    } catch (err) {
      console.log(`❌ FAIL`);
      console.error(`  Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal error during smoke test:', err);
  process.exit(1);
});
