import 'server-only';
import { cache } from 'react';
import { BUYING_GUIDES } from './registry';
import { GUIDE_SLUG, publishedGuides } from './model';

export function getPublishedGuides() {
  return publishedGuides(BUYING_GUIDES);
}

export const getPublishedGuide = cache((slug: string) => {
  if (!GUIDE_SLUG.test(slug)) return null;
  return getPublishedGuides().find(guide => guide.slug === slug) ?? null;
});
