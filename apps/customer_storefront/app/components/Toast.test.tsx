import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

vi.mock('next/navigation', () => ({ usePathname: () => '/bn/shop' }));
const viewportGate = vi.hoisted(() => ({ wait: null as Promise<void> | null }));
vi.mock('./ToastViewport', async (importOriginal) => {
  if (viewportGate.wait) await viewportGate.wait;
  return importOriginal();
});

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
  it('gives a short toast its full lifetime after a delayed viewport load', async () => {
    let release!: () => void;
    viewportGate.wait = new Promise<void>((resolve) => { release = resolve; });
    render(<ToastProvider><TestConsumer message="Slow chunk" duration={50} /></ToastProvider>);
    fireEvent.click(screen.getByText('Trigger Toast'));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(screen.queryByText('Slow chunk')).toBeNull();
    release();
    expect(await screen.findByText('Slow chunk')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Slow chunk')).toBeNull());
    viewportGate.wait = null;
  });

  it('keeps the viewport mounted when the last toast starts exiting', async () => {
    render(<ToastProvider><TestConsumer message="Last toast" actionLabel="Done" onActionClick={() => {}} duration={5000} /></ToastProvider>);
    fireEvent.click(screen.getByText('Trigger Toast'));
    expect(await screen.findByText('Last toast')).toBeInTheDocument();
    // The final toast must pass through AnimatePresence inside the still-mounted viewport.
    const viewport = screen.getByText('Last toast').closest('section');
    expect(viewport).toBeInTheDocument();
    fireEvent.click(screen.getByText('Done'));
    expect(viewport).toBeInTheDocument();
    expect(viewport?.isConnected).toBe(true);
  });
  it('renders nothing initially', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows transient toasts without requiring CartProvider', async () => {
    render(<ToastProvider><TestConsumer message="Saved" duration={500} /></ToastProvider>);
    fireEvent.click(screen.getByText('Trigger Toast'));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it('localizes persistent cart toast copy and avoids stale item messages', async () => {
    function PersistentConsumer() {
      const { showToast } = useToast();
      return <button onClick={() => showToast('Added Rice to cart', undefined, undefined, true)}>Show cart</button>;
    }
    render(<ToastProvider><PersistentConsumer /></ToastProvider>);
    fireEvent.click(screen.getByText('Show cart'));
    expect(await screen.findByText('Added Rice to cart')).toBeInTheDocument();
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

    const toastElement = await screen.findByRole('status');
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

    const actionBtn = await screen.findByText('Undo');
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
