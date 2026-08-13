/* LAB · components/img-settle.js — scale-settle fotográfico [item 41, bloque 4]
   ─────────────────────────────────────────────────────────────────────────
   Toda imagen del sistema duotono (.ph > .ph-img) entra ASENTÁNDOSE:
   1.15 → 1 con power2.out largo [receta del referente]. El contenedor .ph
   ya recorta (overflow hidden), así que el exceso nunca se ve.
   Automático: no necesita atributo — la clase .ph ES el contrato.
   Optar por fuera: data-no-settle en el .ph. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('img-settle', {
    selector: '.ph:not([data-no-settle])',
    init: function (el) {
      if (!LAB.caps.tierHigh || LAB.caps.reduced) return;
      var img = el.querySelector('.ph-img');
      if (!img) return;

      var tw = gsap.fromTo(img, { scale: 1.15 }, {
        scale: 1,
        duration: 1.4,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });

      return {
        cleanup: function () {
          if (tw.scrollTrigger) tw.scrollTrigger.kill();
          tw.kill();
        }
      };
    }
  });
})();
