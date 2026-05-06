import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  authId: string;
  tenantId: string;
  storeId: string;
  role: string;
  name: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: AdminUser | null;
  /** Supabase tenant UUID resolved from the `users` table — never null once loaded */
  tenantId: string;
  /** Supabase store UUID resolved from the `users` table */
  storeId: string;
  loading: boolean;
  signOut: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolve the admin user profile whenever the auth session changes.
  const resolveUser = async (s: Session | null) => {
    if (!s) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch the user row that joins auth.uid() → public.users
      const { data: userRow, error } = await supabase
        .from('users')
        .select('id, auth_id, tenant_id, store_id, role, full_name, name')
        .eq('auth_id', s.user.id)
        .maybeSingle();

      if (error || !userRow) {
        console.error('[AuthContext] Could not load user profile:', error?.message);
        setUser(null);
        setLoading(false);
        return;
      }

      const resolved: AdminUser = {
        id: userRow.id as string,
        authId: userRow.auth_id as string,
        tenantId: userRow.tenant_id as string,
        storeId: userRow.store_id as string,
        role: (userRow.role as string) ?? 'viewer',
        name: (userRow.full_name ?? userRow.name) as string | null,
      };
      setUser(resolved);

    } catch (e) {
      console.error('[AuthContext] Unexpected error resolving user:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      resolveUser(s);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(true);
      resolveUser(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value: AuthContextValue = {
    session,
    user,
    tenantId: user?.tenantId ?? '',
    storeId: user?.storeId ?? '',
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
