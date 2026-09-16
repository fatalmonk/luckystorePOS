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
});
