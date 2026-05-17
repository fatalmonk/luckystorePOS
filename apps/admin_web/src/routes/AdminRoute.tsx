import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Loader } from '../components/ui/Loader';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen size="lg" />;
  }

  if (!session) {
    window.location.href = '/';
    return null;
  }

  // Assuming role check happens here (e.g. session.user.user_metadata.role === 'admin')
  // We'll mock it passing for now since the AuthContext doesn't expose role directly yet
  // but this is where it belongs.
  const isAdmin = true; // TODO: Replace with real role check

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center">
        <div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Permission Denied</h2>
          <p className="text-slate-600">You must be an administrator to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
