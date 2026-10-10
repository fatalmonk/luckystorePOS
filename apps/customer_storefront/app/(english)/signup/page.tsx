'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Envelope, Lock, User as UserIcon, Phone, ArrowRight, ShieldCheck, Truck, Sparkle } from '@phosphor-icons/react';
import { createClient } from '../../lib/supabase/client';
import { useToast } from '../../components/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Header } from '../../components/updated/Header';
import { Badge } from '../../components/ui/Badge';

function SignupForm() {
  const router = useRouter();
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
      showToast('All fields are required');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Auth service unavailable');
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
        showToast(error.message);
      } else {
        if (data.session) {
          showToast('Account created successfully!');
          router.push(next);
          router.refresh();
        } else {
          showToast('Account created! Please check your email to confirm registration.');
          router.push(`/login?next=${encodeURIComponent(next)}`);
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8">
        <Badge variant="default" className="mb-3">
          New Customer
        </Badge>
        <h1 className="text-3xl font-black tracking-tight text-warm-fg">Create Account</h1>
        <p className="mt-2 text-sm text-warm-muted">
          Join Lucky Store for fresh groceries, exclusive deals, and fast local delivery.
        </p>
      </div>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div className="relative">
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
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
            label="WhatsApp Number"
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
            label="Email Address"
            type="email"
            placeholder="you@example.com"
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
            label="Password"
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
          {loading ? 'Creating Account...' : 'Sign Up'}
          <ArrowRight weight="bold" size={16} aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-warm-muted">
        Already have an account?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-bold text-warm-fg underline transition-colors hover:text-warm-accent"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-warm-bg">
      <Header />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Form (signup-04) */}
        <div className="flex items-center justify-center py-8">
          <Suspense fallback={<div className="text-warm-muted animate-pulse">Loading signup form...</div>}>
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
              <span>Lucky Store · Est. 1947</span>
            </div>
            <h2 className="mt-6 text-3xl font-black leading-tight text-white xl:text-4xl">
              Authentic groceries delivered straight to your doorstep.
            </h2>
            <p className="mt-4 text-base text-white/70 max-w-md leading-relaxed">
              Serving Old Dhaka with genuine ingredients, heritage brands, and verified same-day neighborhood fulfillment.
            </p>
          </div>

          {/* Value Props Strip */}
          <div className="relative z-10 grid grid-cols-2 gap-4 my-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <Truck weight="bold" size={24} className="text-[#f0c444] mb-2" />
              <div className="text-sm font-bold text-white">1 km Delivery Radius</div>
              <div className="text-xs text-white/60 mt-0.5">Rapid delivery from Chawkbazar hub</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <ShieldCheck weight="bold" size={24} className="text-[#f0c444] mb-2" />
              <div className="text-sm font-bold text-white">Pay After Inspection</div>
              <div className="text-xs text-white/60 mt-0.5">Cash on delivery or bKash at doorstep</div>
            </div>
          </div>

          {/* Customer Quote / Trust Footer */}
          <div className="relative z-10 border-t border-white/10 pt-6">
            <blockquote className="text-sm italic text-white/80">
              “The most reliable grocery experience in Old Dhaka — authentic spices, pantry staples, and unmatched local care.”
            </blockquote>
            <div className="mt-3 text-xs font-semibold text-white/50">
              Trusted by 5,000+ neighborhood families
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
