import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startAuthRuntime } from './authRuntime';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('../../lib/supabase/client', () => ({ createClient: () => ({ auth: {
  getSession: mocks.getSession, signOut: mocks.signOut, onAuthStateChange: mocks.subscribe,
} }) }));
describe('auth runtime', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.subscribe.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } }); });
  it('does not overwrite a newer auth event with an older session read', async () => {
    let resolve!: (value: any) => void;
    mocks.getSession.mockReturnValue(new Promise((done) => { resolve = done; }));
    const publish = vi.fn();
    const runtime = startAuthRuntime(publish);
    const session = { user: { id: 'signed-in' } };
    mocks.subscribe.mock.calls[0][0]('SIGNED_IN', session);
    resolve({ data: { session: null }, error: null });
    expect(await runtime.ready).toEqual(session);
    expect(publish).toHaveBeenCalledTimes(1);
    runtime.dispose();
    mocks.subscribe.mock.calls[0][0]('SIGNED_OUT', null);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('propagates session and sign-out failures', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: new Error('offline') });
    mocks.signOut.mockResolvedValue({ error: new Error('sign-out failed') });
    const publish = vi.fn();
    const runtime = startAuthRuntime(publish);
    await expect(runtime.ready).rejects.toThrow('offline');
    await expect(runtime.signOut()).rejects.toThrow('sign-out failed');
    expect(publish).not.toHaveBeenCalled();
    runtime.dispose();
  });
});
