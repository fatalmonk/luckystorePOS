import React from 'react';
import Link from 'next/link';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiquidButton } from './liquid';

describe('LiquidButton', () => {
  it('keeps the liquid fill and press interactions without a runtime animator', () => {
    const onClick = vi.fn();

    render(
      <LiquidButton onClick={onClick} fillHeight="3px" delay="0.3s" tapScale={0.97}>
        Add
      </LiquidButton>,
    );

    const button = screen.getByRole('button', { name: 'Add' });
    expect(button).toHaveClass('liquid-button');
    expect(button).toHaveStyle({
      '--liquid-button-rest-height': '3px',
      '--liquid-button-configured-delay': '0.3s',
      '--liquid-button-tap-scale': '0.97',
    });

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges liquid styles into an as-child link without changing its markup', () => {
    render(
      <LiquidButton asChild>
        <Link href="/category" className="category-link">Groceries</Link>
      </LiquidButton>,
    );

    const link = screen.getByRole('link', { name: 'Groceries' });
    expect(link).toHaveAttribute('href', '/category');
    expect(link).toHaveClass('category-link', 'liquid-button');
  });
});
