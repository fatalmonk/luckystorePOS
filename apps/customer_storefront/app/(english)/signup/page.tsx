'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Envelope } from '@phosphor-icons/react/dist/csr/Envelope';
import { Lock } from '@phosphor-icons/react/dist/csr/Lock';
import { User as UserIcon } from '@phosphor-icons/react/dist/csr/User';
import { Phone } from '@phosphor-icons/react/dist/csr/Phone';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { Truck } from '@phosphor-icons/react/dist/csr/Truck';
import { createClient } from '../../lib/supabase/client';
import { useToast } from '../../components/Toast';
import { WhatsAppSupportLink } from '../../components/WhatsAppFloat';
import { SocialMediaLinks } from '../../components/SocialMediaLinks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getLocaleFromPathname, withLocale } from '../../lib/i18n/config';
import { getSafeAuthReturnPath } from '../../lib/auth/redirect';
import { GoogleMapEmbed } from '../contact/GoogleMapEmbed';

const SIGNUP_COPY = {
  en: {
    createAccount: 'Create your Lucky Store account',
    description: 'Shop groceries online from our Chawkbazar store in Chattogram, serving local customers since 1947.',
    fullName: 'Full Name', namePlaceholder: 'Your name', phone: 'WhatsApp Number',
    email: 'Email Address', emailPlaceholder: 'you@example.com', password: 'Password',
    creating: 'Creating Account…', signUp: 'Sign Up', existing: 'Already have an account?', signIn: 'Sign In',
    required: 'All fields are required', shortPassword: 'Password must be at least 6 characters',
    unavailable: 'Auth service unavailable', created: 'Account created successfully!',
    confirmEmail: 'Account created! Please check your email to confirm registration.',
    failed: 'Failed to sign up. Please try again.', loading: 'Loading signup form…',
    heroTitle: <>Shop Online with Lucky Store,<br />Serving <s className="text-white/60 decoration-warm-accent decoration-2">Chattogram</s> Chittagong Since 1947.</>,
    deliveryTitle: '1 km Delivery Radius', deliveryDescription: 'Delivery from Chawkbazar',
    inspectionTitle: 'Pay After Inspection', inspectionDescription: 'Cash on delivery or bKash at your doorstep',
  },
  bn: {
    createAccount: 'অ্যাকাউন্ট তৈরি করুন',
    description: 'চকবাজারের আমাদের দোকান থেকে অনলাইনে মুদি পণ্য কিনুন। ১৯৪৭ সাল থেকে স্থানীয় গ্রাহকদের সেবা দিচ্ছি।',
    fullName: 'পূর্ণ নাম', namePlaceholder: 'আপনার নাম', phone: 'হোয়াটসঅ্যাপ নম্বর',
    email: 'ইমেইল ঠিকানা', emailPlaceholder: 'আপনার ইমেইল লিখুন', password: 'পাসওয়ার্ড',
    creating: 'অ্যাকাউন্ট তৈরি হচ্ছে…', signUp: 'সাইন আপ', existing: 'আগে থেকেই অ্যাকাউন্ট আছে?', signIn: 'সাইন ইন',
    required: 'সব ঘর পূরণ করুন', shortPassword: 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে',
    unavailable: 'অ্যাকাউন্ট সেবা এখন উপলভ্য নয়', created: 'অ্যাকাউন্ট তৈরি হয়েছে!',
    confirmEmail: 'অ্যাকাউন্ট তৈরি হয়েছে। নিবন্ধন নিশ্চিত করতে ইমেইল দেখুন।',
    failed: 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।', loading: 'অ্যাকাউন্ট ফর্ম লোড হচ্ছে…',
    heroTitle: 'চকবাজারের লাকি স্টোর থেকে নিত্যপ্রয়োজনীয় পণ্য।',
    deliveryTitle: '১ কিমি ডেলিভারি এলাকা', deliveryDescription: 'চকবাজার থেকে ডেলিভারি',
    inspectionTitle: 'পণ্য দেখে পেমেন্ট', inspectionDescription: 'ডেলিভারির সময় ক্যাশ অন ডেলিভারি বা বিকাশ',
  },
} as const;

