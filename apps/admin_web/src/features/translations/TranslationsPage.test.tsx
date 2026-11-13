import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/lib/AuthContext';
import { useNotify } from '@/components/NotificationContext';
import { supabase } from '@/lib/supabase';
import { TranslationsPage } from './TranslationsPage';

vi.unmock('@tanstack/react-query');
vi.mock('lucide-react', () => ({ Languages: () => null, Save: () => null }));
vi.mock('@/components/ui', async () => {
  const { Card } = await import('@/components/ui/card');
  return { Card };
});

const tenantId = '20000000-0000-4000-8000-000000000001';
const profileId = '40000000-0000-4000-8000-000000000001';
const authId = '50000000-0000-4000-8000-000000000001';
const item = { id: '10000000-0000-4000-8000-000000000001', tenant_id: tenantId, name: 'Ispahani Tea 500 g', description: 'Tea leaves, 500 g.', sku: 'TEA-500', barcode: '8941154321000', brand: 'Ispahani' };
const category = { id: '10000000-0000-4000-8000-000000000002', tenant_id: tenantId, name: 'Tea', description: null };
const evidence = { entityId: item.id, sourceName: item.name, sourceDescription: item.description, sku: item.sku, barcode: item.barcode, brand: item.brand, packageText: '500 g', sourceUris: ['https://manufacturer.invalid/tea-500'], observedAt: '2026-11-12T10:00:00Z' };
const draft = { id: '30000000-0000-4000-8000-000000000001', tenant_id: tenantId, item_id: item.id, locale: 'bn', name: 'ইস্পাহানি চা 500 g', description: 'চা পাতা, 500 g।', search_terms: ['চা', 'cha', 'tea', 'Ispahani'], review_status: 'draft', evidence_snapshot: evidence, details: { summary: 'চা পাতা।' }, reviewed_by: null, reviewed_at: null, published_by: null, published_at: null, updated_at: '2026-11-12T10:00:00Z' };

type Row = Record<string, unknown>;
type Write = { table: string; operation: string; payload: Row; filters: Record<string, unknown> };
let rows: Record<string, Row[]>;
let writes: Write[];
let writeError: { message: string } | null;
const notify = vi.fn();

function installDatabaseDouble() {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    let operation = 'select';
    let payload: Row = {};
    const filters: Record<string, unknown> = {};
    const resolve = () => {
      if (operation !== 'select') {
        writes.push({ table, operation, payload, filters: { ...filters } });
        return { data: writeError ? null : { id: String(payload.id ?? filters.id ?? '60000000-0000-4000-8000-000000000001') }, error: writeError };
      }
      return { data: rows[table] ?? [], error: null };
    };
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters[key] = value; return query; },
      order: () => query,
      insert: (value: Row) => { operation = 'insert'; payload = value; return query; },
      update: (value: Row) => { operation = 'update'; payload = value; return query; },
      single: () => Promise.resolve(resolve()),
      then: (onFulfilled: (value: ReturnType<typeof resolve>) => unknown, onRejected?: (error: unknown) => unknown) => Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    return query;
  }) as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { ...render(<QueryClientProvider client={queryClient}><TranslationsPage /></QueryClientProvider>), queryClient };
}

beforeEach(() => {
  writes = [];
  writeError = null;
  rows = { items: [item], categories: [category], item_translations: [draft], category_translations: [] };
  notify.mockReset();
  vi.mocked(useNotify).mockReturnValue({ notify } as never);
  vi.mocked(useAuth).mockReturnValue({ tenantId, storeId: '70000000-0000-4000-8000-000000000001', user: { id: profileId, authId, tenantId, storeId: '70000000-0000-4000-8000-000000000001', role: 'manager', name: 'Reviewer' }, loading: false, session: null, signOut: vi.fn() });
  installDatabaseDouble();
});

afterEach(cleanup);

