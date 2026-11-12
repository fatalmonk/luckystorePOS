'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ANALYTICS_CONSENT_KEY } from '../lib/analytics';

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
    _fbq?: unknown;
    luckyLoadMetaPixel?: () => void;
  }
}

const META_PIXEL_ID = '2783542491893720';

function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

function isSensitiveRoute(path: string | null): boolean {
  if (!path) return false;
  const cleanPath = path.replace(/^\/bn/, '') || '/';
  if (cleanPath === '/order' || cleanPath.startsWith('/order/') || cleanPath === '/search') {
    return true;
  }
  if (typeof window !== 'undefined' && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('q') || params.has('num')) {
      return true;
    }
  }
  return false;
}

export function MetaPixel() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Provide a global loader callable by the consent banner upon user acceptance
    window.luckyLoadMetaPixel = () => {
      if (!hasConsent()) return;
      if (document.querySelector('script[data-lucky-pixel]')) {
        return;
      }

      if (!window.fbq) {
        const fbqStub: any = function (...args: unknown[]) {
          if (fbqStub.callMethod) {
            fbqStub.callMethod.apply(fbqStub, args);
          } else {
            fbqStub.queue.push(args);
          }
        };
        fbqStub.queue = [];
        fbqStub.loaded = true;
        fbqStub.version = '2.0';
        window.fbq = fbqStub;
        window._fbq = fbqStub;
        fbqStub('init', META_PIXEL_ID);
        if (!isSensitiveRoute(pathname)) {
          fbqStub('track', 'PageView');
        }
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.dataset.luckyPixel = 'true';
      script.setAttribute('data-cfasync', 'false');
      document.head.appendChild(script);
    };

    if (hasConsent()) {
      window.luckyLoadMetaPixel();
    }
  }, [pathname]);

  // Re-fire PageView on client-side route changes when consent is granted
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (hasConsent() && !isSensitiveRoute(pathname) && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [pathname]);

  return null;
}
