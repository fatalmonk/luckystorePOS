import { describe, expect, it } from 'vitest';
import { sanitizeNotFairArticleHtml } from '../src/lib/notfair-article';

describe('remote NotFair article HTML', () => {
  it('removes executable markup, inline styling, arbitrary classes, and unsafe URLs', () => {
    const clean = sanitizeNotFairArticleHtml(`
      <script>alert(1)</script><form><input name="password" /></form>
      <iframe src="https://example.com"></iframe>
      <p class="nf-attribution arbitrary" style="position:fixed" onclick="alert(1)">Credit</p>
      <a href="javascript:alert(1)" target="_blank" rel="opener">Bad link</a>
      <img src="http://example.com/image.jpg" onerror="alert(1)" />
      <img src="data:image/svg+xml,test" />
    `);
    expect(clean).not.toMatch(/<script|<form|<input|<iframe|style=|onclick=|onerror=|javascript:|data:image|http:\/\/example|arbitrary|rel="opener"/);
    expect(clean).toContain('class="nf-attribution"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  it('preserves article structure, table-of-contents anchors, images and attribution', () => {
    const clean = sanitizeNotFairArticleHtml(`
      <nav class="nf-toc" aria-label="Contents"><p class="nf-toc-title">Contents</p>
        <ul><li class="nf-toc-l2"><a href="#ingredients">Ingredients</a></li>
        <li class="nf-toc-l3"><a href="#details">Details</a></li></ul>
      </nav>
      <h2 id="ingredients">Ingredients</h2><h3 id="details">Details</h3>
      <ol><li>First step</li></ol><blockquote>Note</blockquote>
      <figure><img src="https://notfair.co/api/seo/image/1" alt="Ingredients" loading="lazy" />
        <figcaption>Ingredients pictured</figcaption></figure>
      <div class="nf-tablewrap"><table><thead><tr><th>Item</th></tr></thead>
        <tbody><tr><td>Rice</td></tr></tbody></table></div>
      <p class="nf-attribution"><a href="https://example.com">Source</a></p>
    `);
    for (const expected of ['class="nf-toc"', 'class="nf-toc-title"', 'class="nf-toc-l2"', 'class="nf-toc-l3"', 'href="#ingredients"', 'id="ingredients"', '<ol>', '<blockquote>', '<figcaption>', 'https://notfair.co/api/seo/image/1', 'class="nf-tablewrap"', '<thead>', '<tbody>', '<th>', '<td>', 'class="nf-attribution"']) {
      expect(clean).toContain(expected);
    }
  });

  it('normalizes remote h1 to h2 to maintain single page h1 hierarchy for WCAG', () => {
    const clean = sanitizeNotFairArticleHtml(`
      <h1 id="overview">Overview Title</h1>
      <p>Body copy</p>
    `);
    expect(clean).toContain('<h2 id="overview">Overview Title</h2>');
    expect(clean).not.toContain('<h1');
  });

  it('enforces alt attribute on images and blocks third-party tracking images', () => {
    const clean = sanitizeNotFairArticleHtml(`
      <img src="https://notfair.co/api/seo/photo1.webp" />
      <img src="https://tracker-beacon.evil.com/pixel.gif" alt="Tracking pixel" />
    `);
    expect(clean).toContain('alt="Article image"');
    expect(clean).not.toContain('tracker-beacon.evil.com');
  });
});
