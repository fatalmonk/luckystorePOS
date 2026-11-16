import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Languages } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNotify } from '@/components/NotificationContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { catalogSourceVersion, getCanonicalPackageText, matchesTranslationEvidence, validateCatalogTranslation } from './translationWorkflow';
import type { CanonicalTranslationSource, TranslationKind, TranslationReviewAuditRow, TranslationRow } from './translationTypes';

type CatalogRow = { id: string; tenant_id: string; name: string; description?: string | null; sku?: string | null; barcode?: string | null; brand?: string | null };
type Queue = 'attention' | 'ready' | 'published';
type QueueRow = { row: TranslationRow | null; source: CanonicalTranslationSource; issues: string[]; missing: boolean; outdated: boolean };
const client = supabase as unknown as SupabaseClient;
const tableFor = (kind: TranslationKind) => kind === 'item' ? 'item_translations' : 'category_translations';
const buttonClass = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50';
const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary';

function makeQueueRow(row: TranslationRow | null, source: CanonicalTranslationSource): QueueRow {
  if (!row) return { row, source, issues: ['Bengali translation is missing.'], missing: true, outdated: false };
  const outdated = row.source_version
    ? row.source_version !== source.sourceVersion
    : row.review_status === 'published' && Boolean(row.evidence_snapshot && !matchesTranslationEvidence(row.evidence_snapshot, source));
  const issues = [...validateCatalogTranslation(source, row).issues];
  if (row.kind === 'item' && row.details && Object.keys(row.details).length > 0) {
    issues.push('Localized product details are outside the catalog translation workflow. Clear them before publishing.');
  }
  if (outdated) issues.unshift('English source changed since this translation was generated.');
  if (row.review_status === 'published') return { row, source, issues, missing: false, outdated };
  return { row, source, issues, missing: false, outdated };
}

