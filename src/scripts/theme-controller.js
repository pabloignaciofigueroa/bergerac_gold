import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { palette, themes, stateAtPosition } from './theme-config.js';

export function initThemeController(method) {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sections = [...document.querySelectorAll('[data-section-theme]')];
  const links = [...document.querySelectorAll('.nav-pill a')];
  let markers = [];
  let currentTheme = null;
  let currentSection = null;
  let ready = false;

  function measure() {
    const offset = innerHeight * .62;
    markers = sections.map(section => ({
      y: section.id === 'inicio' ? 0 : section.getBoundingClientRect().top + scrollY - offset,
      theme: section.dataset.sectionTheme,
      section: section.id,
    }));
    markers.push({ y: method.getPinkBoundary(offset), theme: 'pink', section: 'metodo' });
    markers.sort((a, b) => a.y - b.y);
  }

  function sync(immediate = false) {
    method.sync(immediate);
    const state = stateAtPosition(markers, scrollY);
    if (currentTheme !== state.theme || immediate) {
      currentTheme = state.theme;
      root.dataset.theme = state.theme;
      document.querySelector('meta[name="theme-color"]').content = palette[state.theme];
      // One owner. Retarget from the current painted color; never queue transitions.
      gsap.to(root, {
        ...themes[state.theme], duration: immediate || reduced.matches ? 0 : .28,
        ease: 'power2.out', overwrite: true,
      });
    }
    if (currentSection !== state.section) {
      currentSection = state.section;
      root.dataset.activeSection = state.section;
      links.forEach(link => {
        if (link.hash === '#' + state.section) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }

  // Late layout refreshes must not snap an in-flight color transition.
  function refresh() { measure(); sync(!ready); }
  measure();
  sync(true);
  root.classList.add('has-motion');
  const trigger = ScrollTrigger.create({
    id: 'global-theme', start: 0, end: () => Math.max(1, ScrollTrigger.maxScroll(window)),
    onUpdate: () => { if (ready) sync(); },
  });
  ScrollTrigger.addEventListener('refresh', refresh);
  reduced.addEventListener('change', refresh);
  ready = true;

  return {
    sync, refresh,
    destroy() {
      trigger.kill(); gsap.killTweensOf(root);
      ScrollTrigger.removeEventListener('refresh', refresh);
      reduced.removeEventListener('change', refresh);
    },
  };
}
