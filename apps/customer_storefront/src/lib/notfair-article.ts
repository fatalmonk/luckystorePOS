import sanitizeHtml from 'sanitize-html';

/**
 * NotFair posts are remote HTML. Keep the allowed markup explicit so a bad
 * response cannot add scripts, inline styles, forms, or unsafe URLs to the
 * host site. The nf-* classes are structural hooks for the stylesheet below.
 */
export function sanitizeNotFairArticleHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'figure', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'img', 'nav',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'title', 'target', 'rel'],
      div: ['class'], h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      li: ['class'], nav: ['aria-label', 'class'], p: ['class'],
    },
    allowedClasses: {
      div: ['nf-tablewrap'], li: ['nf-toc-l2', 'nf-toc-l3'],
      nav: ['nf-toc'], p: ['nf-attribution', 'nf-toc-title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    },
  });
}
