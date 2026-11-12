(function () {
  var storageKey = 'lucky-analytics-consent';
  var banner = document.getElementById('lucky-consent-banner');
  var accept = document.getElementById('lucky-consent-accept');
  var reject = document.getElementById('lucky-consent-reject');
  if (!banner || !accept || !reject) return;

  var readChoice = function () {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  var saveChoice = function (value) {
    try { localStorage.setItem(storageKey, value); } catch {}
  };
  var clearAnalyticsCookies = function () {
    var hostParts = location.hostname.split('.');
    var domains = ['', location.hostname];
    if (hostParts.length > 2) domains.push('.' + hostParts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (name === '_ga' || name.indexOf('_ga_') === 0 || name === '_fbp' || name === '_fbc') {
        domains.forEach(function (domain) {
          document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '');
        });
      }
    });
  };
  var pendingZarazConsent = null;
  var syncZarazConsent = function (analyticsStorage) {
    var consent = window.zaraz && window.zaraz.consent;
    if (consent && consent.APIReady) {
      try {
        consent.set({ onAw: analyticsStorage === 'granted' });
        pendingZarazConsent = null;
        return;
      } catch {}
    }
    pendingZarazConsent = analyticsStorage;
  };
  document.addEventListener('zarazConsentAPIReady', function () {
    if (pendingZarazConsent === null) return;
    var consent = window.zaraz && window.zaraz.consent;
    if (!consent) return;
    try {
      consent.set({ onAw: pendingZarazConsent === 'granted' });
      pendingZarazConsent = null;
    } catch {}
  });
  var updateConsent = function (analyticsStorage) {
    if (!window.luckyConsentInitialized || typeof window.gtag !== 'function') return false;
    try {
      window.gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: analyticsStorage,
      });
      syncZarazConsent(analyticsStorage);
      return true;
    } catch {
      return false;
    }
  };
  var loadGoogleTagManager = function () {
    if (!window.luckyConsentInitialized || readChoice() !== 'granted') return;
    if (window.google_tag_manager || window.luckyGtmLoading || window.luckyGtmLoaded) return;
    window.luckyGtmLoading = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-PH4QHV3N';
    script.setAttribute('data-cfasync', 'false');
    script.onload = function () {
      window.luckyGtmLoaded = true;
      window.luckyGtmLoading = false;
    };
    script.onerror = function () { window.luckyGtmLoading = false; };
    document.head.appendChild(script);
  };

  if (!window.luckyConsentUiFallbackBound) {
    accept.addEventListener('click', function () {
      if (!updateConsent('granted')) {
        banner.hidden = false;
        return;
      }
      saveChoice('granted');
      loadGoogleTagManager();
      if (window.luckyLoadGoogleAnalytics) window.luckyLoadGoogleAnalytics();
      if (window.luckyLoadMetaPixel) window.luckyLoadMetaPixel();
      banner.hidden = true;
    });
    reject.addEventListener('click', function () {
      saveChoice('denied');
      updateConsent('denied');
      clearAnalyticsCookies();
      banner.hidden = true;
    });
  }

  var savedChoice = readChoice();
  var validChoice = savedChoice === 'granted' || savedChoice === 'denied';
  var consentUpdated = validChoice ? updateConsent(savedChoice) : false;
  banner.hidden = validChoice && (savedChoice === 'denied' || consentUpdated);
  if (savedChoice === 'granted' && consentUpdated) loadGoogleTagManager();
  if (savedChoice === 'denied') clearAnalyticsCookies();
})();
