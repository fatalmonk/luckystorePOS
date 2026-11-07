import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const nextPackagePath = require.resolve('next/package.json');
const nextRoot = path.dirname(nextPackagePath);
const nextVersion = JSON.parse(fs.readFileSync(nextPackagePath, 'utf8')).version;

if (nextVersion !== '16.4.5') {
  throw new Error(
    `The local manifest memory patch targets Next.js 16.4.5; found ${nextVersion}. Review or remove this patch after changing Next.js.`,
  );
}

const helperSourcePath = fileURLToPath(
  new URL('./client-reference-manifest-parser.cjs', import.meta.url),
);
const helperSource = fs.readFileSync(helperSourcePath, 'utf8');

const commonReplacement = `    // Parse known generated manifests in dev; preserve Next's isolated VM fallback for every other shape.
    let contextObject = null;
    if (!shouldCache && path.endsWith('_client-reference-manifest.js')) {
        contextObject = _manifest_memory.parseClientReferenceManifest(content, process.env.NEXT_DEPLOYMENT_ID);
    }
    if (!contextObject) {
        contextObject = {
            process: {
                env: {
                    NEXT_DEPLOYMENT_ID: process.env.NEXT_DEPLOYMENT_ID
                }
            }
        };
        RUN_IN_NEW_CONTEXT;
    }`;

function patchSource(source, format) {
  const importLine = format === 'cjs'
    ? 'const _manifest_memory = require("./client-reference-manifest-memory.cjs");'
    : "import _manifest_memory from './client-reference-manifest-memory.cjs';";
  const importMarker = '_manifest_memory';

  if (source.includes(importMarker)) {
    if (source.includes('parseClientReferenceManifest(content, process.env.NEXT_DEPLOYMENT_ID)')) {
      const vmCall = format === 'cjs'
        ? '(0, _vm.runInNewContext)(content, contextObject);'
        : 'runInNewContext(content, contextObject);';
      return source.replace(`${vmCall}(content, contextObject);`, vmCall);
    }
    throw new Error(`Found a partial/unrecognized manifest patch in the Next.js ${format} loader.`);
  }

  const vmImport = format === 'cjs'
    ? 'const _vm = require("vm");'
    : "import { runInNewContext } from 'vm';";
  if (!source.includes(vmImport)) {
    throw new Error(`Could not find the expected Next.js ${format} VM import.`);
  }
  let updated = source.replace(vmImport, `${vmImport}\n${importLine}`);

  const vmCall = format === 'cjs'
    ? '(0, _vm.runInNewContext)(content, contextObject);'
    : 'runInNewContext(content, contextObject);';
  const replacement = commonReplacement.replace('RUN_IN_NEW_CONTEXT', vmCall);

  const originalBlock = format === 'cjs'
    ? `    let contextObject = {\n        process: {\n            env: {\n                NEXT_DEPLOYMENT_ID: process.env.NEXT_DEPLOYMENT_ID\n            }\n        }\n    };\n    ${vmCall}`
    : `    let contextObject = {\n        process: {\n            env: {\n                NEXT_DEPLOYMENT_ID: process.env.NEXT_DEPLOYMENT_ID\n            }\n        }\n    };\n    ${vmCall}`;

  if (!updated.includes(originalBlock)) {
    throw new Error(`Could not find the expected Next.js ${format} manifest evaluator.`);
  }
  updated = updated.replace(originalBlock, replacement);
  return updated;
}

const targets = [
  {
    format: 'cjs',
    path: path.join(nextRoot, 'dist/server/load-manifest.external.js'),
  },
  {
    format: 'esm',
    path: path.join(nextRoot, 'dist/esm/server/load-manifest.external.js'),
  },
];

const updates = targets.map((target) => {
  const source = fs.readFileSync(target.path, 'utf8');
  const updated = patchSource(source, target.format);
  const helperPath = path.join(path.dirname(target.path), 'client-reference-manifest-memory.cjs');
  return { target, source, updated, helperPath };
});

// Validate every loader before changing any installed Next.js files. This keeps
// a version or source mismatch from leaving only part of the patch applied.
for (const { helperPath } of updates) {
  const helperDirectory = path.dirname(helperPath);
  if (!fs.existsSync(helperDirectory)) {
    throw new Error(`Could not find the expected Next.js helper directory ${helperDirectory}.`);
  }
}

for (const { target, source, updated, helperPath } of updates) {
  if (!fs.existsSync(helperPath) || fs.readFileSync(helperPath, 'utf8') !== helperSource) {
    fs.writeFileSync(helperPath, helperSource);
  }
  if (updated !== source) fs.writeFileSync(target.path, updated);
}

console.log(`Next.js ${nextVersion} dev manifest memory patch is ready.`);
