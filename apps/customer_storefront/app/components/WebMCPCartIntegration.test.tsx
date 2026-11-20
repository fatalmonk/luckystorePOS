import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCartContext } from './CartProvider';
import { WebMCPInit } from './WebMCPInit';
import { __resetCheckoutStateForTesting } from '../lib/webmcp';
import type { Product } from '../lib/types';

vi.mock('../lib/supabase/client', () => ({ createClient: () => null }));

const rice: Product = {
  id: '029b62d8-1111-2222-3333-444455556666', name: 'Rice', price: 100,
  stock: 10, emoji: '', unit: '1 kg', category: 'rice', description: 'Rice',
};
const milk: Product = {
  id: '029b62d8-1111-2222-3333-444455556677', name: 'Milk', price: 60,
  stock: 10, emoji: '', unit: '1 L', category: 'dairy', description: 'Milk',
};

type RegisteredTool = {
  execute: (input: Record<string, unknown>, context: { signal: AbortSignal }) => Promise<unknown>;
};
const registered = new Map<string, RegisteredTool>();

function CartControls() {
  const { cart, isLoaded, addToCart } = useCartContext();
  return (
    <>
      <output aria-label="hydrated">{String(isLoaded)}</output>
      <output aria-label="cart-items">{JSON.stringify(cart.map((item) => ({ id: item.id, qty: item.qty })))}</output>
      <button onClick={() => addToCart(rice)}>UI add rice</button>
      <button onClick={() => addToCart(milk)}>UI add milk</button>
    </>
  );
}

function mount() {
  render(<CartProvider><CartControls /><WebMCPInit /></CartProvider>);
  return waitFor(() => {
    expect(screen.getByLabelText('hydrated')).toHaveTextContent('true');
    expect(registered.has('submit_order')).toBe(true);
  });
}

async function runTool(name: string, input: Record<string, unknown> = {}) {
  const tool = registered.get(name);
  if (!tool) throw new Error('WebMCP did not register ' + name);
  return tool.execute(input, { signal: new AbortController().signal }) as Promise<Record<string, unknown>>;
}

async function runToolAndFlush(name: string, input: Record<string, unknown> = {}) {
  let response: Record<string, unknown> | undefined;
  await act(async () => { response = await runTool(name, input); });
  return response!;
}

const checkout = {
  customerName: 'Test Customer',
  customerPhone: '01712345678',
  customerAddress: '12 Example Road, Chattogram',
  paymentMethod: 'cod',
};

describe('WebMCP cart integration with actual CartProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    registered.clear();
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: async (tool: { name: string; execute: RegisteredTool['execute'] }) => {
          registered.set(tool.name, tool);
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    registered.clear();
    __resetCheckoutStateForTesting();
    Reflect.deleteProperty(document, 'modelContext');
  });

  it('uses the real lucky-cart array and updates mounted UI after agent add and clear', async () => {
    await mount();
    fireEvent.click(screen.getByText('UI add rice'));
    await waitFor(() => expect(screen.getByLabelText('cart-items')).toHaveTextContent(rice.id));
    const fromAgent = await runTool('get_cart');
    expect(fromAgent.items).toMatchObject([{ id: rice.id, qty: 1 }]);
    expect(JSON.parse(localStorage.getItem('lucky-cart')!)).toMatchObject([{ id: rice.id, qty: 1 }]);
    expect(localStorage.getItem('cart')).toBeNull();

    const fetchMock = vi.fn(async () => new Response(JSON.stringify(milk), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const added = await runToolAndFlush('add_to_cart', { id: milk.id, qty: 2 });
    expect(added.ok).toBe(true);
    await waitFor(() => expect(screen.getByLabelText('cart-items')).toHaveTextContent('"qty":2'));
    expect(JSON.parse(localStorage.getItem('lucky-cart')!)).toHaveLength(2);
    const invalidQty = await runTool('add_to_cart', { id: milk.id, qty: 1.5 });
    expect(invalidQty.error).toContain('positive integer');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cleared = await runToolAndFlush('clear_cart');
    expect(cleared.ok).toBe(true);
    await waitFor(() => expect(screen.getByLabelText('cart-items')).toHaveTextContent('[]'));
    expect(JSON.parse(localStorage.getItem('lucky-cart')!)).toEqual([]);
  });

  it('requires customer approval of the price quote using a UI-populated cart', async () => {
    await mount();
    fireEvent.click(screen.getByText('UI add rice'));
    const requests: Array<Record<string, unknown>> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return requests.length === 1
        ? new Response(JSON.stringify({ code: 'PRICE_MISMATCH', subtotal: 90, discount: 10, deliveryFee: 40, total: 130 }), { status: 400 })
        : new Response(JSON.stringify({ ok: true, order: { id: 'approved' } }), { status: 200 });
    }));
    const mismatch = await runTool('submit_order', checkout);
    expect(mismatch).toMatchObject({ requiresCustomerReview: true, total: 130 });
    const pending = await runTool('submit_order', checkout);
    expect(pending).toMatchObject({ requiresCustomerReview: true, total: 130 });
    expect(requests).toHaveLength(1);
    const approved = await runToolAndFlush('submit_order', { ...checkout, confirmedQuote: { subtotal: 90, discount: 10, deliveryFee: 40, total: 130 } });
    expect(approved.ok).toBe(true);
    expect(requests).toHaveLength(2);
    expect(requests[0].idempotencyKey).toBe(requests[1].idempotencyKey);
    expect(requests[1].total).toBe(130);
    await waitFor(() => expect(screen.getByLabelText('cart-items')).toHaveTextContent('[]'));
  });

  it('preserves other products and additional same-product quantity while checkout is in flight', async () => {
    await mount();
    fireEvent.click(screen.getByText('UI add rice'));
    let resolveResponse!: (response: Response) => void;
    const deferred = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const requests: Array<Record<string, unknown>> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return deferred;
    }));
    const pending = runTool('submit_order', checkout);
    expect(requests).toHaveLength(1);
    fireEvent.click(screen.getByText('UI add rice'));
    fireEvent.click(screen.getByText('UI add milk'));
    await waitFor(() => expect(screen.getByLabelText('cart-items')).toHaveTextContent(milk.id));
    await act(async () => {
      resolveResponse(new Response(JSON.stringify({ ok: true, order: { id: 'race-test' } }), { status: 200 }));
      await pending;
    });
    const current = await runTool('get_cart');
    expect(current.items).toMatchObject([
      { id: rice.id, qty: 1 },
      { id: milk.id, qty: 1 },
    ]);
    expect(JSON.parse(localStorage.getItem('lucky-cart')!)).toMatchObject([
      { id: rice.id, qty: 1 },
      { id: milk.id, qty: 1 },
    ]);
  });
});
