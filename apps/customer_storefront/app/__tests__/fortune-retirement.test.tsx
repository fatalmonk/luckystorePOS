import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { metadata as enMetadata } from '../(english)/fortune-cookies-near-me/page';
import { metadata as bnMetadata } from '../(bengali)/bn/fortune-cookies-near-me/page';
import { FortuneCookiesLanding } from '../components/seo/FortuneCookiesLanding';

vi.stubGlobal('React', React);

vi.mock('../components/updated/Header', () => ({ Header: () => null }));
vi.mock('../components/updated/Footer', () => ({ Footer: () => null }));
vi.mock('../components/BottomNav', () => ({ BottomNav: () => null }));

describe('retired fortune cookie landing pages', () => {
  it.each([enMetadata, bnMetadata])('allows crawling links while declining indexing', metadata => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
  it.each(['en', 'bn'] as const)('states no stock or stocking plan and offers actual alternatives in %s', locale => {
    const html = renderToStaticMarkup(<FortuneCookiesLanding locale={locale} />);
    expect(html).toContain(locale === 'en' ? 'does not stock Fortune Cookies and has no plans to stock them' : 'ফরচুন কুকিজ স্টকে রাখে না এবং রাখার কোনো পরিকল্পনা নেই');
    expect(html).toContain(`href="${locale === 'bn' ? '/bn' : ''}/category/biscuits-and-cookies"`);
    expect(html).not.toMatch(/wa\.me|can be arranged|can be sourced|tracking local demand|চাহিদা যাচাই|সংগ্রহ করা যাবে/);
    expect(html).not.toMatch(/"@type":"(?:Product|Offer)"/);
  });
});
