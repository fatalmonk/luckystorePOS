import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const pagePaths = [
  'landing/privacy-policy.html',
  'landing/terms-of-service.html',
  'landing/data-deletion.html',
  'apps/customer_storefront/public/privacy-policy.html',
  'apps/customer_storefront/public/terms-of-service.html',
  'apps/customer_storefront/public/data-deletion.html',
];
const requiredContactLinks = ['mailto:hello@luckystore1947.com', 'tel:+8801731944544'];

function declarations(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, 'i'))?.[1];
  assert.ok(block, `Missing CSS rule for ${selector}`);
  return Object.fromEntries(
    [...block.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
}

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
