#!/usr/bin/env node
/**
 * Simple secret scanner — checks for common secret patterns in source files.
 * Exits non-zero if secrets are found.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const PATTERNS = [
  { name: 'API key', regex: /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[a-zA-Z0-9]{20,}/gi },
  { name: 'AWS secret', regex: /aws_secret_access_key\s*[:=]\s*["']?[a-zA-Z0-9/+=]{40,}/gi },
  { name: 'Postgres URL', regex: /postgresql:\/\/[^:]+:[^@]+@/gi },
  { name: 'JWT token', regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
  { name: 'Private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const IGNORE = ['.git', 'node_modules', 'dist', '.wrangler', 'package-lock.json'];
const EXTENSIONS = ['.ts', '.js', '.mjs', '.json', '.toml', '.yaml', '.yml', '.env'];

let found = false;

function scanDir(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE.includes(entry)) continue;
    const fullPath = join(dir, entry);
    let stat;
    try { stat = statSync(fullPath); } catch { continue; }
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (EXTENSIONS.includes(extname(entry)) || entry === '.env') {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  let content;
  try { content = readFileSync(filePath, 'utf8'); } catch { return; }
  for (const { name, regex } of PATTERNS) {
    const matches = content.match(regex);
    if (matches) {
      for (const match of matches) {
        // Skip placeholder values
        if (match.includes('your-') || match.includes('placeholder') || match.includes('***')) continue;
        console.error(`[SECRET] ${name} in ${filePath}: ${match.slice(0, 40)}...`);
        found = true;
      }
    }
  }
}

const target = process.argv[2] || 'src';
console.log(`Scanning ${target} for secrets...`);
scanDir(target);
if (found) {
  console.error('Secrets detected! Do not deploy.');
  process.exit(1);
} else {
  console.log('No secrets found.');
  process.exit(0);
}