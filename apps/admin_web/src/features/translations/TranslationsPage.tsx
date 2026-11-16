import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Languages, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNotify } from '@/components/NotificationContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { canTransitionTranslation, getCanonicalPackageText } from './translationWorkflow';
import type { RegistryEvidenceResult } from '../../../../../supabase/functions/_shared/translation-registry-evidence';
import type { CanonicalTranslationSource, TranslationAction, TranslationKind, TranslationReviewStatus, TranslationRow, TranslationEvidenceSnapshot } from './translationTypes';

type CatalogRow = { id: string; tenant_id: string; name: string; description?: string | null; sku?: string | null; barcode?: string | null; brand?: string | null };
type Editor = { row: TranslationRow; aliasesText: string; evidenceUrisText: string; evidenceSnapshot: TranslationEvidenceSnapshot | null; humanReviewConfirmed: boolean };
const client = supabase as unknown as SupabaseClient;
const translationTable = (kind: TranslationKind) => kind === 'item' ? 'item_translations' : 'category_translations';
const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary';
const buttonClass = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50';
const httpsUrl = /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i;

function translationContent(row: TranslationRow) {
  return {
    name: row.name.trim(),
    description: row.description?.trim() || null,
    search_terms: row.search_terms,
    evidence_snapshot: row.evidence_snapshot,
    ...(row.kind === 'item' ? { details: row.details ?? null } : { seo_title: row.seo_title?.trim() || null, seo_description: row.seo_description?.trim() || null }),
  };
}

