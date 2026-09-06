import type { Session } from '@supabase/supabase-js';
import { createClient } from '../../lib/supabase/client';

/** Loaded only when a consumer needs session state. */
export function startAuthRuntime(onSession: (session: Session | null) => void) {
  const client = createClient();
  if (!client) throw new Error('Authentication is unavailable. Please try again later.');
  let disposed = false;
  let revision = 0;
  let current: Session | null = null;
  const publish = (session: Session | null) => {
    if (disposed) return;
    current = session;
    onSession(session);
  };
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    revision += 1;
    publish(session);
  });
  const initialRevision = revision;
  const ready = client.auth.getSession().then(({ data, error }) => {
    if (error && revision === initialRevision) throw error;
    if (revision === initialRevision) publish(data.session);
    return current;
  });
  return {
    ready,
    dispose() { disposed = true; subscription.unsubscribe(); },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      publish(null);
    },
  };
}
