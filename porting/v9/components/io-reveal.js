/* LAB · components/io-reveal.js — coreografía táctil [item 67, bloque 7]
   ─────────────────────────────────────────────────────────────────────────
   En tier base (táctil) los wipes de tier high no existen y la página
   entraba MUERTA. Este componente da la entrada táctil: fade+rise suave
   por IntersectionObserver sobre los MISMOS [data-anim-high] (respetando
   su delay declarado). En tier high no hace nada; en reduced tampoco
   (contenido visible directo). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('io-reveal', {
    selector: '[data-anim-high], [data-anim-high-block]',
    init: function (el) {
      if (LAB.caps.tierHigh || LAB.caps.reduced) return;
      var spec = el.getAttribute('data-anim-high') || '';
      var delay = parseInt(spec.split(',')[2], 10) || 0;
      el.classList.add('io-wait');
      if (delay) el.style.transitionDelay = (delay / 1000) + 's';

      var io = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) { el.classList.add('io-in'); io.disconnect(); }
        });
      }, { threshold: 0.12 });
      io.observe(el);

      return { cleanup: function () { io.disconnect(); } };
    }
  });
})();