export function TranslationsPage() {
  const { tenantId, user } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<TranslationKind>('item');
  const [statusFilter, setStatusFilter] = useState<TranslationReviewStatus | 'all'>('all');
  // UUID cursor survives content refreshes within this page; failed product
  // batches advance instead of retrying the same first three indefinitely.
  const [generationCursor, setGenerationCursor] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const canManage = Boolean(user && user.tenantId === tenantId && (user.role === 'admin' || user.role === 'manager'));

  const catalogQuery = useQuery<CanonicalTranslationSource[]>({
    queryKey: ['translation-catalog', kind, tenantId],
    enabled: Boolean(tenantId && canManage),
    queryFn: async () => {
      const fields = kind === 'item' ? 'id, tenant_id, name, description, sku, barcode, brand' : 'id, tenant_id, name';
      const { data, error } = await client.from(kind === 'item' ? 'items' : 'categories')
        .select(fields).eq('tenant_id', tenantId).eq(kind === 'item' ? 'is_active' : 'active', true).order('name');
      if (error) throw error;
      return ((data ?? []) as unknown as CatalogRow[]).map((row) => ({
        id: row.id, tenantId: row.tenant_id, name: row.name, description: kind === 'item' ? row.description ?? null : null,
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
      // Each table determines the discriminant; it is not a database column.
      const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
      return rows.map((row) => ({ ...row, kind })) as unknown as TranslationRow[];
    },
  });
  const sources = new Map((catalogQuery.data ?? []).map((row) => [row.id, row]));
  const source = editing ? sources.get(editing.row.kind === 'item' ? editing.row.item_id : editing.row.category_id) ?? null : null;
  const evidenceQuery = useQuery<{ evidence: RegistryEvidenceResult; snapshot: TranslationEvidenceSnapshot | null }>({
    queryKey: ['translation-registry-evidence', tenantId, source],
    enabled: Boolean(canManage && source && editing?.row.kind === 'item'),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-bengali-translation-drafts', {
        body: { kind: 'evidence', itemId: source!.id },
      });
      if (error || !data?.evidence) throw error ?? new Error('Could not load registry evidence');
      return data;
    },
  });
  const resolvedEvidence = evidenceQuery.data?.evidence ?? null;
  const parsed: TranslationRow | null = editing ? {
    ...editing.row, evidence_snapshot: editing.evidenceSnapshot,
    search_terms: [...new Set(editing.aliasesText.split('\n').map(term => term.trim()).filter(Boolean))],
  } as TranslationRow : null;
  const persisted = (translationsQuery.data ?? []).find((row) => row.id === editing?.row.id);
  const isStale = Boolean(persisted && editing && (
    persisted.updated_at !== editing.row.updated_at
    || persisted.review_status !== editing.row.review_status
    || persisted.reviewed_by !== editing.row.reviewed_by
    || persisted.reviewed_at !== editing.row.reviewed_at
    || persisted.published_by !== editing.row.published_by
    || persisted.published_at !== editing.row.published_at
  ));
  const isDirty = !parsed || !persisted || JSON.stringify(translationContent(parsed)) !== JSON.stringify(translationContent(persisted));
  const transitionContext = parsed ? { actor: user, translation: parsed, source, humanReviewConfirmed: editing?.humanReviewConfirmed ?? false } : null;
  // A saved snapshot is necessary but not sufficient for publication: the
  // current registry lookup must also resolve cleanly so a visible conflict
  // cannot coexist with an enabled Publish action.
  const canPublishWithSavedEvidence = Boolean(
    parsed && source && parsed.review_status === 'reviewed' && editing?.row.kind === 'item'
    && (source.sku?.startsWith('CANVA-TEST-')
      ? Boolean(evidenceQuery.isSuccess && resolvedEvidence?.matched && resolvedEvidence.links.length && parsed.description?.trim())
      : Boolean(parsed.evidence_snapshot?.sourceUris.length && parsed.description?.trim()
        && evidenceQuery.isSuccess && resolvedEvidence?.matched)),
  );
  const canAct = (action: TranslationAction, status: TranslationReviewStatus) => {
    if (!parsed || !transitionContext || isStale) return false;
    const evidenceAllowed = action === 'save_draft' || editing?.row.kind !== 'item'
      ? true
      : action === 'publish'
        ? canPublishWithSavedEvidence
        : resolvedEvidence !== null
          && (source?.sku?.startsWith('CANVA-TEST-')
            ? Boolean(resolvedEvidence.matched && resolvedEvidence.links.length && parsed.description?.trim())
            : Boolean(parsed.evidence_snapshot?.sourceUris.length && parsed.description?.trim()));
    return evidenceAllowed
      && (action === 'save_draft' ? isDirty || parsed.review_status === 'draft' : !isDirty)
      && canTransitionTranslation(parsed.review_status, status, { ...transitionContext, action });
  };

  const mutation = useMutation({
    mutationFn: async ({ row, action, humanReviewConfirmed }: { row: TranslationRow; action: TranslationAction; humanReviewConfirmed: boolean }) => {
      const target = action === 'save_draft' ? 'draft' : action === 'mark_reviewed' ? 'reviewed' : 'published';
      if ((action !== 'save_draft' && isDirty) || !canTransitionTranslation(row.review_status, target, {
        actor: user, translation: row, source, action, humanReviewConfirmed,
      })) throw new Error('Save the draft, complete its evidence and confirm human review before this action.');
      const payload = action === 'save_draft'
        ? { ...translationContent(row), review_status: 'draft', reviewed_by: null, reviewed_at: null, published_by: null, published_at: null }
        : action === 'mark_reviewed' ? { review_status: 'reviewed', reviewed_by: user!.id } : { review_status: 'published', published_by: user!.id };
      let query;
      if (row.id.startsWith('new:')) {
        query = client.from(translationTable(row.kind)).insert({
          ...payload,
          ...(row.kind === 'item' ? { item_id: row.item_id } : { category_id: row.category_id }),
          tenant_id: tenantId, locale: 'bn',
        });
      } else {
        query = client.from(translationTable(row.kind)).update(payload).eq('id', row.id).eq('tenant_id', tenantId).eq('updated_at', row.updated_at);
        if (action !== 'save_draft') query = query.eq('review_status', row.review_status);
      }
      const { data, error } = await query.select('*').single();
      if (error?.code === 'PGRST116') {
        await queryClient.invalidateQueries({ queryKey: ['translations', kind, tenantId] });
        throw new Error('Translation changed; reload before reviewing or publishing.');
      }
      if (error) throw error;
      return data;
    },
    onSuccess: async (saved, { action, row }) => {
      await queryClient.invalidateQueries({ queryKey: ['translations', row.kind, tenantId] });
      if (action === 'publish') {
        setEditing(null);
      } else if (saved && saved.updated_at && saved.id) {
        const updated = { ...row, ...saved, kind: row.kind } as TranslationRow;
        setEditing(previous => previous?.row.id === row.id ? {
          ...previous, row: updated, aliasesText: updated.search_terms.join('\n'),
          evidenceUrisText: updated.evidence_snapshot?.sourceUris.join('\n') ?? '',
          evidenceSnapshot: updated.evidence_snapshot,
          humanReviewConfirmed: action === 'mark_reviewed' ? previous.humanReviewConfirmed : false,
        } : previous);
      } else {
        // Some insert adapters do not return a complete row. Avoid presenting stale revision data.
        setEditing(null);
      }
      notify(action === 'save_draft' ? 'Draft saved. Review is required before publication.' : action === 'mark_reviewed' ? 'Translation reviewed. Publish is a separate action.' : 'Translation published.', 'success');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });
  const generateMutation = useMutation({
    mutationFn: async (requestedKind: TranslationKind) => {
      // Use the Edge Function's existing tenant-scoped targeted itemIds feature.
      // Its default scan always selects the same first 3, so validation failures
      // trap the entire catalog. Choose the next three *untranslated* UUIDs,
      // wrapping around after the end; never use an unstable list index cursor.
      const translated = new Set((translationsQuery.data ?? [])
        .filter(row => row.kind === 'item').map(row => row.item_id));
      const available = requestedKind === 'item'
        ? (catalogQuery.data ?? []).filter(row => !translated.has(row.id))
          .sort((a, b) => a.id.localeCompare(b.id))
        : [];
      const nextIndex = generationCursor
        ? available.findIndex(row => row.id > generationCursor) : 0;
      const start = nextIndex < 0 ? 0 : nextIndex;
      const ordered = [...available.slice(start), ...available.slice(0, start)];
      const attemptedIds = requestedKind === 'item'
        ? ordered.slice(0, 3).map(row => row.id) : [];
      const hasAlternativeBatch = available.length > attemptedIds.length;
      if (requestedKind === 'item' && attemptedIds.length === 0) {
        return { generated: 0, skipped: 0, failed: 0, attemptedIds, hasAlternativeBatch };
      }
      const body = { kind: requestedKind, limit: 3,
        ...(requestedKind === 'item' ? { itemIds: attemptedIds } : {}) };
      const { data, error } = await supabase.functions.invoke('generate-bengali-translation-drafts', { body });
      if (error) {
        // Supabase functions return an HTTP Response on failed invocations.
        // Surface the server's bounded diagnostic, never response headers or tokens.
        const response = (error as { context?: unknown }).context;
        let detail: string | null = null;
        if (response instanceof Response) {
          try {
            const body = await response.json();
            if (typeof body?.error === 'string' && body.error.length <= 200) detail = body.error;
          } catch { /* Provider may return non-JSON on an outage. */ }
        }
        throw new Error(detail ? `AI draft generation: ${detail}` : 'AI draft generation request failed. Check provider availability.');
      }
      if (!data || !Number.isInteger(data.generated) || !Number.isInteger(data.skipped) || !Number.isInteger(data.failed)) throw new Error('Invalid draft generation response.');
      return { ...data, attemptedIds, hasAlternativeBatch } as {
        generated: number; skipped: number; failed: number;
        attemptedIds: string[]; hasAlternativeBatch: boolean;
        fallbackGenerated?: number; failures?: Array<{ id: string; reason: string }>;
      };
    },
    onSuccess: async (result, requestedKind) => {
      if (requestedKind === 'item' && result.attemptedIds.length) {
        setGenerationCursor(result.attemptedIds[result.attemptedIds.length - 1]);
      }
      await queryClient.invalidateQueries({ queryKey: ['translations', requestedKind, tenantId] });
      const reasons = [...new Set((result.failures ?? []).map(f => f.reason))].slice(0, 2);
      const details = reasons.length ? ` Reasons: ${reasons.join('; ')}.` : '';
      const summary = result.generated === 0 && result.failed === 0 && result.skipped === 0
        ? 'No eligible translations found.'
        : `${result.generated} AI draft${result.generated === 1 ? '' : 's'} saved; ${result.skipped} skipped; ${result.failed} failed.${details}`;
      const nextBatch = requestedKind === 'item' && result.failed > 0 && result.hasAlternativeBatch
        ? ' Next click will select different untranslated products.' : '';
      notify(`${summary}${nextBatch} Human review is required before publication.`, result.failed ? 'error' : 'success');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });

  if (!canManage) return <div className="p-6 text-text-muted">Translation review is restricted to administrators and managers.</div>;

  const startEditing = (row: TranslationRow) => {
    setEditing({
      row,
      aliasesText: row.search_terms.join('\n'),
      evidenceUrisText: row.evidence_snapshot?.sourceUris.join('\n') ?? '',
      evidenceSnapshot: row.evidence_snapshot,
      humanReviewConfirmed: false,
    });
  };
  const prepareEvidence = () => {
    if (editing && evidenceQuery.data?.snapshot && !editing.evidenceSnapshot) {
      changeEditor({ evidenceSnapshot: evidenceQuery.data.snapshot });
    }
  };
  const prepareCategoryEvidence = () => {
    if (!editing || editing.row.kind !== 'category' || !source) return;
    const sourceUris = editing.evidenceUrisText.split('\n').map(uri => uri.trim()).filter(Boolean);
    if (!sourceUris.length || sourceUris.some(uri => !httpsUrl.test(uri))) {
      notify('Add at least one valid HTTPS source URL per line before preparing category evidence.', 'error');
      return;
    }
    changeEditor({ evidenceSnapshot: {
      entityId: source.id,
      sourceName: source.name,
      sourceDescription: source.description,
      sku: null,
      barcode: null,
      brand: null,
      packageText: null,
      sourceUris: [...new Set(sourceUris)],
      observedAt: new Date().toISOString(),
    } });
  };
  const changeEditor = (changes: Partial<Editor>) => {
    if (editing) setEditing({ ...editing, ...changes, humanReviewConfirmed: false });
  };
  const translatedIds = new Set((translationsQuery.data ?? []).map((row) => row.kind === 'item' ? row.item_id : row.category_id));
  const newRows: TranslationRow[] = statusFilter === 'all' ? (catalogQuery.data ?? []).filter((row) => !translatedIds.has(row.id)).map((row): TranslationRow => {
    const base = {
      id: `new:${row.id}`, tenant_id: tenantId, locale: 'bn' as const, name: '', description: null,
      search_terms: [], review_status: 'draft' as const, evidence_snapshot: null,
      reviewed_by: null, reviewed_at: null, published_by: null, published_at: null, updated_at: '',
    };
    return kind === 'item'
      ? { ...base, kind: 'item', item_id: row.id, details: null }
      : { ...base, kind: 'category', category_id: row.id, seo_title: null, seo_description: null };
  }) : [];
  const visibleRows = [...newRows, ...(translationsQuery.data ?? []).filter((row) => statusFilter === 'all' || row.review_status === statusFilter)];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredRows = normalizedSearch
    ? visibleRows.filter((row) => {
      const sourceRow = sources.get(row.kind === 'item' ? row.item_id : row.category_id);
      return [row.name, row.description, row.search_terms.join(' '), sourceRow?.name, sourceRow?.sku, sourceRow?.brand]
        .filter(Boolean).join(' ').toLocaleLowerCase().includes(normalizedSearch);
    })
    : visibleRows;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);
  const canGenerateForFilter = statusFilter === 'all' || statusFilter === 'draft';

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Bengali translations" subtitle="Compare canonical identity and reliable evidence before reviewing localized copy." />
      <div className="mb-4 flex gap-2">
        {(['item', 'category'] as const).map((value) => (
          <button key={value} type="button" disabled={mutation.isPending || generateMutation.isPending} aria-pressed={kind === value} onClick={() => { setKind(value); setGenerationCursor(null); setCurrentPage(1); setEditing(null); }} className={`${buttonClass} ${kind === value ? 'bg-primary text-primary-on' : 'bg-surface text-text-muted'}`}>
            {value === 'item' ? 'Products' : 'Categories'}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Translation status filter">
        {(['all', 'draft', 'reviewed', 'published'] as const).map((value) => (
          <button key={value} type="button" disabled={mutation.isPending || generateMutation.isPending} aria-pressed={statusFilter === value} onClick={() => { setStatusFilter(value); setCurrentPage(1); setEditing(null); }} className={`${buttonClass} capitalize ${statusFilter === value ? 'bg-primary text-primary-on' : 'bg-surface text-text-muted'}`}>
            {value === 'all' ? 'All translations' : value === 'draft' ? 'Show drafts' : value}
          </button>
        ))}
      </div>
      <div className="mb-4 space-y-2">
        <label className="block max-w-xl space-y-1 text-sm font-semibold">Search translations
          <input aria-label="Search translations" disabled={Boolean(editing)} value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }} placeholder="Search by product, category, brand, SKU or alias" className={inputClass} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={buttonClass} title={!canGenerateForFilter ? 'Switch to All translations or Show drafts before generating.' : undefined} disabled={mutation.isPending || generateMutation.isPending || translationsQuery.isLoading || catalogQuery.isLoading || Boolean(editing) || !canGenerateForFilter} onClick={() => generateMutation.mutate(kind)}>{generateMutation.isPending ? 'Generating AI drafts…' : 'Generate AI Drafts'}</button>
          <span className="text-sm text-text-muted" role="status">{filteredRows.length} matching translation{filteredRows.length === 1 ? '' : 's'}</span>
        </div>
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
          {pagedRows.map((row) => editing?.row.id === row.id ? (
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
                  {editing.row.kind === 'item' && <section aria-label="Registry evidence" className="space-y-2 rounded-lg border border-border p-3 text-sm">
                    <h4 className="font-semibold">Source evidence</h4>
                    {evidenceQuery.isLoading && <p role="status">Loading registry evidence...</p>}
                    {evidenceQuery.isError && <p role="alert">Could not load registry evidence. Retry before review.</p>}
                    {resolvedEvidence?.matched ? <p>Exact production registry match: {resolvedEvidence.entry?.exactName} — {resolvedEvidence.entry?.netQuantity} (ID {resolvedEvidence.key})</p> : <p role="alert" className="text-danger">{resolvedEvidence?.issue ?? 'No exact production registry mapping.'}</p>}
                    {resolvedEvidence?.links.map(link => <div key={link.url} className="break-words">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-text-link underline">{link.title} — Open manufacturer source</a>
                      <p className="text-text-muted">Registry last verified: {link.verifiedAt ?? 'Not recorded'}. Open and check this exact variant and size before confirming review.</p>
                    </div>)}
                    {resolvedEvidence?.missing.map(message => <p key={message} className="text-text-muted">Evidence missing: {message}</p>)}
                    {!resolvedEvidence?.links.length && (!editing.evidenceSnapshot?.sourceUris.length
                      ? <p role="alert">Evidence missing: No openable product-specific source. This product must remain a draft until packaging photos or manufacturer proof can be checked.</p>
                      : <p className="text-text-muted">No registered manufacturer URL. Open every saved source link and independently verify the exact product, variant, size and claims before reviewing.</p>)}
                    {evidenceQuery.data?.snapshot && !editing.evidenceSnapshot && <button type="button" className={buttonClass} onClick={prepareEvidence}>Prepare evidence snapshot</button>}
                    {editing.evidenceSnapshot && <p>Canonical evidence snapshot prepared for this item. {isDirty ? 'Save Draft to persist it.' : 'Saved evidence is ready for review.'}</p>}
                  </section>}
                  {editing.row.kind === 'category' && <section aria-label="Category evidence" className="space-y-2 rounded-lg border border-border p-3 text-sm">
                    <h4 className="font-semibold">Category evidence</h4>
                    <p className="text-text-muted">Add one HTTPS source URL per line, open and verify each source, then prepare the canonical snapshot before review.</p>
                    <textarea aria-label="Category evidence URLs" value={editing.evidenceUrisText} onChange={(event) => changeEditor({ evidenceUrisText: event.target.value, evidenceSnapshot: null })} className={inputClass} rows={3} placeholder="https://example.com/category-source" />
                    {!editing.evidenceSnapshot && <button type="button" className={buttonClass} onClick={prepareCategoryEvidence}>Prepare category evidence snapshot</button>}
                    {editing.evidenceSnapshot && <p>Canonical category evidence snapshot prepared. {isDirty ? 'Save Draft to persist it.' : 'Saved evidence is ready for review.'}</p>}
                  </section>}
                  {editing.row.kind === 'item' && parsed?.evidence_snapshot?.sourceUris.length ? <section aria-label="Saved product evidence links" className="space-y-2 text-sm">
                    <h4 className="font-semibold">Saved product evidence URLs</h4>
                    <p className="text-text-muted">Verify exact product identity and pack size for each source. A brand page alone does not prove an individual SKU or its claims.</p>
                    {parsed.evidence_snapshot.sourceUris.map((uri, index) =>
                      <a key={`${uri}:${index}`} href={uri} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-text-link underline">{uri}</a>)}
                  </section> : null}
                  {editing.row.kind === 'category' && parsed?.evidence_snapshot?.sourceUris.map((uri, index) => <a key={`${uri}:${index}`} href={uri} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-text-link underline">{uri}</a>)}
                </div>
                <div className="min-w-0 space-y-3">
                  <h3 className="font-semibold">Review Bengali translation</h3>
                  <label className="block space-y-1 text-sm">Bengali name<input lang="bn" value={editing.row.name} onChange={(event) => changeEditor({ row: { ...editing.row, name: event.target.value } })} className={inputClass} /></label>
                  {editing.row.kind === 'item' && !editing.row.description?.trim() && <p role="status" className="text-sm text-text-muted">{resolvedEvidence?.supportedFacts
                    ? 'Bengali description is missing. Use Generate AI Drafts from the list to fill it from linked facts before reviewing.'
                    : 'Bengali description is missing. No independently openable product evidence is available; this item must stay a draft.'}</p>}
                  <label className="block space-y-1 text-sm">Bengali description<textarea lang="bn" value={editing.row.description ?? ''} onChange={(event) => changeEditor({ row: { ...editing.row, description: event.target.value } })} className={inputClass} rows={3} /></label>
                  <label className="block space-y-1 text-sm">Search aliases<textarea value={editing.aliasesText} onChange={(event) => changeEditor({ aliasesText: event.target.value })} className={inputClass} rows={3} /></label>
                  <p className="text-xs text-text-muted">One alias per line. Include Bengali, Banglish, English and the canonical Latin brand.</p>
                  {editing.row.kind === 'category' ? <>
                    <label className="block space-y-1 text-sm">SEO title<input lang="bn" value={editing.row.kind === 'category' ? editing.row.seo_title ?? '' : ''} onChange={(event) => changeEditor({ row: editing.row.kind === 'category' ? { ...editing.row, seo_title: event.target.value } : editing.row })} className={inputClass} /></label>
                    <label className="block space-y-1 text-sm">SEO description<textarea lang="bn" value={editing.row.kind === 'category' ? editing.row.seo_description ?? '' : ''} onChange={(event) => changeEditor({ row: editing.row.kind === 'category' ? { ...editing.row, seo_description: event.target.value } : editing.row })} className={inputClass} rows={3} /></label>
                  </> : <section className="space-y-1 text-sm"><h4 className="font-semibold">Saved Bengali product details</h4>
                    {editing.row.details?.summary ? <p>{editing.row.details.summary}</p> : <p className="text-text-muted">No additional Bengali details saved.</p>}
                    {editing.row.details?.specifications?.map((spec, index) => <p key={index}>{spec.label}: {spec.value}</p>)}
                  </section>}
                  <p className="text-xs text-text-muted">Source matching and snapshot creation are automatic. Evidence without a verifiable link remains blocked. No JSON editing is required.</p>
                </div>
              </div>
              {isStale && <p role="alert" className="text-sm text-danger">Translation changed on the server. Reload before saving or reviewing.</p>}
              <div role="status" className="rounded-lg border border-border bg-surface p-3 text-sm">
                <p className="font-semibold">Review checklist</p>
                <ul className="list-disc pl-5">
                  <li>Compare the Bengali copy with the canonical source shown above.</li>
                  {!parsed?.evidence_snapshot && <li>An openable source link must be available and its exact product claims checked before approval.</li>}
                  {row.review_status === 'reviewed' && editing.row.kind === 'item' && (evidenceQuery.isError || (evidenceQuery.isSuccess && !resolvedEvidence?.matched))
                    && <li role="alert">Publication is disabled until the current registry evidence resolves without a conflict.</li>}
                  {isDirty && <li>Save your changes as a draft before marking it reviewed.</li>}
                  {!editing.humanReviewConfirmed && <li>Confirm the human review checkbox below.</li>}
                </ul>
                <p>{row.review_status === 'reviewed'
                  ? 'This translation is reviewed. Check its saved evidence, confirm the verification checkbox, then select Publish below.'
                  : 'Mark Reviewed approves this draft. Publish is a separate action.'}</p>
              </div>
              <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={editing.humanReviewConfirmed} onChange={(event) => setEditing({ ...editing, humanReviewConfirmed: event.target.checked })} className="mt-1 h-4 w-4" /><span>I opened and checked the linked sources, Bengali copy, exact product identity, package size, aliases and claims.</span></label>
              <p className="text-sm text-text-muted">Save changes as draft first. Review and publication are separate actions; the database records the acting user and timestamps.</p>
              <div className="sticky bottom-16 z-10 -mx-4 flex flex-wrap gap-2 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                {([['save_draft', 'draft', 'Save Draft'], ['mark_reviewed', 'reviewed', 'Mark Reviewed'], ['publish', 'published', 'Publish']] as const).map(([action, status, label]) => <button key={action} type="button" disabled={mutation.isPending || !canAct(action, status)} onClick={() => { if (parsed) mutation.mutate({ row: parsed, action, humanReviewConfirmed: editing.humanReviewConfirmed }); }} className={`${buttonClass} inline-flex items-center gap-2 ${action === 'publish' ? 'bg-primary text-primary-on' : 'bg-surface'}`}>
                  {action === 'save_draft' && <Save size={16} />}{label}
                </button>)}
                <button type="button" onClick={() => setEditing(null)} className={buttonClass}>Cancel</button>
              </div>
            </fieldset>
          ) : (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0"><p className="break-words font-semibold">{row.name || sources.get((row.kind === 'item' ? row.item_id : row.category_id))?.name}</p><p className="text-sm text-text-muted">{row.description || 'No description — evidence may be missing'}</p>{row.review_status === 'published' && <p className="text-xs text-text-muted">Saved published record · {row.published_at ?? 'timestamp unavailable'} · Publisher {row.published_by ?? 'not recorded'}</p>}</div>
              <div className="flex items-center gap-3"><span className="text-sm capitalize text-text-muted">{row.id.startsWith('new:') ? 'Not generated' : row.review_status}</span><button type="button" disabled={mutation.isPending || generateMutation.isPending} onClick={() => startEditing(row)} className={buttonClass}>{row.id.startsWith('new:') ? 'Add Bengali' : row.review_status === 'draft' ? 'Review draft' : row.review_status === 'reviewed' ? 'Publish…' : 'Edit'}</button></div>
            </div>
          ))}
          {!translationsQuery.isLoading && !catalogQuery.isLoading && !filteredRows.length && <p className="p-4 text-text-muted">No matching translations found.</p>}
        </div>
        {filteredRows.length > pageSize && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-sm">
          <span>Page {effectivePage} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" className={buttonClass} disabled={effectivePage === 1 || Boolean(editing)} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Previous</button>
            <button type="button" className={buttonClass} disabled={effectivePage === totalPages || Boolean(editing)} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Next</button>
          </div>
        </div>}
      </Card>
    </div>
  );
}
