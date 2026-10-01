// One observer handles the public pages and components added after route changes.
const groups = [
  {
    selector: '.hero-tag, .hero-heading, .hero-sub, .hero-actions, .hero-gallery-frame, .about-story-hero .about-story-kicker, .about-story-hero h1, .about-story-hero p, .help-story-hero .about-story-kicker, .help-story-hero h1, .help-story-hero p, .help-story-hero .button',
  },
  {
    selector: '.reason-heading-block, .about-story-origin .about-story-photo, .about-story-offering .about-story-prose, .help-story-copy, .partner-application-copy',
    origin: 'left',
  },
  {
    selector: '.reason-copy-block, .about-story-origin .about-story-prose, .about-story-problem-copy > p, .help-story-code-panel, .help-story-history-list, .contact-page .contact-card, .partner-application-page:not(.contact-page) .partner-application-card',
    origin: 'right',
  },
  {
    selector: '.reason-image-wrap, .about-story-problem-intro > .about-story-kicker, .about-story-problem-intro > h2, .about-story-problem-collage, .about-story-section-heading, .about-story-timeline > li, .about-story-value, .about-story-visual-card, .about-story-honesty-card, .about-story-caveat, .about-story-cta .about-story-inner > *, .help-story-heading, .help-story-choice-card, .help-story-step, .help-story-app-preview, .help-story-tip, .help-story-result-card, .help-story-caveat, .help-story-account-grid > div, .help-story-maker-grid > div, .help-story-questions > *, .help-story-safety .about-story-inner > *, .public-scan-workspace .workspace-mode-switch, .capture-panel, .code-scan-launcher, .manufacturer-page-intro, .manufacturer-stat-card, .manufacturer-product-card, .manufacturer-panel-heading, .manufacturer-table-head, .manufacturer-table-row, .manufacturer-activity-row, .manufacturer-list-row, .manufacturer-export-row, .manufacturer-generate-form, .workspace-main-header, .thread-scan-entry, .demo-stage-card, .code-scan-result-card, .contact-dialog, .manufacturer-dialog, .legal-card',
    stagger: true,
  },
  { selector: '.reason-stat-card', origin: 'right', stagger: true },
];

const selector = groups.map((group) => group.selector).join(', ');

export function installScrollReveal(root) {
  if (!root || !('IntersectionObserver' in window)) return;

  const observed = new WeakSet();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0, rootMargin: '0px 0px -7% 0px' });

  function register(element) {
    if (observed.has(element)) return;
    const group = groups.find(({ selector: match }) => element.matches(match));
    if (!group) return;
    observed.add(element);
    element.classList.add('gn-reveal');
    if (group.origin) element.dataset.gnOrigin = group.origin;
    if (group.stagger && element.parentElement) {
      const siblings = [...element.parentElement.children].filter((sibling) => sibling.matches(group.selector));
      element.style.setProperty('--gn-delay', `${Math.min(siblings.indexOf(element), 4) * 65}ms`);
    }
    observer.observe(element);
  }

  function scan(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches(selector)) register(node);
    node.querySelectorAll(selector).forEach(register);
  }

  scan(root);
  document.documentElement.classList.add('gn-motion-ready');

  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.classList.contains('gn-reveal')) {
          observer.unobserve(node);
          observed.delete(node);
        }
        node.querySelectorAll('.gn-reveal').forEach((element) => {
          observer.unobserve(element);
          observed.delete(element);
        });
      }
    }
    for (const record of records) {
      for (const node of record.addedNodes) scan(node);
    }
  });
  mutations.observe(root, { childList: true, subtree: true });
}
