'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { Envelope } from '@phosphor-icons/react/dist/csr/Envelope';
import { Lock } from '@phosphor-icons/react/dist/csr/Lock';
import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { Storefront } from '@phosphor-icons/react/dist/csr/Storefront';
import { Truck } from '@phosphor-icons/react/dist/csr/Truck';
import { createClient } from '../../lib/supabase/client';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import { getLocaleFromPathname, withLocale } from '../../lib/i18n/config';

const LOGIN_COPY = {
  en: {
    orbitLabel: 'Lucky Store trust highlights: serving customers since 1947, local support, and protected account access.',
    servingSince: 'Serving since 1947', localDelivery: 'Local delivery', privateSignIn: 'Private sign in',
    backToStore: 'Back to store', tagline: 'A familiar place for your everyday shop',
    welcomeHeading: 'Welcome back to your neighborhood store.',
    welcomeDescription: 'Sign in to pick up where you left off, with Lucky Store close at hand.',
    localStoreSince: 'A local store, serving customers since 1947.', account: 'Lucky Store account',
    welcomeBack: 'Welcome back', signInDescription: 'Sign in with the email address and password linked to your account.',
    formLabel: 'Sign in', email: 'Email address', emailPlaceholder: 'you@example.com',
    password: 'Password', passwordPlaceholder: 'Enter your password', signingIn: 'Signing in…',
    signIn: 'Sign in', newCustomer: 'New to Lucky Store?', createAccount: 'Create an account',
    callbackFailed: 'Authentication failed. Please try again.', required: 'Please enter both email and password',
    unavailable: 'Auth service unavailable', signedIn: 'Successfully signed in!', failed: 'Failed to sign in',
  },
  bn: {
    orbitLabel: 'লাকি স্টোর: ১৯৪৭ সাল থেকে সেবা, স্থানীয় সহায়তা এবং নিরাপদ অ্যাকাউন্ট প্রবেশ।',
    servingSince: '১৯৪৭ সাল থেকে সেবা', localDelivery: 'স্থানীয় ডেলিভারি', privateSignIn: 'নিরাপদ সাইন ইন',
    backToStore: 'দোকানে ফিরুন', tagline: 'নিত্যদিনের কেনাকাটার পরিচিত ঠিকানা',
    welcomeHeading: 'আপনার পাড়ার দোকানে আবারও স্বাগতম।',
    welcomeDescription: 'লাকি স্টোরে আপনার কেনাকাটা চালিয়ে যেতে সাইন ইন করুন।',
    localStoreSince: '১৯৪৭ সাল থেকে গ্রাহকদের সেবা দিচ্ছে একটি স্থানীয় দোকান।', account: 'লাকি স্টোর অ্যাকাউন্ট',
    welcomeBack: 'আবার স্বাগতম', signInDescription: 'আপনার অ্যাকাউন্টের ইমেইল ঠিকানা ও পাসওয়ার্ড দিয়ে সাইন ইন করুন।',
    formLabel: 'সাইন ইন', email: 'ইমেইল ঠিকানা', emailPlaceholder: 'আপনার ইমেইল লিখুন',
    password: 'পাসওয়ার্ড', passwordPlaceholder: 'আপনার পাসওয়ার্ড লিখুন', signingIn: 'সাইন ইন হচ্ছে…',
    signIn: 'সাইন ইন', newCustomer: 'লাকি স্টোরে নতুন?', createAccount: 'অ্যাকাউন্ট তৈরি করুন',
    callbackFailed: 'সাইন ইন করা যায়নি। আবার চেষ্টা করুন।', required: 'ইমেইল ঠিকানা ও পাসওয়ার্ড লিখুন',
    unavailable: 'সাইন ইন সেবা এখন উপলভ্য নয়', signedIn: 'সফলভাবে সাইন ইন হয়েছে!', failed: 'সাইন ইন করা যায়নি। আবার চেষ্টা করুন।',
  },
} as const;

