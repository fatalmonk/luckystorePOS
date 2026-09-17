export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((listener) => listener(deferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((listener) => listener(null));
  });
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearInstallPrompt(): void {
  deferredPrompt = null;
  listeners.forEach((listener) => listener(null));
}

export function subscribeInstallPrompt(callback: (prompt: BeforeInstallPromptEvent | null) => void): () => void {
  listeners.add(callback);
  callback(deferredPrompt);
  return () => {
    listeners.delete(callback);
  };
}
