/* LAB · components/mouse-parallax.js — capas que derivan con el cursor
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO: <div data-mouse-parallax="18">  → deriva máxima en px hacia el
   cursor (negativo = contra el cursor, para separar planos: el fondo sigue,
   el titular contra → profundidad). Lerp de la casa 0.05 [MEDIDO].
   Compone con parallax de scroll (este usa x/y px; aquél usa yPercent —
   GSAP los combina sin pisarse). No-op sin puntero fino. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('mouse-parallax', {
    selector: '[data-mouse-parallax]',
    init: function (el) {
      if (!LAB.mouse || !LAB.mouse.enabled) return;
      var amp = parseFloat(el.getAttribute('data-mouse-parallax'));
      if (!amp) return;
      var t = LAB.mouse.tracker(0.05);
      var setX = gsap.quickSetter(el, 'x', 'px');
      var setY = gsap.quickSetter(el, 'y', 'px');
      var off = LAB.onTick(function () {
        setX(t.nx * amp);
        setY(t.ny * amp * 0.7);
      });
      return { cleanup: off };
    }
  });
})();