function TrustOrbit({ locale }: { locale: 'en' | 'bn' }) {
  const copy = LOGIN_COPY[locale];
  return (
    <div
      role="img"
      aria-label={copy.orbitLabel}
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
        <span className="text-left text-xs font-bold leading-tight text-warm-fg">{copy.servingSince}</span>
      </div>

      <div aria-hidden="true" className="absolute left-0 top-1/2 flex w-[6.5rem] -translate-y-1/2 items-center gap-2 rounded-2xl border border-warm-border bg-warm-bg/95 px-2 py-2 shadow-warm-md backdrop-blur">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warm-surface text-warm-fg">
          <Truck size={17} weight="duotone" />
        </span>
        <span className="text-left text-[11px] font-bold leading-tight text-warm-fg">{copy.localDelivery}</span>
      </div>

      <div aria-hidden="true" className="absolute right-0 top-1/2 flex w-[6.5rem] -translate-y-1/2 items-center gap-2 rounded-2xl border border-warm-border bg-warm-bg/95 px-2 py-2 shadow-warm-md backdrop-blur">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warm-surface text-warm-fg">
          <Lock size={16} weight="duotone" />
        </span>
        <span className="text-left text-[11px] font-bold leading-tight text-warm-fg">{copy.privateSignIn}</span>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const locale = getLocaleFromPathname(usePathname());
  const copy = LOGIN_COPY[locale];
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const next = searchParams.get('next') ?? '/profile';
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (errorParam === 'auth_callback_failed') {
      showToast(copy.callbackFailed);
    }
  }, [errorParam, showToast, copy.callbackFailed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast(copy.required);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error(copy.unavailable);
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        showToast(locale === 'bn' ? copy.failed : error.message);
      } else {
        showToast(copy.signedIn);
        router.push(next);
        router.refresh();
      }
    } catch (err: any) {
      showToast(locale === 'bn' ? copy.failed : (err?.message || copy.failed));
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
          <Logo href={withLocale('/', locale)} className="[&_img]:max-h-9 sm:[&_img]:max-h-11" />
          <Link
            href={withLocale('/', locale)}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-warm-muted transition-colors hover:bg-warm-surface hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            {copy.backToStore}
          </Link>
        </div>

        <div className="relative z-10 mx-auto mt-6 w-full max-w-xl text-center lg:mt-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-warm-muted">
            {copy.tagline}
          </p>
          <h2 id="login-story-title" className="mx-auto mt-3 max-w-lg text-2xl font-black leading-tight tracking-tight text-warm-fg sm:text-3xl lg:text-4xl">
            {copy.welcomeHeading}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-warm-muted sm:text-base">
            {copy.welcomeDescription}
          </p>
        </div>

        <div className="relative z-10 mx-auto mt-2 flex w-full flex-1 items-center justify-center lg:mt-6">
          <TrustOrbit locale={locale} />
        </div>

        <p className="relative z-10 mt-1 text-center text-xs font-medium text-warm-muted lg:mt-4">
          {copy.localStoreSince}
        </p>
      </section>

      <section className="flex min-h-[34rem] items-center justify-center px-5 py-12 sm:px-8 lg:min-h-dvh lg:px-12 lg:py-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-sm font-bold text-warm-muted">{copy.account}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-warm-fg sm:text-4xl">{copy.welcomeBack}</h1>
            <p className="mt-3 text-sm leading-6 text-warm-muted">
              {copy.signInDescription}
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col" aria-label={copy.formLabel}>
            <div className="relative">
              <Input
                label={copy.email}
                name="email"
                type="email"
                autoComplete="email"
                placeholder={copy.emailPlaceholder}
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
                label={copy.password}
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder={copy.passwordPlaceholder}
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
              {loading ? copy.signingIn : copy.signIn}
              <ArrowRight data-icon="inline-end" weight="bold" size={18} aria-hidden="true" />
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-warm-muted">
            {copy.newCustomer}{' '}
            <Link
              href={`${withLocale('/signup', locale)}?next=${encodeURIComponent(next)}`}
              className="font-bold text-warm-fg underline decoration-warm-accent underline-offset-4 transition-colors hover:text-warm-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              {copy.createAccount}
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
