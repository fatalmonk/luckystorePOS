import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";
import test from "node:test";

const script = fileURLToPath(new URL("./validate-backend.mjs", import.meta.url));

for (const host of ["https://example.supabase.co", "https://example.supabase.co/"]) {
  test(`accepts root HTTPS host ${host}`, () => {
    const result = spawnSync(process.execPath, [script], {
      env: { ...process.env, CANVA_BACKEND_HOST: host },
    });
    assert.equal(result.status, 0);
  });
}

for (const host of [
  "",
  "http://example.supabase.co",
  "https://user:password@example.supabase.co",
  "https://example.supabase.co/functions",
  "https://example.supabase.co/functions/",
  "https://example.supabase.co?",
  "https://example.supabase.co#",
  "https://example.supabase.co?query=1",
  "https://example.supabase.co#fragment",
]) {
  test(`rejects invalid backend host ${host}`, () => {
    const result = spawnSync(process.execPath, [script], {
      env: { ...process.env, CANVA_BACKEND_HOST: host },
    });
    assert.equal(result.status, 1);
  });
}
