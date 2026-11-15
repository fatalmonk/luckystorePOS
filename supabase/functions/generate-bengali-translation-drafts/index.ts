import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { allowedOrigin, bengaliNameRetrySources, boundedGenerationLimit, canGenerate, parseBatch, validRequest, type Source } from './validation.ts';

// One pinned free model. No alternate provider or paid fallback.
import { classifyProviderOutput, decodeSuccessfulProviderResponse, providerConfig, providerRequest } from './provider.ts';
import { registrySnapshot, resolveRegistryEvidence } from '../_shared/translation-registry-evidence.ts';
import { evidenceFallbackDraft } from './evidenceFallback.ts';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (request) => {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
  if (origin && allowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const respond = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
  if (!allowedOrigin(origin)) return respond(403, { error: 'Origin not allowed' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' });
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return respond(401, { error: 'Authentication required' });
  let body: unknown;
  try { body = await request.json(); } catch { return respond(400, { error: 'Invalid JSON request' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return respond(400, { error: 'Invalid request' });
  const { kind, limit, itemIds, itemId } = body as Record<string, unknown>;
  if (kind === 'evidence' ? (typeof itemId !== 'string' || !uuid.test(itemId) || itemIds !== undefined || limit !== undefined) : (!validRequest(kind, limit) || itemId !== undefined)) {
    return respond(400, { error: 'Invalid evidence lookup or generation request' });
  }
  // Targeted regeneration is scoped to the requesting tenant, never arbitrary IDs.
  const requestedIds = itemIds === undefined ? null : itemIds;
  if (requestedIds !== null && (kind !== 'item' || !Array.isArray(requestedIds)
    || requestedIds.length < 1 || requestedIds.length > 10
    || requestedIds.some(id => typeof id !== 'string' || !uuid.test(id))
    || new Set(requestedIds).size !== requestedIds.length)) {
    return respond(400, { error: 'itemIds must contain 1–10 unique product UUIDs' });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return respond(503, { error: 'Database configuration unavailable' });
  const db = createClient(url, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await db.auth.getUser(auth.slice(7));
  if (authError || !authData.user) return respond(401, { error: 'Invalid session' });
  const { data: profile, error: profileError } = await db.from('users').select('id, tenant_id, role').eq('auth_id', authData.user.id).single();
  if (profileError || !profile || !uuid.test(profile.tenant_id) || !canGenerate(profile.role, profile.tenant_id, profile.tenant_id)) return respond(403, { error: 'Manager access required' });
  if (kind === 'evidence') {
    const { data: item, error } = await db.from('items').select('id, tenant_id, name, description, sku, barcode, brand')
      .eq('id', itemId).eq('tenant_id', profile.tenant_id).single();
    if (error || !item || item.tenant_id !== profile.tenant_id) return respond(404, { error: 'Product not found' });
    const source = { ...item, packageText: item.name.match(/\b\d+(?:\.\d+)?\s*(?:kg|gm|g|ml|l|pcs?|pieces?|grams?|litres?|liters?)\b/i)?.[0]
      ?? item.description?.match(/\b\d+(?:\.\d+)?\s*(?:kg|gm|g|ml|l|pcs?|pieces?|grams?|litres?|liters?)\b/i)?.[0] ?? null };
    return respond(200, { evidence: resolveRegistryEvidence(source), snapshot: registrySnapshot(source) });
  }
  const config = providerConfig(Deno.env.get('OPENROUTER_API_KEY'));
  const batchLimit = boundedGenerationLimit(limit as number);
  // A narrowly scoped, verified-source fallback can work even when the free provider is unavailable.
  const table = kind === 'item' ? 'item_translations' : 'category_translations';
  const catalog = kind === 'item' ? 'items' : 'categories';
  const foreignKey = kind === 'item' ? 'item_id' : 'category_id';
  const fields: string = kind === 'item' ? 'id, tenant_id, name, description, brand, sku' : 'id, tenant_id, name, description';
  const candidates: Array<Source & { previous?: { id: string; updated_at: string } }> = [];
  let skipped = 0;
  try {
    // Bounded scan avoids one request consuming unlimited database and provider resources.
    for (let offset = 0; offset < 10000 && candidates.length < batchLimit; offset += 50) {
      let query = db.from(catalog).select(fields)
        .eq('tenant_id', profile.tenant_id).eq(kind === 'item' ? 'is_active' : 'active', true);
      if (requestedIds) query = query.in('id', requestedIds as string[]);
      const { data: records, error } = await query.order('id').range(offset, offset + 49);
      if (error) return respond(502, { error: 'Could not read catalog' });
      if (!records?.length) break;
      const catalogRows = records as unknown as Array<Source & { tenant_id: string }>;
      const ids = catalogRows.map((record) => record.id);
      const { data: existing, error: existingError } = await db.from(table).select(`${foreignKey}, id, description, review_status, updated_at`).eq('tenant_id', profile.tenant_id).eq('locale', 'bn').in(foreignKey, ids);
      if (existingError) return respond(502, { error: 'Could not read existing translations' });
      const translations = new Map((existing ?? []).map((row) => [row[foreignKey], row]));
      for (const record of catalogRows) {
        if (!canGenerate(profile.role, profile.tenant_id, record.tenant_id) || !uuid.test(record.id)
          || typeof record.name !== 'string' || !record.name.trim()
          || (record.description !== null && typeof record.description !== 'string')) return respond(502, { error: 'Invalid catalog source' });
        const previous = translations.get(record.id);
        if (previous && (previous.review_status !== 'draft' || previous.description)) { skipped++; continue; }
        const resolved = kind === 'item' ? resolveRegistryEvidence(record) : null;
        const evidenceDescription = resolved?.matched ? resolved.supportedFacts : null;
        // Existing empty drafts are enhanced only if exact registry-backed facts exist.
        if (previous && !evidenceDescription && !record.description) { skipped++; continue; }
        if (candidates.length < batchLimit) candidates.push({
          id: record.id, name: record.name, description: record.description, sku: kind === 'item' ? record.sku : null,
          brand: kind === 'item' ? record.brand : null, evidenceDescription,
          ...(previous ? { previous: { id: previous.id, updated_at: previous.updated_at } } : {}),
        });
      }
      if (records.length < 50) break;
    }
    if (!candidates.length) return respond(200, { generated: 0, skipped, failed: 0 });
    let results: ReturnType<typeof parseBatch> = new Map();
    // Exact manufacturer templates are the only permissible evidence-only claims.
    // Never treat arbitrary generated prose as verified manufacturer copy.
    const vettedDescriptions = new Map<string, string>();
    for (const source of candidates) {
      if (!source.description?.trim() && source.evidenceDescription?.trim()) {
        const template = evidenceFallbackDraft(source)?.description;
        if (template) vettedDescriptions.set(source.id, template);
      }
    }
    let providerUnavailable = !config;
    let providerOutcome = config ? 'unknown' : 'missing_api_key';
    let nameRepairAttempted = 0;
    let nameRepairRecovered = 0;
    if (config) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);
      try {
        const provider = await fetch(config.url, {
          method: 'POST', signal: controller.signal,
          headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(providerRequest(candidates)),
        });
        if (provider.ok) {
          const decoded = await decodeSuccessfulProviderResponse(provider);
          if (!decoded.ok) {
            providerUnavailable = true;
            providerOutcome = 'upstream_invalid_response';
          } else {
            const choice = decoded.body.choices?.[0];
            const content: unknown = choice?.message?.content;
            if (typeof content === 'string' && content.trim() && content.length <= 30000) {
              results = parseBatch(content, candidates, vettedDescriptions);
              providerOutcome = classifyProviderOutput(results, choice?.finish_reason);
              const nameRetry = bengaliNameRetrySources(candidates, results);
              if (nameRetry.length && !controller.signal.aborted) {
                nameRepairAttempted = nameRetry.length;
                // Second attempt is strictly limited to rows missing Bengali letters.
                // Use the same single free model, abort signal, and overall deadline.
                try {
                  const retryResponse = await fetch(config.url, {
                    method: 'POST', signal: controller.signal,
                    headers: { Authorization: 'Bearer ' + config.key, 'Content-Type': 'application/json' },
                    body: JSON.stringify(providerRequest(nameRetry, { repairBengaliNames: true })),
                  });
                  if (retryResponse.ok) {
                    const retryBody = await decodeSuccessfulProviderResponse(retryResponse);
                    const retryText = retryBody.ok ? retryBody.body.choices?.[0]?.message?.content : null;
                    if (typeof retryText === 'string' && retryText.trim() && retryText.length <= 30000) {
                      const repair = parseBatch(retryText, nameRetry, vettedDescriptions);
                      for (const source of nameRetry) {
                        const updated = repair.get(source.id);
                        if (updated?.draft) {
                          results.set(source.id, updated);
                          nameRepairRecovered++;
                        }
                      }
                      if (nameRepairRecovered) providerOutcome = 'valid_output';
                    }
                  }
                } catch {
                  // Preserve the original validation result; never save an unverified repair.
                }
              }
            } else {
              providerUnavailable = true;
              providerOutcome = choice?.finish_reason === 'length'
                ? 'output_truncated' : 'empty_or_invalid_content';
            }
          }
        } else {
          providerUnavailable = true;
          providerOutcome = `upstream_http_${provider.status}`;
          let code = 'unknown';
          try {
            const failure = await provider.json();
            if (typeof failure?.error?.code === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(failure.error.code)) code = failure.error.code;
          } catch { /* Never include raw upstream bodies in logs. */ }
          console.error(JSON.stringify({ event: 'translation_provider_error', provider: 'openrouter', status: provider.status, code }));
        }
      } catch {
        providerUnavailable = true;
        providerOutcome = 'upstream_network_or_timeout';
      } finally { clearTimeout(timeout); }
    }
    let generated = 0;
    let fallbackGenerated = 0;
    const failures: Array<{ id: string; reason: string }> = [];
    for (const source of candidates) {
      const modelResult = results.get(source.id);
      // A name-only response must not masquerade as a completed description.
      const needsDescription = Boolean(source.description?.trim() || source.evidenceDescription?.trim());
      const incompleteModelDraft = Boolean(modelResult?.draft && needsDescription && !modelResult.draft.description);
      const fallback = (!modelResult?.draft || incompleteModelDraft) ? evidenceFallbackDraft(source) : null;
      const draft = fallback ?? (incompleteModelDraft ? null : modelResult?.draft);
      if (!draft) {
        failures.push({ id: source.id, reason: modelResult?.error
          ?? (incompleteModelDraft ? 'Model returned an empty description despite available facts'
            : 'AI unavailable and no linked manufacturer facts for this item') });
        continue;
      }
      if (source.previous) {
        // Keep existing translated names, reviewer decisions and aliases untouched.
        const { data, error } = await db.from(table).update({ description: draft.description })
          .eq('id', source.previous.id).eq('tenant_id', profile.tenant_id)
          .eq('review_status', 'draft').eq('updated_at', source.previous.updated_at)
          .or('description.is.null,description.eq.').select('id').maybeSingle();
        if (error || !data) failures.push({ id: source.id, reason: 'Draft was changed or could not be updated' });
        else { generated++; if (fallback) fallbackGenerated++; }
        continue;
      }
      const { error } = await db.from(table).insert({
        [foreignKey]: source.id, tenant_id: profile.tenant_id, locale: 'bn', name: draft.name,
        description: draft.description, search_terms: draft.search_terms,
        review_status: 'draft', evidence_snapshot: null, reviewed_by: null, reviewed_at: null, published_by: null, published_at: null,
      });
      if (error) {
        if (error.code === '23505') skipped++;
        else failures.push({ id: source.id, reason: 'Draft could not be saved' });
      } else { generated++; if (fallback) fallbackGenerated++; }
    }
    // Safe structured diagnostics: never log generated text, tokens, names or source details.
    console.info(JSON.stringify({ event: 'translation_generation_summary', model: 'nvidia/nemotron-3.5-super-vl:free',
      providerOutcome, candidates: candidates.length, nameRepairAttempted,
      nameRepairRecovered, generated, failed: failures.length, skipped }));
    if (providerUnavailable && generated === 0) return respond(503, {
      error: providerOutcome === 'missing_api_key' ? 'OpenRouter API key not configured'
        : `Free AI provider unavailable (${providerOutcome})`,
      generated, skipped, failed: failures.length, failures: failures.slice(0, 10),
    });
    return respond(200, { generated, skipped, failed: failures.length, fallbackGenerated,
      providerOutcome, failures: failures.slice(0, 10) });
  } catch { return respond(502, { error: 'Draft generation failed' }); }
});
