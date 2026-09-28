import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchClientPage } from './SearchClientPage';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../components/updated/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('../components/BottomNav', () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));

describe('SearchClientPage recovery', () => {
  beforeEach(() => {
    push.mockReset();
    vi.restoreAllMocks();
  });

  it('keeps search working when recent-search storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    render(<SearchClientPage />);

    expect(
      screen.getByText('Recent searches cannot be saved on this device. Search still works normally.'),
    ).toHaveAttribute('role', 'status');

    fireEvent.change(screen.getByPlaceholderText('Search groceries, brands, essentials...'), {
      target: { value: 'Milk' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(push).toHaveBeenCalledWith('/category?q=Milk');
  });
});
