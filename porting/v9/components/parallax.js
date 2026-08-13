/* LAB · components/parallax.js — deriva vertical sutil ligada al scroll
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (patrón del referente en galería/retratos [DEDUCIDO de scrubs]):
   <div data-parallax="0.06">…</div>
   · valor = fracción del propio alto que deriva durante su paso por el
     viewport (positivo = baja; negativo = sube). Rango sano: 0.03–0.12.
   · Parejas cruzadas (split H05): izquierda -v, derecha +v.
   Mecánica: yPercent de -v·100 a +v·100 con scrub directo entre
   'top bottom' y 'bottom top' (lineal por scroll, regla de la casa).
   reduced-motion: sin deriva. Táctil: se mantiene (scrub nativo). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('parallax', {
    selector: '[data-parallax]',
    init: function (el) {
      if (LAB.caps.reduced) return;
      var v = parseFloat(el.getAttribute('data-parallax'));
      if (!v) return;

      var tween = gsap.fromTo(el,
        { yPercent: -v * 100 },
        {
          yPercent: v * 100, ease: 'none',
          scrollTrigger: {
            trigger: el, start: 'top bottom', end: 'bottom top', scrub: true
          }
        });

      return {
        cleanup: function () {
          if (tween.scrollTrigger) tween.scrollTrigger.kill();
          tween.kill();
        }
      };
    }
  });
})();
