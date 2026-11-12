import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeTeaBanner } from './HomePromoBanners';

describe('HomeTeaBanner', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lazy-loads the original tea banner when resizing is off', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_RESIZE', '');
    render(<HomeTeaBanner />);
    const image = document.querySelector('img');
    expect(image).toHaveAttribute('src', '/images/tea-time.webp');
    expect(image).not.toHaveAttribute('srcset');
    expect(image).toHaveAttribute('width', '1600');
    expect(image).toHaveAttribute('height', '538');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(screen.getByRole('link', { name: 'Shop now' })).toHaveAttribute('href', '/category/tea-and-coffee');
  });

  it('serves a short Cloudflare srcset for the rendered banner width', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_RESIZE', '1');
    render(<HomeTeaBanner locale="bn" />);
    const image = document.querySelector('img');
    expect(image?.getAttribute('src')).toBe(
      '/cdn-cgi/image/width=800,quality=75,format=auto,fit=scale-down/images/tea-time.webp',
    );
    expect(image?.getAttribute('srcset')).toBe(
      [
        '/cdn-cgi/image/width=480,quality=75,format=auto,fit=scale-down/images/tea-time.webp 480w',
        '/cdn-cgi/image/width=800,quality=75,format=auto,fit=scale-down/images/tea-time.webp 800w',
      ].join(', '),
    );
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(screen.getByRole('link', { name: 'বাজার করুন' })).toHaveAttribute('href', '/bn/category/tea-and-coffee');
  });
});
