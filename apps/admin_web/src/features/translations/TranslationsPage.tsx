import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Languages, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNotify } from '@/components/NotificationContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { canTransitionTranslation, getCanonicalPackageText, isLocalizedProductDetails, isTranslationEvidenceSnapshot } from './translationWorkflow';
import type { CanonicalTranslationSource, TranslationAction, TranslationKind, TranslationReviewStatus, TranslationRow } from './translationTypes';

type CatalogRow = { id: string; tenant_id: string; name: string; description: string | null; sku?: string | null; barcode?: string | null; brand?: string | null };
type Editor = { row: TranslationRow; aliasesText: string; evidenceText: string; detailsText: string; humanReviewConfirmed: boolean };
const client = supabase as unknown as SupabaseClient;
const translationTable = (kind: TranslationKind) => kind === 'item' ? 'item_translations' : 'category_translations';
const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary';
const buttonClass = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50';

function translationContent(row: TranslationRow, kind: TranslationKind) {
  return {
    name: row.name.trim(),
    description: row.description?.trim() || null,
    search_terms: row.search_terms,
    evidence_snapshot: row.evidence_snapshot,
    ...(kind === 'item' ? { details: row.details ?? null } : { seo_title: row.seo_title?.trim() || null, seo_description: row.seo_description?.trim() || null }),
  };
}

