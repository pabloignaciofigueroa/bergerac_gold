import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initMethod() {
  const section = document.querySelector('.method');
  const track = section.querySelector('.method-panels');
  const panels = [...track.children];
  const mm = gsap.matchMedia();
  let trigger = null, sticky = false, current = -1;

  function setStep(index) {
    if (current === index) return;
    current = index;
    section.dataset.activeStep = String(index);
    document.getElementById('method-current').textContent = String(index + 1).padStart(2,'0');
    panels.forEach((panel,i)=>{
      panel.classList.toggle('is-active',i===index);
      // Keep every panel painted: the next stage physically enters from the right.
      panel.inert = sticky && i!==index;
      if(sticky)panel.setAttribute('aria-hidden',String(i!==index));
      else panel.removeAttribute('aria-hidden');
    });
  }
  function update(self=trigger) {
    if(!sticky||!self)return;
    // Seven equal scroll spans: read, move, read, move, read, move, read.
    const span=gsap.utils.clamp(0,7,(scrollY-self.start)/Math.max(1,self.end-self.start)*7);
    const step=Math.min(3,Math.floor(span/2));
    const position=Math.min(3,step+gsap.utils.clamp(0,1,span-step*2-1));
    // Include the space between stages so each reading stop stays aligned.
    const gap=parseFloat(getComputedStyle(track).columnGap)||0;
    const stride=track.getBoundingClientRect().width+gap;
    gsap.set(track,{x:-stride*position,xPercent:0});
    setStep(Math.round(position));
  }
  mm.add('(min-width: 901px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)',()=>{
    sticky=true;current=-1;
    section.classList.add('is-sticky');
    trigger=ScrollTrigger.create({
      id:'method-horizontal',trigger:section,start:'top top',end:'bottom bottom',
      invalidateOnRefresh:true,onUpdate:update,onRefresh:update,
    });
    update();
    return()=>{
      sticky=false;trigger=null;current=-1;
      gsap.killTweensOf(track);
      gsap.set(track,{clearProps:'transform'});
      section.classList.remove('is-sticky');
      panels.forEach(panel=>{panel.inert=false;panel.removeAttribute('aria-hidden');panel.classList.remove('is-active');});
    };
  });
  mm.add('(max-width: 900px), (max-height: 649px), (prefers-reduced-motion: reduce)',()=>{
    panels.forEach((panel,index)=>ScrollTrigger.create({trigger:panel,start:'top 62%',onEnter:()=>setStep(index),onLeaveBack:()=>setStep(Math.max(0,index-1))}));
  });
  return {
    sync(){update();},
    getPinkBoundary(offset){return sticky&&trigger?trigger.start+(trigger.end-trigger.start)*.5:panels[2].getBoundingClientRect().top+scrollY-offset;},
    getStepPosition(index){return sticky&&trigger?trigger.start+(trigger.end-trigger.start)*(index*2+.5)/7:panels[index].getBoundingClientRect().top+scrollY-110;},
    destroy(){mm.revert();},
  };
}