describe('TranslationsPage publication actions', () => {
  it('shows canonical identity and evidence beside Bengali fields without a status selector or bulk review', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Ispahani Tea 500 g')).toBeInTheDocument();
    expect(screen.getByText('TEA-500')).toBeInTheDocument();
    expect(screen.getByText('8941154321000')).toBeInTheDocument();
    expect(screen.getByText('Ispahani')).toBeInTheDocument();
    expect(screen.getByText('500 g')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://manufacturer.invalid/tea-500' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Review status' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Review selected/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('binds Mark Reviewed to the public user UUID and an unchanged persisted draft', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked the Bengali copy/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark Reviewed' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({ table: 'item_translations', operation: 'update', payload: { review_status: 'reviewed', reviewed_by: profileId }, filters: { id: draft.id, tenant_id: tenantId, review_status: 'draft', updated_at: draft.updated_at } });
    expect(writes[0].payload).not.toHaveProperty('published_by');
  });

  it('uses a separate Publish action and preserves the prior reviewer', async () => {
    rows.item_translations = [{ ...draft, review_status: 'reviewed', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z' }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked the Bengali copy/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({ table: 'item_translations', operation: 'update', payload: { review_status: 'published', published_by: profileId }, filters: { id: draft.id, tenant_id: tenantId, review_status: 'reviewed', updated_at: draft.updated_at } });
    expect(writes[0].payload).not.toHaveProperty('reviewed_by');
  });

  it.each([
    { ...draft, evidence_snapshot: null },
    { ...draft, evidence_snapshot: { ...evidence, sku: null } },
    { ...draft, evidence_snapshot: { ...evidence, packageText: null } },
    { ...draft, review_status: 'reviewed', reviewed_by: null, reviewed_at: '2026-11-12T11:00:00Z' },
  ])('keeps publication disabled for ineligible rows: %#', async (row) => {
    rows.item_translations = [row];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked the Bengali copy/ }));
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    if (row.review_status === 'draft') expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    expect(writes).toHaveLength(0);
  });

  it('requires saving edited reviewed copy as draft and clears prior attribution', async () => {
    rows.item_translations = [{ ...draft, review_status: 'published', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z', published_by: profileId, published_at: '2026-11-12T12:00:00Z' }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bengali name' }), { target: { value: 'ইস্পাহানি নতুন চা 500 g' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].payload).toMatchObject({ name: 'ইস্পাহানি নতুন চা 500 g', review_status: 'draft', reviewed_by: null, reviewed_at: null, published_by: null, published_at: null, details: { summary: 'চা পাতা।' } });
    expect(writes[0].filters).toMatchObject({ tenant_id: tenantId, updated_at: draft.updated_at });
  });

  it('does not review or publish unsaved changes', async () => {
    rows.item_translations = [{ ...draft, review_status: 'reviewed', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z' }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked the Bengali copy/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bengali description' }), { target: { value: 'নতুন বিবরণ।' } });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(writes).toHaveLength(0);
  });

  it.each([
    { review_status: 'reviewed', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z' },
    { updated_at: '2026-11-12T11:00:00Z' },
    { reviewed_by: profileId },
  ])('disables all writes when a refetch changes workflow or revision metadata: %#', async (change) => {
    const { queryClient } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked the Bengali copy/ }));
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeEnabled();
    await act(async () => { queryClient.setQueryData(['translations', 'item', tenantId], [{ ...draft, ...change }]); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText(/Translation changed on the server/)).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it('creates new and imported copy as draft with no review or publication attribution', async () => {
    rows.item_translations = [];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Bengali' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bengali name' }), { target: { value: 'ইস্পাহানি চা 500 g' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({ table: 'item_translations', operation: 'insert', payload: { item_id: item.id, tenant_id: tenantId, locale: 'bn', review_status: 'draft', reviewed_by: null, reviewed_at: null, published_by: null, published_at: null } });
  });

  it('exposes category SEO and search aliases and saves them only as draft', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Categories' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add Bengali' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bengali name' }), { target: { value: 'চা' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'SEO title' }), { target: { value: 'চা কিনুন' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'SEO description' }), { target: { value: 'অনলাইনে চা কিনুন।' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search aliases' }), { target: { value: 'চা\ncha\ntea' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({ table: 'category_translations', operation: 'insert', payload: { category_id: category.id, seo_title: 'চা কিনুন', seo_description: 'অনলাইনে চা কিনুন।', search_terms: ['চা', 'cha', 'tea'], review_status: 'draft' } });
    expect(writes[0].payload).not.toHaveProperty('details');
  });

  it('reports stale-row failures without claiming publication succeeded', async () => {
    rows.item_translations = [{ ...draft, review_status: 'reviewed', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z' }];
    writeError = { message: 'Translation changed; reload before publishing.' };
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I checked the Bengali copy/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Translation changed; reload before publishing.', 'error'));
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  it('restricts the entire editor to authorized staff', () => {
    vi.mocked(useAuth).mockReturnValue({ tenantId, storeId: '', user: { id: profileId, authId, tenantId, storeId: '', role: 'cashier', name: null }, loading: false, session: null, signOut: vi.fn() });
    renderPage();
    expect(screen.getByText(/restricted to administrators and managers/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });
});
