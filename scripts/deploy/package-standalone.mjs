import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createStandaloneRuntimeManifest } from './standalone-runtime-manifest.mjs';

export function writeBuildProvenance(standaloneDir, buildSha) {
  if (!buildSha) throw new Error('Build SHA is required for release provenance.');
  fs.mkdirSync(standaloneDir, { recursive: true });
  fs.writeFileSync(path.join(standaloneDir, 'build_sha.txt'), `${buildSha}\n`);
  fs.writeFileSync(
    path.join(standaloneDir, 'build_provenance.json'),
    `${JSON.stringify({ schema: 'luckystore.build-provenance.v1', buildSha, packagedAt: new Date().toISOString() }, null, 2)}\n`,
  );
}

export function packageStandalone({ rootDir = process.cwd(), outputZip = 'storefront-release.zip', buildSha = process.env.EXPECTED_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || null } = {}) {
  const standaloneDir = path.join(rootDir, 'apps/customer_storefront/.next/standalone');
  const staticDir = path.join(rootDir, 'apps/customer_storefront/.next/static');
  const publicDir = path.join(rootDir, 'apps/customer_storefront/public');
  const resolvedOutputZip = path.isAbsolute(outputZip) ? outputZip : path.resolve(rootDir, outputZip);

  console.log('📦 Preparing Hostinger standalone package...');

  const destStatic = path.join(standaloneDir, 'apps/customer_storefront/.next/static');
  const destPublic = path.join(standaloneDir, 'apps/customer_storefront/public');
  const rootDestStatic = path.join(standaloneDir, '.next/static');
  const rootDestPublic = path.join(standaloneDir, 'public');

  fs.mkdirSync(destStatic, { recursive: true });
  fs.cpSync(staticDir, destStatic, { recursive: true });
  fs.mkdirSync(destPublic, { recursive: true });
  fs.cpSync(publicDir, destPublic, { recursive: true });
  fs.mkdirSync(rootDestStatic, { recursive: true });
  fs.cpSync(staticDir, rootDestStatic, { recursive: true });
  fs.mkdirSync(rootDestPublic, { recursive: true });
  fs.cpSync(publicDir, rootDestPublic, { recursive: true });

  fs.writeFileSync(path.join(standaloneDir, 'server.js'), `require('./apps/customer_storefront/server.js');\n`);
  const appPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'apps/customer_storefront/package.json'), 'utf8'));
  const rootPkg = createStandaloneRuntimeManifest(appPkg);
  fs.writeFileSync(path.join(standaloneDir, 'package.json'), JSON.stringify(rootPkg, null, 2));

  writeBuildProvenance(standaloneDir, buildSha);

  if (fs.existsSync(resolvedOutputZip)) fs.unlinkSync(resolvedOutputZip);
  console.log(`Creating ZIP at ${resolvedOutputZip}...`);
  execSync(`cd "${standaloneDir}" && zip -r -q "${resolvedOutputZip}" .`, { stdio: 'inherit' });
  console.log(`✅ Package created: ${resolvedOutputZip} (${(fs.statSync(resolvedOutputZip).size / 1024 / 1024).toFixed(2)} MB)`);
  return { outputZip: resolvedOutputZip, standaloneDir, buildSha };
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  const buildSha = process.env.EXPECTED_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || null;
  if (!buildSha) {
    console.error('ERROR: EXPECTED_SHA or NEXT_PUBLIC_BUILD_SHA is required for release provenance.');
    process.exit(1);
  }
  packageStandalone({
    outputZip: process.argv[2] || 'storefront-release.zip',
    buildSha,
  });
}
