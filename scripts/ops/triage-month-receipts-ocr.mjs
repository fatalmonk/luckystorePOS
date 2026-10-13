import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createWorker } from 'tesseract.js';

const month = process.argv[2] || '2026-08';
const monthNameMap = {
  '2026-04': 'april-2026-reciepts',
  '2026-05': 'may-2026-reciepts',
  '2026-06': 'june-2026-receipts',
  '2026-07': 'july-2026-receipts',
  '2026-08': 'august-2026-receipts',
  '2026-09': 'september-2026-receipts',
  '2026-10': 'october-2026-receipts',
};

const folderName = monthNameMap[month] || `${month}-receipts`;
const REPO_ROOT = path.resolve('.');
const RECEIPTS_DIR = path.join(REPO_ROOT, 'data', folderName);
const AUDIT_DIR = path.join(REPO_ROOT, '.codex-audits', month);
fs.mkdirSync(AUDIT_DIR, { recursive: true });
const OUT_JSONL = path.join(AUDIT_DIR, 'ocr-triage.jsonl');

async function main() {
  if (!fs.existsSync(RECEIPTS_DIR)) {
    console.error(`Receipts directory not found: ${RECEIPTS_DIR}`);
    process.exit(1);
  }

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
  console.log(`Month: ${month} (${folderName}) | Total: ${allFiles.length}, Done: ${doneSet.size}, Todo: ${todoFiles.length}`);

  if (todoFiles.length === 0) {
    console.log('All files already triaged.');
    return;
  }

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
        if ((idx + 1) % 15 === 0 || idx === todoFiles.length - 1) {
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
  console.log(`OCR triage for ${month} completed successfully.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
