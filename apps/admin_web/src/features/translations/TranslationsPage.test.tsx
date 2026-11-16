import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/lib/AuthContext';
import { useNotify } from '@/components/NotificationContext';
import { supabase } from '@/lib/supabase';
import { TranslationsPage } from './TranslationsPage';

vi.unmock('@tanstack/react-query');
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn(), functions: { invoke: vi.fn() } } }));
vi.mock('lucide-react', () => ({ Languages: () => null }));
vi.mock('@/components/ui', async () => {
  const { Card } = await import('@/components/ui/card');
  return { Card };
});

const tenantId = '20000000-0000-4000-8000-000000000001';
const item = { id: '10000000-0000-4000-8000-000000000001', tenant_id: tenantId,
  name: 'Ispahani Tea 500 g', description: 'Tea leaves, 500 g.', sku: 'TEA-500', barcode: '8941154321000', brand: 'Ispahani' };
const translation = { id: '30000000-0000-4000-8000-000000000001', tenant_id: tenantId, item_id: item.id,
  locale: 'bn', name: 'ইস্পাহানি চা 500 g', description: 'চা পাতা, 500 g।', search_terms: ['Ispahani Tea 500 g'],
  review_status: 'draft', source_version: null, evidence_snapshot: null, details: null,
  reviewed_by: null, reviewed_at: null, published_by: null, published_at: null, updated_at: '2026-11-15T10:00:00Z' };
const notify = vi.fn();
let records: Record<string, Array<Record<string, unknown>>>;
let writes: Array<{ table: string; operation: string; payload: Record<string, unknown> }>;

function installDatabaseDouble() {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    let operation = 'select';
    let payload: Record<string, unknown> = {};
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      insert: (value: Record<string, unknown>) => { operation = 'insert'; payload = value; return query; },
      update: (value: Record<string, unknown>) => { operation = 'update'; payload = value; return query; },
      single: async () => {
        writes.push({ table, operation, payload });
        return { data: { id: translation.id }, error: null };
      },
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: records[table] ?? [], error: null }).then(resolve, reject),
    };
    return query;
  }) as never);
  vi.mocked(supabase.rpc).mockResolvedValue({ data: 1, error: null } as never);
  vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { generated: 0, failed: 0, skipped: 0 }, error: null } as never);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><TranslationsPage /></QueryClientProvider>);
}

beforeEach(() => {
  records = { items: [item], item_translations: [translation], categories: [], category_translations: [] };
  writes = [];
  notify.mockReset();
  vi.mocked(useNotify).mockReturnValue({ notify } as never);
  vi.mocked(useAuth).mockReturnValue({ tenantId, storeId: '', user: { id: '40000000-0000-4000-8000-000000000001',
    authId: '50000000-0000-4000-8000-000000000001', tenantId, storeId: '', role: 'manager', name: 'Manager' },
    loading: false, session: null, signOut: vi.fn() });
  installDatabaseDouble();
});

afterEach(cleanup);

describe('Bengali translation queues', () => {
  it('previews English and Bengali together, then publishes all ready rows in one database action', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Ready to Publish/ }));
    expect(await screen.findAllByText(item.name)).toHaveLength(2);
    expect(await screen.findByText('ইস্পাহানি চা 500 g')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Publish Approved Translations/ }));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('publish_bengali_translations', {
      p_kind: 'item', p_translation_ids: [translation.id],
    }));
  });

  it('shows an exact exception and allows a correction that follows the English source', async () => {
    records.item_translations = [{ ...translation, description: 'বর্ণনায় নতুন 2 kg তথ্য।' }];
    renderPage();
    expect(await screen.findByText('Catalog description numeric identity changed.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Correct translation' }));
    fireEvent.change(screen.getByRole('textbox', { name: `Bengali description for ${item.name}` }), {
      target: { value: 'চা পাতা, 500 g।' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({ table: 'item_translations', operation: 'update', payload: { review_status: 'draft', description: 'চা পাতা, 500 g।' } });
  });

  it('keeps an empty English description empty and blocks invented Bengali description text', async () => {
    records.items = [{ ...item, description: null }];
    records.item_translations = [{ ...translation, description: 'এই পণ্যে ভিটামিন আছে।' }];
    renderPage();
    expect(await screen.findByText('Description has no canonical catalog text to verify against.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Publish Approved Translations/ })).not.toBeInTheDocument();
  });

  it('restricts publishing to tenant administrators and managers', () => {
    vi.mocked(useAuth).mockReturnValue({ tenantId, storeId: '', user: { id: '40000000-0000-4000-8000-000000000001',
      authId: '', tenantId, storeId: '', role: 'cashier', name: null }, loading: false, session: null, signOut: vi.fn() });
    renderPage();
    expect(screen.getByText(/restricted to administrators and managers/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Publish Approved Translations/ })).not.toBeInTheDocument();
  });
});
