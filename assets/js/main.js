/* ============================================
   SelfTour — MAIN JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const mobileMenu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');
  const closeMenu = document.getElementById('closeMenu');

  // ---- Store platform (mobile viewport) ----
  function updateStorePlatform() {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const root = document.documentElement;

    if (!isMobile) {
      delete root.dataset.platform;
      return;
    }

    if (isIOS) {
      root.dataset.platform = 'ios';
    } else if (isAndroid) {
      root.dataset.platform = 'android';
    } else {
      delete root.dataset.platform;
    }
  }

  updateStorePlatform();
  window.matchMedia('(max-width: 767px)').addEventListener('change', updateStorePlatform);

  // ---- Hero video autoplay fallback ----
  const heroVideo = document.querySelector('.hero__phone-video');
  if (heroVideo) {
    heroVideo.muted = true;
    const playHeroVideo = () => {
      const promise = heroVideo.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {});
      }
    };

    playHeroVideo();
    heroVideo.addEventListener('loadeddata', playHeroVideo, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) playHeroVideo();
    });
  }

  // ---- Mobile menu ----
  if (hamburger && closeMenu && mobileMenu) {
    const mobileLinks = mobileMenu.querySelectorAll('a');

    function openMenu() {
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeMenuFn() {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', openMenu);
    closeMenu.addEventListener('click', closeMenuFn);
    mobileLinks.forEach(link => link.addEventListener('click', closeMenuFn));
  }

  // ---- Navbar scroll shadow ----
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  // ---- Active nav link on scroll ----
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav__link');

  function updateActiveLink() {
    const scrollPos = window.scrollY + 80;
    let activeId = '';

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        activeId = id;
      }
    });

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const isActive = href === `#${activeId}`;
      link.classList.toggle('active', isActive);
      link.classList.toggle('mobile-nav__link--active', isActive);
    });
  }

  if (sections.length && navLinks.length) {
    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();
  }

  // ---- Fade-in animations ----
  const stepCards = document.querySelectorAll('.step-card');
  stepCards.forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
    card.classList.add('fade-in');
  });

  const featureItems = document.querySelectorAll('.features-list__item');
  featureItems.forEach((item, i) => {
    item.style.transitionDelay = `${i * 0.08}s`;
    item.classList.add('fade-in');
  });

  const fadeEls = document.querySelectorAll('.fade-in:not(.visible)');
  if (fadeEls.length) {
    if ('IntersectionObserver' in window) {
      const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      fadeEls.forEach(el => fadeObserver.observe(el));
    } else {
      fadeEls.forEach(el => el.classList.add('visible'));
    }
  }
});
