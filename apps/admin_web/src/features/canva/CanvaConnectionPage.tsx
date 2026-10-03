import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Connection = { status: string; canvaUserId: string | null; canvaTeamId: string | null };
const labels: Record<string, string> = {
  connected_ready: 'Connected and ready',
  connected_missing_autofill: 'Connected; Canva autofill is unavailable',
  connected_missing_brand_template: 'Connected; Canva brand templates are unavailable',
  reauthorization_required: 'Connect again to authorize Canva',
  revoked: 'Disconnected',
};

async function request(path: string, method = 'GET'): Promise<Record<string, unknown>> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sign in to manage your Canva connection.');
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/canva-connect/oauth${path}`, {
    method, headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
  });
  const body = await response.clone().json().catch(() => ({})) as { code?: unknown };
  if (!response.ok) throw new Error(response.status === 403 && body.code === 'CANVA_SCOPE_DENIED' ?
    'An owner, manager or admin account assigned to a store is required.' :
    'Unable to complete the Canva connection. Connect again to retry.');
  return response.json();
}

// OAuth callback relay: uses the current RetailOS session, never provider tokens.
// Query parameters are removed before any network request; they are not persisted.
export function CanvaConnectionPage() {
  const callback = useRef(window.location.pathname === '/canva-connect/callback' ? window.location.search : null);
  const started = useRef(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const query = callback.current;
    callback.current = null;
    if (query !== null) window.history.replaceState(null, '', '/canva-connect/callback');
    void (async () => {
      try {
        if (query !== null) {
          // Forward only protocol fields. Provider descriptions never reach UI.
          const input = new URLSearchParams(query);
          const params = new URLSearchParams();
          for (const field of ['state','code','error']) {
            for (const value of input.getAll(field)) params.append(field,value);
          }
          setConnection(await request(`/callback?${params}`) as Connection);
        } else {
          const result = await request(''); setConnection(result.connection as Connection | null);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to connect Canva.');
      } finally { setBusy(false); }
    })();
  }, []);

  async function connect() {
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await request('/start');
      const url = new URL(String(result.authorizationUrl));
      if (url.origin !== 'https://www.canva.com' || url.pathname !== '/api/oauth/authorize') throw new Error('Invalid Canva authorization response.');
      window.location.assign(url.toString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to connect Canva.'); setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true); setError(null);
    try {
      const result = await request('', 'DELETE'); setConnection({ status: 'revoked', canvaUserId: null, canvaTeamId: null });
      setNotice(result.providerRevoked ? 'Canva disconnected.' :
        'Disconnected locally. Canva could not confirm revocation; remove access in Canva account settings.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to disconnect Canva.'); }
    finally { setBusy(false); }
  }
  return (
    <main className="p-6 space-y-4">
      <h1>Canva connection</h1>
      <a href="/canva-designs">Create a product design</a>
      <p role="status" aria-live="polite">{busy ? 'Checking Canva connection…' : connection ? labels[connection.status] ?? 'Connection unavailable' : 'Canva is not connected'}</p>
      {connection?.canvaTeamId && <p>Canva team: {connection.canvaTeamId}</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={() => void connect()}>{connection && connection.status !== 'revoked' ? 'Reconnect Canva' : 'Connect Canva'}</button>
        {connection && connection.status !== 'revoked' && <button type="button" disabled={busy} onClick={() => void disconnect()}>Disconnect Canva</button>}
      </div>
    </main>
  );
}
