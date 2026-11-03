import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicOcr = resolve(appRoot, 'public/ocr');
const publicCore = resolve(publicOcr, 'core');
const workerSource = require.resolve('tesseract.js/dist/worker.min.js');
const coreRoot = dirname(require.resolve('tesseract.js-core'));
// Tesseract's worker selects one compatible core after detecting browser SIMD
// support. Keep the baseline and SIMD variants; LSTM and relaxed-SIMD variants
// are larger optional builds and are not needed by the worker's default mode.
const coreFiles = ['tesseract-core.wasm.js', 'tesseract-core-simd.wasm.js'];
const unusedCoreFiles = [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
];

for (const file of coreFiles) {
  if (!existsSync(resolve(coreRoot, file))) {
    throw new Error(`Missing required Tesseract WASM core: ${file}`);
  }
}

mkdirSync(publicCore, { recursive: true });
copyFileSync(workerSource, resolve(publicOcr, 'worker.min.js'));

for (const file of unusedCoreFiles) {
  const destination = resolve(publicCore, file);
  if (existsSync(destination)) unlinkSync(destination);
}

for (const file of coreFiles) {
  copyFileSync(resolve(coreRoot, file), resolve(publicCore, file));
}
