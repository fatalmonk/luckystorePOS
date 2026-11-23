import type { ReactNode } from 'react';
import { LoginPage } from './LoginPage';
import { useAuth } from '../lib/AuthContext';

/**
 * This is a UI gate only. Supabase RLS and server-side authorization must
 * independently protect every data read and mutation.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08060d] flex items-center justify-center" role="status" aria-label="Checking account access">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return <LoginPage />;

  // A Supabase Auth account alone does not grant access to the staff portal.
  // Resolve the tenant-scoped public.users profile before mounting any admin UI.
  if (
    !user ||
    user.authId !== session.user?.id ||
    !user.tenantId ||
    !user.storeId ||
    !(user.role ?? '').trim()
  ) {
    return (
      <main className="min-h-screen bg-background-default flex items-center justify-center px-4">
        <section className="w-full max-w-md rounded-xl border border-border-default bg-surface p-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">Access denied</h1>
          <p className="mt-3 text-sm text-text-muted" role="alert">
            This account cannot access the Lucky Store staff portal. A valid staff profile is required.
          </p>
          <button
            type="button"
            className="mt-6 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-on"
            onClick={() => { void signOut(); }}
          >
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
