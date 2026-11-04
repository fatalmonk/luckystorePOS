import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeTrustStrip } from './HomeTrustStrip';

describe('HomeTrustStrip', () => {
  it('uses the family-grocer brand line and higher-contrast fact dividers', () => {
    render(<HomeTrustStrip />);

    expect(screen.getByText('Your Neighborhood Family Grocer')).toBeInTheDocument();

    const facts = screen.getByText('Delivery coverage').closest('dl');
    expect(facts).toHaveClass('grid-cols-2', 'border-warm-fg/40', 'lg:grid-cols-4');

    const factItems = facts?.querySelectorAll(':scope > div');
    expect(factItems?.[0]).toHaveClass('border-b', 'border-r', 'border-warm-fg/40');
    expect(factItems?.[3]).toHaveClass('lg:border-r-0');
  });
});
