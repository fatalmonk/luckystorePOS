import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('./migrate-images-to-r2.mjs', import.meta.url));

test('legacy execution mode is rejected before environment loading or remote access', () => {
  const emptyCwd = mkdtempSync(join(tmpdir(), 'luckystore-image-migration-'));
  try {
    const result = spawnSync(process.execPath, [scriptPath, '--execute'], {
      cwd: emptyCwd,
      encoding: 'utf8',
    });
    const output = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 2);
    assert.match(output, /Direct legacy image migration is disabled/);
    assert.doesNotMatch(output, /\.env\.local not found/);
  } finally {
    rmSync(emptyCwd, { recursive: true, force: true });
  }
});
