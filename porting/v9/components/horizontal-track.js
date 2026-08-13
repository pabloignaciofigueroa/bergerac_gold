/* LAB · components/horizontal-track.js — el "workhorse": recorrido horizontal
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (ficha H04 · mecánica del referente [MEDIDO]: pinning por
   position:sticky CSS — el bundle original solo tiene 1 pin GSAP en total —
   y traslación X con scrub directo):
   <section data-horizontal-section>
     <div>                                  ← se convierte en viewport sticky
       <div data-horizontal-track> …contenido más ancho que la pantalla… </div>
     </div>
   </section>
   Mecánica: altura de la sección = (ancho sobrante del track) + 100svh;
   el track hace translateX con scrub:true entre 'top top' y 'bottom bottom' —
   1px de scroll vertical = 1px de recorrido horizontal (sensación directa
   del referente). Re-medición en resize (debounce 200ms).
   reduced-motion: SIN secuestro — la sección colapsa y el track queda en
   overflow-x nativo (clase is-native): el contenido sigue accesible. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('horizontal-track', {
    selector: '[data-horizontal-section]',
    init: function (section) {
      var track = section.querySelector('[data-horizontal-track]');
      if (!track) { console.warn('[LAB hz] falta [data-horizontal-track]', section); return; }

      section.classList.add('lab-hz');
      var viewport = track.parentElement;
      viewport.classList.add('lab-hz__viewport');
      track.classList.add('lab-hz__track');

      if (LAB.caps.reduced) { section.classList.add('is-native'); return; }

      var tween = null;
      function build() {
        if (tween) {
          if (tween.scrollTrigger) tween.scrollTrigger.kill();
          tween.kill();
          gsap.set(track, { x: 0 });
        }
        var dist = track.scrollWidth - viewport.clientWidth;
        if (dist <= 0) { section.style.height = ''; return; }
        section.style.height = (dist + viewport.clientHeight) + 'px';
        tween = gsap.to(track, {
          x: -dist, ease: 'none',
          scrollTrigger: {
            trigger: section, start: 'top top', end: 'bottom bottom', scrub: true
          }
        });
      }
      build();

      var rT;
      function onResize() {
        clearTimeout(rT);
        rT = setTimeout(function () { build(); ScrollTrigger.refresh(); }, 200);
      }
      addEventListener('resize', onResize);

      return {
        cleanup: function () {
          removeEventListener('resize', onResize);
          if (tween) {
            if (tween.scrollTrigger) tween.scrollTrigger.kill();
            tween.kill();
          }
        }
      };
    }
  });
})();
