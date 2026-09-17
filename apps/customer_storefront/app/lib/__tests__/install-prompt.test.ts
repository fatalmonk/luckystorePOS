import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getInstallPrompt,
  clearInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../install-prompt';

describe('install-prompt module', () => {
  beforeEach(() => {
    clearInstallPrompt();
  });

  it('allows subscription and notification of prompt event', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeInstallPrompt(callback);

    expect(callback).toHaveBeenCalledWith(null);

    const fakePrompt = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    } as unknown as BeforeInstallPromptEvent;

    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), fakePrompt));

    expect(getInstallPrompt()).toBeDefined();

    clearInstallPrompt();
    expect(getInstallPrompt()).toBeNull();

    unsubscribe();
  });
});
