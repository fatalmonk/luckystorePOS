import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeliveryParallax } from './DeliveryParallax';

vi.mock('./ParallaxHero', () => ({
  ParallaxHero: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('DeliveryParallax', () => {
  it('links shoppers directly to Lucky Store WhatsApp support', () => {
    render(<DeliveryParallax />);

    const link = screen.getByRole('link', { name: /Chat on WhatsApp/i });
    expect(link).toHaveAttribute(
      'href',
      'https://wa.me/8801731944544?text=Hello%20Lucky%20Store%2C%20I%20need%20help%20with%20my%20order.',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: /How ordering works/i })).not.toBeInTheDocument();
  });
});
