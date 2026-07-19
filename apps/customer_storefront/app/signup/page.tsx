'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Envelope, Lock, User as UserIcon, Phone, ArrowRight } from '@phosphor-icons/react';
import { createClient } from '../lib/supabase/client';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Header } from '../components/updated/Header';

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
        // If email confirmation is required, Supabase session might be null.
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
    <div className="w-full max-w-md p-6 bg-white border border-warm-border rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-warm-fg mb-2">Create Account</h1>
        <p className="text-sm text-warm-muted">Join Lucky Store today</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
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
          <span className="absolute left-3.5 bottom-3.5 text-warm-muted">
            <UserIcon size={18} />
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
          <span className="absolute left-3.5 bottom-3.5 text-warm-muted">
            <Phone size={18} />
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
          {loading ? 'Creating Account...' : 'Sign Up'}
          <ArrowRight weight="bold" size={16} />
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-warm-muted">
        Already have an account?{' '}
        <button
          onClick={() => router.push(`/login?next=${encodeURIComponent(next)}`)}
          className="font-bold text-warm-fg underline hover:text-warm-accent-hover transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-warm-bg">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="text-warm-muted animate-pulse">Loading signup form...</div>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
