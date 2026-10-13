import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createWorker } from 'tesseract.js';

const REPO_ROOT = path.resolve('.');
const RECEIPTS_DIR = path.join(REPO_ROOT, 'data/july-2026-receipts');
const OUT_JSONL = path.join(REPO_ROOT, '.codex-audits/2026-07/ocr-triage.jsonl');

async function main() {
  const allFiles = fs.readdirSync(RECEIPTS_DIR)
    .filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'))
    .sort();

  // Load existing results if any
  const doneSet = new Set();
  if (fs.existsSync(OUT_JSONL)) {
    const lines = fs.readFileSync(OUT_JSONL, 'utf8').split('\n').filter(Boolean);
    for (const l of lines) {
      try {
        const item = JSON.parse(l);
        if (item.filename) doneSet.add(item.filename);
      } catch {}
    }
  }

  const todoFiles = allFiles.filter(f => !doneSet.has(f));
  console.log(`Total files: ${allFiles.length}, Already done: ${doneSet.size}, Remaining: ${todoFiles.length}`);

  if (todoFiles.length === 0) {
    console.log('All files already triaged.');
    return;
  }

  // Create 4 worker pool
  const numWorkers = 4;
  console.log(`Initializing ${numWorkers} workers...`);
  const workers = await Promise.all(
    Array.from({ length: numWorkers }, () => createWorker('eng'))
  );

  let cursor = 0;
  const outStream = fs.createWriteStream(OUT_JSONL, { flags: 'a' });

  async function workerLoop(worker, workerId) {
    while (cursor < todoFiles.length) {
      const idx = cursor++;
      const file = todoFiles[idx];
      const filePath = path.join(RECEIPTS_DIR, file);

      try {
        const buf = fs.readFileSync(filePath);
        const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
        const ret = await worker.recognize(filePath);
        const record = {
          filename: file,
          sha256,
          size_bytes: buf.length,
          text: ret.data.text.trim(),
          confidence: ret.data.confidence,
        };
        outStream.write(JSON.stringify(record) + '\n');
        if ((idx + 1) % 10 === 0 || idx === todoFiles.length - 1) {
          console.log(`[Worker ${workerId}] Processed ${idx + 1}/${todoFiles.length} (${file})`);
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
      }
    }
  }

  await Promise.all(workers.map((w, id) => workerLoop(w, id)));
  outStream.end();
  await Promise.all(workers.map(w => w.terminate()));
  console.log('OCR triage completed successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
