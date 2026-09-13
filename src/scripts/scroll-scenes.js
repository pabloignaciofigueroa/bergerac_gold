import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initScrollScenes() {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const intro = gsap.timeline();
    const root = document.documentElement;
    const resolved = document.querySelector('.contact-resolved');
    if (resolved) ScrollTrigger.create({trigger:resolved,start:'top 91%',once:true,onEnter:()=>resolved.classList.add('is-visible')});
    function enterHero() {
      if (scrollY >= 50 || location.hash || root.dataset.intro === 'cancelled') return;
      intro.from('.hero-title .line-mask > span',{yPercent:105,duration:.7,stagger:.07,ease:'power3.out',clearProps:'transform'})
        .from('.hero-statement, .hero-cta',{y:14,opacity:0,duration:.45,stagger:.06,ease:'power3.out',clearProps:'transform,opacity'},.32);
    }
    if (root.dataset.intro === 'prepared' || root.dataset.intro === 'playing') window.addEventListener('bergerac:hero-enter',enterHero,{once:true});
    else if (!root.dataset.intro) enterHero();
    document.querySelectorAll('[data-reveal]').forEach(el => {
      gsap.from(el, {y:24,opacity:0,duration:.65,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:el,start:'top 91%',once:true}});
    });
    gsap.from('.about-picture',{y:48,opacity:0,duration:.85,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:'.about-picture',start:'top 92%',once:true}});
    gsap.fromTo('.about-picture img',{scale:1.08},{scale:1,ease:'none',scrollTrigger:{trigger:'.about-picture',start:'top bottom',end:'bottom 30%',scrub:.4}});
    gsap.from('.social-symbols',{y:22,duration:.6,ease:'power3.out',clearProps:'transform',scrollTrigger:{trigger:'.social-symbols',start:'top 90%',once:true}});
    gsap.from('.project-slider',{y:35,opacity:0,duration:.7,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:'.project-slider',start:'top 95%',once:true}});
    return ()=>{resolved?.classList.remove('is-visible');intro.kill();window.removeEventListener('bergerac:hero-enter',enterHero);};
  });
  return {destroy:()=>mm.revert()};
}