export function TranslationsPage() {
  const { tenantId, user } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<TranslationKind>('item');
  const [statusFilter, setStatusFilter] = useState<TranslationReviewStatus | 'all'>('all');
  const [editing, setEditing] = useState<Editor | null>(null);
  const canManage = Boolean(user && user.tenantId === tenantId && (user.role === 'admin' || user.role === 'manager'));

  const catalogQuery = useQuery<CanonicalTranslationSource[]>({
    queryKey: ['translation-catalog', kind, tenantId],
    enabled: Boolean(tenantId && canManage),
    queryFn: async () => {
      const fields = kind === 'item' ? 'id, tenant_id, name, description, sku, barcode, brand' : 'id, tenant_id, name, description';
      const { data, error } = await client.from(kind === 'item' ? 'items' : 'categories')
        .select(fields).eq('tenant_id', tenantId).eq(kind === 'item' ? 'is_active' : 'active', true).order('name');
      if (error) throw error;
      return ((data ?? []) as unknown as CatalogRow[]).map((row) => ({
        id: row.id, tenantId: row.tenant_id, name: row.name, description: row.description ?? null,
        sku: row.sku ?? null, barcode: row.barcode ?? null, brand: row.brand ?? null,
        packageText: kind === 'item' ? getCanonicalPackageText(row.name, row.description) : null,
      }));
    },
  });
  const translationsQuery = useQuery<TranslationRow[]>({
    queryKey: ['translations', kind, tenantId],
    enabled: Boolean(tenantId && canManage),
    queryFn: async () => {
      const { data, error } = await client.from(translationTable(kind))
        .select(`id, ${kind}_id, tenant_id, locale, name, description, search_terms, review_status, evidence_snapshot, reviewed_by, reviewed_at, published_by, published_at, updated_at, ${kind === 'item' ? 'details' : 'seo_title, seo_description'}`)
        .eq('tenant_id', tenantId).eq('locale', 'bn').order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TranslationRow[];
    },
  });
  const sources = new Map((catalogQuery.data ?? []).map((row) => [row.id, row]));
  const source = editing ? sources.get(editing.row.item_id ?? editing.row.category_id ?? '') ?? null : null;
  let parsed: TranslationRow | null = null;
  let parseError: string | null = null;
  if (editing) {
    try {
      const evidence = editing.evidenceText.trim() ? JSON.parse(editing.evidenceText) : null;
      const details = kind === 'item' && editing.detailsText.trim() ? JSON.parse(editing.detailsText) : null;
      if (evidence !== null && !isTranslationEvidenceSnapshot(evidence)) throw new Error('Evidence needs canonical fields, source links, a SHA-256 hash and an observation timestamp.');
      if (!isLocalizedProductDetails(details)) throw new Error('Localized details must use summary, highlights, specifications, usage, storage and FAQ structures.');
      parsed = { ...editing.row, evidence_snapshot: evidence, details, search_terms: [...new Set(editing.aliasesText.split('\n').map((term) => term.trim()).filter(Boolean))] };
    } catch (error) {
      parseError = error instanceof SyntaxError ? 'Evidence and details must be valid JSON.' : (error as Error).message;
    }
  }
  const persisted = (translationsQuery.data ?? []).find((row) => row.id === editing?.row.id);
  const isStale = Boolean(persisted && editing && (
    persisted.updated_at !== editing.row.updated_at
    || persisted.review_status !== editing.row.review_status
    || persisted.reviewed_by !== editing.row.reviewed_by
    || persisted.reviewed_at !== editing.row.reviewed_at
    || persisted.published_by !== editing.row.published_by
    || persisted.published_at !== editing.row.published_at
  ));
  const isDirty = !parsed || !persisted || JSON.stringify(translationContent(parsed, kind)) !== JSON.stringify(translationContent(persisted, kind));
  const transitionContext = parsed ? { actor: user, translation: parsed, source, humanReviewConfirmed: editing?.humanReviewConfirmed ?? false } : null;
  const canAct = (action: TranslationAction, status: TranslationReviewStatus) => Boolean(parsed && transitionContext
    && !isStale
    && (action === 'save_draft' || !isDirty)
    && canTransitionTranslation(parsed.review_status, status, { ...transitionContext, action }));

  const mutation = useMutation({
    mutationFn: async ({ row, action, humanReviewConfirmed }: { row: TranslationRow; action: TranslationAction; humanReviewConfirmed: boolean }) => {
      const target = action === 'save_draft' ? 'draft' : action === 'mark_reviewed' ? 'reviewed' : 'published';
      if ((action !== 'save_draft' && isDirty) || !canTransitionTranslation(row.review_status, target, {
        actor: user, translation: row, source, action, humanReviewConfirmed,
      })) throw new Error('Save the draft, complete its evidence and confirm human review before this action.');
      const payload = action === 'save_draft'
        ? { ...translationContent(row, kind), review_status: 'draft', reviewed_by: null, reviewed_at: null, published_by: null, published_at: null }
        : action === 'mark_reviewed' ? { review_status: 'reviewed', reviewed_by: user!.id } : { review_status: 'published', published_by: user!.id };
      let query;
      if (row.id.startsWith('new:')) {
        query = client.from(translationTable(kind)).insert({ ...payload, [`${kind}_id`]: row.item_id ?? row.category_id, tenant_id: tenantId, locale: 'bn' });
      } else {
        query = client.from(translationTable(kind)).update(payload).eq('id', row.id).eq('tenant_id', tenantId).eq('updated_at', row.updated_at);
        if (action !== 'save_draft') query = query.eq('review_status', row.review_status);
      }
      const { error } = await query.select('id').single();
      if (error?.code === 'PGRST116') throw new Error('Translation changed; reload before reviewing or publishing.');
      if (error) throw error;
    },
    onSuccess: async (_, { action }) => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['translations', kind, tenantId] });
      notify(action === 'save_draft' ? 'Draft saved. Review is required before publication.' : action === 'mark_reviewed' ? 'Translation reviewed. Publish is a separate action.' : 'Translation published.', 'success');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });

  if (!canManage) return <div className="p-6 text-text-muted">Translation review is restricted to administrators and managers.</div>;

  const startEditing = (row: TranslationRow) => setEditing({
    row, aliasesText: row.search_terms.join('\n'), evidenceText: row.evidence_snapshot ? JSON.stringify(row.evidence_snapshot, null, 2) : '',
    detailsText: row.details ? JSON.stringify(row.details, null, 2) : '', humanReviewConfirmed: false,
  });
  const changeEditor = (changes: Partial<Editor>) => {
    if (editing) setEditing({ ...editing, ...changes, humanReviewConfirmed: false });
  };
  const translatedIds = new Set((translationsQuery.data ?? []).map((row) => row.item_id ?? row.category_id));
  const newRows: TranslationRow[] = statusFilter === 'all' ? (catalogQuery.data ?? []).filter((row) => !translatedIds.has(row.id)).map((row) => ({
    id: `new:${row.id}`, [`${kind}_id`]: row.id, tenant_id: tenantId, locale: 'bn', name: '', description: null, search_terms: [],
    review_status: 'draft', evidence_snapshot: null, details: null, reviewed_by: null, reviewed_at: null, published_by: null, published_at: null, updated_at: '',
  })) : [];
  const visibleRows = [...newRows, ...(translationsQuery.data ?? []).filter((row) => statusFilter === 'all' || row.review_status === statusFilter)];

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Bengali translations" subtitle="Compare canonical identity and reliable evidence before reviewing localized copy." />
      <div className="mb-4 flex gap-2">
        {(['item', 'category'] as const).map((value) => (
          <button key={value} type="button" disabled={mutation.isPending} aria-pressed={kind === value} onClick={() => { setKind(value); setEditing(null); }} className={`${buttonClass} ${kind === value ? 'bg-primary text-primary-on' : 'bg-surface text-text-muted'}`}>
            {value === 'item' ? 'Products' : 'Categories'}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Translation status filter">
        {(['all', 'draft', 'reviewed', 'published'] as const).map((value) => (
          <button key={value} type="button" disabled={mutation.isPending} aria-pressed={statusFilter === value} onClick={() => { setStatusFilter(value); setEditing(null); }} className={`${buttonClass} capitalize ${statusFilter === value ? 'bg-primary text-primary-on' : 'bg-surface text-text-muted'}`}>
            {value === 'all' ? 'All translations' : value === 'draft' ? 'Show drafts' : value}
          </button>
        ))}
      </div>
      <Card padding="none">
        <div className="flex items-center gap-2 border-b border-border p-4"><Languages size={18} /><h2 className="font-semibold">{kind === 'item' ? 'Product' : 'Category'} translations</h2></div>
        {(translationsQuery.isLoading || catalogQuery.isLoading) && <p role="status" className="p-4 text-text-muted">Loading translations...</p>}
        {(translationsQuery.isError || catalogQuery.isError) && <div role="alert" className="space-y-2 p-4 text-danger">
          <p>Could not load translations or canonical catalog data.</p>
          <p className="text-sm">{(translationsQuery.error ?? catalogQuery.error)?.message}</p>
          <button type="button" onClick={() => { void translationsQuery.refetch(); void catalogQuery.refetch(); }} className={buttonClass}>Retry</button>
        </div>}
        <div className="divide-y divide-border">
          {visibleRows.map((row) => editing?.row.id === row.id ? (
            <fieldset key={row.id} disabled={mutation.isPending} className="min-w-0 space-y-4 p-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="min-w-0 space-y-4">
                  <h3 className="font-semibold">Canonical source</h3>
                  {source ? <dl className="space-y-3 text-sm">
                    {Object.entries({ Name: source.name, Description: source.description, SKU: source.sku, Barcode: source.barcode, Brand: source.brand, 'Package text': source.packageText }).map(([label, value]) => <div key={label}><dt className="text-text-muted">{label}</dt><dd className="break-words">{value ?? 'None'}</dd></div>)}
                  </dl> : <p role="alert">Canonical source is unavailable. Reload before review.</p>}
                  <dl className="space-y-3 text-sm">
                    {Object.entries({ Status: row.review_status, Reviewer: row.reviewed_by, 'Reviewed at': row.reviewed_at, Publisher: row.published_by, 'Published at': row.published_at }).map(([label, value]) => <div key={label}><dt className="text-text-muted">{label}</dt><dd className="break-all">{value ?? 'Not yet recorded'}</dd></div>)}
                  </dl>
                  {parsed?.evidence_snapshot?.sourceUris.map((uri, index) => <a key={`${uri}:${index}`} href={uri} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-text-link underline">{uri}</a>)}
                </div>
                <div className="min-w-0 space-y-3">
                  <h3 className="font-semibold">Bengali presentation</h3>
                  <label className="block space-y-1 text-sm">Bengali name<input lang="bn" value={editing.row.name} onChange={(event) => changeEditor({ row: { ...editing.row, name: event.target.value } })} className={inputClass} /></label>
                  <label className="block space-y-1 text-sm">Bengali description<textarea lang="bn" value={editing.row.description ?? ''} onChange={(event) => changeEditor({ row: { ...editing.row, description: event.target.value } })} className={inputClass} rows={3} /></label>
                  <label className="block space-y-1 text-sm">Search aliases<textarea value={editing.aliasesText} onChange={(event) => changeEditor({ aliasesText: event.target.value })} className={inputClass} rows={3} /></label>
                  <p className="text-xs text-text-muted">One alias per line. Include Bengali, Banglish, English and the canonical Latin brand.</p>
                  {kind === 'category' ? <>
                    <label className="block space-y-1 text-sm">SEO title<input lang="bn" value={editing.row.seo_title ?? ''} onChange={(event) => changeEditor({ row: { ...editing.row, seo_title: event.target.value } })} className={inputClass} /></label>
                    <label className="block space-y-1 text-sm">SEO description<textarea lang="bn" value={editing.row.seo_description ?? ''} onChange={(event) => changeEditor({ row: { ...editing.row, seo_description: event.target.value } })} className={inputClass} rows={3} /></label>
                  </> : <label className="block space-y-1 text-sm">Localized details (JSON)<textarea value={editing.detailsText} onChange={(event) => changeEditor({ detailsText: event.target.value })} className={`${inputClass} font-mono text-xs`} rows={8} /></label>}
                  <label className="block space-y-1 text-sm">Evidence snapshot (JSON)<textarea value={editing.evidenceText} onChange={(event) => changeEditor({ evidenceText: event.target.value })} className={`${inputClass} font-mono text-xs`} rows={10} /></label>
                  <p className="text-xs text-text-muted">Provide sourceUris and observedAt from reliable evidence. Model/import copy always starts as draft.</p>
                  {source && <button type="button" onClick={() => changeEditor({ evidenceText: JSON.stringify({ entityId: source.id, sourceName: source.name, sourceDescription: source.description, sku: source.sku, barcode: source.barcode, brand: source.brand, packageText: source.packageText, sourceUris: [], observedAt: '' }, null, 2) })} className={buttonClass}>Start canonical evidence snapshot</button>}
                </div>
              </div>
              {isStale && <p role="alert" className="text-sm text-danger">Translation changed on the server. Reload before saving or reviewing.</p>}
              {parseError && <p role="alert" className="text-sm text-danger">{parseError}</p>}
              <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={editing.humanReviewConfirmed} onChange={(event) => setEditing({ ...editing, humanReviewConfirmed: event.target.checked })} className="mt-1 h-4 w-4" /><span>I checked the Bengali copy, identity, package, aliases and claims against the evidence.</span></label>
              <p className="text-sm text-text-muted">Save changes as draft first. Review and publication are separate actions; the database records the acting user and timestamps.</p>
              <div className="flex flex-wrap gap-2">
                {([['save_draft', 'draft', 'Save Draft'], ['mark_reviewed', 'reviewed', 'Mark Reviewed'], ['publish', 'published', 'Publish']] as const).map(([action, status, label]) => <button key={action} type="button" disabled={mutation.isPending || !canAct(action, status)} onClick={() => { if (parsed) mutation.mutate({ row: parsed, action, humanReviewConfirmed: editing.humanReviewConfirmed }); }} className={`${buttonClass} inline-flex items-center gap-2 ${action === 'publish' ? 'bg-primary text-primary-on' : 'bg-surface'}`}>
                  {action === 'save_draft' && <Save size={16} />}{label}
                </button>)}
                <button type="button" onClick={() => setEditing(null)} className={buttonClass}>Cancel</button>
              </div>
            </fieldset>
          ) : (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0"><p className="break-words font-semibold">{row.name || sources.get(row.item_id ?? row.category_id ?? '')?.name}</p><p className="text-sm text-text-muted">{row.description || 'No description'}</p></div>
              <div className="flex items-center gap-3"><span className="text-sm capitalize text-text-muted">{row.review_status}</span><button type="button" disabled={mutation.isPending} onClick={() => startEditing(row)} className={buttonClass}>{row.id.startsWith('new:') ? 'Add Bengali' : 'Edit'}</button></div>
            </div>
          ))}
          {!translationsQuery.isLoading && !catalogQuery.isLoading && !visibleRows.length && <p className="p-4 text-text-muted">No matching translations found.</p>}
        </div>
      </Card>
    </div>
  );
}
