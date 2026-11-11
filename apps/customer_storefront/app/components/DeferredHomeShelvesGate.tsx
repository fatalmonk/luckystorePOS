'use client';

import type { DeferredHomeShelvesProps } from './DeferredHomeShelves';
import { DeferredHomeShelves } from './DeferredHomeShelves';

/** Server-rendered shelves. The client bundle for these sections loads with the page. */
export function DeferredHomeShelvesGate(props: DeferredHomeShelvesProps) {
  return <DeferredHomeShelves {...props} />;
}
