import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActiveLink } from './ActiveLink';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('./CartProvider', () => ({
  useCartContext: () => ({ totalItems: 0 }),
}));

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex.match(/[a-f\d]{2}/gi)!.map((value) => {
      const channel = Number.parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };

  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('ActiveLink', () => {
  it('uses the accessible dark green treatment for external navigation', () => {
    render(
      <ActiveLink
        href="https://wa.me/8801731944544"
        icon={<span>icon</span>}
        label="WhatsApp"
        external
      />,
    );

    const link = screen.getByRole('link', { name: 'WhatsApp (opens in a new tab)' });
    expect(link).toHaveClass('text-[#0d6f37]');
    expect(link).toHaveClass('dark:text-[#25D366]');
    expect(link).not.toHaveClass('text-[#168f49]');
    expect(contrastRatio('#25D366', '#241e1a')).toBeGreaterThanOrEqual(4.5);
  });
});
