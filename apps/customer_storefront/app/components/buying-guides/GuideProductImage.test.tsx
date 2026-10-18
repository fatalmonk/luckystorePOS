import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GuideProductImage } from './GuideProductImage';

describe('GuideProductImage', () => {
  it('renders an accessible fallback when the catalogue image fails', () => {
    render(<GuideProductImage src="https://images.luckystore1947.com/missing.webp" alt="Rice product pack" />);
    fireEvent.error(screen.getByAltText('Rice product pack'));
    expect(screen.getByRole('img', { name: 'Rice product pack unavailable' })).toBeInTheDocument();
    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
  });
});
