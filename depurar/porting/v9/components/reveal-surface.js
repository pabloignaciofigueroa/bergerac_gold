/* LAB · components/reveal-surface.js — la segunda firma: morfos de elipse
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (motion-spec §9b · valores [MEDIDO] en CSS del referente):
   <div data-reveal-surface>          → abre por elipse al entrar (top 80%, una vez)
   <div data-reveal-surface="manual"> → sin auto: instancia expone open()/close()
                                        (para menú overlay y widgets de dato vivo)
   <div data-reveal-hover>            → variante hover: la elipse se CONTRAE
                                        (patrón part-i del referente) — CSS puro
   Mecánica fiel al referente: el morfo es TRANSICIÓN CSS con la curva de la casa
   (var(--animation-default)), no un tween — este componente solo conmuta clases.
   Oculto:  clip-path: ellipse(100% 0%  at 50% 0)
   Visible: clip-path: ellipse(100% 120% at 50% 0)
   reduced-motion: contenido visible sin morfo (CSS lo resuelve, aquí solo estado). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('reveal-surface', {
    selector: '[data-reveal-surface]',
    init: function (el) {
      el.classList.add('lab-reveal');
      var mode = el.getAttribute('data-reveal-surface');

      function open()  { el.classList.add('is-open'); }
      function close() { el.classList.remove('is-open'); }

      if (LAB.caps.reduced) { open(); return { open: open, close: close }; }
      if (mode === 'manual') { return { open: open, close: close }; }

      var st = ScrollTrigger.create({
        trigger: el, start: 'top 80%', once: true, onEnter: open
      });
      return { open: open, close: close, cleanup: function () { st.kill(); } };
    }
  });
})();
