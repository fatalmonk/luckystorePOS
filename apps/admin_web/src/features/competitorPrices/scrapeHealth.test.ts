import { describe, expect, it } from 'vitest';
import type { CompetitorPrice } from '../../lib/api/types';
import { summarizeCompetitorScrapeHealth } from './scrapeHealth';

const row = (id: string, source: CompetitorPrice['source'], status: string | null, scrapedAt: string): CompetitorPrice => ({
  id,
  store_id: 'store-1',
  item_id: null,
  product_name: 'Test item',
  competitor_key: 'store-a',
  competitor_name: 'Store A',
  competitor_price: 10,
  our_price: null,
  price_gap_percent: null,
  source,
  is_override_active: false,
  matcher_version: 'test',
  match_status: 'AMBIGUOUS',
  scraped_at: scrapedAt,
  scrape_status: status,
  created_at: scrapedAt,
  updated_at: scrapedAt,
});

describe('competitor scrape health summary', () => {
  it('selects newest successful and newest non-success scraper observations independently of input order', () => {
    const rows = [
      row('old-success', 'scraper', 'success', '2026-10-20T10:00:00Z'),
      row('manual', 'manual', 'error', '2026-10-22T10:00:00Z'),
      row('new-error', 'scraper', 'error', '2026-10-22T09:00:00Z'),
      row('new-success', 'scraper', 'success', '2026-10-22T08:00:00Z'),
    ];

    expect(summarizeCompetitorScrapeHealth(rows)).toEqual({
      latestSuccessful: rows[3],
      latestNonSuccess: rows[2],
    });
  });

  it('returns null states when no scraper observations exist', () => {
    expect(summarizeCompetitorScrapeHealth([row('manual', 'manual', null, '2026-10-22T10:00:00Z')]))
      .toEqual({ latestSuccessful: null, latestNonSuccess: null });
  });
});
