#!/usr/bin/env node
// verify-agent-skills.mjs
// Verifies SHA256 hashes in agent-skills/index.json match actual files on disk.
// Exit 0 = all OK, Exit 1 = one or more hashes drifted.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsRoot = path.resolve(
  __dirname,
  "../public/.well-known/agent-skills"
);
const indexPath = path.join(skillsRoot, "index.json");

const { skills } = JSON.parse(readFileSync(indexPath, "utf8"));

let failed = false;

for (const skill of skills) {
  // Derive relative file path from URL
  const urlPath = new URL(skill.url).pathname; // e.g. /.well-known/agent-skills/browse-products.md
  const relativePath = urlPath.replace("/.well-known/agent-skills/", "");
  const fullPath = path.join(skillsRoot, relativePath);

  let content;
  try {
    content = readFileSync(fullPath);
  } catch {
    console.error(`❌  ${skill.name}: file not found at ${fullPath}`);
    failed = true;
    continue;
  }

  const actual = createHash("sha256").update(content).digest("hex");
  if (actual !== skill.sha256) {
    console.error(`❌  ${skill.name}: hash mismatch`);
    console.error(`    recorded: ${skill.sha256}`);
    console.error(`    actual:   ${actual}`);
    failed = true;
  } else {
    console.log(`✅  ${skill.name}`);
  }
}

if (failed) {
  console.error(
    "\nFix: update sha256 values in index.json and bump version + updated_at."
  );
  process.exit(1);
}

console.log("\nAll agent-skill hashes verified.");
