import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CanvaDesignPage } from './CanvaDesignPage';
const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
beforeEach(() => {
  vi.restoreAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'session' } } });
});
it('sends only ordered catalog IDs and a stable request ID on retry', async () => {
  const postBodies: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    if (init.method === 'POST') { postBodies.push(String(init.body)); return new Response('{}', { status: 503 }); }
    if (url.includes('/products')) return Response.json({ products: [
      { id: 'item-1', name: 'Catalog product 1', price: 50, image_url: 'https://images.luckystore1947.com/products/a' },
      { id: 'item-2', name: 'Catalog product 2', price: 60, image_url: 'https://images.luckystore1947.com/products/b' },
    ] });
    if (url.endsWith('/templates')) return Response.json({ templates: [{ id: 'template', name: 'Approved', expected_dataset_schema: {
      product_1_image: {}, product_1_name: {}, product_1_price: {}, product_2_image: {}, product_2_name: {}, product_2_price: {},
    } }] });
    return Response.json({ runs: [] });
  }));
  render(<CanvaDesignPage />);
  await screen.findByText('Approved');
  fireEvent.change(screen.getByLabelText('Approved template'), { target: { value: 'template' } });
  fireEvent.change(screen.getByLabelText('Product 1'), { target: { value: 'item-1' } });
  fireEvent.change(screen.getByLabelText('Product 2'), { target: { value: 'item-2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create design' }));
  await screen.findByRole('alert');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create design' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Create design' }));
  await waitFor(() => expect(postBodies).toHaveLength(2));
  expect(postBodies[0]).toBe(postBodies[1]);
  expect(JSON.parse(postBodies[0])).toMatchObject({ template_id: 'template', item_ids: ['item-1', 'item-2'] });
});
it('ready designs expose no editor, export or processing action', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.endsWith('/products') ? { products: [] } :
    url.endsWith('/templates') ? { templates: [] } : { runs: [{ id: 'run', status: 'design_ready', design_id: 'design' }] })));
  render(<CanvaDesignPage />);
  expect(await screen.findByText('Saved Canva design: design')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Continue processing' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /export|edit design/i })).not.toBeInTheDocument();
});
