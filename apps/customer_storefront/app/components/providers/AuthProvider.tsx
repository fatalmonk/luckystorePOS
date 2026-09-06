'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import type { startAuthRuntime } from './authRuntime';

type AuthStatus = 'unresolved' | 'loading' | 'authenticated' | 'anonymous' | 'error';
interface AuthContextType {
  user: User | null;
  session: Session | null;
  status: AuthStatus;
  loading: boolean;
  error: string | null;
  ensureAuth: () => Promise<Session | null>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_ROUTES = ['/login', '/signup', '/profile', '/checkout'];

let authRuntimePromise: Promise<typeof import('./authRuntime')> | null = null;
function loadAuthRuntime() {
  if (!authRuntimePromise) {
    authRuntimePromise = import('./authRuntime').catch((err) => {
      authRuntimePromise = null;
      throw err;
    });
  }
  return authRuntimePromise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('unresolved');
  const [error, setError] = useState<string | null>(null);
  const currentSession = useRef<Session | null>(null);
  const runtime = useRef<ReturnType<typeof startAuthRuntime> | null>(null);
  const pending = useRef<Promise<Session | null> | null>(null);
  const generation = useRef(0);

  useEffect(() => () => {
    generation.current += 1;
    runtime.current?.dispose();
    runtime.current = null;
    pending.current = null;
  }, []);

  const ensureAuth = useCallback((): Promise<Session | null> => {
    if (pending.current) return pending.current;
    if (runtime.current) return Promise.resolve(currentSession.current);
    const attempt = generation.current;
    setStatus('loading');
    setError(null);
    const request = loadAuthRuntime().then(async ({ startAuthRuntime }) => {
      if (generation.current !== attempt) return null;
      const instance = startAuthRuntime((nextSession) => {
        if (generation.current !== attempt) return;
        currentSession.current = nextSession;
        setSession(nextSession);
        setStatus(nextSession ? 'authenticated' : 'anonymous');
      });
      runtime.current = instance;
      await instance.ready;
      return currentSession.current;
    }).catch((cause: unknown) => {
      if (generation.current === attempt) {
        runtime.current?.dispose();
        runtime.current = null;
        setStatus('error');
        setError('Unable to check your account. Please retry.');
      }
      throw cause;
    }).finally(() => {
      if (generation.current === attempt) pending.current = null;
    });
    pending.current = request;
    return request;
  }, []);

  useEffect(() => {
    if (AUTH_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`))) {
      void ensureAuth().catch(() => {});
    }
  }, [pathname, ensureAuth]);

  const signOut = useCallback(async () => {
    await ensureAuth();
    setStatus('loading');
    try {
      await runtime.current!.signOut();
    } catch (cause) {
      setStatus(currentSession.current ? 'authenticated' : 'anonymous');
      throw cause;
    }
  }, [ensureAuth]);

  const value = useMemo(() => ({
    user: session?.user ?? null, session, status,
    loading: status === 'unresolved' || status === 'loading',
    error, ensureAuth, signOut,
  }), [session, status, error, ensureAuth, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
