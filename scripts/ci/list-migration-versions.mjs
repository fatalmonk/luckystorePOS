#!/usr/bin/env node
import fs from 'node:fs';
const dir = process.argv[2] || 'supabase/migrations';
const versions = fs.readdirSync(dir)
  .map((f) => /^(\d{14})_.*\.sql$/.exec(f)?.[1])
  .filter(Boolean)
  .sort();
process.stdout.write(JSON.stringify(versions));
