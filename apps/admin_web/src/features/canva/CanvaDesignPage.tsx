import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Product = { id: string; name: string; price: number | null; image_url: string | null };
type Template = { id: string; name: string; expected_dataset_schema: Record<string, unknown> };
type Run = { id: string; status: string; assets?: { asset_id?: string }[]; products?: unknown[]; design_id?: string; error_code?: string };
async function request(path: string, body?: unknown) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sign in to create a Canva design.');
  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/canva-connect${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', credentials: 'omit',
  });
  if (!r.ok) throw new Error('Unable to process this design. Check your connection, template and store products.');
  return r.json();
}
export function CanvaDesignPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [template, setTemplate] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [productQuery, setProductQuery] = useState('');
  async function load() {
    const [p,t,r] = await Promise.all([request(`/products?q=${encodeURIComponent(productQuery)}&limit=100`), request('/templates'), request('/designs')]);
    setProducts(p.products); setTemplates(t.templates); setRuns(r.runs);
  }
  useEffect(() => {
    let active = true;
    void Promise.all([request(`/products?q=${encodeURIComponent(productQuery)}&limit=100`), request('/templates'), request('/designs')]).then(([p,t,r]) => {
      if (active) { setProducts(p.products); setTemplates(t.templates); setRuns(r.runs); }
    }).catch(() => { if (active) setError('Unable to load Canva design workspace.'); });
    return () => { active = false; };
  }, [productQuery]);
  async function perform(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await action(); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to process design.'); }
    finally { setBusy(false); }
  }
  const requiredCount = Object.keys(templates.find(t => t.id === template)?.expected_dataset_schema ?? {}).length / 3;
  async function processRun(id: string) {
    // Each step is saved server-side; a reload can resume a known provider job.
    for (let step = 0; step < 30; step++) {
      const result = await request(`/designs/${id}/advance`, {});
      await load();
      if (['design_ready','failed'].includes(result.run?.status) ||
        ['terminal','busy'].includes(result.run?.result)) return;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  return <main className="p-6 space-y-4">
    <h1>Canva product designs</h1>
    <a href="/canva-connect">Manage Canva connection</a>
    <p>Select products in slot order. Names, prices and images come from your store catalog.</p>
    {error && <p role="alert">{error}</p>}
    <label>Search products <input value={productQuery} onChange={e => setProductQuery(e.target.value)} placeholder="Search catalog" /></label>
    <label>Approved template <select disabled={busy} value={template} onChange={e => {
      setTemplate(e.target.value); setSelected([]); setRequestId(crypto.randomUUID());
    }}><option value="">Choose a template</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    {Array.from({ length: requiredCount }, (_, i) => <label key={i} className="block">Product {i + 1} <select
      disabled={busy} value={selected[i] ?? ''} onChange={e => {
        const next = [...selected]; next[i] = e.target.value; setSelected(next); setRequestId(crypto.randomUUID());
      }}><option value="">Choose a product</option>{products.filter(p => p.image_url && p.price !== null)
        .map(p => <option key={p.id} value={p.id}>{p.name} — ৳{p.price}</option>)}</select></label>)}
    <button disabled={busy || !template || selected.filter(Boolean).length !== requiredCount || new Set(selected).size !== requiredCount}
      onClick={() => void perform(async () => { await request('/designs', {
        request_id: requestId, template_id: template, item_ids: selected,
      }); setRequestId(crypto.randomUUID()); })}>Create design</button>
    <p>Continue processing resumes saved jobs. Designs stop when ready; nothing is exported or published.</p>
    {runs.map(r => <section key={r.id} data-testid={`run-${r.id}`} className="border p-3">
      <div role="status" aria-live="polite" aria-atomic="true">
        <p>{r.status}{r.error_code ? ` — ${r.error_code}` : ''}</p>
        <p>{r.assets?.filter(a => a.asset_id).length ?? 0} of {r.products?.length ?? 0} images uploaded</p>
        {r.design_id && <p>Saved Canva design: {r.design_id}</p>}
      </div>
      {!['design_ready','failed'].includes(r.status) && <button disabled={busy}
        onClick={() => void perform(() => processRun(r.id))}>Continue processing</button>}
    </section>)}
  </main>;
}
