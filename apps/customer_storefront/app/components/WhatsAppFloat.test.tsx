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

  it('keeps the support action available but places it clear of mobile auth form actions', () => {
    currentPath = '/signup';
    const { rerender } = render(<WhatsAppFloat />);
    const signupLink = screen.getByRole('link', { name: /Chat on WhatsApp/i });
    expect(signupLink).toHaveClass(
      'left-4',
      'right-auto',
      'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]',
      'max-[360px]:right-4',
      'max-[360px]:top-[calc(3.5rem+env(safe-area-inset-top,0px))]',
      'md:right-6',
    );

    currentPath = '/bn/login';
    rerender(<WhatsAppFloat />);
    expect(screen.getByRole('link', { name: /হোয়াটসঅ্যাপে যোগাযোগ করুন/i })).toHaveClass(
      'left-4',
      'right-auto',
      'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]',
    );
  });

  it('uses a neutral elevation shadow while preserving the green support affordance', () => {
    render(<WhatsAppFloat />);

    const link = screen.getByRole('link', { name: /Chat on WhatsApp/i });
    expect(link).toHaveClass('bg-[#25D366]');
    expect(link.className).toContain('shadow-[0_4px_12px_rgba(0,0,0,0.16)');
    expect(link.className).not.toContain('rgba(37,211,102,0.35)');
  });

  it('clears the mobile purchase bar on localized and English product pages', () => {
    currentPath = '/product/example-product';
    const { rerender } = render(<WhatsAppFloat />);

    const englishLink = screen.getByRole('link', { name: /Chat on WhatsApp/i });
    expect(englishLink).toHaveClass(
      'bottom-[calc(var(--bottom-nav-height)+5.25rem+env(safe-area-inset-bottom,0px))]',
      'md:bottom-6',
    );

    currentPath = '/bn/product/example-product';
    rerender(<WhatsAppFloat />);

    expect(screen.getByRole('link', { name: /হোয়াটসঅ্যাপে যোগাযোগ করুন/i })).toHaveClass(
      'bottom-[calc(var(--bottom-nav-height)+5.25rem+env(safe-area-inset-bottom,0px))]',
    );
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