export function TranslationsPage() {
  const { tenantId, user } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<TranslationKind>('item');
  const [queue, setQueue] = useState<Queue>('attention');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const autoRun = useRef(false);
  const canManage = Boolean(user && user.tenantId === tenantId && ['admin', 'manager'].includes(user.role));

  const catalogQuery = useQuery<CanonicalTranslationSource[]>({
    queryKey: ['translation-catalog', kind, tenantId], enabled: Boolean(tenantId && canManage),
    queryFn: async () => {
      const fields = kind === 'item' ? 'id, tenant_id, name, description, sku, barcode, brand' : 'id, tenant_id, name';
      const { data, error } = await client.from(kind === 'item' ? 'items' : 'categories').select(fields)
        .eq('tenant_id', tenantId).eq(kind === 'item' ? 'is_active' : 'active', true).order('name');
      if (error) throw error;
      const raw = (data ?? []) as unknown as CatalogRow[];
      return Promise.all(raw.map(async (record) => {
        const source = { id: record.id, name: record.name, description: kind === 'item' ? record.description ?? null : null,
          sku: record.sku ?? null, barcode: record.barcode ?? null, brand: record.brand ?? null };
        return { ...source, tenantId: record.tenant_id, sourceVersion: await catalogSourceVersion(source),
          packageText: kind === 'item' ? getCanonicalPackageText(record.name, record.description ?? null) : null };
      }));
    },
  });
  const translationsQuery = useQuery<TranslationRow[]>({
    queryKey: ['translations', kind, tenantId], enabled: Boolean(tenantId && canManage),
    queryFn: async () => {
      const { data, error } = await client.from(tableFor(kind))
        .select(`id, ${kind}_id, tenant_id, locale, name, description, search_terms, review_status, source_version, evidence_snapshot, reviewed_by, reviewed_at, published_by, published_at, updated_at, ${kind === 'item' ? 'details' : 'seo_title, seo_description'}`)
        .eq('tenant_id', tenantId).eq('locale', 'bn').order('updated_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({ ...row, kind })) as unknown as TranslationRow[];
    },
  });
  const auditQuery = useQuery<TranslationReviewAuditRow[]>({
    queryKey: ['translation-review-audit', tenantId, historyId], enabled: Boolean(canManage && tenantId && historyId),
    queryFn: async () => {
      const { data, error } = await client.from('translation_review_audit')
        .select('id, translation_kind, translation_id, entity_id, from_status, to_status, action, actor_id, content_fingerprint, evidence_source_uris, created_at')
        .eq('tenant_id', tenantId).eq('translation_id', historyId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TranslationReviewAuditRow[];
    },
  });
  const sources = useMemo(() => new Map((catalogQuery.data ?? []).map((row) => [row.id, row])), [catalogQuery.data]);
  const rows = useMemo(() => {
    const translations = new Map((translationsQuery.data ?? []).map((row) => [row.kind === 'item' ? row.item_id : row.category_id, row]));
    return [...sources.values()].map((source) => makeQueueRow(translations.get(source.id) ?? null, source));
  }, [sources, translationsQuery.data]);
  const eligibleIds = useMemo(() => rows.filter(({ row, outdated }) => !row || outdated)
    .map(({ source }) => source.id), [rows]);

  // Missing translations and drafts tied to an older canonical source are generated in bounded, tenant-scoped batches.
  useEffect(() => {
    if (autoRun.current || !canManage || !catalogQuery.isSuccess || !translationsQuery.isSuccess || !eligibleIds.length) return;
    autoRun.current = true;
    let cancelled = false;
    void (async () => {
      setGenerating(true);
      let generated = 0;
      let failed = 0;
      for (let offset = 0; offset < eligibleIds.length && !cancelled; offset += 10) {
        const itemIds = eligibleIds.slice(offset, offset + 10);
        try {
          const { data, error } = await supabase.functions.invoke('generate-bengali-translation-drafts', { body: { kind, limit: itemIds.length, ...(kind === 'item' ? { itemIds } : {}) } });
          if (error) { failed += itemIds.length; continue; }
          generated += Number.isInteger(data?.generated) ? data.generated : 0;
          failed += Number.isInteger(data?.failed) ? data.failed : itemIds.length;
        } catch { failed += itemIds.length; }
      }
      if (!cancelled) {
        await queryClient.invalidateQueries({ queryKey: ['translations', kind, tenantId] });
        setGenerating(false);
        if (generated || failed) notify(`${generated} translation${generated === 1 ? '' : 's'} generated or refreshed; ${failed} need attention.`, failed ? 'error' : 'success');
      }
    })();
    return () => { cancelled = true; };
  }, [canManage, catalogQuery.isSuccess, translationsQuery.isSuccess, eligibleIds, kind, tenantId, queryClient, notify]);

  const publishMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length || !user || !tenantId) throw new Error('There are no approved translations ready to publish.');
      const { data, error } = await client.rpc('publish_bengali_translations', { p_kind: kind, p_translation_ids: ids });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['translations', kind, tenantId] });
      setQueue('published');
      notify('Approved Bengali translations published.', 'success');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });
  const saveMutation = useMutation({
    mutationFn: async ({ item, name, description }: { item: QueueRow; name: string; description: string }) => {
      const row = item.row;
      if (row?.review_status === 'published' && !item.outdated && !item.issues.length) throw new Error('Published translations cannot be edited here.');
      const updated = (row ? { ...row, name, description: description.trim() || null, source_version: item.source.sourceVersion } : {
        id: '', tenant_id: tenantId!, locale: 'bn' as const, name, description: description.trim() || null,
        search_terms: [item.source.name], review_status: 'draft' as const, evidence_snapshot: null,
        reviewed_by: null, reviewed_at: null, published_by: null, published_at: null, updated_at: '', source_version: item.source.sourceVersion,
        ...(kind === 'item' ? { kind: 'item' as const, item_id: item.source.id, details: null } : { kind: 'category' as const, category_id: item.source.id, seo_title: null, seo_description: null }),
      }) as TranslationRow;
      const validation = validateCatalogTranslation(item.source, updated);
      if (!validation.valid) throw new Error(validation.issues.join(' '));
      const query = row
        ? client.from(tableFor(kind)).update({ name: updated.name, description: updated.description,
          ...(kind === 'item' ? { details: null } : {}),
          source_version: item.source.sourceVersion, review_status: 'draft', reviewed_by: null, reviewed_at: null,
          published_by: null, published_at: null })
          .eq('id', row.id).eq('tenant_id', tenantId).eq('updated_at', row.updated_at).eq('review_status', row.review_status)
        : client.from(tableFor(kind)).insert({ ...(kind === 'item' ? { item_id: item.source.id, details: null } : { category_id: item.source.id, seo_title: null, seo_description: null }),
          tenant_id: tenantId, locale: 'bn', name: updated.name, description: updated.description, search_terms: updated.search_terms, review_status: 'draft', source_version: item.source.sourceVersion });
      const { data, error } = await query.select('id').single();
      if (error) throw error;
      if (!data) throw new Error('Translation changed; reload before saving.');
    },
    onSuccess: async () => {
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['translations', kind, tenantId] });
      notify('Translation saved and validated against the current English source.', 'success');
    },
    onError: (error: Error) => notify(error.message, 'error'),
  });

  if (!canManage) return <div className="p-6 text-text-muted">Translation publishing is restricted to administrators and managers.</div>;
  const visibleRows = rows.filter((item) => {
    const status = item.row?.review_status;
    const belongs = queue === 'published' ? status === 'published' && item.issues.length === 0 : queue === 'ready'
      ? Boolean(item.row && status !== 'published' && item.issues.length === 0)
      : !item.row || item.issues.length > 0;
    if (!belongs) return false;
    if (!search.trim()) return true;
    return `${item.source.name} ${item.source.brand ?? ''} ${item.source.sku ?? ''} ${item.row?.name ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  });
  const readyIds = visibleRows.filter(({ row, issues }) => row && row.review_status !== 'published' && issues.length === 0)
    .slice(0, 500).map(({ row }) => row!.id);
  const attentionCount = rows.filter(({ row, issues }) => !row || row.review_status !== 'published' && issues.length > 0).length;
  const readyCount = readyIds.length;
  const publishedCount = rows.filter(({ row, issues }) => row?.review_status === 'published' && issues.length === 0).length;

  return <div className="p-4 md:p-6">
    <PageHeader title="Bengali translations" subtitle="Review English and Bengali together; publish only translations that pass the catalog checks." />
    <div className="mb-4 flex flex-wrap gap-2" aria-label="Translation type">
      {(['item', 'category'] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value}
        onClick={() => { autoRun.current = false; setKind(value); setEditingId(null); }} className={`${buttonClass} ${kind === value ? 'bg-primary text-primary-on' : 'bg-surface text-text-muted'}`}>
        {value === 'item' ? 'Products' : 'Categories'}
      </button>)}
    </div>
    <div className="mb-4 flex flex-wrap gap-2" aria-label="Translation queues">
      {([['attention', 'Needs Attention', attentionCount], ['ready', 'Ready to Publish', readyCount], ['published', 'Published', publishedCount]] as const).map(([value, label, count]) =>
        <button key={value} type="button" aria-pressed={queue === value} onClick={() => { setQueue(value); setEditingId(null); }}
          className={`${buttonClass} ${queue === value ? 'bg-primary text-primary-on' : 'bg-surface text-text-muted'}`}>{label} ({count})</button>)}
    </div>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <label className="block max-w-xl flex-1 space-y-1 text-sm font-semibold">Search products and translations
        <input aria-label="Search translations" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by English name, brand, SKU or Bengali name" className={inputClass} />
      </label>
      {queue === 'ready' && readyIds.length > 0 && <button type="button" className={`${buttonClass} bg-primary text-primary-on`}
        disabled={publishMutation.isPending || Boolean(editingId)} onClick={() => publishMutation.mutate(readyIds)}>
        {publishMutation.isPending ? 'Publishing…' : `Publish Approved Translations (${readyIds.length})`}
      </button>}
    </div>
    {generating && <p role="status" className="mb-3 text-sm text-text-muted">Generating missing or outdated translations from the English catalog…</p>}
    {(catalogQuery.isError || translationsQuery.isError) && <div role="alert" className="mb-3 text-danger">Could not load the canonical catalog or translations. Retry before publishing.</div>}
    <Card padding="none">
      <div className="flex items-center gap-2 border-b border-border p-4"><Languages size={18} /><h2 className="font-semibold">{queue === 'attention' ? 'Needs Attention' : queue === 'ready' ? 'Ready to Publish' : 'Published'}</h2></div>
      {(catalogQuery.isLoading || translationsQuery.isLoading) && <p role="status" className="p-4 text-text-muted">Loading translations…</p>}
      <div className="divide-y divide-border">
        {visibleRows.map((item) => <article key={item.row?.id ?? `missing:${item.source.id}`} className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{item.source.name}</h3>
              <p className="text-xs text-text-muted">{[item.source.brand, item.source.sku, item.source.packageText].filter(Boolean).join(' · ') || 'Catalog product'}</p></div>
            <span className="rounded-full border border-border px-2 py-1 text-xs capitalize">{item.row?.review_status ?? 'missing'}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <section className="rounded-lg border border-border p-3"><h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">English source</h4><p className="whitespace-pre-wrap text-sm">{item.source.name}</p><p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">{item.source.description?.trim() || 'Description is empty'}</p></section>
            <section className="rounded-lg border border-border p-3"><h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Bengali translation</h4>{editingId === (item.row?.id ?? `new:${item.source.id}`) ? <div className="space-y-2">
              <input aria-label={`Bengali name for ${item.source.name}`} lang="bn" value={editName} onChange={(event) => setEditName(event.target.value)} className={inputClass} />
              <textarea aria-label={`Bengali description for ${item.source.name}`} lang="bn" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className={inputClass} rows={3} />
              <div className="flex gap-2"><button type="button" className={buttonClass} disabled={saveMutation.isPending} onClick={() => saveMutation.mutate({ item, name: editName, description: editDescription })}>Save correction</button><button type="button" className={buttonClass} onClick={() => setEditingId(null)}>Cancel</button></div>
            </div> : <><p lang="bn" className="whitespace-pre-wrap text-sm">{item.row?.name || 'Translation not generated'}</p><p lang="bn" className="mt-2 whitespace-pre-wrap text-sm text-text-muted">{item.row?.description || 'Description is empty'}</p></>}</section>
          </div>
          {item.issues.length > 0 && <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm"><h4 className="font-semibold">Exceptions</h4><ul className="list-disc pl-5">{item.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
            {(item.row?.review_status !== 'published' || item.issues.length > 0) && editingId !== (item.row?.id ?? `new:${item.source.id}`) && <button type="button" className={`${buttonClass} mt-2`} onClick={() => { setEditingId(item.row?.id ?? `new:${item.source.id}`); setEditName(item.row?.name ?? ''); setEditDescription(item.row?.description ?? ''); }}>{item.row ? 'Correct translation' : 'Enter Bengali translation'}</button>}
          </div>}
          {item.row && <div>
            <button type="button" className="text-sm text-text-link underline" onClick={() => setHistoryId(historyId === item.row!.id ? null : item.row!.id)}>
              {historyId === item.row.id ? 'Hide audit history' : 'Audit history'}
            </button>
            {historyId === item.row.id && <div className="mt-2 space-y-2 rounded-lg border border-border p-3 text-sm">
              {auditQuery.isLoading && <p role="status">Loading audit history…</p>}
              {auditQuery.isError && <p role="alert">Could not load audit history.</p>}
              {!auditQuery.isLoading && !auditQuery.isError && !auditQuery.data?.length && <p className="text-text-muted">No workflow actions recorded yet.</p>}
              {auditQuery.data?.map((event) => <p key={event.id}>{event.action.replace('_', ' ')} · {event.from_status ?? 'new'} → {event.to_status ?? 'deleted'} · {event.created_at} · Actor {event.actor_id ?? 'system'}</p>)}
            </div>}
          </div>}
          {item.row?.review_status === 'published' && <p className="text-xs text-text-muted">Published by {item.row.published_by ?? 'recorded reviewer'} · {item.row.published_at ?? 'timestamp unavailable'}</p>}
        </article>)}
        {!catalogQuery.isLoading && !translationsQuery.isLoading && !visibleRows.length && <p className="p-4 text-text-muted">No translations in this queue.</p>}
      </div>
    </Card>
  </div>;
}
