import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Loader } from '../components/ui/Loader';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, storeId, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader fullScreen size="lg" />;
  }

  // Not authenticated
  if (!session) {
    // Save the intended destination so they can be redirected after login
    // but in this POS, login happens outside the admin app. Just bounce them out.
    // For now, bounce them to the OAuth consent or login root
    // Assuming root login is on another domain or path.
    window.location.href = '/'; 
    return null;
  }

  // Authenticated, but no store selected yet (if applicable)
  // Usually the POS ensures storeId is present if they have access to the app
  if (!storeId) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center">
        <div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-slate-600">You must be assigned to a store to use the POS.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
