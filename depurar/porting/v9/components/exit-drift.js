/* LAB · components/exit-drift.js — SALIDAS con intención [item 39, bloque 4]
   ─────────────────────────────────────────────────────────────────────────
   Hoy todo ENTRA pero nada SALE: los elementos mueren de golpe al scrollear.
   Este componente da la salida: deriva vertical + desvanecido PROGRESIVO
   ligado al scroll (scrub — reversible al volver), cuando el elemento se
   acerca al borde superior.
   CONTRATO: <div data-exit="-14">  → yPercent de deriva (default -14).
   Solo tier high; en reduced no existe. Funciona también dentro de secciones
   sticky (el progreso es documental, no visual). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('exit-drift', {
    selector: '[data-exit]',
    init: function (el) {
      if (!LAB.caps.tierHigh || LAB.caps.reduced) return;
      var y = parseFloat(el.getAttribute('data-exit')) || -14;

      /* tarde y suave: a 'bottom 38%' el claim empezaba a borrarse con
         media pantalla de vida por delante [auditoría S26] */
      var tw = gsap.to(el, {
        yPercent: y,
        autoAlpha: 0.35,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'bottom 25%',
          end: 'bottom 4%',
          scrub: true
        }
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
