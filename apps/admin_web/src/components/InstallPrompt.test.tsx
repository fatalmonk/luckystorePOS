import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/sw-register', () => ({
  getInstallPrompt: () => ({ prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' }) }),
  clearInstallPrompt: vi.fn(),
}));

import { InstallPrompt } from './InstallPrompt';

describe('InstallPrompt', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });

  it('uses the admin portal install name', async () => {
    render(<InstallPrompt />);
    expect(await screen.findByText('Lucky Store Admin Portal')).toBeInTheDocument();
  });
});
