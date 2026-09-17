import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LedgerPage } from './LedgerPage';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ tenantId: 'tenant-1' }),
}));

vi.mock('@/components', async () => {
  const actual = await vi.importActual<typeof import('@/components')>('@/components');
  return { ...actual, useNotify: () => ({ notify: vi.fn() }) };
});

type QueryResult = { data: unknown; error: { message: string } | null };

const customerA = { id: 'customer-a', tenant_id: 'tenant-1', type: 'customer' as const, name: 'Customer A', current_balance: 0 };
const customerB = { id: 'customer-b', tenant_id: 'tenant-1', type: 'customer' as const, name: 'Customer B', current_balance: 0 };

const pageProps = {
  partyType: 'customer' as const,
  title: 'Customer Ledger',
  subtitle: 'Statements',
  icon: () => <svg />,
  emptyTitle: 'No customers',
  emptyDescription: 'Add a customer',
  balanceLabel: 'Due',
  balanceColorPositive: 'var(--color-danger)',
  statementSubtitle: 'Customer statement',
  debitLabel: 'Debit',
  creditLabel: 'Credit',
  debitColor: 'var(--color-danger)',
  creditColor: 'var(--color-success)',
  balanceSign: 1 as const,
  emptyLedgerText: 'No transactions',
};

function deferred() {
  let resolve: (result: QueryResult) => void;
  const promise = new Promise<QueryResult>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve: resolve! };
}

function query(result: Promise<QueryResult> | QueryResult) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnValue(result),
  };
}

function setupQueries(ledgerResults: Array<Promise<QueryResult> | QueryResult>) {
  const mockFrom = vi.mocked(supabase.from);
  mockFrom.mockImplementation(((table: string) => {
    if (table === 'parties') {
      return query({ data: [customerA, customerB], error: null });
    }
    return query(ledgerResults.shift()!);
  }) as never);
}

describe('LedgerPage statement loading', () => {
  it('keeps the newest party statement when earlier requests resolve late', async () => {
    const firstRequest = deferred();
    const secondRequest = deferred();
    setupQueries([firstRequest.promise, secondRequest.promise]);

    render(<LedgerPage {...pageProps} />);

    fireEvent.click(await screen.findByRole('button', { name: /customer a/i }));
    expect(screen.getByRole('heading', { name: 'Customer A' }).closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(screen.getByRole('button', { name: /customer b/i }));
    secondRequest.resolve({
      data: [{ id: 'entry-b', effective_date: '2026-09-18', debit_amount: 100, credit_amount: 0, reference_type: 'Sale B', reference_id: 'sale-b' }],
      error: null,
    });

    await screen.findByText('Sale B');
    firstRequest.resolve({
      data: [{ id: 'entry-a', effective_date: '2026-09-18', debit_amount: 50, credit_amount: 0, reference_type: 'Sale A', reference_id: 'sale-a' }],
      error: null,
    });

    await waitFor(() => {
      expect(screen.getByText('Sale B')).toBeInTheDocument();
      expect(screen.queryByText('Sale A')).not.toBeInTheDocument();
    });
  });

  it('shows a retryable statement error without leaving stale rows visible', async () => {
    setupQueries([
      { data: null, error: { message: 'network failure' } },
      { data: [], error: null },
    ]);

    render(<LedgerPage {...pageProps} />);

    fireEvent.click(await screen.findByRole('button', { name: /customer a/i }));
    expect(await screen.findByText('Failed to load this statement.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await waitFor(() => {
      expect(screen.getByText('No transactions')).toBeInTheDocument();
    });
  });
});
