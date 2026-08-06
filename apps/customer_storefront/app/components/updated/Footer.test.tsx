import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('keeps primary help, shopping, contact, and social paths available', () => {
    render(<Footer />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'LUCKY STORE' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'GROCERIES' })).toHaveAttribute('href', '/category');
    expect(screen.getByRole('link', { name: 'WEEKLY DEALS' })).toHaveAttribute(
      'href',
      '/category?theme=deals',
    );
    expect(screen.getByRole('link', { name: 'CONTACT' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });
});
