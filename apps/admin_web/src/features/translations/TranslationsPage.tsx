import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNotify } from '@/components/NotificationContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';

type ReviewStatus = 'draft' | 'reviewed' | 'published';
type TranslationRow = {
  id: string;
  item_id?: string;
  category_id?: string;
  name: string;
  description: string | null;
  review_status: ReviewStatus;
};
type CatalogRow = { id: string; name: string; description?: string | null };

const translationTable = (kind: 'item' | 'category') =>
  kind === 'item' ? 'item_translations' : 'category_translations';

export function TranslationsPage() {
  const { tenantId, user } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<'item' | 'category'>('item');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [editing, setEditing] = useState<TranslationRow | null>(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const catalogQuery = useQuery<CatalogRow[]>({
    queryKey: ['translation-catalog', kind, tenantId],
    enabled: Boolean(tenantId && canManage),
    queryFn: async () => {
      const table = kind === 'item' ? 'items' : 'categories';
      let query = (supabase as any).from(table).select('id, name, description').eq('tenant_id', tenantId).order('name');
      if (kind === 'item') query = query.eq('is_active', true);
      else query = query.eq('active', true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CatalogRow[];
    },
  });

  const translationsQuery = useQuery<TranslationRow[]>({
    queryKey: ['translations', kind, tenantId],
    enabled: Boolean(tenantId && canManage),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(translationTable(kind))
        .select(`id, ${kind === 'item' ? 'item_id' : 'category_id'}, name, description, review_status`)
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TranslationRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (row: TranslationRow) => {
      const isNew = row.id.startsWith('new:');
      if (!row.name.trim()) throw new Error('Bengali name is required.');
      if (isNew) {
        const { error } = await (supabase as any).from(translationTable(kind)).insert({
          ...(kind === 'item' ? { item_id: row.item_id } : { category_id: row.category_id }),
          tenant_id: tenantId,
          locale: 'bn',
          name: row.name.trim(),
          description: row.description?.trim() || null,
          review_status: row.review_status,
        });
        if (error) throw error;
        return;
      }
      const { error } = await (supabase as any)
        .from(translationTable(kind))
        .update({ name: row.name.trim(), description: row.description?.trim() || null, review_status: row.review_status, updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['translations', kind, tenantId] });
      notify('Translation saved.', 'success');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });

  const bulkReviewMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await (supabase as any)
        .from(translationTable(kind))
        .update({ review_status: 'reviewed', updated_at: new Date().toISOString() })
        .in('id', ids)
        .eq('tenant_id', tenantId)
        .eq('review_status', 'draft');
      if (error) throw error;
    },
    onSuccess: async () => {
      setSelectedDraftIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ['translations', kind, tenantId] });
      notify('Selected drafts marked as reviewed.', 'success');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });

  if (!canManage) {
    return <div className="p-6 text-text-muted">Translation review is restricted to administrators and managers.</div>;
  }

  const translatedIds = new Set((translationsQuery.data ?? []).map((row) => kind === 'item' ? row.item_id : row.category_id));
  const visibleTranslations = (translationsQuery.data ?? []).filter((row) => statusFilter === 'all' || row.review_status === statusFilter);
  const untranslated = statusFilter === 'all' ? (catalogQuery.data ?? []).filter((row) => !translatedIds.has(row.id)) : [];

  return (
    <div className="p-6">
      <PageHeader title="Bengali translations" subtitle="Review localized catalog copy before it becomes public." />
      <div className="mb-4 flex gap-2">
        {(['item', 'category'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setEditing(null); setSelectedDraftIds(new Set()); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${kind === value ? 'bg-primary text-white' : 'bg-surface text-text-muted'}`}>
            {value === 'item' ? 'Products' : 'Categories'}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Translation status filter">
        {(['all', 'draft', 'reviewed', 'published'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => { setStatusFilter(value); setEditing(null); setSelectedDraftIds(new Set()); }} className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${statusFilter === value ? 'bg-primary text-white' : 'bg-surface text-text-muted'}`}>
            {value === 'all' ? 'All translations' : value === 'draft' ? 'Show drafts' : value}
          </button>
        ))}
      </div>
      <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex items-center gap-2"><Languages size={18} /><span className="font-semibold">{kind === 'item' ? 'Product' : 'Category'} translations</span></div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => {
                const draftIds = visibleTranslations.filter((row) => row.review_status === 'draft').map((row) => row.id);
                setSelectedDraftIds((current) => current.size === draftIds.length ? new Set() : new Set(draftIds));
              }} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
                {selectedDraftIds.size && selectedDraftIds.size === visibleTranslations.filter((row) => row.review_status === 'draft').length ? 'Unselect drafts' : 'Select all drafts'}
              </button>
              <button type="button" disabled={!selectedDraftIds.size || bulkReviewMutation.isPending} onClick={() => bulkReviewMutation.mutate(Array.from(selectedDraftIds))} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {bulkReviewMutation.isPending ? 'Reviewing…' : `Review selected${selectedDraftIds.size ? ` (${selectedDraftIds.size})` : ''}`}
              </button>
            </div>
          </div>
        {(translationsQuery.isLoading || catalogQuery.isLoading) && <p className="p-4 text-text-muted">Loading translations…</p>}
        {translationsQuery.isError && (
          <div className="space-y-2 p-4 text-red-400">
            <p>Could not load translations.</p>
            <p className="text-sm">{(translationsQuery.error as Error).message}</p>
            <button type="button" onClick={() => translationsQuery.refetch()} className="rounded-lg border border-red-400/40 px-3 py-2 text-sm font-semibold">
              Retry
            </button>
          </div>
        )}
        <div className="divide-y divide-border">
          {untranslated.map((source) => {
            const newId = `new:${source.id}`;
            return (
              <div key={source.id} className="flex items-center justify-between gap-3 p-4">
                <div><p className="font-semibold">{source.name}</p><p className="text-sm text-text-muted">{source.description || 'No description'}</p></div>
                {editing?.id === newId ? (
                  <div className="grid w-full gap-3 md:grid-cols-[1fr_160px_auto]">
                    <div className="space-y-2">
                      <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Bengali name" className="w-full rounded-lg border border-border bg-surface px-3 py-2" aria-label="Bengali name" autoFocus />
                      <textarea value={editing.description ?? ''} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="Bengali description (optional)" className="w-full rounded-lg border border-border bg-surface px-3 py-2" aria-label="Bengali description" rows={2} />
                    </div>
                    <select value={editing.review_status} onChange={(event) => setEditing({ ...editing, review_status: event.target.value as ReviewStatus })} className="rounded-lg border border-border bg-surface px-3 py-2" aria-label="Review status"><option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="published">Published</option></select>
                    <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(editing)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"><Save size={16} />Add</button>
                  </div>
                ) : <button type="button" onClick={() => setEditing({ id: newId, ...(kind === 'item' ? { item_id: source.id } : { category_id: source.id }), name: '', description: null, review_status: 'draft' })} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Add Bengali</button>}
              </div>
            );
          })}
          {visibleTranslations.map((row) => (
            <div key={row.id} className="grid gap-3 p-4 md:grid-cols-[1fr_160px_auto] md:items-center">
              {editing?.id === row.id ? (
                <div className="space-y-2">
                  <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className="w-full rounded-lg border border-border bg-surface px-3 py-2" aria-label="Bengali name" />
                  <textarea value={editing.description ?? ''} onChange={(event) => setEditing({ ...editing, description: event.target.value })} className="w-full rounded-lg border border-border bg-surface px-3 py-2" aria-label="Bengali description" rows={2} />
                </div>
              ) : <div className="flex items-start gap-3">
                {row.review_status === 'draft' && <input type="checkbox" checked={selectedDraftIds.has(row.id)} onChange={() => setSelectedDraftIds((current) => { const next = new Set(current); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })} aria-label={`Select ${row.name}`} className="mt-1 h-4 w-4" />}
                <div><p className="font-semibold">{row.name}</p><p className="text-sm text-text-muted">{row.description || 'No description'}</p></div>
              </div>}
              {editing?.id === row.id ? <select value={editing.review_status} onChange={(event) => setEditing({ ...editing, review_status: event.target.value as ReviewStatus })} className="rounded-lg border border-border bg-surface px-3 py-2" aria-label="Review status"><option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="published">Published</option></select> : <span className="text-sm capitalize text-text-muted">{row.review_status}</span>}
              {editing?.id === row.id ? <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(editing)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"><Save size={16} />Save</button> : <button type="button" onClick={() => setEditing(row)} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">Edit</button>}
            </div>
          ))}
          {!translationsQuery.isLoading && !catalogQuery.isLoading && !visibleTranslations.length && !untranslated.length && <p className="p-4 text-text-muted">No matching translations found.</p>}
        </div>
      </Card>
    </div>
  );
}
