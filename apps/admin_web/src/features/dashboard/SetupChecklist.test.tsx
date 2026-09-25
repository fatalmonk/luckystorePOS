import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupChecklist } from './SetupChecklist';

const baseProps = {
  storeId: 'store-1',
  hasProducts: false,
  hasPaymentMethods: false,
  hasStaff: false,
  isStoreConfigured: false,
};

describe('SetupChecklist', () => {
  beforeEach(() => localStorage.clear());

  it('does not present loading or failed queries as incomplete', () => {
    const onRefresh = vi.fn();
    render(
      <MemoryRouter>
        <SetupChecklist
          {...baseProps}
          statuses={{ products: 'pending', paymentMethods: 'error', staff: 'success', store: 'success' }}
          onRefresh={onRefresh}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Unavailable — retry' });
    fireEvent.click(retry);
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.getByText('0/4')).toBeInTheDocument();
  });

  it('requires at least one active payment method for completion', () => {
    render(
      <MemoryRouter>
        <SetupChecklist
          {...baseProps}
          statuses={{ products: 'success', paymentMethods: 'success', staff: 'success', store: 'success' }}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });
});
