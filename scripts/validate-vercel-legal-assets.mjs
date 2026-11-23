import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDirectory = resolve('dist_public');
const legalPages = [
  'privacy-policy.html',
  'terms-of-service.html',
  'data-deletion.html',
];
const requiredAssets = [
  'logo-main.png',
  'favicon.ico',
  'favicon-48x48.png',
  'favicon.svg',
  'apple-touch-icon.png',
];

for (const assetName of requiredAssets) {
  const assetPath = resolve(outputDirectory, assetName);
  assert.ok(statSync(assetPath).size > 0, `${assetName} must be nonempty in dist_public`);
  const bytes = readFileSync(assetPath);
  if (assetName.endsWith('.png')) {
    assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), `${assetName} must be a PNG image`);
  } else if (assetName.endsWith('.ico')) {
    assert.deepEqual(bytes.subarray(0, 4), Buffer.from([0, 0, 1, 0]), `${assetName} must be an ICO image`);
  } else {
    assert.match(bytes.toString('utf8'), /<svg\b/i, `${assetName} must be an SVG image`);
  }
}

for (const pageName of legalPages) {
  const html = readFileSync(resolve(outputDirectory, pageName), 'utf8');
  assert.match(html, /src=["']\/logo-main\.png["']/i, `${pageName} must reference the packaged logo`);
  for (const assetName of requiredAssets.slice(1)) {
    assert.ok(html.includes(`/${assetName}?v=2`), `${pageName} must reference ${assetName}`);
  }
}

console.log(`Validated ${legalPages.length} legal pages and ${requiredAssets.length} nonempty image assets in ${outputDirectory}.`);
