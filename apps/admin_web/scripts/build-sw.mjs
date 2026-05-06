import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

await build({
  root: projectRoot,
  configFile: resolve(projectRoot, 'vite.config.ts'),
  build: {
    emptyOutDir: false,
    outDir: resolve(projectRoot, 'dist'),
    lib: {
      entry: resolve(projectRoot, 'src/sw/sw.ts'),
      formats: ['es'],
      fileName: () => 'sw.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'sw.js',
      },
    },
  },
});

console.log('Service worker built to dist/sw.js');