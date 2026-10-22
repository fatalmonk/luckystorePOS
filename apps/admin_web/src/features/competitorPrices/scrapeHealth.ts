import type { CompetitorPrice } from '../../lib/api/types';

export interface CompetitorScrapeHealth {
  latestSuccessful: CompetitorPrice | null;
  latestNonSuccess: CompetitorPrice | null;
}

export function summarizeCompetitorScrapeHealth(rows: CompetitorPrice[]): CompetitorScrapeHealth {
  const scraperRows = rows.filter(row => row.source === 'scraper');
  const newestFirst = (a: CompetitorPrice, b: CompetitorPrice) =>
    new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime();
  const latestSuccessful = scraperRows
    .filter(row => row.scrape_status === 'success')
    .sort(newestFirst)[0] ?? null;
  const latestNonSuccess = scraperRows
    .filter(row => Boolean(row.scrape_status) && row.scrape_status !== 'success')
    .sort(newestFirst)[0] ?? null;

  return { latestSuccessful, latestNonSuccess };
}
