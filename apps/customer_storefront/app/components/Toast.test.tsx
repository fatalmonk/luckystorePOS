import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

vi.mock('next/navigation', () => ({ usePathname: () => '/bn/shop' }));

function TestConsumer({
  message,
  actionLabel,
  onActionClick,
  duration = 50,
}: {
  message?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  duration?: number;
}) {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        showToast(
          message || 'Item added to cart',
          actionLabel && onActionClick ? { label: actionLabel, onClick: onActionClick } : undefined,
          duration
        );
      }}
    >
      Trigger Toast
    </button>
  );
}

describe('Toast Component', () => {
  it('renders nothing initially', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows transient toasts without requiring CartProvider', () => {
    render(<ToastProvider><TestConsumer message="Saved" /></ToastProvider>);
    fireEvent.click(screen.getByText('Trigger Toast'));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('localizes persistent cart toast copy and avoids stale item messages', async () => {
    function PersistentConsumer() {
      const { showToast } = useToast();
      return <button onClick={() => showToast('Added Rice to cart', undefined, undefined, true)}>Show cart</button>;
    }
    render(<ToastProvider><PersistentConsumer /></ToastProvider>);
    fireEvent.click(screen.getByText('Show cart'));
    expect(screen.getByText('Added Rice to cart')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'বিজ্ঞপ্তি বন্ধ করুন' })).toBeInTheDocument();
    expect(screen.queryByLabelText('ফ্রি ডেলিভারির অগ্রগতি: ০ শতাংশ')).toBeNull();
  });

  it('displays a toast when triggered and auto-dismisses after duration', async () => {
    render(
      <ToastProvider>
        <TestConsumer message="Order confirmed!" duration={50} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Toast'));

    const toastElement = screen.getByRole('status');
    expect(toastElement).toBeInTheDocument();
    expect(screen.getByText('Order confirmed!')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText('Order confirmed!')).toBeNull();
      },
      { timeout: 2000 }
    );
  });

  it('handles action button click and dismisses immediately', async () => {
    const handleAction = vi.fn();
    render(
      <ToastProvider>
        <TestConsumer message="Deleted item" actionLabel="Undo" onActionClick={handleAction} duration={5000} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Toast'));

    const actionBtn = screen.getByText('Undo');
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);

    await waitFor(
      () => {
        expect(screen.queryByText('Deleted item')).toBeNull();
      },
      { timeout: 2000 }
    );
  });

  it('throws error when useToast is used outside of ToastProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useToast must be used within ToastProvider');
    consoleError.mockRestore();
  });
});
