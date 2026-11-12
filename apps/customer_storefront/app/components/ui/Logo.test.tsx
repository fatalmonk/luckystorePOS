import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logo } from './Logo';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Logo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps the approved logo files when resizing is off', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_RESIZE', '');
    render(<Logo />);
    const light = screen.getByRole('img', { name: 'Lucky Store 1947' });
    const dark = document.querySelector('img[src="/logo-main-inverse.png"]');
    expect(light).toHaveAttribute('src', '/logo-main.png');
    expect(light).not.toHaveAttribute('srcset');
    expect(light).toHaveAttribute('width', '210');
    expect(light).toHaveAttribute('height', '48');
    expect(light).toHaveAttribute('loading', 'eager');
    expect(dark).toHaveAttribute('loading', 'lazy');
    expect(screen.getByRole('link', { name: 'Lucky Store 1947' })).toHaveAttribute('href', '/');
  });

  it('resizes the English PNG logos and leaves Bengali SVG artwork untouched', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_RESIZE', '1');
    const { unmount } = render(<Logo />);
    const light = screen.getByRole('img', { name: 'Lucky Store 1947' });
    expect(light.getAttribute('src')).toBe(
      '/cdn-cgi/image/width=420,quality=75,format=auto,fit=scale-down/logo-main.png',
    );
    expect(light.getAttribute('srcset')).toContain(
      '/cdn-cgi/image/width=210,quality=75,format=auto,fit=scale-down/logo-main.png 210w',
    );
    expect(light.getAttribute('srcset')).toContain(
      '/cdn-cgi/image/width=420,quality=75,format=auto,fit=scale-down/logo-main.png 420w',
    );
    expect(light).toHaveAttribute('width', '210');
    expect(light).toHaveAttribute('height', '48');
    const inverse = document.querySelector('img[alt=""]');
    expect(inverse?.getAttribute('src')).toContain('/logo-main-inverse.png');
    expect(inverse).toHaveAttribute('loading', 'lazy');
    unmount();

    render(<Logo locale="bn" />);
    const bangla = screen.getByRole('img', { name: 'লাকি স্টোর ১৯৪৭' });
    expect(bangla).toHaveAttribute('src', '/logo-bangla.svg');
    expect(bangla).not.toHaveAttribute('srcset');
    expect(bangla).toHaveAttribute('width', '155');
    expect(bangla).toHaveAttribute('height', '48');
  });
});
