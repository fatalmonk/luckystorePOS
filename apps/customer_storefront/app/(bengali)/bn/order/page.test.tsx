import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrderPage from './page';
import { dynamic, metadata, revalidate } from './layout';

vi.mock('../../../(english)/order/OrderContent', () => ({
  default: ({ locale }: { locale?: string }) => <div data-testid="order-locale">{locale}</div>,
}));

describe('Bengali order route', () => {
  it('renders the shared order flow with the Bengali locale', () => {
    render(<OrderPage />);
    expect(screen.getByTestId('order-locale')).toHaveTextContent('bn');
  });

  it('is dynamic and explicitly excluded from indexing', () => {
    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(metadata).toMatchObject({
      title: 'অর্ডারের অবস্থা',
      robots: { index: false, follow: true },
    });
  });
});
