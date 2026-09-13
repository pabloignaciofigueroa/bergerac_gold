import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initMethod } from './scripts/method.js';
import { initThemeController } from './scripts/theme-controller.js';
import { initNavigation } from './scripts/navigation.js';
import { initScrollScenes } from './scripts/scroll-scenes.js';
import { initContact } from './scripts/contact.js';
import { initProjects } from './scripts/projects.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ignoreMobileResize:true});
document.querySelectorAll('.button-label').forEach(label=>{
  const text=label.textContent;
  label.closest('a,button').setAttribute('aria-label',text);
  const span=document.createElement('span');span.className='button-text';span.textContent=text;
  label.replaceChildren(span);
});
await document.fonts.ready;
const method = initMethod();
const theme = initThemeController(method);
const navigation = initNavigation(method,theme);
initContact();
initProjects();
initScrollScenes();
ScrollTrigger.refresh();
if (location.hash) navigation.go(location.hash,false);
theme.refresh();
document.documentElement.dataset.ready='true';
window.addEventListener('pageshow',()=>{ScrollTrigger.refresh();theme.refresh();});
// The browser may perform its first fragment jump after module execution. A
// sticky method has virtual step positions, so restore that position after load.
if (location.hash) {
  const restoreInitialFragment=()=>requestAnimationFrame(()=>{
    ScrollTrigger.refresh();navigation.go(location.hash,false);theme.refresh();
  });
  if(document.readyState==='complete')restoreInitialFragment();
  else window.addEventListener('load',restoreInitialFragment,{once:true});
}

// Optional enhancement: a failed GPU or module download never hides the message.
import('./scripts/hero-cube.js').then(({initHeroCube})=>initHeroCube()).catch(error=>{
  document.getElementById('cube-stage').dataset.renderState='fallback';
  console.warn('El cubo usa su vista estática.',error);
});
