import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompetitorPricesPage } from './CompetitorPricesPage';

const mocks = vi.hoisted(() => ({
  fetchCompetitorPrices: vi.fn(),
  fetchCompetitorPriceCounts: vi.fn(),
  fetchPriceAlerts: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => ({
  ...await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
}));

vi.mock('../../lib/AuthContext', () => ({ useAuth: () => ({ storeId: 'store-1' }) }));

vi.mock('../../lib/api/domains/competitorPrices', () => ({
  fetchCompetitorPrices: mocks.fetchCompetitorPrices,
  fetchCompetitorPriceCounts: mocks.fetchCompetitorPriceCounts,
  fetchPriceAlerts: mocks.fetchPriceAlerts,
  clearManualCompetitorPrice: vi.fn(),
  formatPriceGapPercent: (fraction: number | null) => fraction == null
    ? 'N/A'
    : `${fraction > 0 ? '+' : ''}${(fraction * 100).toFixed(2)}%`,
}));

vi.mock('@/components', () => ({
  useNotify: () => ({ notify: vi.fn() }),
  DataTable: ({ data, columns, emptyMessage }: any) => (
    <div>
      {data.length === 0 && emptyMessage}
      {data.map((row: any) => columns.map((column: any, index: number) => (
        <span key={`${row.id}-${index}`}>{column.accessor(row)}</span>
      )))}
    </div>
  ),
}));

vi.mock('./AddPriceModal', () => ({ AddPriceModal: () => null }));
vi.mock('./LinkProductModal', () => ({ LinkProductModal: () => null }));

const matchedObservation = {
  id: 'price-1', store_id: 'store-1', item_id: 'item-1',
  product_name: 'Marks Powder 1000 g', item_name: 'Marks Powder 1000 g', sku: 'SKU-MARKS',
  competitor_key: 'shwapno', competitor_name: 'shwapno', competitor_price: 1300,
  our_price: 945, price_gap_percent: -0.2730769, source: 'scraper',
  is_override_active: false, matcher_version: 'safe-v2:VERIFIED:test', match_status: 'VERIFIED',
  scraped_at: '2026-07-21T03:25:00Z',
  created_at: '2026-07-21T03:25:00Z', updated_at: '2026-07-21T03:25:00Z',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CompetitorPricesPage />
    </QueryClientProvider>,
  );
}

describe('CompetitorPricesPage price gap and KPI scope', () => {
  beforeEach(() => {
    mocks.fetchCompetitorPrices.mockReset().mockResolvedValue([matchedObservation]);
    mocks.fetchCompetitorPriceCounts.mockReset().mockResolvedValue({ total: 9364, matched: 107, unmatched: 9257 });
    mocks.fetchPriceAlerts.mockReset().mockResolvedValue([]);
  });

  it('renders the signed price gap and keeps store-wide KPIs independent of list search', async () => {
    renderPage();

    expect(await screen.findByText('-27.31%')).toBeInTheDocument();
    expect(screen.getByLabelText('Product match status: VERIFIED')).toBeInTheDocument();
    expect(screen.getByText('Store-wide counts; list filters do not change counts.')).toBeInTheDocument();
    expect(screen.getByText('9,364')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search product, SKU...'), {
      target: { value: 'no matching product' },
    });

    await waitFor(() => {
      expect(screen.getByText('No observations match the current search and competitor filter.')).toBeInTheDocument();
      expect(screen.getByText('9,364')).toBeInTheDocument();
    });
    expect(mocks.fetchCompetitorPriceCounts).toHaveBeenCalledTimes(1);
  });

  it('renders zero prices as unavailable and does not show a comparison', async () => {
    mocks.fetchCompetitorPrices.mockResolvedValueOnce([{
      ...matchedObservation,
      id: 'zero-price',
      our_price: 0,
      competitor_price: 0,
      price_gap_percent: null,
    }]);

    renderPage();

    expect(await screen.findAllByText('N/A')).toHaveLength(3);
  });

});
