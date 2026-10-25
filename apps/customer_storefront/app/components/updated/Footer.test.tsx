import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('keeps primary help, shopping, contact, and social paths available', () => {
    render(<Footer />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lucky Store 1947' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Groceries' })).toHaveAttribute('href', '/category');
    expect(screen.getByRole('link', { name: 'Weekly deals' })).toHaveAttribute(
      'href',
      '/category?theme=deals',
    );
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });

  it('limits English footer delivery claims to the published Chawkbazar area', () => {
    render(<Footer locale="en" />);

    expect(screen.getByText(/Delivery is limited to our published 1 km Chawkbazar area/)).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).not.toHaveTextContent('delivered with care across Chattogram');
  });

  it('gives Bengali shoppers the same delivery-coverage qualification', () => {
    render(<Footer locale="bn" />);

    expect(screen.getByText(/প্রকাশিত ডেলিভারি এলাকা চকবাজার থেকে ১ কিমির মধ্যে/)).toBeInTheDocument();
    expect(screen.getByText(/অর্ডারের আগে আপনার ঠিকানা আওতাভুক্ত কি না দেখে নিন/)).toBeInTheDocument();
  });
});
