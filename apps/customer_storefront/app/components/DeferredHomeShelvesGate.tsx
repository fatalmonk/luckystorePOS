'use client';

import dynamic from 'next/dynamic';
import type { DeferredHomeShelvesProps } from './DeferredHomeShelves';

const DeferredHomeShelves = dynamic(
  () => import('./DeferredHomeShelves').then((mod) => mod.DeferredHomeShelves),
  { ssr: false, loading: () => <div className="min-h-[24rem]" aria-hidden="true" /> },
);

/** Client gate so the below-fold shelves are not in the initial document. */
export function DeferredHomeShelvesGate(props: DeferredHomeShelvesProps) {
  return <DeferredHomeShelves {...props} />;
}
