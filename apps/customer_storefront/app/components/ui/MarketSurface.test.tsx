import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketCard, MarketPanel } from './MarketSurface';

describe('MarketSurface', () => {
  it('preserves section semantics and exposes the selected material tone', () => {
    render(
      <MarketPanel tone="night" aria-labelledby="market-title">
        <h2 id="market-title">Market edit</h2>
      </MarketPanel>,
    );

    const panel = screen.getByRole('region', { name: 'Market edit' });
    expect(panel).toHaveAttribute('data-market-tone', 'night');
    expect(panel).toHaveClass('market-panel');
  });

  it('expresses merchandise availability without changing card content order', () => {
    render(
      <MarketCard stockState="limited" interactive>
        <span>Milk</span>
      </MarketCard>,
    );

    const card = screen.getByText('Milk').parentElement;
    expect(card).toHaveAttribute('data-stock-state', 'limited');
    expect(card).toHaveAttribute('data-interactive', 'true');
  });
});
