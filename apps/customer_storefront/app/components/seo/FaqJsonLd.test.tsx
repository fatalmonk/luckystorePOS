import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FaqJsonLd } from './FaqJsonLd';

describe('FaqJsonLd', () => {
  it('renders JSON-LD script tag with FAQPage schema', () => {
    const { container } = render(<FaqJsonLd />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const json = JSON.parse(script?.textContent || '{}');
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('FAQPage');
    expect(json.mainEntity).toHaveLength(4);
    expect(json.mainEntity[0].name).toBe('Does Lucky Store offer home delivery for online grocery in Chittagong?');
    expect(json.mainEntity[1].name).toBe('Where can I find an organic grocery shop near me in Chittagong?');
  });
});
