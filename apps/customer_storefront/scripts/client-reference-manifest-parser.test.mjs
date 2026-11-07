import assert from 'node:assert/strict';
import test from 'node:test';

import parser from './client-reference-manifest-parser.cjs';

const { parseClientReferenceManifest } = parser;

const prefix = 'globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\n';

test('parses a generated Turbopack manifest without creating a VM context', () => {
  const value = { clientModules: { './Card.js': { id: 7, chunks: ['chunk.js'] } } };
  const source = `${prefix}globalThis.__RSC_MANIFEST["/(english)/page"] = ${JSON.stringify(value)}\n`;

  assert.deepEqual(parseClientReferenceManifest(source, 'deploy-42'), {
    process: { env: { NEXT_DEPLOYMENT_ID: 'deploy-42' } },
    __RSC_MANIFEST: { '/(english)/page': value },
  });
});

test('rejects unrecognized executable suffixes for the existing VM fallback', () => {
  const source = `${prefix}globalThis.__RSC_MANIFEST["/page"] = {"clientModules":{}}\nthrow new Error("custom code")`;
  assert.equal(parseClientReferenceManifest(source), null);
});

test('rejects __proto__ keys so JSON parsing cannot change object-literal semantics', () => {
  const value = JSON.stringify({ ['__proto__']: { polluted: true } });
  const source = `${prefix}globalThis.__RSC_MANIFEST["/page"] = ${value}\n`;
  assert.equal(parseClientReferenceManifest(source), null);
});

test('rejects deployment-ID code suffixes for the existing VM fallback', () => {
  const source = `${prefix}globalThis.__RSC_MANIFEST["/page"] = {"clientModules":{}}\nfor (const key in globalThis.__RSC_MANIFEST["/page"].clientModules) {}`;
  assert.equal(parseClientReferenceManifest(source), null);
});
