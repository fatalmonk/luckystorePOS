const DEBUG_POS = import.meta.env.VITE_DEBUG_POS === 'true';

export function debugLog(label: string, data: unknown) {
  if (DEBUG_POS) {
    console.log(`[${label}]:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }
}

export function createDebugLogger(namespace: string) {
  return (label: string, data: unknown) => debugLog(`${namespace} ${label}`, data);
}