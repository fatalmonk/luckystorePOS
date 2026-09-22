import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicOcr = resolve(appRoot, 'public/ocr');
const publicCore = resolve(publicOcr, 'core');
const workerSource = require.resolve('tesseract.js/dist/worker.min.js');
const coreRoot = dirname(require.resolve('tesseract.js-core'));
const coreFiles = readdirSync(coreRoot).filter((name) => /^tesseract-core.*\.wasm\.js$/.test(name));

if (coreFiles.length < 4) {
  throw new Error(`Expected Tesseract WASM core variants, found ${coreFiles.length}`);
}

mkdirSync(publicCore, { recursive: true });
copyFileSync(workerSource, resolve(publicOcr, 'worker.min.js'));

for (const file of coreFiles) {
  copyFileSync(resolve(coreRoot, file), resolve(publicCore, file));
}
