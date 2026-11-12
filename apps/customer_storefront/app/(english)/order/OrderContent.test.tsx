import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrderContent from './OrderContent';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  showToast: vi.fn(),
  search: 'num=LSO-BN-1',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: React.PropsWithChildren<{ href: string }>) => <a href={href}>{children}</a>,
}));

vi.mock('../../components/Toast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock('../../components/ui/Button', () => ({
  Button: ({
    children,
    fullWidth: _fullWidth,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean; variant?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@phosphor-icons/react/dist/csr/WhatsappLogo', () => ({
  WhatsappLogo: () => <span aria-hidden="true" />,
}));

const fetchMock = vi.fn();

const orderRow = {
  id: 'order-id',
  order_number: 'LSO-BN-1',
  customer_name: 'Amina Rahman',
  customer_phone: '01700000000',
  customer_address: 'Chawkbazar, Chattogram',
  notes: 'Call on arrival',
  delivery_slot: 'morning',
  payment_method: 'cod',
  items: [{ id: 'rice-1', name: 'Miniket Rice', price: 120, qty: 2, unit: '1 kg' }],
  subtotal: 240,
  delivery_fee: 40,
  total: 280,
  created_at: '2026-11-12T12:00:00.000Z',
  status: 'delivered',
};

function respondWithOrder(overrides: Partial<typeof orderRow> = {}) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, order: { ...orderRow, ...overrides } }),
  } as Response);
}

describe('OrderContent localization', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.showToast.mockReset();
    mocks.search = 'num=LSO-BN-1';
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/order?num=LSO-BN-1#track=track-token');
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('renders Bengali order UI while retaining the existing token-authenticated status request', async () => {
    respondWithOrder();

    render(<OrderContent locale="bn" />);

    expect(await screen.findByTestId('order-confirmed-heading')).toHaveTextContent('অর্ডার করা হয়েছে');
    expect(screen.getByText('ধন্যবাদ, Amina')).toBeInTheDocument();
    expect(screen.getByText('বর্তমান অবস্থা: ডেলিভারি হয়েছে।')).toBeInTheDocument();
    expect(screen.getByText('অর্ডার নম্বর')).toBeInTheDocument();
    expect(screen.getByText('ডেলিভারির পথে')).toBeInTheDocument();
    expect(screen.getByText('অর্ডারের অবস্থা')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'কেনাকাটা চালিয়ে যান' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'অর্ডার শেয়ার করুন' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue Shopping' })).not.toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith('/api/orders?num=LSO-BN-1', {
      cache: 'no-store',
      headers: { 'x-order-tracking-token': 'track-token' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'কেনাকাটা চালিয়ে যান' }));
    expect(mocks.push).toHaveBeenCalledWith('/bn');
  });

  it('localizes Bengali share and WhatsApp messages and preserves num and track in the share URL', async () => {
    respondWithOrder();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });

    render(<OrderContent locale="bn" />);
    await screen.findByTestId('order-confirmed-heading');

    const whatsappLink = screen.getByRole('link', { name: 'লাকি স্টোরকে মেসেজ করুন' });
    const whatsappMessage = new URL(whatsappLink.getAttribute('href')!).searchParams.get('text');
    expect(whatsappMessage).toContain('🛒 নতুন অর্ডার — #LSO-BN-1');
    expect(whatsappMessage).toContain('পরিমাণ: 2 × ৳120.00 = ৳240.00');
    expect(whatsappMessage).toContain('অনুগ্রহ করে এই অর্ডারটি নিশ্চিত করুন।');
    expect(whatsappMessage).not.toContain('Please confirm this order.');

    fireEvent.click(screen.getByRole('button', { name: 'অর্ডার শেয়ার করুন' }));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: 'অর্ডার #LSO-BN-1 — Lucky Store',
        text: 'লাকি স্টোরে অর্ডার #LSO-BN-1 ট্র্যাক করুন',
        url: expect.stringContaining('/bn/order?num=LSO-BN-1#track=track-token'),
      });
    });
  });

  it('keeps the existing English order copy unchanged by default', async () => {
    respondWithOrder();

    render(<OrderContent />);

    expect(await screen.findByTestId('order-confirmed-heading')).toHaveTextContent('Order placed');
    expect(screen.getByText('Thanks, Amina')).toBeInTheDocument();
    expect(screen.getByText('Current status: delivered.')).toBeInTheDocument();
    expect(screen.getByText('💵 Have Cash Ready')).toBeInTheDocument();
    expect(screen.getByText('Contact Lucky Store')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue Shopping' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share Order' })).toBeInTheDocument();
  });
});
