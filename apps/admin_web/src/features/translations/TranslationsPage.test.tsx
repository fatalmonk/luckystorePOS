import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/lib/AuthContext';
import { useNotify } from '@/components/NotificationContext';
import { supabase } from '@/lib/supabase';
import { TranslationsPage } from './TranslationsPage';

vi.unmock('@tanstack/react-query');
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn(), functions: { invoke: vi.fn() } } }));
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
const ramenEvidence = { key: 'b79a6606', matched: true, issue: null, entry: { exactName: 'Samyang Buldak Ramen 2X Cup 70g', netQuantity: '70g' }, links: [{ url: 'https://buldak.com/us/product/buldak-ramen-2x-cup/', title: 'Buldak Ramen 2X Cup', verifiedAt: '2026-11-12', evidenceRef: 'manufacturer' }], missing: [], supportedFacts: 'Pack size: 70g' };
const draft = { id: '30000000-0000-4000-8000-000000000001', tenant_id: tenantId, item_id: item.id, locale: 'bn', name: 'ইস্পাহানি চা 500 g', description: 'চা পাতা, 500 g।', search_terms: ['চা', 'cha', 'tea', 'Ispahani'], review_status: 'draft', evidence_snapshot: evidence, details: { summary: 'চা পাতা।' }, reviewed_by: null, reviewed_at: null, published_by: null, published_at: null, updated_at: '2026-11-12T10:00:00Z' };

type Row = Record<string, unknown>;
type Write = { table: string; operation: string; payload: Row; filters: Record<string, unknown> };
let rows: Record<string, Row[]>;
let writes: Write[];
let writeError: { code?: string; message: string } | null;
let persistWrites = false;
const notify = vi.fn();

