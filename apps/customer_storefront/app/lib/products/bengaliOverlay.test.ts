import { describe, it, expect, vi } from 'vitest';
import { resolveBengaliOverlays } from './bengaliOverlay';

function createMockSupabase(rows?: Array<{ item_id: string; name?: string; description?: string }>, opts?: {
  error?: { message: string; code?: string } | null;
  throwOnCall?: boolean;
}) {
  const inFn = vi.fn().mockReturnThis();
  const eqChain = vi.fn().mockImplementation(() => {
    if (opts?.throwOnCall) throw new Error('network down');
    return Promise.resolve({ data: rows ?? [], error: opts?.error ?? null });
  });
  const client: any = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: inFn,
      eq: vi.fn().mockImplementation(function (this: any) {
        // First eq returns chainable object whose second eq resolves.
        return { eq: eqChain };
      }),
    })),
    inCalls: inFn,
  };
  return client;
}

describe('resolveBengaliOverlays', () => {
  it('reuses in-memory bengali fields without any database call', async () => {
    const supabase = createMockSupabase();
    const products = [
      { id: 'p1', bengaliName: 'চা', bengaliDescription: 'তাজা চা', bengaliTranslationResolved: true },
      { id: 'p2', bengaliName: 'কফি', bengaliDescription: undefined, bengaliTranslationResolved: true },
    ];

    const overlays = await resolveBengaliOverlays(supabase, products);

    expect(supabase.from).not.toHaveBeenCalled();
    expect(overlays.get('p1')).toEqual({ name: 'চা', description: 'তাজা চা' });
    expect(overlays.get('p2')).toEqual({ name: 'কফি', description: undefined });
  });

  it('queries only products whose translation status is unknown', async () => {
    const supabase = createMockSupabase([
      { item_id: 'p3', name: 'দুধ', description: 'খাঁটি দুধ' },
    ]);
    const products = [
      { id: 'p1', bengaliName: 'চা', bengaliTranslationResolved: true },
      // Verified as having NO published translation: must not be re-queried.
      { id: 'p2', bengaliTranslationResolved: true },
      { id: 'p3' },
    ];

    const overlays = await resolveBengaliOverlays(supabase, products);

    expect(supabase.inCalls).toHaveBeenCalledTimes(1);
    const requestedIds = supabase.inCalls.mock.calls[0][1];
    expect(requestedIds).toEqual(['p3']);
    expect(overlays.get('p1')).toEqual({ name: 'চা', description: undefined });
    expect(overlays.get('p3')).toEqual({ name: 'দুধ', description: 'খাঁটি দুধ' });
    // Verified-untranslated and missing translation: no entry, caller keeps
    // base-language content.
    expect(overlays.has('p2')).toBe(false);
  });

  it('triggers ZERO database calls when every product is resolved without translations', async () => {
    const supabase = createMockSupabase();
    const products = Array.from({ length: 50 }, (_, i) => ({
      id: `p${i}`,
      bengaliTranslationResolved: true,
    }));

    const overlays = await resolveBengaliOverlays(supabase, products);

    expect(supabase.from).not.toHaveBeenCalled();
    expect(overlays.size).toBe(0);
  });

  it('queries products with bengali fields but no resolved flag (failed lookup upstream)', async () => {
    const supabase = createMockSupabase([{ item_id: 'p1', name: 'চা' }]);
    // bengaliName present but lookup not marked resolved (e.g. stale snapshot
    // data): conservatively re-verify via DB.
    const products = [{ id: 'p1', bengaliName: 'চা' }];

    const overlays = await resolveBengaliOverlays(supabase, products);

    expect(supabase.inCalls).toHaveBeenCalledTimes(1);
    expect(overlays.get('p1')).toEqual({ name: 'চা', description: undefined });
  });

  it('batches missing ids in chunks of 100', async () => {
    const supabase = createMockSupabase([]);
    const products = Array.from({ length: 250 }, (_, i) => ({ id: `p${i}` }));

    await resolveBengaliOverlays(supabase, products);

    expect(supabase.inCalls).toHaveBeenCalledTimes(3);
    expect(supabase.inCalls.mock.calls[0][1]).toHaveLength(100);
    expect(supabase.inCalls.mock.calls[2][1]).toHaveLength(50);
  });

  it('runs batch queries concurrently, not sequentially', async () => {
    // Each batch only resolves once every batch has started; a sequential loop
    // would deadlock and time out.
    let started = 0;
    const allStarted: Array<() => void> = [];
    const client: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => {
            started += 1;
            return new Promise((res) => { allStarted.push(() => res({ data: [], error: null })); });
          }),
        })),
      })),
    };
    const products = Array.from({ length: 250 }, (_, i) => ({ id: `p${i}` }));

    const pending = resolveBengaliOverlays(client, products);
    await Promise.resolve();
    expect(started).toBe(3);
    allStarted.forEach((resolve) => resolve());
    await pending;
  });

  it('one failed batch does not prevent other batches from contributing overlays', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let call = 0;
    const client: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockImplementation(() => {
            call += 1;
            if (call === 1) return Promise.resolve({ data: null, error: { message: 'boom' } });
            return Promise.resolve({ data: [{ item_id: 'p150', name: 'ব্যাস' }], error: null });
          }),
        })),
      })),
    };
    const products = Array.from({ length: 200 }, (_, i) => ({ id: `p${i}` }));

    const overlays = await resolveBengaliOverlays(client, products);

    expect(overlays.get('p150')).toEqual({ name: 'ব্যাস', description: undefined });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('handles concurrent callers independently (no shared mutable state)', async () => {
    const supabase = createMockSupabase([{ item_id: 'p2', name: 'কফি' }]);

    const [a, b] = await Promise.all([
      resolveBengaliOverlays(supabase, [
        { id: 'p1', bengaliName: 'চা', bengaliTranslationResolved: true },
        { id: 'p2' },
      ]),
      resolveBengaliOverlays(supabase, [{ id: 'p2' }, { id: 'p3' }]),
    ]);

    expect(a.get('p2')).toEqual({ name: 'কফি', description: undefined });
    expect(b.get('p2')).toEqual({ name: 'কফি', description: undefined });
    expect(b.has('p3')).toBe(false);
  });

  it('degrades gracefully on a DB error for missing ids', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = createMockSupabase([], { error: { message: 'timeout' } });
    const products = [
      { id: 'p1', bengaliName: 'চা', bengaliTranslationResolved: true },
      { id: 'p2' },
    ];

    const overlays = await resolveBengaliOverlays(supabase, products);

    expect(overlays.get('p1')).toEqual({ name: 'চা', description: undefined });
    expect(overlays.has('p2')).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('treats a missing item_translations table as expected (no error log)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = createMockSupabase([], {
      error: { message: 'relation "public.item_translations" does not exist', code: '42P01' },
    });

    const overlays = await resolveBengaliOverlays(supabase, [{ id: 'p2' }]);

    expect(overlays.size).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('recovers from a thrown network failure without poisoning later calls', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const supabase = createMockSupabase([{ item_id: 'p2', name: 'কফি' }], { throwOnCall: true });

    const first = await resolveBengaliOverlays(supabase, [{ id: 'p2' }]);
    expect(first.size).toBe(0);

    // A fresh call with a healthy client resolves normally.
    const healthy = createMockSupabase([{ item_id: 'p2', name: 'কফি' }]);
    const second = await resolveBengaliOverlays(healthy, [{ id: 'p2' }]);
    expect(second.get('p2')).toEqual({ name: 'কফি', description: undefined });
    errorSpy.mockRestore();
  });

  it('returns an empty map for an empty product list without a DB call', async () => {
    const supabase = createMockSupabase();
    const overlays = await resolveBengaliOverlays(supabase, []);
    expect(overlays.size).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('skips products with empty ids', async () => {
    const supabase = createMockSupabase([]);
    const overlays = await resolveBengaliOverlays(supabase, [{ id: '' }, { id: 'p1' }]);
    expect(overlays.size).toBe(0);
    expect(supabase.inCalls.mock.calls[0][1]).toEqual(['p1']);
  });
});
