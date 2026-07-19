'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Envelope, Lock, ArrowRight } from '@phosphor-icons/react';
import { createClient } from '../lib/supabase/client';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Header } from '../components/updated/Header';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const next = searchParams.get('next') ?? '/profile';
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (errorParam === 'auth_callback_failed') {
      showToast('Authentication failed. Please try again.');
    }
  }, [errorParam, showToast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showToast(error.message);
      } else {
        showToast('Successfully signed in!');
        router.push(next);
        router.refresh();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white border border-warm-border rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-warm-fg mb-2">Welcome Back</h1>
        <p className="text-sm text-warm-muted">Sign in to your Lucky Store account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            disabled={loading}
            className="pl-10"
            required
          />
          <span className="absolute left-3.5 bottom-3.5 text-warm-muted">
            <Envelope size={18} />
          </span>
        </div>

        <div className="relative">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            disabled={loading}
            className="pl-10"
            required
          />
          <span className="absolute left-3.5 bottom-3.5 text-warm-muted">
            <Lock size={18} />
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={loading}
          className="mt-6 flex items-center justify-center gap-2 h-12 bg-warm-accent text-warm-fg rounded-[14px]"
        >
          {loading ? 'Signing In...' : 'Sign In'}
          <ArrowRight weight="bold" size={16} />
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-warm-muted">
        {"Don't have an account? "}
        <button
          onClick={() => router.push(`/signup?next=${encodeURIComponent(next)}`)}
          className="font-bold text-warm-fg underline hover:text-warm-accent-hover transition-colors"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-warm-bg">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="text-warm-muted animate-pulse">Loading login form...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
