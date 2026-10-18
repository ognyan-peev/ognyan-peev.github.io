(() => {
  const MEASUREMENT_ID = "G-CK8012PBLQ";
  const CONSENT_KEY = "ognyan_analytics_consent";
  let loaded = false;
  let sessionConsent = null;
  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY) || sessionConsent; }
    catch (e) { return sessionConsent; }
  }

  function loadAnalytics() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID, { anonymize_ip: true });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(s);
    document.dispatchEvent(new CustomEvent('analytics-ready'));
  }

  function setConsent(value) {
    sessionConsent = value;
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
    document.getElementById('cookieBanner')?.remove();
    if (value === 'accepted') loadAnalytics();
  }

  function showBanner() {
    if (document.getElementById('cookieBanner')) return;
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.id = 'cookieBanner';
    banner.innerHTML = `
      <div class="cookie-inner">
        <p><strong>Статистика на посещенията</strong><br>Сайтът използва Google Analytics само за анонимна статистика — посещения и време за четене. Данните не се показват публично.</p>
        <div class="cookie-actions">
          <button type="button" class="button secondary" id="cookieReject">Отказвам</button>
          <button type="button" class="button" id="cookieAccept">Приемам</button>
        </div>
      </div>`;
    document.body.appendChild(banner);
    document.getElementById('cookieAccept').addEventListener('click', () => setConsent('accepted'));
    document.getElementById('cookieReject').addEventListener('click', () => setConsent('rejected'));
  }

  const consent = getConsent();
  if (consent === 'accepted') loadAnalytics();
  else if (!consent) showBanner();

  window.siteAnalytics = {
    event(name, params={}) {
      if (getConsent() !== 'accepted') return;
      const send = () => window.gtag && gtag('event', name, params);
      if (loaded) send(); else document.addEventListener('analytics-ready', send, {once:true});
    }
  };
})();
