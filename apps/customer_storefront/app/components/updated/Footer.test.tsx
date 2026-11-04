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
    expect(screen.getByRole('link', { name: 'About us' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Return policy' })).toHaveAttribute('href', '/return-policy');
    expect(screen.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });

  it('uses the approved English neighborhood brand story', () => {
    render(<Footer locale="en" />);

    expect(
      screen.getByText(
        'Your Neighborhood Family Grocer, picking up quality products, your favorite brands and daily essentials since 1947. Delivery is limited to our published 1 km Chawkbazar area; check coverage before ordering.',
      ),
    ).toBeInTheDocument();
  });

  it('gives Bengali shoppers the same delivery-coverage qualification', () => {
    render(<Footer locale="bn" />);

    expect(screen.getByRole('link', { name: 'আমাদের সম্পর্কে' })).toHaveAttribute('href', '/bn/about');
    expect(screen.getByRole('link', { name: 'ফেরত নীতি' })).toHaveAttribute('href', '/bn/return-policy');
    expect(screen.getByRole('link', { name: 'ব্যবহারের শর্তাবলী' })).toHaveAttribute('href', '/bn/terms');
    expect(screen.getByText(/প্রকাশিত ডেলিভারি এলাকা চকবাজার থেকে ১ কিমির মধ্যে/)).toBeInTheDocument();
    expect(screen.getByText(/অর্ডারের আগে আপনার ঠিকানা আওতাভুক্ত কি না দেখে নিন/)).toBeInTheDocument();
  });
});
