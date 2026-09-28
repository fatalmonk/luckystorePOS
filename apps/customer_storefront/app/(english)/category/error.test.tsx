import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CategoryError from './error';

describe('CategoryError', () => {
  it('explains the failure and offers a working retry', () => {
    const reset = vi.fn();
    render(<CategoryError error={new Error('Unavailable')} reset={reset} />);

    expect(screen.getByText('We could not show these products.')).toBeInTheDocument();
    expect(screen.getByText('Your cart has not been changed.', { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Browse all products' })).toHaveAttribute('href', '/category');
  });
});
