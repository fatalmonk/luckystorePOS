import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

describe('POST /api/webhooks/supabase-sync', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    vi.stubEnv('SUPABASE_SYNC_WEBHOOK_SECRET', '');
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.createClient.mockReturnValue({ from: mocks.from });
  });

  it('fails closed when the webhook secret is not configured', async () => {
    const response = await POST(new Request('http://localhost/api/webhooks/supabase-sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'user-1', email: 'user@example.com' }),
    }));

    expect(response.status).toBe(503);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('rejects an incorrect secret before performing privileged writes', async () => {
    vi.stubEnv('SUPABASE_SYNC_WEBHOOK_SECRET', 'expected-secret');

    const response = await POST(new Request('http://localhost/api/webhooks/supabase-sync', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': 'incorrect-secret',
      },
      body: JSON.stringify({ id: 'user-1', email: 'user@example.com' }),
    }));

    expect(response.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('allows a correctly authenticated webhook to sync the user', async () => {
    vi.stubEnv('SUPABASE_SYNC_WEBHOOK_SECRET', 'expected-secret');

    const response = await POST(new Request('http://localhost/api/webhooks/supabase-sync', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': 'expected-secret',
      },
      body: JSON.stringify({ id: 'user-1', email: 'user@example.com' }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.createClient).toHaveBeenCalledOnce();
    expect(mocks.from).toHaveBeenCalledWith('users');
    expect(mocks.upsert).toHaveBeenCalledOnce();
  });
});
