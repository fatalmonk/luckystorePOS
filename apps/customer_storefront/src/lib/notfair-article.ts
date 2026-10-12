import sanitizeHtml from 'sanitize-html';

const ALLOWED_IMAGE_HOSTS = new Set([
  'notfair.co',
  'www.notfair.co',
  'images.luckystore1947.com',
  'www.luckystore1947.com',
  'luckystore1947.com',
]);

function isAllowedImageSrc(src: string): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    for (const host of ALLOWED_IMAGE_HOSTS) {
      if (hostname === host || hostname.endsWith(`.${host}`)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * NotFair posts are remote HTML. Keep the allowed markup explicit so a bad
 * response cannot add scripts, inline styles, forms, or unsafe URLs to the
 * host site. The nf-* classes are structural hooks for the stylesheet below.
 */
export function sanitizeNotFairArticleHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags.filter((t) => t !== 'h1'),
      'figure',
      'figcaption',
      'h2',
      'h3',
      'h4',
      'img',
      'nav',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'title', 'target', 'rel'],
      div: ['class'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      li: ['class'],
      nav: ['aria-label', 'class'],
      p: ['class'],
    },
    allowedClasses: {
      div: ['nf-tablewrap'],
      li: ['nf-toc-l2', 'nf-toc-l3'],
      nav: ['nf-toc'],
      p: ['nf-attribution', 'nf-toc-title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
      // WCAG Heading Hierarchy: The page hero already renders the single <h1>.
      // Remote article <h1> elements are normalized to <h2> with IDs preserved for TOC navigation.
      h1: (_tagName, attribs) => ({
        tagName: 'h2',
        attribs,
      }),
      // WCAG Accessibility & Security: Ensure alt text is guaranteed and restrict image origins
      // to NotFair and Lucky Store domains to prevent arbitrary tracking pixels.
      img: (_tagName, attribs) => {
        const src = attribs.src || '';
        if (!isAllowedImageSrc(src)) {
          return { tagName: 'span', attribs: { class: 'hidden' } as sanitizeHtml.Attributes };
        }
        const alt = attribs.alt !== undefined ? attribs.alt : (attribs.title || 'Article image');
        const imgAttribs: sanitizeHtml.Attributes = { ...attribs, alt };
        return {
          tagName: 'img',
          attribs: imgAttribs,
        };
      },
    },
  });
}
