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

  it('shows loading without disabling pricing controls', () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);
    renderEditor();

    expect(screen.getByText('Loading market data...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10%' })).toBeEnabled();
  });

  it('shows an empty market-data state', () => {
    mocks.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    renderEditor();

    expect(screen.getByText('No competitor data available')).toBeInTheDocument();
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

  it('labels stale scraper observations', () => {
    mocks.useQuery.mockReturnValue({
      data: [{
        item_id: 'item-1',
        competitor_key: 'shwapno',
        competitor_name: 'Shwapno',
        competitor_price: 112,
        our_price: 120,
        price_gap_percent: 0.0714,
        source: 'scraper',
        is_override_active: false,
        manual_override_reason: null,
        manual_override_at: null,
        observed_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        competitor_product_url: null,
        match_confidence: 0.96,
        matcher_version: 'matcher-v1',
        status: 'stale',
      }],
      isLoading: false,
      isError: false,
    } as never);
    renderEditor();

    expect(screen.getByText('stale')).toBeInTheDocument();
    expect(screen.getByText('9d ago')).toBeInTheDocument();
  });

  it('labels an active manual override', () => {
    mocks.useQuery.mockReturnValue({
      data: [{
        item_id: 'item-1',
        competitor_key: 'chaldal',
        competitor_name: 'Chaldal',
        competitor_price: 105,
        our_price: 120,
        price_gap_percent: 0.1429,
        source: 'manual',
        is_override_active: true,
        manual_override_reason: 'Local check',
        manual_override_at: new Date().toISOString(),
        observed_at: new Date().toISOString(),
        competitor_product_url: null,
        match_confidence: null,
        matcher_version: 'manual',
        status: 'manual',
      }],
      isLoading: false,
      isError: false,
    } as never);
    renderEditor();

    expect(screen.getByText('manual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Chaldal manual override' })).toBeEnabled();
  });
});
