import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { LoginPage } from './LoginPage';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

const mockResetPasswordForEmail = vi.mocked(supabase.auth.resetPasswordForEmail);

describe('LoginPage password recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it('requests a recovery email using the production reset page', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('admin@luckystore.com'), {
      target: { value: 'manager@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('manager@example.com', {
        redirectTo: 'https://admin.luckystore1947.com/reset-password',
      });
    });
    expect(
      screen.getByText('If that account exists, a password recovery email has been sent.'),
    ).toBeInTheDocument();
  });

  it('requires an email address before requesting recovery', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

    expect(screen.getByText('Enter your admin email first.')).toBeInTheDocument();
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });
});
