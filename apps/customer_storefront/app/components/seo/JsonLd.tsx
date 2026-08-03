import type { ReactNode } from 'react';

interface JsonLdProps<T extends Record<string, unknown>> {
  data: T;
}

/**
 * Render JSON-LD structured data safely.
 * Escapes closing script tags to prevent injection when data is dynamic.
 */
export function JsonLd<T extends Record<string, unknown>>({ data }: JsonLdProps<T>): ReactNode {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
