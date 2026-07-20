/**
 * SelfTour — runtime copy from config/locales/en.json + config/site.json
 */
(function () {
  const LOCALE = 'en';

  function get(obj, path) {
    return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
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

  async function init() {
    const base = document.documentElement.dataset.base || '';
    const site = await fetch(`${base}config/site.json`).then(r => {
      if (!r.ok) throw new Error('Failed to load site config');
      return r.json();
    });

    const messages = await fetch(`${base}config/locales/${LOCALE}.json`).then(r => {
      if (!r.ok) throw new Error('Failed to load locale copy');
      return r.json();
    });

    document.documentElement.lang = LOCALE;
    document.documentElement.dataset.i18nReady = 'true';

    applyMeta(messages, site);
    applyText(document, messages);
    applySiteLinks(document, site);

    window.SelfTourConfig = site;
    window.SelfTourLocale = LOCALE;
    window.SelfTourMessages = messages;

    document.dispatchEvent(new CustomEvent('i18n:ready', { detail: { locale: LOCALE, messages, site } }));
  }

  window.SelfTourI18n = { init, get };
})();
