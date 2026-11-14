import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { allowedOrigin, canGenerate, parseBatch, validRequest, type Source } from './validation.ts';

// Fixed low-cost providers only. Credentials remain server-side Supabase secrets.
const openAiModel = 'gpt-4o-mini';
const openRouterModel = 'google/gemini-2.5-flash';
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
  const { kind, limit } = body as Record<string, unknown>;
  if (!validRequest(kind, limit)) {
    return respond(400, { error: 'kind and limit (1–10) are required' });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return respond(503, { error: 'Database configuration unavailable' });
  const db = createClient(url, anonKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await db.auth.getUser(auth.slice(7));
  if (authError || !authData.user) return respond(401, { error: 'Invalid session' });
  const { data: profile, error: profileError } = await db.from('users').select('id, tenant_id, role').eq('auth_id', authData.user.id).single();
  if (profileError || !profile || !uuid.test(profile.tenant_id) || !canGenerate(profile.role, profile.tenant_id, profile.tenant_id)) return respond(403, { error: 'Manager access required' });
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
  const key = openAiKey || openRouterKey;
  const providerUrl = openAiKey ? 'https://api.openai.com/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
  const model = openAiKey ? openAiModel : openRouterModel;
  if (!key) return respond(503, { error: 'AI provider unavailable' });
  const table = kind === 'item' ? 'item_translations' : 'category_translations';
  const catalog = kind === 'item' ? 'items' : 'categories';
  const foreignKey = kind === 'item' ? 'item_id' : 'category_id';
  const fields: string = kind === 'item' ? 'id, tenant_id, name, description, brand' : 'id, tenant_id, name, description';
  const candidates: Source[] = [];
  let skipped = 0;
  try {
    // Bounded scan avoids one request consuming unlimited database and provider resources.
    for (let offset = 0; offset < 10000 && candidates.length < (limit as number); offset += 50) {
      const { data: records, error } = await db.from(catalog).select(fields)
        .eq('tenant_id', profile.tenant_id).eq(kind === 'item' ? 'is_active' : 'active', true).order('id').range(offset, offset + 49);
      if (error) return respond(502, { error: 'Could not read catalog' });
      if (!records?.length) break;
      const catalogRows = records as unknown as Array<Source & { tenant_id: string }>;
      const ids = catalogRows.map((record) => record.id);
      const { data: existing, error: existingError } = await db.from(table).select(foreignKey).eq('tenant_id', profile.tenant_id).eq('locale', 'bn').in(foreignKey, ids);
      if (existingError) return respond(502, { error: 'Could not read existing translations' });
      const translated = new Set((existing ?? []).map((row) => row[foreignKey]));
      for (const record of catalogRows) {
        if (!canGenerate(profile.role, profile.tenant_id, record.tenant_id) || !uuid.test(record.id)
          || typeof record.name !== 'string' || !record.name.trim()
          || (record.description !== null && typeof record.description !== 'string')) return respond(502, { error: 'Invalid catalog source' });
        if (translated.has(record.id)) { skipped++; continue; }
        if (candidates.length < (limit as number)) candidates.push({ id: record.id, name: record.name, description: record.description, brand: kind === 'item' ? record.brand : null });
      }
      if (records.length < 50) break;
    }
    if (!candidates.length) return respond(200, { generated: 0, skipped, failed: 0 });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let provider: Response;
    try {
      provider = await fetch(providerUrl, {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0, max_tokens: 3000, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: 'Translate only canonical product/category name and description into Bengali. Return JSON {"translations":[{"id":"...","name":"...","description":null or "...","search_terms":["..."]}]}. Exactly one row for each input id. Preserve Latin brand, variant, all numeric tokens, weights and units verbatim. Do not add claims, sizes, ingredients, or attributes. If source description is null return null. Search terms must include the canonical English name. No markdown.' },
          { role: 'user', content: JSON.stringify(candidates) },
        ] }),
      });
    } catch { return respond(503, { error: 'AI provider unavailable' }); }
    finally { clearTimeout(timeout); }
    if (!provider.ok) return respond(503, { error: 'AI provider unavailable' });
    let content: unknown;
    try { content = (await provider.json()).choices?.[0]?.message?.content; } catch { return respond(502, { error: 'Invalid AI provider response' }); }
    if (typeof content !== 'string' || content.length > 30000) return respond(502, { error: 'Invalid AI provider response' });
    const results = parseBatch(content, candidates);
    let generated = 0;
    const failures: Array<{ id: string; reason: string }> = [];
    for (const source of candidates) {
      const result = results.get(source.id);
      if (!result?.draft) { failures.push({ id: source.id, reason: result?.error ?? 'Invalid model row' }); continue; }
      const { error } = await db.from(table).insert({
        [foreignKey]: source.id, tenant_id: profile.tenant_id, locale: 'bn', name: result.draft.name,
        description: result.draft.description, search_terms: result.draft.search_terms,
        review_status: 'draft', evidence_snapshot: null, reviewed_by: null, reviewed_at: null, published_by: null, published_at: null,
      });
      if (error) {
        if (error.code === '23505') skipped++;
        else failures.push({ id: source.id, reason: 'Draft could not be saved' });
      } else generated++;
    }
    return respond(200, { generated, skipped, failed: failures.length, failures: failures.slice(0, 10) });
  } catch { return respond(502, { error: 'Draft generation failed' }); }
});
