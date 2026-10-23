import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PosErrorNotice } from './PosErrorNotice';

describe('PosErrorNotice', () => {
  it('announces the visible message and preserves optional dismissal', () => {
    const onDismiss = vi.fn();
    render(<PosErrorNotice message="Barcode not found" onDismiss={onDismiss} />);

    const alert = screen.getByRole('alert');
    const message = alert.querySelector('span');
    expect(alert).toHaveTextContent('Barcode not found');
    expect(message?.style.minWidth).toBe('0');
    expect(message?.style.overflowWrap).toBe('anywhere');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error message' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not add a dismiss action when the surface has none', () => {
    render(<PosErrorNotice message="Payment could not be completed" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Payment could not be completed');
    expect(screen.queryByRole('button', { name: 'Dismiss error message' })).not.toBeInTheDocument();
  });
});
