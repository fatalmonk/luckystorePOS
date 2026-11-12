import type { DeferredHomeShelvesProps } from '../components/DeferredHomeShelves';
import type { Locale } from './i18n/config';

export async function fetchDeferredHomeShelves(locale: Locale, signal: AbortSignal): Promise<DeferredHomeShelvesProps> {
  const response = await fetch(`/api/home/deferred?locale=${locale}`, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error(`Homepage data request failed: ${response.status}`);
  return response.json() as Promise<DeferredHomeShelvesProps>;
}
