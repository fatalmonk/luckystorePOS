import { describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { buyingGuideSchema, guideContentHash } from '../lib/buying-guides/model';
import { REVIEW_GUIDES } from '../lib/buying-guides/research';
const { guides } = vi.hoisted(() => ({ guides: [] as unknown[] }));
vi.mock('../lib/buying-guides/registry', () => ({ BUYING_GUIDES: guides }));
vi.mock('../lib/supabase/middleware', () => ({ updateSession: vi.fn(async () => NextResponse.next()) }));
import { middleware } from '../../middleware';

describe('buying-guide crawler content negotiation', () => {
  it.each(['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot'])('serves full guide HTML to %s instead of generic Markdown', async userAgent => {
    const guide = buyingGuideSchema.parse({ ...structuredClone(REVIEW_GUIDES[0]),
      author: { name: 'Test', kind: 'Organization', profileUrl: 'https://example.com/editor' },
      publishedAt: '2026-10-15T12:00:00Z', updatedAt: '2026-10-15T12:00:00Z' });
    guides.splice(0, guides.length, { ...guide, state: 'published', approval: {
      revision: 1, contentHash: guideContentHash(guide), verifiedBy: 'Test', approvedBy: 'Test',
      verifiedAt: '2026-10-15T10:00:00Z', approvedAt: '2026-10-15T11:00:00Z',
    } });
    const response = await middleware(new NextRequest('https://www.luckystore1947.com/best/biscuits-bangladesh', {
      headers: { 'user-agent': userAgent, accept: '*/*' },
    }));
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
  it('returns an actual noindex 404 for missing, invalid, review and archived guide URLs', async () => {
    guides.splice(0, guides.length, ...REVIEW_GUIDES);
    for (const slug of ['biscuits-bangladesh', 'missing', 'milk-powder-bangladesh', 'ice-cream-bangladesh', 'bad/slug']) {
      const response = await middleware(new NextRequest(`https://www.luckystore1947.com/best/${slug}`));
      expect(response.status).toBe(404);
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    }
  });
  it('retains existing Markdown behavior on other routes', async () => {
    const response = await middleware(new NextRequest('https://www.luckystore1947.com/delivery', { headers: { accept: 'text/markdown' } }));
    expect(response.headers.get('x-middleware-rewrite')).toContain('/api/markdown?path=%2Fdelivery');
  });
});
