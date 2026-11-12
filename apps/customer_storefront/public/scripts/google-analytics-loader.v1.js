var consentStorageKey = 'lucky-analytics-consent';
var getAnalyticsChoice = function () {
  try { return localStorage.getItem(consentStorageKey); } catch { return null; }
};
var loadGtag = function () {
  if (!window.luckyConsentInitialized || getAnalyticsChoice() !== 'granted') return;
  if (document.querySelector('script[data-lucky-gtag]')) return;
  if (window.zaraz || window.google_tag_manager || window.luckyGtmLoading || window.luckyGtmLoaded) return;

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-K5JLJNSW6D';
  script.dataset.luckyGtag = 'true';
  script.setAttribute('data-cfasync', 'false');
  script.onload = function () {
    window.gtag('js', new Date());
    window.gtag('config', 'G-K5JLJNSW6D');
  };
  document.head.appendChild(script);
};
window.luckyLoadGoogleAnalytics = loadGtag;

var scheduleGtag = function () { window.setTimeout(loadGtag, 3000); };
if (getAnalyticsChoice() === 'granted' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(scheduleGtag, { timeout: 5000 });
} else if (getAnalyticsChoice() === 'granted') {
  scheduleGtag();
}
