import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const consentUi = readFileSync(join(process.cwd(), 'public/scripts/google-consent-ui.v1.js'), 'utf8');

describe('consent UI fallback behavior', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    Reflect.deleteProperty(window, 'gtag');
    Reflect.deleteProperty(window, 'luckyConsentInitialized');
    Reflect.deleteProperty(window, 'luckyLoadGoogleAnalytics');
    Reflect.deleteProperty(window, 'luckyLoadMetaPixel');
  });

  it('keeps invalid stored choices visible and handles an unavailable gtag safely', () => {
    document.body.innerHTML = `
      <div id="lucky-consent-banner">
        <button id="lucky-consent-accept"></button>
        <button id="lucky-consent-reject"></button>
      </div>
    `;
    localStorage.setItem('lucky-analytics-consent', 'true');
    window.luckyConsentInitialized = false;
    window.eval(consentUi);

    const banner = document.getElementById('lucky-consent-banner') as HTMLDivElement;
    expect(banner.hidden).toBe(false);
    expect(() => document.getElementById('lucky-consent-accept')!.click()).not.toThrow();
    expect(banner.hidden).toBe(false);
    expect(localStorage.getItem('lucky-analytics-consent')).toBe('true');

    expect(() => document.getElementById('lucky-consent-reject')!.click()).not.toThrow();
    expect(localStorage.getItem('lucky-analytics-consent')).toBe('denied');
    expect(banner.hidden).toBe(true);
  });

  it('hides the banner only after a valid stored choice is applied', () => {
    document.body.innerHTML = `
      <div id="lucky-consent-banner">
        <button id="lucky-consent-accept"></button>
        <button id="lucky-consent-reject"></button>
      </div>
    `;
    localStorage.setItem('lucky-analytics-consent', 'granted');
    window.luckyConsentInitialized = true;
    window.gtag = vi.fn();
    window.eval(consentUi);

    expect((document.getElementById('lucky-consent-banner') as HTMLDivElement).hidden).toBe(true);
    expect(window.gtag).toHaveBeenCalledWith('consent', 'update', expect.objectContaining({ analytics_storage: 'granted' }));
  });
});
