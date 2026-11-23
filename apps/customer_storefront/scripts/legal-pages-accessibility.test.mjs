import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const pagePaths = [
  'landing/privacy-policy.html',
  'landing/terms-of-service.html',
  'landing/data-deletion.html',
  'apps/customer_storefront/public/privacy-policy.html',
  'apps/customer_storefront/public/terms-of-service.html',
  'apps/customer_storefront/public/data-deletion.html',
];
const pagePairs = [
  ['landing/privacy-policy.html', 'apps/customer_storefront/public/privacy-policy.html'],
  ['landing/terms-of-service.html', 'apps/customer_storefront/public/terms-of-service.html'],
  ['landing/data-deletion.html', 'apps/customer_storefront/public/data-deletion.html'],
];
const requiredContactLinks = ['mailto:hello@luckystore1947.com', 'tel:+8801731944544'];
const requiredAssets = [
  'logo-main.png',
  'favicon.ico',
  'favicon-48x48.png',
  'favicon.svg',
  'apple-touch-icon.png',
];
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

function normalizeDeploymentPaths(html, assetPrefix) {
  return html
    .replaceAll(`${assetPrefix}logo-main.png`, '/legal-assets/logo-main.png')
    .replaceAll(`${assetPrefix}favicon.ico`, '/legal-assets/favicon.ico')
    .replaceAll(`${assetPrefix}favicon-48x48.png`, '/legal-assets/favicon-48x48.png')
    .replaceAll(`${assetPrefix}favicon.svg`, '/legal-assets/favicon.svg')
    .replaceAll(`${assetPrefix}apple-touch-icon.png`, '/legal-assets/apple-touch-icon.png');
}

