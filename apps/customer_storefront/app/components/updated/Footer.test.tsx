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

  it('shows concise delivery and payment details instead of repeating the brand story', () => {
    render(<Footer locale="en" />);

    expect(screen.getByText('Delivery: 09:00 AM–12:30 AM daily · Pay by COD or bKash')).toBeInTheDocument();
    expect(screen.queryByText(/Your Neighborhood Family Grocer, picking up quality products/)).not.toBeInTheDocument();
  });

  it('gives Bengali shoppers the same delivery-coverage qualification', () => {
    render(<Footer locale="bn" />);

    expect(screen.getByText('ডেলিভারি: প্রতিদিন সকাল ৯টা–রাত ১২:৩০ · COD বা bKash-এ পেমেন্ট')).toBeInTheDocument();
  });
});
