'use client';

import React, { useState, Suspense } from 'react';
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
import { Sparkle } from '@phosphor-icons/react/dist/csr/Sparkle';
import { createClient } from '../../lib/supabase/client';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Header } from '../../components/updated/Header';
import { Badge } from '../../components/ui/Badge';
import { getLocaleFromPathname, withLocale } from '../../lib/i18n/config';

const SIGNUP_COPY = {
  en: {
    newCustomer: 'New Customer', createAccount: 'Create Account',
    description: 'Join Lucky Store for everyday groceries and local delivery.',
    fullName: 'Full Name', namePlaceholder: 'Your name', phone: 'WhatsApp Number',
    email: 'Email Address', emailPlaceholder: 'you@example.com', password: 'Password',
    creating: 'Creating Account…', signUp: 'Sign Up', existing: 'Already have an account?', signIn: 'Sign In',
    required: 'All fields are required', shortPassword: 'Password must be at least 6 characters',
    unavailable: 'Auth service unavailable', created: 'Account created successfully!',
    confirmEmail: 'Account created! Please check your email to confirm registration.',
    failed: 'Failed to sign up. Please try again.', loading: 'Loading signup form…',
    brandLine: 'Lucky Store · Est. 1947',
    heroTitle: 'Everyday groceries from your Chawkbazar store.',
    heroDescription: 'Shop from Lucky Store in Chawkbazar, Chattogram.',
    deliveryTitle: '1 km Delivery Radius', deliveryDescription: 'Delivery from Chawkbazar',
    inspectionTitle: 'Pay After Inspection', inspectionDescription: 'Cash on delivery or bKash at your doorstep',
    storeLocation: 'Chawkbazar, Chattogram',
  },
  bn: {
    newCustomer: 'নতুন গ্রাহক', createAccount: 'অ্যাকাউন্ট তৈরি করুন',
    description: 'লাকি স্টোর থেকে নিত্যপ্রয়োজনীয় পণ্য ও স্থানীয় ডেলিভারি পান।',
    fullName: 'পূর্ণ নাম', namePlaceholder: 'আপনার নাম', phone: 'হোয়াটসঅ্যাপ নম্বর',
    email: 'ইমেইল ঠিকানা', emailPlaceholder: 'আপনার ইমেইল লিখুন', password: 'পাসওয়ার্ড',
    creating: 'অ্যাকাউন্ট তৈরি হচ্ছে…', signUp: 'সাইন আপ', existing: 'আগে থেকেই অ্যাকাউন্ট আছে?', signIn: 'সাইন ইন',
    required: 'সব ঘর পূরণ করুন', shortPassword: 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে',
    unavailable: 'অ্যাকাউন্ট সেবা এখন উপলভ্য নয়', created: 'অ্যাকাউন্ট তৈরি হয়েছে!',
    confirmEmail: 'অ্যাকাউন্ট তৈরি হয়েছে। নিবন্ধন নিশ্চিত করতে ইমেইল দেখুন।',
    failed: 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।', loading: 'অ্যাকাউন্ট ফর্ম লোড হচ্ছে…',
    brandLine: 'লাকি স্টোর · প্রতিষ্ঠিত ১৯৪৭',
    heroTitle: 'চকবাজারের লাকি স্টোর থেকে নিত্যপ্রয়োজনীয় পণ্য।',
    heroDescription: 'চকবাজার, চট্টগ্রামে আমাদের দোকান থেকে কেনাকাটা করুন।',
    deliveryTitle: '১ কিমি ডেলিভারি এলাকা', deliveryDescription: 'চকবাজার থেকে ডেলিভারি',
    inspectionTitle: 'পণ্য দেখে পেমেন্ট', inspectionDescription: 'ডেলিভারির সময় ক্যাশ অন ডেলিভারি বা বিকাশ',
    storeLocation: 'চকবাজার, চট্টগ্রাম',
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

  const next = searchParams.get('next') ?? '/profile';

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
    <div className="w-full max-w-[440px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8">
        <Badge variant="default" className="mb-3">
          {copy.newCustomer}
        </Badge>
        <h1 className="text-3xl font-black tracking-tight text-warm-fg">{copy.createAccount}</h1>
        <p className="mt-2 text-sm text-warm-muted">
          {copy.description}
        </p>
      </div>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div className="relative">
          <Input
            label={copy.fullName}
            type="text"
            placeholder={copy.namePlaceholder}
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            disabled={loading}
            className="pl-10"
            required
          />
          <span className="pointer-events-none absolute left-3.5 bottom-3.5 text-warm-muted">
            <UserIcon size={18} aria-hidden="true" />
          </span>
        </div>

        <div className="relative">
          <Input
            label={copy.phone}
            type="tel"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            disabled={loading}
            className="pl-10"
            required
          />
          <span className="pointer-events-none absolute left-3.5 bottom-3.5 text-warm-muted">
            <Phone size={18} aria-hidden="true" />
          </span>
        </div>

        <div className="relative">
          <Input
            label={copy.email}
            type="email"
            placeholder={copy.emailPlaceholder}
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            disabled={loading}
            className="pl-10"
            required
          />
          <span className="pointer-events-none absolute left-3.5 bottom-3.5 text-warm-muted">
            <Envelope size={18} aria-hidden="true" />
          </span>
        </div>

        <div className="relative">
          <Input
            label={copy.password}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            disabled={loading}
            className="pl-10"
            required
          />
          <span className="pointer-events-none absolute left-3.5 bottom-3.5 text-warm-muted">
            <Lock size={18} aria-hidden="true" />
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={loading}
          className="mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-warm-accent font-extrabold text-warm-accent-text hover:bg-warm-accent-hover"
        >
          {loading ? copy.creating : copy.signUp}
          <ArrowRight weight="bold" size={16} aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-warm-muted">
        {copy.existing}{' '}
        <Link
          href={`${withLocale('/login', locale)}?next=${encodeURIComponent(next)}`}
          className="font-bold text-warm-fg underline transition-colors hover:text-warm-accent"
        >
          {copy.signIn}
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const locale = getLocaleFromPathname(usePathname());
  const copy = SIGNUP_COPY[locale];
  return (
    <div className="min-h-screen flex flex-col bg-warm-bg">
      <Header locale={locale} />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Form (signup-04) */}
        <div className="flex items-center justify-center py-8">
          <Suspense fallback={<div className="text-warm-muted animate-pulse">{copy.loading}</div>}>
            <SignupForm />
          </Suspense>
        </div>

        {/* Right Column: Hero Showcase (signup-04) */}
        <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-l border-warm-border bg-[#0B0B0D] p-12 text-white">
          {/* Subtle Background Pattern & Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-[#0B0B0D]/95 to-black z-0 pointer-events-none" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f0c444_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Top Branding */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#f0c444]">
              <Sparkle weight="fill" size={18} />
              <span>{copy.brandLine}</span>
            </div>
            <h2 className="mt-6 text-3xl font-black leading-tight text-white xl:text-4xl">
              {copy.heroTitle}
            </h2>
            <p className="mt-4 text-base text-white/70 max-w-md leading-relaxed">
              {copy.heroDescription}
            </p>
          </div>

          {/* Value Props Strip */}
          <div className="relative z-10 grid grid-cols-2 gap-4 my-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <Truck weight="bold" size={24} className="text-[#f0c444] mb-2" />
              <div className="text-sm font-bold text-white">{copy.deliveryTitle}</div>
              <div className="text-xs text-white/60 mt-0.5">{copy.deliveryDescription}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <ShieldCheck weight="bold" size={24} className="text-[#f0c444] mb-2" />
              <div className="text-sm font-bold text-white">{copy.inspectionTitle}</div>
              <div className="text-xs text-white/60 mt-0.5">{copy.inspectionDescription}</div>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/10 pt-6">
            <div className="text-xs font-semibold text-white/50">{copy.storeLocation}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
