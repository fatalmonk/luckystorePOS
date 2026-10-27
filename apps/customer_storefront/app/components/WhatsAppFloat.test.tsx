import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WhatsAppFloat } from './WhatsAppFloat';

let currentPath = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
}));

describe('WhatsAppFloat', () => {
  beforeEach(() => {
    currentPath = '/';
  });

  it('renders floating WhatsApp button in bottom-right corner', () => {
    render(<WhatsAppFloat />);

    const link = screen.getByRole('link', { name: /Chat on WhatsApp/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/8801731944544'));
    expect(link).toHaveClass('fixed');
    expect(link).toHaveClass('right-4');
    expect(link).toHaveClass('md:right-6');
  });

  it('renders localized message and aria-label in Bengali', () => {
    currentPath = '/bn';
    render(<WhatsAppFloat />);

    const link = screen.getByRole('link', { name: /হোয়াটসঅ্যাপে যোগাযোগ করুন/i });
    expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent('হ্যালো লাকি স্টোর')));
  });

  it('hides on /checkout and /order paths', () => {
    currentPath = '/checkout';
    const { container: checkoutContainer } = render(<WhatsAppFloat />);
    expect(checkoutContainer).toBeEmptyDOMElement();

    currentPath = '/order/123';
    const { container: orderContainer } = render(<WhatsAppFloat />);
    expect(orderContainer).toBeEmptyDOMElement();
  });
});
