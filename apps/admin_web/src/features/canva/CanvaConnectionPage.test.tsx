import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CanvaConnectionPage } from './CanvaConnectionPage';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));

describe('Canva connection UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/canva-connect');
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'retailos-session' } } });
  });
  it('shows capability state from metadata only', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ connection: {
      status: 'connected_missing_autofill', canvaTeamId: 'team', canvaUserId: 'user',
    } })));
    render(<CanvaConnectionPage />);
    expect(await screen.findByText('Connected; Canva autofill is unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconnect Canva' })).toBeEnabled();
  });
  it('relays OAuth callback once with RetailOS auth and removes browser query', async () => {
    window.history.replaceState(null, '', '/canva-connect/callback?state=oauth-state&code=oauth-code&error_description=private');
    const request = vi.fn().mockImplementation(() => {
      expect(window.location.search).toBe('');
      return Promise.resolve(Response.json({ status: 'connected_ready', canvaTeamId: 'team', canvaUserId: 'user' }));
    });
    vi.stubGlobal('fetch', request);
    render(<CanvaConnectionPage />);
    expect(await screen.findByText('Connected and ready')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toContain('/oauth/callback?state=oauth-state&code=oauth-code');
    expect(request.mock.calls[0][0]).not.toContain('private');
    expect(request.mock.calls[0][1].headers.Authorization).toBe('Bearer retailos-session');
  });
  it('disconnects without any image operation and reports failed remote revocation', async () => {
    const request = vi.fn().mockResolvedValueOnce(Response.json({ connection: {
      status: 'connected_ready', canvaTeamId: 'team', canvaUserId: 'user',
    } })).mockResolvedValueOnce(Response.json({ status: 'revoked', providerRevoked: false }));
    vi.stubGlobal('fetch', request);
    render(<CanvaConnectionPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Disconnect Canva' }));
    expect(await screen.findByText(/Disconnected locally/)).toBeInTheDocument();
    expect(request.mock.calls[1][1].method).toBe('DELETE');
    expect(request.mock.calls.every(call => String(call[0]).includes('/canva-connect/oauth'))).toBe(true);
  });
  it('never renders provider failure detail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'secret-provider-response' }, { status: 502 })));
    render(<CanvaConnectionPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to complete the Canva connection'));
    expect(screen.queryByText('secret-provider-response')).not.toBeInTheDocument();
  });
});
