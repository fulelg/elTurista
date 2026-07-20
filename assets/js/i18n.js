/**
 * SelfTour — runtime i18n
 *
 * Locale resolution (first match wins):
 * 1. ?lang=xx in the URL (optional override for testing)
 * 2. navigator.language / related browser locales
 * 3. fallback: en
 *
 * Available languages are listed in config/locales/locales.json.
 * To add a language: create config/locales/{code}.json and add "{code}"
 * to locales.json. Only listed files are fetched (no 404 noise).
 */
(function () {
  const DEFAULT_LOCALE = 'en';
  const LOCALE_PATH = 'config/locales';
  const LOCALES_MANIFEST = `${LOCALE_PATH}/locales.json`;

  function get(obj, path) {
    return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  }

  function normalizeLocale(tag) {
    if (!tag || typeof tag !== 'string') return null;
    const normalized = tag.trim().replace(/_/g, '-').toLowerCase();
    return /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(normalized) ? normalized : null;
  }

  function expandLocale(tag) {
    const code = normalizeLocale(tag);
    if (!code) return [];
    const base = code.split('-')[0];
    return base && base !== code ? [base, code] : [code];
  }

  function browserLocaleCandidates() {
    const raw = [];

    if (navigator.language) raw.push(navigator.language);
    if (navigator.userLanguage) raw.push(navigator.userLanguage);

    try {
      const intl = Intl.DateTimeFormat().resolvedOptions().locale;
      if (intl) raw.push(intl);
    } catch (_) { /* ignore */ }

    if (Array.isArray(navigator.languages)) raw.push(...navigator.languages);

    const candidates = [];
    const seen = new Set();
    raw.forEach(tag => {
      expandLocale(tag).forEach(code => {
        if (!seen.has(code)) {
          seen.add(code);
          candidates.push(code);
        }
      });
    });
    return candidates;
  }

  function preferredLocaleCandidates() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = normalizeLocale(params.get('lang'));
    const seen = new Set();
    const candidates = [];

    const pushAll = tags => {
      tags.forEach(code => {
        if (!seen.has(code)) {
          seen.add(code);
          candidates.push(code);
        }
      });
    };

    if (fromUrl) pushAll(expandLocale(fromUrl));
    pushAll(browserLocaleCandidates());
    pushAll([DEFAULT_LOCALE]);
    return candidates;
  }

  function isLocaleMessages(data) {
    return Boolean(data && typeof data === 'object' && data.nav && data.brand);
  }

  async function loadAvailableLocales(base) {
    try {
      const res = await fetch(`${base}${LOCALES_MANIFEST}`);
      if (!res.ok) return [DEFAULT_LOCALE];
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.locales;
      const codes = (Array.isArray(list) ? list : [])
        .map(normalizeLocale)
        .filter(Boolean);
      return codes.length ? codes : [DEFAULT_LOCALE];
    } catch {
      return [DEFAULT_LOCALE];
    }
  }

  function matchAvailableLocale(candidate, availableSet) {
    if (availableSet.has(candidate)) return candidate;
    const base = candidate.split('-')[0];
    if (base && availableSet.has(base)) return base;
    return null;
  }

  async function fetchLocaleJson(base, code) {
    try {
      const res = await fetch(`${base}${LOCALE_PATH}/${code}.json`);
      if (!res.ok) return null;
      const data = await res.json();
      return isLocaleMessages(data) ? data : null;
    } catch {
      return null;
    }
  }

  async function resolveLocale(base) {
    const available = await loadAvailableLocales(base);
    const availableSet = new Set(available);
    const tried = new Set();

    for (const candidate of preferredLocaleCandidates()) {
      const code = matchAvailableLocale(candidate, availableSet);
      if (!code || tried.has(code)) continue;
      tried.add(code);

      const messages = await fetchLocaleJson(base, code);
      if (messages) {
        return { locale: code.split('-')[0] || code, messages };
      }
    }

    if (!tried.has(DEFAULT_LOCALE)) {
      const messages = await fetchLocaleJson(base, DEFAULT_LOCALE);
      if (messages) return { locale: DEFAULT_LOCALE, messages };
    }

    throw new Error('Failed to load any locale copy');
  }

  function applyText(root, messages) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const value = get(messages, el.dataset.i18n);
      if (value != null) el.textContent = value;
    });

    root.querySelectorAll('[data-i18n-html]').forEach(el => {
      const value = get(messages, el.dataset.i18nHtml);
      if (value != null) el.innerHTML = value;
    });

    root.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const value = get(messages, el.dataset.i18nAlt);
      if (value != null) el.setAttribute('alt', value);
    });

    root.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const value = get(messages, el.dataset.i18nAria);
      if (value != null) el.setAttribute('aria-label', value);
    });
  }

  function applySiteLinks(root, site) {
    const map = {
      appStore: site.links.appStore,
      googlePlay: site.links.googlePlay,
      privacy: site.links.privacy,
      terms: site.links.terms,
      home: site.links.home,
      tiktok: site.links.tiktok,
      instagram: site.links.instagram,
      youtube: site.links.youtube,
      email: `mailto:${site.brand.email}`
    };

    root.querySelectorAll('[data-config-href]').forEach(el => {
      const href = map[el.dataset.configHref];
      if (href) el.setAttribute('href', href);
    });

    root.querySelectorAll('[data-config-email]').forEach(el => {
      el.textContent = site.brand.email;
      if (el.tagName === 'A') el.setAttribute('href', `mailto:${site.brand.email}`);
    });
  }

  function applyMeta(messages, site) {
    const titleKey = document.documentElement.dataset.i18nTitle;
    const title = titleKey ? get(messages, titleKey) : messages.meta?.title;
    if (title) document.title = title;

    if (!messages.meta) return;

    const setMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el && content) el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', messages.meta.description);
    setMeta('meta[property="og:title"]', messages.meta.title);
    setMeta('meta[property="og:description"]', messages.meta.ogDescription || messages.meta.description);
    setMeta('meta[property="og:url"]', site.links.canonical);
    setMeta('meta[property="og:image"]', site.links.ogImage);
    setMeta('meta[name="twitter:title"]', messages.meta.title);
    setMeta('meta[name="twitter:description"]', messages.meta.ogDescription || messages.meta.description);
    setMeta('meta[name="twitter:image"]', site.links.ogImage);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', site.links.canonical);
  }

  function applyDocument(locale, messages, site) {
    document.documentElement.lang = locale;
    document.documentElement.dataset.i18nReady = 'true';
    document.documentElement.dataset.locale = locale;

    applyMeta(messages, site);
    applyText(document, messages);
    applySiteLinks(document, site);

    window.SelfTourConfig = site;
    window.SelfTourLocale = locale;
    window.SelfTourMessages = messages;

    document.dispatchEvent(new CustomEvent('i18n:ready', {
      detail: { locale, messages, site }
    }));
  }

  async function init() {
    const base = document.documentElement.dataset.base || '';
    const site = await fetch(`${base}config/site.json`).then(r => {
      if (!r.ok) throw new Error('Failed to load site config');
      return r.json();
    });

    const { locale, messages } = await resolveLocale(base);
    applyDocument(locale, messages, site);
    return { locale, messages, site };
  }

  window.SelfTourI18n = {
    init,
    get,
    resolveLocale,
    DEFAULT_LOCALE
  };
})();
