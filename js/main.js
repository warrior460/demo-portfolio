/* =========================================================
   PUBLIC SITE BOOTSTRAP
   Wires up the interactive bits (nav, scroll reveal, active
   link tracking) and calls the shared renderer (shared/render.js)
   to paint content from shared/store.js (localStorage). Also
   listens for changes made in the Admin Panel (in another tab)
   and updates live, instantly.
   ========================================================= */

// ---------- Mobile nav toggle ----------
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---------- Scroll reveal (re-run after dynamic content is injected) ----------
let revealObserver = null;

function initReveal() {
  const revealEls = document.querySelectorAll('.reveal:not(.in-view)');
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  }
  revealEls.forEach(el => revealObserver.observe(el));
}

// ---------- Active nav link on scroll ----------
function setActive() {
  const sections = document.querySelectorAll('main section[id], #top');
  const navAnchors = document.querySelectorAll('.nav-link');
  let currentId = 'top';
  const scrollPos = window.scrollY + 120;

  sections.forEach(sec => {
    if (sec.offsetTop <= scrollPos) currentId = sec.id;
  });

  navAnchors.forEach(a => {
    a.style.color = a.dataset.nav === currentId ? 'var(--text)' : '';
  });
}
window.addEventListener('scroll', setActive, { passive: true });

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  // A page exported via the Admin Panel's "Publish" feature has real content
  // baked directly into the HTML and is marked with data-static="1". It must
  // NOT be overwritten by a visitor's own (empty) local storage.
  if (document.body.dataset.static === '1') {
    initReveal();
    setActive();
    return;
  }
  Store.applyTheme(Store.getTheme());
  SiteRenderer.renderContent(Store.getContent(), document);
  initReveal();
  setActive();
});

// ---------- Live sync from the Admin Panel (other tab) ----------
if (document.body.dataset.static !== '1' && typeof Store !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === Store.KEYS.content) {
      SiteRenderer.renderContent(Store.getContent(), document);
      initReveal();
    }
    if (e.key === Store.KEYS.theme) {
      Store.applyTheme(Store.getTheme());
    }
  });
}