function declarations(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, 'i'))?.[1];
  assert.ok(block, `Missing CSS rule for ${selector}`);
  return Object.fromEntries(
    [...block.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
}

for (const [landingPath, storefrontPath] of pagePairs) {
  test(`${landingPath} and ${storefrontPath} stay in design parity`, () => {
    const landingHtml = readFileSync(new URL(`../../../${landingPath}`, import.meta.url), 'utf8');
    const storefrontHtml = readFileSync(new URL(`../../../${storefrontPath}`, import.meta.url), 'utf8');
    const normalizedLandingHtml = normalizeDeploymentPaths(landingHtml, '/legal-assets/')
      .replace('href="index.html"', 'href="/"');
    const normalizedStorefrontHtml = normalizeDeploymentPaths(storefrontHtml, '/');

    assert.equal(
      normalizedLandingHtml,
      normalizedStorefrontHtml,
      'only deployment-specific asset paths and the back-link destination may differ',
    );
  });
}

test('Vercel legal pages reference existing packaged legal assets', () => {
  for (const pageName of ['privacy-policy.html', 'terms-of-service.html', 'data-deletion.html']) {
    const html = readFileSync(new URL(`../../../landing/${pageName}`, import.meta.url), 'utf8');
    for (const assetName of requiredAssets) {
      assert.ok(html.includes(`/legal-assets/${assetName}`), `${pageName} must reference /legal-assets/${assetName}`);
      assert.ok(
        existsSync(new URL(`../../../apps/customer_storefront/public/${assetName}`, import.meta.url)),
        `Vercel must package existing source asset ${assetName}`,
      );
    }
  }
});

test('Hostinger storefront legal pages reference assets in the public directory', () => {
  for (const pageName of ['privacy-policy.html', 'terms-of-service.html', 'data-deletion.html']) {
    const html = readFileSync(
      new URL(`../../../apps/customer_storefront/public/${pageName}`, import.meta.url),
      'utf8',
    );
    for (const assetName of requiredAssets) {
      assert.ok(html.includes(`/${assetName}`), `${pageName} must reference root-relative ${assetName}`);
      assert.ok(
        existsSync(new URL(`../../../apps/customer_storefront/public/${assetName}`, import.meta.url)),
        `Hostinger public directory must contain ${assetName}`,
      );
    }
  }
});

test('Hostinger standalone public roots include all legal assets', () => {
  const standaloneRoot = resolve(repositoryRoot, 'apps/customer_storefront/.next/standalone');
  const publicRoots = [
    resolve(standaloneRoot, 'public'),
    resolve(standaloneRoot, 'apps/customer_storefront/public'),
  ].filter(existsSync);

  if (publicRoots.length === 0) {
    assert.match(
      readFileSync(resolve(repositoryRoot, 'scripts/deploy/package-standalone.mjs'), 'utf8'),
      /fs\.cpSync\(publicDir,\s*destPublic,\s*\{\s*recursive:\s*true\s*\}\)/,
      'Hostinger packaging must recursively copy the storefront public directory',
    );
    return;
  }

  for (const publicRoot of publicRoots) {
    for (const assetName of requiredAssets) {
      assert.ok(existsSync(resolve(publicRoot, assetName)), `${publicRoot} must contain ${assetName}`);
    }
  }
});

function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const channels = hex.match(/[a-f\d]{2}/gi);
    assert.equal(channels?.length, 3, `Expected a six-digit hex color, got ${hex}`);
    const [red, green, blue] = channels.map((value) => {
      const channel = Number.parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

for (const pagePath of pagePaths) {
  test(`${pagePath} has readable, underlined links and visible keyboard focus`, () => {
    const html = readFileSync(new URL(`../../../${pagePath}`, import.meta.url), 'utf8');
    const style = html.match(/<style>([\s\S]*?)<\/style>/i)?.[1];
    assert.ok(style, `${pagePath} must include its page stylesheet`);
    const assetPrefix = pagePath.startsWith('landing/') ? '/legal-assets/' : '/';
    assert.ok(html.includes(`href="${assetPrefix}favicon.svg?v=2"`));
    assert.ok(html.includes(`src="${assetPrefix}logo-main.png"`));
    for (const favicon of requiredAssets.slice(1)) {
      assert.ok(html.includes(`href="${assetPrefix}${favicon}?v=2"`), `${pagePath} must reference ${assetPrefix}${favicon}`);
    }

    const base = declarations(style, 'a');
    const hover = declarations(style, 'a:hover');
    const focus = declarations(style, 'a:focus-visible');
    const body = declarations(style, 'body');
    const container = declarations(style, '.container');
    const contactBox = declarations(style, '.contact-box');
    const backLinkHover = declarations(style, '.back-link:hover');
    const lightBackgrounds = [
      body.background,
      container.background,
      contactBox.background,
      '#FFF8E1',
      backLinkHover.background,
    ].filter((color) => /^#[\da-f]{6}$/i.test(color));

    assert.equal(base['text-decoration'], 'underline');
    assert.equal(hover['text-decoration'] ?? base['text-decoration'], 'underline');
    assert.match(focus.outline, /2px solid/i);
    assert.match(focus['outline-color'] ?? focus.outline, /#0B0B0D/i);
    assert.equal(focus['outline-offset'], '2px');

    const anchor = html.match(/<a\b[^>]*>/gi) ?? [];
    assert.ok(anchor.length >= 3, `${pagePath} should contain contact and navigation links`);
    for (const href of requiredContactLinks) {
      assert.ok(html.includes(`href="${href}"`), `${pagePath} must retain ${href}`);
    }

    for (const background of lightBackgrounds) {
      for (const color of [base.color, hover.color, backLinkHover.color ?? hover.color]) {
        assert.ok(
          contrastRatio(color, background) >= 4.5,
          `${pagePath}: ${color} on ${background} must meet WCAG AA contrast`,
        );
      }
      assert.ok(
        contrastRatio('#0B0B0D', background) >= 3,
        `${pagePath}: keyboard focus outline must have 3:1 contrast on ${background}`,
      );
    }
  });
}
