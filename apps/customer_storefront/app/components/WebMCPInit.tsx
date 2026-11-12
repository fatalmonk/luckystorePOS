'use client';

import { useEffect } from 'react';
import { initWebMCP } from '../lib/webmcp';

/**
 * Client component that initializes WebMCP on mount.
 * Renders nothing — just handles the browser-side lifecycle.
 */
export function WebMCPInit() {
  useEffect(() => {
    const controller = new AbortController();
    void initWebMCP(controller.signal);
    return () => controller.abort();
  }, []);

  return null;
}
