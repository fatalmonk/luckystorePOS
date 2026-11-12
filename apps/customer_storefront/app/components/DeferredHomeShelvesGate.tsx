'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { DeferredHomeShelvesProps } from './DeferredHomeShelves';
import type { Locale } from '../lib/i18n/config';
import { fetchDeferredHomeShelves } from '../lib/homeDeferredClient';

const DeferredHomeShelves = dynamic(
  () => import('./DeferredHomeShelves').then((module) => module.DeferredHomeShelves),
  { ssr: false },
);

/** Load below-the-fold homepage sections shortly before they enter the viewport. */
export function DeferredHomeShelvesGate({ locale }: { locale: Locale }) {
  const gateRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [shelves, setShelves] = useState<DeferredHomeShelvesProps | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const gate = gateRef.current;
    if (!gate) return;

    if (!('IntersectionObserver' in window)) {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(gate);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nearViewport) return;
    const controller = new AbortController();

    async function loadShelves() {
      try {
        setLoadFailed(false);
        const data = await fetchDeferredHomeShelves(locale, controller.signal);
        setShelves(data);
      } catch {
        if (!controller.signal.aborted) setLoadFailed(true);
      }
    }

    void loadShelves();
    return () => controller.abort();
  }, [locale, nearViewport, retryCount]);

  return (
    <div ref={gateRef} data-testid="deferred-home-shelves-gate">
      {shelves ? <DeferredHomeShelves {...shelves} /> : loadFailed ? (
        <p role="status" className="mx-auto max-w-7xl px-4 py-8 text-sm text-warm-muted sm:px-6 lg:px-8">
          {locale === 'bn' ? 'হোমপেজের কিছু অংশ এখন লোড করা যাচ্ছে না।' : 'Some homepage sections are temporarily unavailable.'}{' '}
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => setRetryCount((count) => count + 1)}>
            {locale === 'bn' ? 'আবার চেষ্টা করুন' : 'Try again'}
          </button>
        </p>
      ) : (
        <div aria-hidden="true" className="min-h-[28rem]">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="h-64 rounded-xl bg-warm-fg/[0.03] sm:h-80" />
          </div>
        </div>
      )}
    </div>
  );
}
