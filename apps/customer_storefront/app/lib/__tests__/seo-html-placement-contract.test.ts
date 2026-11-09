import { describe, expect, it } from 'vitest';

function analyzeSeoPlacement(html: string) {
  const headEnd = html.toLowerCase().indexOf('</head>');
  const head = headEnd >= 0 ? html.slice(0, headEnd) : '';
  const body = headEnd >= 0 ? html.slice(headEnd) : html;
  const count = (re: RegExp, s: string) => (s.match(re) || []).length;
  const canonicalHrefs = [...head.matchAll(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  return {
    headFound: headEnd >= 0,
    canonicalHead: count(/<link[^>]*rel=["']canonical["'][^>]*>/gi, head),
    canonicalBody: count(/<link[^>]*rel=["']canonical["'][^>]*>/gi, body),
    titleHead: count(/<title\b/gi, head),
    titleBody: count(/<title\b/gi, body),
    metaDescriptionBody: count(/<meta[^>]*name=["']description["'][^>]*>/gi, body),
    robotsBody: count(/<meta[^>]*name=["']robots["'][^>]*>/gi, body),
    hreflangBody: count(/hreflang=/gi, body),
    canonicalHrefs,
  };
}

describe('raw HTML SEO placement contract (PerfBee Task 1/2 guard)', () => {
  it('accepts canonical/title/meta in head and none in body', () => {
    const html = `<!doctype html><html><head><title>T</title><link rel="canonical" href="https://www.luckystore1947.com/"/><meta name="description" content="d"/></head><body><main>x</main></body></html>`;
    expect(analyzeSeoPlacement(html)).toMatchObject({
      headFound: true,
      canonicalHead: 1,
      canonicalBody: 0,
      titleHead: 1,
      titleBody: 0,
      metaDescriptionBody: 0,
      canonicalHrefs: ['https://www.luckystore1947.com/'],
    });
  });

  it('detects SEO tags misplaced in body (observed production failure mode)', () => {
    const html = `<!doctype html><html><head></head><body><link rel="canonical" href="https://www.luckystore1947.com/bn/product/x"/><title>X</title><meta name="description" content="d"/></body></html>`;
    expect(analyzeSeoPlacement(html)).toMatchObject({
      canonicalHead: 0,
      canonicalBody: 1,
      titleHead: 0,
      titleBody: 1,
      metaDescriptionBody: 1,
    });
  });

  it('detects duplicate/conflicting canonicals distinctly', () => {
    const html = `<!doctype html><html><head><link rel="canonical" href="https://a/"/><link rel="canonical" href="https://b/"/></head><body></body></html>`;
    expect(analyzeSeoPlacement(html)).toMatchObject({
      canonicalHead: 2,
      canonicalBody: 0,
      canonicalHrefs: ['https://a/', 'https://b/'],
    });
  });

  it('treats incomplete/partial HTML as a limitation, not a pass', () => {
    const html = `<!doctype html><html><head><title>T</title>`;
    expect(analyzeSeoPlacement(html)).toMatchObject({
      headFound: false,
      canonicalHead: 0,
      titleHead: 0,
    });
  });
});
