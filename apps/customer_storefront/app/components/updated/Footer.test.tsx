import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('keeps primary help, shopping, contact, and social paths available', () => {
    render(<Footer />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Need help with an order?' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'All groceries' })).toHaveAttribute('href', '/category');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '/#how-it-works',
    );
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'WhatsApp ↗' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });
});
