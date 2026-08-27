import type { ReactNode } from 'react';
import { LoginPage } from './LoginPage';
import { useAuth } from '../lib/AuthContext';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08060d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!session) return <LoginPage />;

  return <>{children}</>;
}
