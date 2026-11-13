'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { Envelope } from '@phosphor-icons/react/dist/csr/Envelope';
import { Lock } from '@phosphor-icons/react/dist/csr/Lock';
import { Storefront } from '@phosphor-icons/react/dist/csr/Storefront';
import { Truck } from '@phosphor-icons/react/dist/csr/Truck';
import { createClient } from '../../lib/supabase/client';
import { useToast } from '../../components/Toast';
import { WhatsAppSupportLink } from '../../components/WhatsAppFloat';
import { SocialMediaLinks } from '../../components/SocialMediaLinks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import { getLocaleFromPathname, withLocale } from '../../lib/i18n/config';
import { getSafeAuthReturnPath } from '../../lib/auth/redirect';

const LOGIN_COPY = {
  en: {
    orbitLabel: 'Lucky Store trust highlights: serving customers since 1947, local support, and protected account access.',
    servingSince: 'Serving since 1947', localDelivery: 'Local delivery', privateSignIn: 'Private sign in',
    tagline: 'A familiar place for your everyday shop',
    welcomeHeading: 'Welcome back to your neighborhood family grocer.',
    localStoreSince: 'A local store, serving customers since 1947.',
    signInDescription: 'Sign in with the email address and password linked to your account.',
    formLabel: 'Sign in', email: 'Email address', emailPlaceholder: 'you@example.com',
    password: 'Password', passwordPlaceholder: 'Enter your password', signingIn: 'Signing in…',
    signIn: 'Sign in', newCustomer: 'New to Lucky Store?', createAccount: 'Create an account',
    callbackFailed: 'Authentication failed. Please try again.', required: 'Please enter both email and password',
    unavailable: 'Auth service unavailable', signedIn: 'Successfully signed in!', failed: 'Failed to sign in',
  },
  bn: {
    orbitLabel: 'লাকি স্টোর: ১৯৪৭ সাল থেকে সেবা, স্থানীয় সহায়তা এবং নিরাপদ অ্যাকাউন্ট প্রবেশ।',
    servingSince: '১৯৪৭ সাল থেকে সেবা', localDelivery: 'স্থানীয় ডেলিভারি', privateSignIn: 'নিরাপদ সাইন ইন',
    tagline: 'নিত্যদিনের কেনাকাটার পরিচিত ঠিকানা',
    welcomeHeading: 'আপনার পাড়ার দোকানে আবারও স্বাগতম।',
    localStoreSince: '১৯৪৭ সাল থেকে গ্রাহকদের সেবা দিচ্ছে একটি স্থানীয় দোকান।',
    signInDescription: 'আপনার অ্যাকাউন্টের ইমেইল ঠিকানা ও পাসওয়ার্ড দিয়ে সাইন ইন করুন।',
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

      <div className="absolute left-1/2 top-1/2 flex size-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
        <Image src="/icon-192x192.png" alt="" width={192} height={192} className="size-[68%] object-contain" />
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

  const next = getSafeAuthReturnPath(searchParams.get('next'));
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
    <main className="flex min-h-dvh flex-col bg-warm-bg text-warm-fg lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-dvh flex-1 flex-col bg-gradient-to-br from-[#141414] via-[#0B0B0D] to-[#1A160B] px-5 py-8 sm:px-8 lg:col-start-2 lg:row-start-1 lg:px-12 lg:py-10">
        <div className="mx-auto w-full max-w-md">
          <div style={{ transform: 'scale(1.2)', transformOrigin: 'left center' }}>
            <Logo href={withLocale('/', locale)} className="[&_img]:max-h-14" />
          </div>
        </div>
        <div className="flex w-full flex-1 items-center justify-center">
          <div className="w-full max-w-md">
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-warm-fg lg:hidden">
            {copy.formLabel}
          </h1>
          <div className="mb-8">
            <p className="mt-0 text-pretty text-base leading-7 text-warm-muted">
              {copy.signInDescription}
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col" aria-label={copy.formLabel}>
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
              leadingIcon={<Envelope className="text-warm-muted" size={18} />}
              required
            />

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
              leadingIcon={<Lock className="text-warm-muted" size={18} />}
              required
            />

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
          <div className="mt-4 flex justify-center">
            <WhatsAppSupportLink />
          </div>
          <SocialMediaLinks locale={locale} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="login-story-title"
        className="relative hidden min-h-[25rem] flex-col overflow-hidden border-b border-warm-border bg-[#0B0B0D] px-5 py-5 sm:px-8 sm:py-7 lg:col-start-1 lg:row-start-1 lg:flex lg:min-h-dvh lg:border-b-0 lg:border-r lg:px-12 lg:py-10 xl:px-16"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-black/80 via-[#0B0B0D]/95 to-black" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(#f0c444_1px,transparent_1px)] opacity-20 [background-size:24px_24px]" />
        <div className="relative z-10 mx-auto mt-6 w-full max-w-xl text-center lg:mt-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-warm-muted">
            {copy.tagline}
          </p>
          <h1 id="login-story-title" className="mx-auto mt-3 max-w-lg text-balance text-2xl font-black leading-tight tracking-tight text-warm-fg sm:text-3xl lg:text-4xl">
            {copy.welcomeHeading}
          </h1>
        </div>

        <div className="relative z-10 mx-auto mt-2 flex w-full flex-1 items-center justify-center lg:mt-6">
          <TrustOrbit locale={locale} />
        </div>

        <p className="relative z-10 mt-1 text-center text-xs font-medium text-warm-muted lg:mt-4">
          {copy.localStoreSince}
        </p>
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
