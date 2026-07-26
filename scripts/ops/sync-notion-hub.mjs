#!/usr/bin/env node

/**
 * Auto-Sync Script for Notion Operating Hub (luckystore1947.com)
 *
 * Gathers current git branch, latest commit, uncommitted changes, typecheck status,
 * and updates both local context.md and the Notion canonical pages.
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const MAIN_HUB_ID = '3a7fe7a6-8af8-813f-9b0d-f695ac2515af';

function run(cmd, suppressError = false) {
  try {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch (err) {
    if (suppressError) return '';
    throw err;
  }
}

function getGitInfo() {
  const branch = run('git rev-parse --abbrev-ref HEAD', true) || 'main';
  const commitHash = run('git rev-parse --short HEAD', true) || 'unknown';
  const commitMsg = run('git log -1 --format="%s"', true) || '';
  const commitDate = run('git log -1 --format="%cd" --date=short', true) || new Date().toISOString().split('T')[0];
  const statusOutput = run('git status --porcelain', true) || '';
  const modifiedFiles = statusOutput ? statusOutput.split('\n').filter(Boolean) : [];

  return {
    branch,
    commitHash,
    commitMsg,
    commitDate,
    uncommittedCount: modifiedFiles.length,
    modifiedFilesPreview: modifiedFiles.slice(0, 5).join(', '),
  };
}

function checkHealth() {
  let storefrontTypecheck = false;
  let adminTypecheck = false;

  try {
    run('cd apps/customer_storefront && npx tsc --noEmit', true);
    storefrontTypecheck = true;
  } catch {
    storefrontTypecheck = false;
  }

  try {
    run('cd apps/admin_web && npx tsc -p tsconfig.app.json --noEmit', true);
    adminTypecheck = true;
  } catch {
    adminTypecheck = false;
  }

  return { storefrontTypecheck, adminTypecheck };
}

function generateContextMd(git, health) {
  const now = new Date().toISOString().split('T')[0];
  return `[Project]
Stack: Next.js 15 (customer_storefront), React 19/Vite (admin_web), Flutter (mobile_app), Supabase, Cloudflare Workers/R2
Current: Storefront & Admin Notion Hub auto-sync setup
Done: Enriched Markdown-for-Agents endpoint (/api/markdown), populated Notion hubs (customer_storefront, admin_web), added 12 child pages
Branch: ${git.branch} (${git.commitHash} - ${git.commitMsg})
Uncommitted: ${git.uncommittedCount} files (${git.modifiedFilesPreview || 'clean'})
Health: Storefront TS ${health.storefrontTypecheck ? '✅' : '❌'} | Admin TS ${health.adminTypecheck ? '✅' : '❌'}
Last Synced: ${now}
ctx: notion auto-sync | done: 15 | next: pr review
`;
}

function updateHubContent(existingMarkdown, git, health) {
  const now = new Date().toISOString().split('T')[0];

  const statusBlock = `## Live Repository Status
- **Current Branch:** \`${git.branch}\`
- **Latest Commit:** \`${git.commitHash}\` — *${git.commitMsg}* (${git.commitDate})
- **Uncommitted Files:** ${git.uncommittedCount === 0 ? 'Clean working tree' : `${git.uncommittedCount} modified (${git.modifiedFilesPreview})`}
- **Typecheck Status:** Storefront ${health.storefrontTypecheck ? '✅ Passing' : '❌ Failing'} | Admin Web ${health.adminTypecheck ? '✅ Passing' : '❌ Failing'}
- **Last Synced:** ${now}`;

  // Insert right before Canonical pages
  if (existingMarkdown.includes('## Canonical pages')) {
    return existingMarkdown.replace(/(## Canonical pages)/, `${statusBlock}\n\n$1`);
  }

  return existingMarkdown + '\n\n' + statusBlock;
}

async function main() {
  console.log('🔄 Gathering repository status...');
  const git = getGitInfo();
  const health = checkHealth();

  console.log(`📌 Branch: ${git.branch} | Commit: ${git.commitHash}`);
  console.log(`🏥 Health: Storefront TS (${health.storefrontTypecheck ? 'Pass' : 'Fail'}) | Admin TS (${health.adminTypecheck ? 'Pass' : 'Fail'})`);

  // 1. Update local context.md
  const contextContent = generateContextMd(git, health);
  writeFileSync(join(REPO_ROOT, 'context.md'), contextContent);
  console.log('✅ Updated local context.md');

  // 2. Fetch current Notion Operating Hub (luckystore1947.com) page content
  console.log(`📥 Fetching current Notion operating hub (${MAIN_HUB_ID})...`);
  const currentMarkdown = run(`ntn pages get ${MAIN_HUB_ID}`);

  if (!currentMarkdown) {
    console.error('❌ Failed to retrieve current Notion hub content');
    return;
  }

  // 3. Dynamically patch the status block into existing markdown
  const updatedMarkdown = updateHubContent(currentMarkdown, git, health);
  const tempFile = join(REPO_ROOT, '.tmp_hub_sync.md');
  writeFileSync(tempFile, updatedMarkdown);

  try {
    execSync(`ntn pages edit ${MAIN_HUB_ID} < "${tempFile}"`, { stdio: 'inherit' });
    console.log(`✅ Synced Notion main operating hub (${MAIN_HUB_ID})`);
  } catch (err) {
    console.error('❌ Failed to update Notion hub:', err.message);
  } finally {
    try {
      execSync(`rm -f "${tempFile}"`);
    } catch {}
  }
}

main().catch(console.error);
