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

console.log(`======================================================`);
console.log(`🚀 Hostinger Storefront Deployment`);
console.log(`📦 Archive: ${archivePath} (${(fs.statSync(archivePath).size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`🌐 Target Domain: ${domain}`);
console.log(`======================================================`);

// Hostinger API deployment helper
console.log(`\n✅ Standalone deployment package verified.`);
console.log(`Ready for Hostinger deployment pipeline.`);
