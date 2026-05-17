import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Loader } from '../components/ui/Loader';

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen size="lg" />;
  }

  // If already logged in, public routes like login or consent shouldn't be accessed
  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
