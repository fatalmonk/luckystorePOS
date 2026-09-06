import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

const mocks = vi.hoisted(() => ({ path: '/', start: vi.fn(), dispose: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => mocks.path }));
vi.mock('./authRuntime', () => ({ startAuthRuntime: mocks.start }));
function Consumer() {
  const auth = useAuth();
  return <><span>{auth.status}</span><span>{auth.user?.id}</span><button onClick={() => { void auth.signOut().catch(() => {}); }}>Sign out</button><button onClick={() => { void auth.ensureAuth().catch(() => {}); }}>Load</button><input aria-label="Cart state" defaultValue="preserved" /></>;
}
describe('deferred auth', () => {
  beforeEach(() => {
    mocks.path = '/';
    mocks.start.mockReset(); mocks.dispose.mockReset();
    mocks.start.mockImplementation((publish) => ({
      ready: Promise.resolve().then(() => { publish(null); return null; }),
      dispose: mocks.dispose, signOut: vi.fn(),
    }));
  });
  it('does not initialize on the homepage and keeps children mounted during initialization', async () => {
    render(<AuthProvider><Consumer /></AuthProvider>);
    expect(screen.getByText('unresolved')).toBeInTheDocument();
    expect(mocks.start).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Cart state'), { target: { value: 'edited' } });
    fireEvent.click(screen.getByText('Load'));
    fireEvent.click(screen.getByText('Load'));
    await screen.findByText('anonymous');
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Cart state')).toHaveValue('edited');
  });
  it('initializes on client navigation to checkout and cleans up the subscription', async () => {
    const view = render(<AuthProvider><Consumer /></AuthProvider>);
    mocks.path = '/checkout';
    view.rerender(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText('anonymous');
    view.unmount();
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });
  it('keeps session updates across public navigation and clears them on sign-out', async () => {
    let publish!: (session: any) => void;
    mocks.path = '/login';
    mocks.start.mockImplementation((callback) => {
      publish = callback;
      return { ready: Promise.resolve().then(() => callback(null)), dispose: mocks.dispose,
        signOut: vi.fn().mockImplementation(async () => callback(null)) };
    });
    const view = render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText('anonymous');
    act(() => publish({ user: { id: 'customer-1' } }));
    await screen.findByText('authenticated');
    mocks.path = '/';
    view.rerender(<AuthProvider><Consumer /></AuthProvider>);
    expect(screen.getByText('customer-1')).toBeInTheDocument();
    expect(mocks.start).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Sign out'));
    await screen.findByText('anonymous');
    expect(screen.queryByText('customer-1')).not.toBeInTheDocument();
  });

  it('does not create duplicate subscriptions under Strict Mode', async () => {
    mocks.path = '/profile';
    const view = render(<React.StrictMode><AuthProvider><Consumer /></AuthProvider></React.StrictMode>);
    await screen.findByText('anonymous');
    expect(mocks.start).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed lookup distinct from anonymous and permits retry', async () => {
    mocks.path = '/profile';
    mocks.start.mockImplementationOnce(() => { throw new Error('offline'); });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText('error');
    fireEvent.click(screen.getByText('Load'));
    await screen.findByText('anonymous');
  });
});
