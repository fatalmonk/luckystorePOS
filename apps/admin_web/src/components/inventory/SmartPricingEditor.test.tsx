import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchEffective: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQuery: mocks.useQuery,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('../../lib/AuthContext', () => ({
  useAuth: () => ({ storeId: 'store-1' }),
}));

vi.mock('../../lib/api/domains/competitorPrices', () => ({
  fetchEffectiveCompetitorPrices: mocks.fetchEffective,
  setManualCompetitorPrice: vi.fn(),
  clearManualCompetitorPrice: vi.fn(),
}));

import { SmartPricingEditor } from './SmartPricingEditor';

function renderEditor() {
  render(
    <SmartPricingEditor
      itemId="item-1"
      cost={80}
      mrp={150}
      currentPrice={120}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
}

describe('SmartPricingEditor market-data states', () => {
  beforeEach(() => {
    mocks.fetchEffective.mockReset();
    mocks.invalidateQueries.mockReset();
    mocks.useMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
  });

  it('keeps normal pricing controls usable when market data fails', async () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);
    renderEditor();

    expect(screen.getByText('Failed to load competitor data')).toBeInTheDocument();
    expect(screen.getByText('Quick Markup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10%' })).toBeEnabled();
  });

  it('shows source and observation age for a fresh scrape', async () => {
    mocks.useQuery.mockReturnValue({
      data: [{
        item_id: 'item-1',
        competitor_key: 'chaldal',
        competitor_name: 'Chaldal',
        competitor_price: 110,
        our_price: 120,
        price_gap_percent: 0.0909,
        source: 'scraper',
        is_override_active: false,
        manual_override_reason: null,
        manual_override_at: null,
        observed_at: new Date().toISOString(),
        competitor_product_url: null,
        match_confidence: 0.99,
        matcher_version: 'matcher-v1',
        status: 'fresh',
      }],
      isLoading: false,
      isError: false,
    } as never);
    renderEditor();

    expect(screen.getByText('0m ago')).toBeInTheDocument();
    expect(screen.getByTitle(/scraper/)).toBeInTheDocument();
  });
});
