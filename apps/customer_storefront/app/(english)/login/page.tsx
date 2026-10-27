'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Envelope, Lock, ShieldCheck, Storefront, Truck } from '@phosphor-icons/react';
import { createClient } from '../../lib/supabase/client';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';

function TrustOrbit() {
  return (
    <div
      role="img"
      aria-label="Lucky Store trust highlights: serving customers since 1947, local support, and protected account access."
      className="relative mx-auto aspect-square w-full max-w-[20rem] lg:max-w-[27rem]"
    >
      <div aria-hidden="true" className="absolute inset-[8%] rounded-full border border-warm-border/80" />
      <div
        aria-hidden="true"
        className="absolute inset-[19%] rounded-full border border-dashed border-warm-accent/70 motion-safe:animate-[spin_48s_linear_infinite] motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-[30%] rounded-full border border-warm-border/70"
      />

      <div className="absolute left-1/2 top-1/2 flex size-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-warm-accent/50 bg-warm-accent text-warm-accent-text shadow-warm-lg">
        <ShieldCheck size={32} weight="duotone" aria-hidden="true" />
        <span className="mt-1 text-[10px] font-black uppercase tracking-[0.16em]">Lucky Store</span>
      </div>

      <div aria-hidden="true" className="absolute left-1/2 top-[3%] flex w-32 -translate-x-1/2 items-center gap-2 rounded-2xl border border-warm-border bg-warm-bg/95 px-3 py-2 shadow-warm-md backdrop-blur">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warm-accent/20 text-warm-fg">
          <Storefront size={18} weight="duotone" />
        </span>
        <span className="text-left text-xs font-bold leading-tight text-warm-fg">Serving since 1947</span>
      </div>

      <div aria-hidden="true" className="absolute left-0 top-1/2 flex w-[6.5rem] -translate-y-1/2 items-center gap-2 rounded-2xl border border-warm-border bg-warm-bg/95 px-2 py-2 shadow-warm-md backdrop-blur">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warm-surface text-warm-fg">
          <Truck size={17} weight="duotone" />
        </span>
        <span className="text-left text-[11px] font-bold leading-tight text-warm-fg">Local delivery</span>
      </div>

      <div aria-hidden="true" className="absolute right-0 top-1/2 flex w-[6.5rem] -translate-y-1/2 items-center gap-2 rounded-2xl border border-warm-border bg-warm-bg/95 px-2 py-2 shadow-warm-md backdrop-blur">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warm-surface text-warm-fg">
          <Lock size={16} weight="duotone" />
        </span>
        <span className="text-left text-[11px] font-bold leading-tight text-warm-fg">Private sign in</span>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      const supabase = createClient();
      if (!supabase) throw new Error('Auth service unavailable');
      const { error } = await supabase.auth.signInWithPassword({ email, password });

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
    <main className="min-h-dvh bg-warm-bg text-warm-fg lg:grid lg:grid-cols-2">
      <section
        aria-labelledby="login-story-title"
        className="relative flex min-h-[25rem] flex-col overflow-hidden border-b border-warm-border px-5 py-5 sm:px-8 sm:py-7 lg:min-h-dvh lg:border-b-0 lg:border-r lg:px-12 lg:py-10 xl:px-16"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-warm-accent/15 via-transparent to-warm-surface/70" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <Logo href="/" className="[&_img]:h-9 sm:[&_img]:h-11" />
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-warm-muted transition-colors hover:bg-warm-surface hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            Back to store
          </Link>
        </div>

        <div className="relative z-10 mx-auto mt-6 w-full max-w-xl text-center lg:mt-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-warm-muted">
            A familiar place for your everyday shop
          </p>
          <h2 id="login-story-title" className="mx-auto mt-3 max-w-lg text-2xl font-black leading-tight tracking-tight text-warm-fg sm:text-3xl lg:text-4xl">
            Welcome back to your neighborhood store.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-warm-muted sm:text-base">
            Sign in to pick up where you left off, with Lucky Store close at hand.
          </p>
        </div>

        <div className="relative z-10 mx-auto mt-2 flex w-full flex-1 items-center justify-center lg:mt-6">
          <TrustOrbit />
        </div>

        <p className="relative z-10 mt-1 text-center text-xs font-medium text-warm-muted lg:mt-4">
          A local store, serving customers since 1947.
        </p>
      </section>

      <section className="flex min-h-[34rem] items-center justify-center px-5 py-12 sm:px-8 lg:min-h-dvh lg:px-12 lg:py-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-sm font-bold text-warm-muted">Lucky Store account</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-warm-fg sm:text-4xl">Welcome back</h1>
            <p className="mt-3 text-sm leading-6 text-warm-muted">
              Sign in with the email address and password linked to your account.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col" aria-label="Sign in">
            <div className="relative">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                disabled={loading}
                className="pl-11"
                required
              />
              <Envelope className="pointer-events-none absolute bottom-[2.15rem] left-3.5 text-warm-muted" size={18} aria-hidden="true" />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                disabled={loading}
                className="pl-11"
                required
              />
              <Lock className="pointer-events-none absolute bottom-[2.15rem] left-3.5 text-warm-muted" size={18} aria-hidden="true" />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-warm-accent font-extrabold text-warm-accent-text hover:bg-warm-accent-hover"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              <ArrowRight data-icon="inline-end" weight="bold" size={18} aria-hidden="true" />
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-warm-muted">
            New to Lucky Store?{' '}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="font-bold text-warm-fg underline decoration-warm-accent underline-offset-4 transition-colors hover:text-warm-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-warm-bg" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}
