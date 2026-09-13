import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

export function initNavigation(method, theme) {
  const menu = document.getElementById('mobile-menu');
  const toggle = document.querySelector('.menu-toggle');
  const close = menu.querySelector('.menu-close');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let scrollTween;
  const stepIds = ['estudiar','definir','desarrollar','afinar'];

  function closeMenu(animate = true) {
    if (!menu.open) return;
    gsap.killTweensOf(menu);
    const finish = () => {menu.close();toggle.setAttribute('aria-expanded','false');gsap.set(menu,{clearProps:'transform,opacity'});};
    if (animate && !reduced.matches) gsap.to(menu,{y:-12,opacity:0,duration:.18,ease:'power3.out',onComplete:finish});
    else finish();
  }
  toggle.addEventListener('click', event => {
    gsap.killTweensOf(menu);
    menu.showModal(); toggle.setAttribute('aria-expanded','true');
    if (event.detail && !reduced.matches) gsap.fromTo(menu,{y:-16,opacity:0},{y:0,opacity:1,duration:.24,ease:'power3.out',clearProps:'transform,opacity'});
  });
  close.addEventListener('click',event=>closeMenu(Boolean(event.detail)));
  menu.addEventListener('cancel',()=>{gsap.killTweensOf(menu);toggle.setAttribute('aria-expanded','false');gsap.set(menu,{clearProps:'transform,opacity'});});
  matchMedia('(min-width: 901px)').addEventListener('change', event=>{if(event.matches)closeMenu(false);});

  function positionFor(hash) {
    const id = decodeURIComponent(hash.slice(1));
    const element = document.getElementById(id);
    if (!element) return null;
    const step = stepIds.indexOf(id);
    if (step >= 0) return method.getStepPosition(step);
    return id === 'inicio' ? 0 : element.getBoundingClientRect().top + scrollY - 100;
  }

  function go(hash, animate = false, focus = false) {
    const y = positionFor(hash);
    if (y === null) return;
    closeMenu(false);
    scrollTween?.kill();
    const finish = () => {
      theme.sync();
      if (focus) {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)));
        const previous = el.getAttribute('tabindex');
        el.setAttribute('tabindex','-1');el.focus({preventScroll:true});
        el.addEventListener('blur',()=>{if(previous===null)el.removeAttribute('tabindex');else el.setAttribute('tabindex',previous);},{once:true});
      }
    };
    if (animate && !reduced.matches) scrollTween = gsap.to(window,{scrollTo:{y,autoKill:true},duration:.7,ease:'power3.out',onComplete:finish});
    else {window.scrollTo({top:y,behavior:'instant'});theme.sync(true);finish();}
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (positionFor(link.hash) === null) return;
    event.preventDefault();
    history.pushState(null,'',link.hash);
    go(link.hash,Boolean(event.detail),!event.detail);
  });
  window.addEventListener('popstate',()=>go(location.hash || '#inicio',false));
  window.addEventListener('hashchange',()=>go(location.hash || '#inicio',false));
  return { go };
}