function installDatabaseDouble() {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    let operation = 'select';
    let payload: Row = {};
    const filters: Record<string, unknown> = {};
    const resolve = () => {
      if (operation !== 'select') {
        writes.push({ table, operation, payload, filters: { ...filters } });
        if (persistWrites && !writeError && operation === 'update') {
          const index = (rows[table] ?? []).findIndex(entry => entry.id === filters.id);
          if (index !== -1) {
            const at = `2026-11-15T02:00:${String(writes.length).padStart(2, '0')}Z`;
            const saved = { ...rows[table][index], ...payload, updated_at: at,
              ...(payload.review_status === 'reviewed' ? { reviewed_at: at } : {}),
              ...(payload.review_status === 'published' ? { published_at: at } : {}) };
            rows[table][index] = saved;
            return { data: saved, error: null };
          }
        }
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
  persistWrites = false;
  rows = { items: [item], categories: [category], item_translations: [draft], category_translations: [] };
  notify.mockReset();
  vi.mocked(useNotify).mockReturnValue({ notify } as never);
  vi.mocked(useAuth).mockReturnValue({ tenantId, storeId: '70000000-0000-4000-8000-000000000001', user: { id: profileId, authId, tenantId, storeId: '70000000-0000-4000-8000-000000000001', role: 'manager', name: 'Reviewer' }, loading: false, session: null, signOut: vi.fn() });
  installDatabaseDouble();
  vi.mocked(supabase.functions.invoke).mockReset();
  vi.mocked(supabase.functions.invoke).mockImplementation(async (_name, options) => {
    if ((options?.body as { kind?: string })?.kind === 'evidence') {
      const itemId = (options?.body as { itemId: string }).itemId;
      return { data: { evidence: itemId === '1aafa29f-07ca-4f04-a702-549c1720bd6a' ? ramenEvidence :
        { key: itemId === '29e60fea-429c-4b7d-b639-406471a6623b' ? '4d20b020' : null, matched: itemId === '29e60fea-429c-4b7d-b639-406471a6623b', issue: 'No registry match', entry: null, links: [], missing: [], supportedFacts: null },
        snapshot: itemId === '1aafa29f-07ca-4f04-a702-549c1720bd6a' ? { ...evidence, entityId: itemId, sourceName: ramenEvidence.entry.exactName, sourceDescription: null, sku: 'CANVA-TEST-b79a6606', barcode: null, brand: null, packageText: '70g', sourceUris: [ramenEvidence.links[0].url] } : null }, error: null } as never;
    }
    return { data: null, error: null } as never;
  });
});

afterEach(cleanup);

describe('TranslationsPage publication actions', () => {
  it('opens draft review explicitly and explains missing evidence', async () => {
    rows.item_translations = [{ ...draft, evidence_snapshot: null }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft' }));
    expect(screen.getByRole('heading', { name: 'Review Bengali translation' })).toBeInTheDocument();
    expect(screen.getByText('An openable source link must be available and its exact product claims checked before approval.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    expect(writes).toHaveLength(0);
  });

  it('shows independently saved evidence URLs without inventing registered manufacturer proof', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft' }));
    expect(await screen.findByRole('heading', { name: 'Saved product evidence URLs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: evidence.sourceUris[0] })).toHaveAttribute('href', evidence.sourceUris[0]);
    expect(await screen.findByText(/No registered manufacturer URL/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    expect(writes).toHaveLength(0);
  });

  it('lets an authorized human review a persisted production product snapshot with saved seller packaging sources', async () => {
    const sellerEvidence = { key: '002fbcb3', matched: true, issue: null,
      entry: { exactName: item.name, netQuantity: '500 g' }, links: [],
      missing: ['No product-specific manufacturer page.'], supportedFacts: null };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { evidence: sellerEvidence, snapshot: null }, error: null,
    } as never);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft' }));
    expect(await screen.findByText(/No registered manufacturer URL/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: evidence.sourceUris[0] })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: /Open manufacturer source/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked the linked sources/ }));
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeEnabled();
    expect(writes).toHaveLength(0);
  });

  it('still blocks a production row with missing snapshot even when seller packaging links exist', async () => {
    rows.item_translations = [{ ...draft, evidence_snapshot: null }];
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { evidence: { key: '002fbcb3', matched: true, issue: null,
        entry: { exactName: item.name, netQuantity: '500 g' }, links: [],
        missing: [], supportedFacts: null }, snapshot: null }, error: null,
    } as never);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked the linked sources/ }));
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    expect(writes).toHaveLength(0);
  });

  it('passes exact empty-draft item IDs to the Edge Function', async () => {
    rows.item_translations = [{ ...draft, description: '' }];
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { generated: 0, skipped: 1, failed: 0 }, error: null } as never);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate AI Drafts' })).toBeEnabled());
    fireEvent.click(await screen.findByRole('button', { name: 'Generate AI Drafts' }));
    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-bengali-translation-drafts', {
      body: { kind: 'item', limit: 3, itemIds: [item.id] },
    }));
  });

  it('does not enable review if registry evidence cannot be loaded', async () => {
    rows.item_translations = [{ ...draft, evidence_snapshot: null }];
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: new Error('unavailable') } as never);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft' }));
    expect(await screen.findByText(/Could not load registry evidence/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    expect(writes).toHaveLength(0);
  });

  it('prepares an exact Samyang 2X manufacturer snapshot for one-click draft saving', async () => {
    const ramen = { ...item, id: '1aafa29f-07ca-4f04-a702-549c1720bd6a',
      name: 'Samyang Buldak Ramen 2X Cup 70g', description: null,
      sku: 'CANVA-TEST-b79a6606', barcode: null, brand: null };
    rows.items = [ramen];
    rows.item_translations = [{ ...draft, item_id: ramen.id, description: null, evidence_snapshot: null }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft' }));
    expect(await screen.findByText(/Exact production registry match:/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Buldak Ramen 2X Cup.*Open manufacturer source/i })).toHaveAttribute(
      'href', 'https://buldak.com/us/product/buldak-ramen-2x-cup/',
    );
    expect(screen.queryByRole('textbox', { name: /JSON/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare evidence snapshot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect((writes[0].payload.evidence_snapshot as { entityId: string }).entityId).toBe(ramen.id);
  });

  it('blocks BelleAme review when only packaging notes exist without links', async () => {
    const biscuits = { ...item, id: '29e60fea-429c-4b7d-b639-406471a6623b',
      name: 'BelleAme Chocolate Digestive Biscuits 135g', description: null,
      sku: 'CANVA-TEST-4d20b020', brand: 'BelleAme', barcode: null };
    rows.items = [biscuits];
    rows.item_translations = [{ ...draft, item_id: biscuits.id, description: null, evidence_snapshot: null }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft' }));
    expect(await screen.findByText(/No openable product-specific source/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked/ }));
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    expect(writes).toHaveLength(0);
  });

  it('keeps the saved Samyang draft open for human review and only publishes after a separate click', async () => {
    const ramen = { ...item, id: '1aafa29f-07ca-4f04-a702-549c1720bd6a',
      name: 'Samyang Buldak Ramen 2X Cup 70g', description: null, sku: 'CANVA-TEST-b79a6606', barcode: null, brand: null };
    rows.items = [ramen];
    rows.item_translations = [{ ...draft, item_id: ramen.id, name: 'Samyang Buldak রামেন 2X কাপ 70g',
      description: 'Samyang Buldak Ramen 2X Cup 70g হলো 70g ওজনের কাপ নুডলস।',
      evidence_snapshot: null }];
    persistWrites = true;
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review draft' }));
    await screen.findByText(/Exact production registry match:/);
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare evidence snapshot' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].payload).toMatchObject({ review_status: 'draft', evidence_snapshot: { entityId: ramen.id } });
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked/ }));
    expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mark Reviewed' }));
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1].payload.review_status).toBe('reviewed');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    expect(writes).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(writes).toHaveLength(3));
    expect(writes[2].payload.review_status).toBe('published');
    expect(await screen.findByText(/Saved published record/)).toBeInTheDocument();
  });

  it('generates saved drafts and shows them in the draft queue without publishing', async () => {
    rows.item_translations = [];
    vi.mocked(supabase.functions.invoke).mockImplementation(async () => {
      rows.item_translations = [{ ...draft, evidence_snapshot: null }];
      return { data: { generated: 1, skipped: 0, failed: 0 }, error: null } as never;
    });
    renderPage();
    expect(await screen.findByText('Not generated')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI Drafts' }));
    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-bengali-translation-drafts', { body: { kind: 'item', limit: 3 } }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining('1 AI draft saved'), 'success'));
    fireEvent.click(screen.getByRole('button', { name: 'Show drafts' }));
    expect(await screen.findByText(draft.name)).toBeInTheDocument();
    expect(screen.queryByText('Not generated')).not.toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });
  it('reports provider failure without creating a draft or publishing', async () => {
    rows.item_translations = [];
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: new Error('provider') } as never);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate AI Drafts' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI Drafts' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining('AI draft generation request failed'), 'error'));
    expect(screen.getByText('Not generated')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });
  it('reports individual model rejection reasons instead of silent zero drafts', async () => {
    rows.item_translations = [];
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { generated: 0, skipped: 0, failed: 2, failures: [
        { id: 'first', reason: 'Model omitted or duplicated this product' },
        { id: 'second', reason: 'Invalid Bengali description' },
      ] }, error: null,
    } as never);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate AI Drafts' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI Drafts' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(
      expect.stringContaining('Model omitted or duplicated this product'), 'error'));
    expect(writes).toHaveLength(0);
  });

  it('requests category drafts in a single bounded batch', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { generated: 0, skipped: 1, failed: 0 }, error: null } as never);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Categories' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate AI Drafts' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI Drafts' }));
    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-bengali-translation-drafts', { body: { kind: 'category', limit: 3 } }));
    expect(writes).toHaveLength(0);
  });
  it('shows canonical identity and evidence beside Bengali fields without a status selector or bulk review', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
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

  it('does not expose JSON editors for source evidence or product details', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    expect(screen.queryByRole('textbox', { name: /JSON/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Source matching and snapshot creation are automatic/)).toBeInTheDocument();
  });

  it('binds Mark Reviewed to the public user UUID and an unchanged persisted draft', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked the linked sources/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Mark Reviewed' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toEqual({ table: 'item_translations', operation: 'update', payload: { review_status: 'reviewed', reviewed_by: profileId }, filters: { id: draft.id, tenant_id: tenantId, review_status: 'draft', updated_at: draft.updated_at } });
    expect(writes[0].payload).not.toHaveProperty('published_by');
  });

  it('uses a separate Publish action and preserves the prior reviewer', async () => {
    rows.item_translations = [{ ...draft, review_status: 'reviewed', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z' }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked the linked sources/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
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
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked the linked sources/ }));
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    if (row.review_status === 'draft') expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeDisabled();
    expect(writes).toHaveLength(0);
  });

  it('requires saving edited reviewed copy as draft and clears prior attribution', async () => {
    rows.item_translations = [{ ...draft, review_status: 'published', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z', published_by: profileId, published_at: '2026-11-12T12:00:00Z' }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bengali name' }), { target: { value: 'ইস্পাহানি নতুন চা 500 g' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].payload).toMatchObject({ name: 'ইস্পাহানি নতুন চা 500 g', review_status: 'draft', reviewed_by: null, reviewed_at: null, published_by: null, published_at: null, details: { summary: 'চা পাতা।' } });
    expect(writes[0].filters).toMatchObject({ tenant_id: tenantId, updated_at: draft.updated_at });
  });

  it('does not reset an unchanged published translation to draft', async () => {
    rows.item_translations = [{ ...draft, review_status: 'published', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z', published_by: profileId, published_at: '2026-11-12T12:00:00Z' }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDisabled();
  });

  it('does not review or publish unsaved changes', async () => {
    rows.item_translations = [{ ...draft, review_status: 'reviewed', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z' }];
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked the linked sources/ }));
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
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked the linked sources/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Reviewed' })).toBeEnabled());
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
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked the linked sources/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Translation changed; reload before publishing.', 'error'));
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  it('refetches translations after a revision conflict', async () => {
    rows.item_translations = [{ ...draft, review_status: 'reviewed', reviewed_by: profileId, reviewed_at: '2026-11-12T11:00:00Z' }];
    const { queryClient } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Review draft|Edit/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /I opened and checked the linked sources/ }));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    writeError = { code: 'PGRST116', message: 'No rows returned' };
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['translations', 'item', tenantId] }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Translation changed; reload before reviewing or publishing.', 'error'));
  });

  it('restricts the entire editor to authorized staff', () => {
    vi.mocked(useAuth).mockReturnValue({ tenantId, storeId: '', user: { id: profileId, authId, tenantId, storeId: '', role: 'cashier', name: null }, loading: false, session: null, signOut: vi.fn() });
    renderPage();
    expect(screen.getByText(/restricted to administrators and managers/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });
});
