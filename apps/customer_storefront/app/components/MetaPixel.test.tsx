import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaPixel } from './MetaPixel';
import { ANALYTICS_CONSENT_KEY } from '../lib/analytics';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('MetaPixel', () => {
  beforeEach(() => {
    mockPathname = '/';
    localStorage.clear();
    delete (window as any).fbq;
    delete (window as any)._fbq;
    delete (window as any).luckyLoadMetaPixel;
    document.querySelectorAll('script[data-lucky-pixel]').forEach((s) => s.remove());
  });

  it('does not load pixel or fire PageView when consent is absent', () => {
    render(<MetaPixel />);
    expect(document.querySelector('script[data-lucky-pixel]')).toBeNull();
    expect((window as any).fbq).toBeUndefined();
  });

  it('immediately initializes fbq and queues PageView when consent is granted on standard routes', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    render(<MetaPixel />);

    expect(typeof (window as any).fbq).toBe('function');
    expect(typeof (window as any).luckyLoadMetaPixel).toBe('function');
    expect(document.querySelector('script[data-lucky-pixel]')).not.toBeNull();

    // Verify fbq queue contains init and PageView
    const queue = (window as any).fbq.queue;
    expect(queue).toEqual([
      ['init', '2783542491893720'],
      ['track', 'PageView'],
    ]);
  });

  it('does not fire duplicate PageView on subsequent luckyLoadMetaPixel calls', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    render(<MetaPixel />);

    const initialQueueLength = (window as any).fbq.queue.length;
    // Simulate subsequent reload / script execution call
    (window as any).luckyLoadMetaPixel();
    expect((window as any).fbq.queue.length).toBe(initialQueueLength);
  });

  it('skips PageView on sensitive routes (/order and /search)', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    mockPathname = '/order';
    render(<MetaPixel />);

    expect(typeof (window as any).fbq).toBe('function');
    const queue = (window as any).fbq.queue;
    // fbq initialized but no PageView queued
    expect(queue).toEqual([
      ['init', '2783542491893720'],
    ]);
  });
});
