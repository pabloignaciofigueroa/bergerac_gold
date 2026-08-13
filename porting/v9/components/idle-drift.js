/* LAB · components/idle-drift.js — nada 100% quieto, nunca
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO: <div data-idle-drift="6">  → deriva máxima en px de un vaivén
   permanente (Lissajous suave con el pace de la casa [MEDIDO: 0.01]).
   Cada instancia se desfasa por orden de montaje (sin Math.random —
   determinista). NO combinar con data-mouse-parallax en el mismo elemento
   (ambos escriben x/y). Se apaga en reduced-motion. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  var seedCounter = 0;

  LAB.register('idle-drift', {
    selector: '[data-idle-drift]',
    init: function (el) {
      if (LAB.caps.reduced) return;
      /* guard: ambos escriben x/y y pelearían por el transform [S20-análisis] */
      if (el.hasAttribute('data-mouse-parallax')) {
        console.warn('[LAB idle-drift] combinado con data-mouse-parallax en', el,
                     '— pelean por x/y; drift omitido');
        return;
      }
      var amp = parseFloat(el.getAttribute('data-idle-drift')) || 6;
      var seed = (seedCounter++) * 1.7;
      var setX = gsap.quickSetter(el, 'x', 'px');
      var setY = gsap.quickSetter(el, 'y', 'px');
      var off = LAB.onTick(function (time) {
        setX(Math.sin(time * 0.5 + seed) * amp * 0.7);
        setY(Math.cos(time * 0.37 + seed * 1.3) * amp);
      });
      return { cleanup: off };
    }
  });
})();
