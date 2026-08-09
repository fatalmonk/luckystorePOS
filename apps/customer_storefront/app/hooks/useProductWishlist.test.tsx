import React, { type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { getLocalWishlist } from '../lib/wishlistHelpers';
import { useProductWishlist } from './useProductWishlist';

const toggleWishlistItemServer = vi.fn();

vi.mock('../lib/wishlistHelpers', async () => {
  const actual = await vi.importActual<typeof import('../lib/wishlistHelpers')>('../lib/wishlistHelpers');
  return {
    ...actual,
    toggleWishlistItemServer: (...args: unknown[]) => toggleWishlistItemServer(...args),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('useProductWishlist', () => {
  beforeEach(() => {
    localStorage.clear();
    toggleWishlistItemServer.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', { randomUUID: () => 'fingerprint-1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rolls back optimistic state when server sync fails', async () => {
    toggleWishlistItemServer.mockRejectedValueOnce(new Error('sync failed'));
    const { result } = renderHook(() => useProductWishlist('p1', 'Test Rice'), { wrapper });

    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.isWishlisted).toBe(false);
    expect(getLocalWishlist()).not.toContain('p1');
  });

  it('synchronizes duplicate same-page product instances', async () => {
    toggleWishlistItemServer.mockResolvedValue(undefined);
    const first = renderHook(() => useProductWishlist('p1', 'Test Rice'), { wrapper });
    const second = renderHook(() => useProductWishlist('p1', 'Test Rice'), { wrapper });

    await act(async () => {
      await first.result.current.toggle();
    });

    await waitFor(() => {
      expect(second.result.current.isWishlisted).toBe(true);
    });
  });

  it('shares pending state across duplicate instances to avoid overlapping server toggles', async () => {
    let resolveServer: (() => void) | undefined;
    toggleWishlistItemServer.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveServer = resolve;
    }));
    const first = renderHook(() => useProductWishlist('p1', 'Test Rice'), { wrapper });
    const second = renderHook(() => useProductWishlist('p1', 'Test Rice'), { wrapper });

    await act(async () => {
      void first.result.current.toggle();
    });

    await waitFor(() => {
      expect(second.result.current.isWishlisted).toBe(true);
      expect(second.result.current.isPending).toBe(true);
    });

    await act(async () => {
      await second.result.current.toggle();
    });

    expect(toggleWishlistItemServer).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveServer?.();
    });

    await waitFor(() => {
      expect(first.result.current.isPending).toBe(false);
      expect(second.result.current.isPending).toBe(false);
    });
  });
});