function SignupForm() {
  const router = useRouter();
  const locale = getLocaleFromPathname(usePathname());
  const copy = SIGNUP_COPY[locale];
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const next = getSafeAuthReturnPath(searchParams.get('next'));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || !password) {
      showToast(copy.required);
      return;
    }

    if (password.length < 6) {
      showToast(copy.shortPassword);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error(copy.unavailable);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
          },
        },
      });

      if (error) {
        showToast(locale === 'bn' ? copy.failed : error.message);
      } else {
        if (data.session) {
          showToast(copy.created);
          router.push(next);
          router.refresh();
        } else {
          showToast(copy.confirmEmail);
          router.push(`${withLocale('/login', locale)}?next=${encodeURIComponent(next)}`);
        }
      }
    } catch (err: any) {
      showToast(locale === 'bn' ? copy.failed : (err?.message || copy.failed));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="motion-safe:animate-[fadeUp_450ms_cubic-bezier(.22,1,.36,1)_both] w-full max-w-[500px] px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:px-7 sm:py-8 lg:px-8 lg:py-10">
      <div className="mb-8">
        <h1 className="max-w-[15ch] text-balance font-display text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-warm-fg sm:text-4xl">{copy.createAccount}</h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-warm-muted">{copy.description}</p>
      </div>

      <form onSubmit={handleSignup} className="flex flex-col">
        <Input
          label={copy.fullName}
          name="name"
          type="text"
          autoComplete="name"
          placeholder={copy.namePlaceholder}
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          disabled={loading}
          className="pl-10"
          leadingIcon={<UserIcon size={18} aria-hidden="true" />}
          required
        />

        <Input
          label={copy.phone}
          name="phone"
          type="tel"
          autoComplete="tel-national"
          placeholder="01XXXXXXXXX"
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          disabled={loading}
          className="pl-10"
          leadingIcon={<Phone size={18} aria-hidden="true" />}
          required
        />

        <Input
          label={copy.email}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={copy.emailPlaceholder}
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          disabled={loading}
          className="pl-10"
          leadingIcon={<Envelope size={18} aria-hidden="true" />}
          required
        />

        <Input
          label={copy.password}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          disabled={loading}
          className="pl-10"
          leadingIcon={<Lock size={18} aria-hidden="true" />}
          required
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={loading}
          className="mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-warm-accent font-extrabold text-warm-accent-text shadow-[0_8px_24px_rgba(240,196,68,0.12)] transition-shadow duration-200 hover:bg-warm-accent-hover hover:shadow-[0_10px_28px_rgba(240,196,68,0.2)]"
        >
          {loading ? copy.creating : copy.signUp}
          <ArrowRight weight="bold" size={16} aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-warm-muted">
        {copy.existing}{' '}
        <Link
          href={`${withLocale('/login', locale)}?next=${encodeURIComponent(next)}`}
          className="font-bold text-warm-fg underline decoration-warm-accent underline-offset-4 transition-colors duration-200 hover:text-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          {copy.signIn}
        </Link>
      </div>
      <div className="mt-4 flex justify-center">
        <WhatsAppSupportLink />
      </div>
      <SocialMediaLinks locale={locale} />
    </div>
  );
}

export default function SignupPage() {
  const locale = getLocaleFromPathname(usePathname());
  const copy = SIGNUP_COPY[locale];
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const syncDesktopViewport = () => setIsDesktopViewport(desktopQuery.matches);

    syncDesktopViewport();
    desktopQuery.addEventListener('change', syncDesktopViewport);
    return () => desktopQuery.removeEventListener('change', syncDesktopViewport);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-warm-bg">
      <main className="grid flex-1 grid-cols-1 items-stretch lg:grid-cols-2">
        {/* Left Column: Form (signup-04) */}
        <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_12%_8%,rgba(240,196,68,0.09),transparent_36%),linear-gradient(135deg,#141414_0%,#0B0B0D_58%,#1A160B_100%)] py-4 sm:py-6 lg:py-0">
          <Suspense fallback={<div className="text-warm-muted animate-pulse">{copy.loading}</div>}>
            <SignupForm />
          </Suspense>
        </div>

        {/* Right Column: Hero Showcase (signup-04) */}
        <div className="relative hidden min-h-dvh flex-col justify-between overflow-hidden border-l border-warm-border bg-[#0B0B0D] p-12 text-white lg:flex">
          {/* Subtle Background Pattern & Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-[#0B0B0D]/95 to-black z-0 pointer-events-none" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f0c444_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Top Branding */}
          <div className="relative z-10">
            <h2 className="max-w-xl text-balance text-2xl font-bold leading-[1.16] tracking-tight text-white xl:text-3xl">
              {copy.heroTitle}
            </h2>
          </div>

          <div className="relative z-10 mt-10 mb-6 h-[380px] w-full overflow-hidden rounded-[28px] border border-warm-border/80 bg-warm-surface shadow-warm-md">
              {isDesktopViewport ? <GoogleMapEmbed placeId="ChIJH4nhmJAnrTARgEupScnGdJI" /> : null}
          </div>

          {/* Value Props Strip */}
          <div className="relative z-10 grid grid-cols-2 gap-4 my-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition-[border-color,background-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-[#f0c444]/25 hover:bg-white/[0.07] motion-reduce:transition-none motion-reduce:hover:transform-none">
              <Truck weight="bold" size={24} className="mb-3 text-[#f0c444]" />
              <div className="text-sm font-bold text-white">{copy.deliveryTitle}</div>
              <div className="text-xs text-white/60 mt-0.5">{copy.deliveryDescription}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition-[border-color,background-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-[#f0c444]/25 hover:bg-white/[0.07] motion-reduce:transition-none motion-reduce:hover:transform-none">
              <ShieldCheck weight="bold" size={24} className="mb-3 text-[#f0c444]" />
              <div className="text-sm font-bold text-white">{copy.inspectionTitle}</div>
              <div className="text-xs text-white/60 mt-0.5">{copy.inspectionDescription}</div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
