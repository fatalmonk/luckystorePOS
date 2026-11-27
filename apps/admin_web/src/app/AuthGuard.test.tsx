import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../lib/AuthContext';
import { AuthGuard } from './AuthGuard';

vi.mock('../lib/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./LoginPage', () => ({
  LoginPage: () => <div>Admin login</div>,
}));

const authMock = vi.mocked(useAuth);
const signOut = vi.fn().mockResolvedValue(undefined);

function useAuthState(overrides: Record<string, unknown> = {}) {
  authMock.mockReturnValue({
    session: { user: { id: 'auth-staff' } },
    user: {
      id: 'staff-1',
      authId: 'auth-staff',
      tenantId: 'tenant-1',
      storeId: 'store-1',
      role: 'manager',
      name: 'Staff',
    },
    loading: false,
    signOut,
    tenantId: 'tenant-1',
    storeId: 'store-1',
    ...overrides,
  } as ReturnType<typeof useAuth>);
}

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthState();
  });

  it('does not mount protected content while checking access', () => {
    useAuthState({ loading: true });
    render(<AuthGuard><div>Private dashboard</div></AuthGuard>);
    expect(screen.getByRole('status', { name: 'Checking account access' })).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });

  it('shows login when signed out', () => {
    useAuthState({ session: null, user: null });
    render(<AuthGuard><div>Private dashboard</div></AuthGuard>);
    expect(screen.getByText('Admin login')).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });

  it('denies an authenticated account without a linked staff profile', () => {
    useAuthState({ user: null });
    render(<AuthGuard><div>Private dashboard</div></AuthGuard>);
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('denies a staff profile from another auth identity', () => {
    useAuthState({
      user: { id: 'staff-1', authId: 'other-auth', tenantId: 'tenant-1', storeId: 'store-1', role: 'admin' },
    });
    render(<AuthGuard><div>Private dashboard</div></AuthGuard>);
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
  });

  it('denies staff accounts missing tenant or store associations', () => {
    useAuthState({
      user: { id: 'staff-1', authId: 'auth-staff', tenantId: '', storeId: 'store-1', role: 'cashier' },
    });
    render(<AuthGuard><div>Private dashboard</div></AuthGuard>);
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
  });

  it.each(['admin', 'manager', 'cashier'])('allows a linked %s profile', (role) => {
    useAuthState({
      user: { id: 'staff-1', authId: 'auth-staff', tenantId: 'tenant-1', storeId: 'store-1', role },
    });
    render(<AuthGuard><div>Private dashboard</div></AuthGuard>);
    expect(screen.getByText('Private dashboard')).toBeInTheDocument();
  });
});
