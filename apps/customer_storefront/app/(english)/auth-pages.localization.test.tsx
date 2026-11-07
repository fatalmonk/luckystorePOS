import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './login/page';
import SignupPage from './signup/page';

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../lib/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../components/updated/Header', () => ({ Header: () => <header /> }));
vi.mock('../components/ui/Logo', () => ({ Logo: ({ href }: { href: string }) => <a href={href}>Logo</a> }));
vi.mock('../components/ui/Badge', () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock('../components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));
vi.mock('../components/ui/Input', () => ({
  Input: ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <label>{label}<input {...props} /></label>
  ),
}));

describe('Bengali auth page localization', () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it('localizes the login story, fields, actions, and navigation', () => {
    usePathnameMock.mockReturnValue('/bn/login');
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'আবার স্বাগতম' })).toBeInTheDocument();
    expect(screen.getByLabelText('ইমেইল ঠিকানা')).toBeInTheDocument();
    expect(screen.getByLabelText('পাসওয়ার্ড')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'সাইন ইন' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'অ্যাকাউন্ট তৈরি করুন' })).toHaveAttribute('href', '/bn/signup?next=%2Fprofile');
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
  });

  it('localizes signup and removes unsupported testimonial claims', () => {
    usePathnameMock.mockReturnValue('/bn/signup');
    render(<SignupPage />);

    expect(screen.getByRole('heading', { name: 'অ্যাকাউন্ট তৈরি করুন' })).toBeInTheDocument();
    expect(screen.getByLabelText('পূর্ণ নাম')).toBeInTheDocument();
    expect(screen.getByLabelText('হোয়াটসঅ্যাপ নম্বর')).toBeInTheDocument();
    expect(screen.getByLabelText('ইমেইল ঠিকানা')).toBeInTheDocument();
    expect(screen.getByLabelText('পাসওয়ার্ড')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'সাইন আপ' })).toBeInTheDocument();
    expect(screen.getByText('চকবাজার, চট্টগ্রাম')).toBeInTheDocument();
    expect(screen.queryByText(/Trusted by 5,000|most reliable grocery experience/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Old Dhaka|same-day neighborhood fulfillment/i)).not.toBeInTheDocument();
  });
});
