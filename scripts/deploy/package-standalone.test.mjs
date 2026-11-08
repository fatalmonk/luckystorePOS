import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeBuildProvenance } from './package-standalone.mjs';

test('writeBuildProvenance writes reviewed commit SHA into standalone package before zipping', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e6r-provenance-'));
  writeBuildProvenance(root, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  const txt = fs.readFileSync(path.join(root, 'build_sha.txt'), 'utf8').trim();
  const json = JSON.parse(fs.readFileSync(path.join(root, 'build_provenance.json'), 'utf8'));
  assert.equal(txt, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(json.buildSha, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
});
