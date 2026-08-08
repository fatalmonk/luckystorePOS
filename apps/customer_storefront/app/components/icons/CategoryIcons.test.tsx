import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryIcon, resolveCategoryIcon } from './CategoryIcons';

describe('CategoryIcon', () => {
  it.each([
    'dairy-&-eggs',
    'Dairy & Eggs',
    'Cleaning Supply',
    'air-freshener',
    'chips-and-pretzels',
  ])('resolves %s to a known category family', (category) => {
    expect(resolveCategoryIcon(category).isKnown).toBe(true);
  });

  it('uses the deterministic generic glyph for an unknown category', () => {
    expect(resolveCategoryIcon('Miscellaneous Imports').isKnown).toBe(false);
    const { container } = render(<CategoryIcon category="Miscellaneous Imports" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not render emoji text', () => {
    render(<CategoryIcon category="Snacks" />);
    expect(screen.queryByText('🍿')).not.toBeInTheDocument();
  });
});
