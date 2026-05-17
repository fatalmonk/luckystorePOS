const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/
  )
);

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearInstallPrompt(): void {
  deferredPrompt = null;
}

export type SwStatus = 'installing' | 'waiting' | 'active' | 'redundant' | 'error';

type SwStatusCallback = (status: SwStatus) => void;

let statusListener: SwStatusCallback | null = null;

export function onSwStatusChange(cb: SwStatusCallback): () => void {
  statusListener = cb;
  return () => { statusListener = null; };
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });

  const swUrl = '/sw.js';

  if (isLocalhost) {
    // In localhost, check if a service worker still exists
    fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
      .then((response) => {
        const contentType = response.headers.get('content-type');
        if (contentType?.indexOf('javascript') === -1) {
          console.warn('[SW] Service worker not served with correct MIME type');
          return;
        }
        registerValidSW(swUrl);
      })
      .catch(() => {
        console.log('[SW] No service worker found in localhost — running in dev mode');
      });
  } else {
    registerValidSW(swUrl);
  }
}

function registerValidSW(swUrl: string): void {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          switch (installingWorker.state) {
            case 'installing':
              statusListener?.('installing');
              break;
            case 'installed':
              if (navigator.serviceWorker.controller) {
                statusListener?.('waiting');
              } else {
                statusListener?.('active');
              }
              break;
            case 'activating':
              statusListener?.('installing');
              break;
            case 'activated':
              statusListener?.('active');
              break;
            case 'redundant':
              statusListener?.('redundant');
              break;
          }
        };
      };
    })
    .catch((error) => {
      console.error('[SW] Registration failed:', error);
      statusListener?.('error');
    });
}