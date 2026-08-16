/* LAB · components/skew-velocity.js — el gesto de arrastre [items 42+50, bloque 4]
   ─────────────────────────────────────────────────────────────────────────
   El contenido se INCLINA con la velocidad del scroll (skewY) y ASIENTA con
   gracia al parar (lerp de vuelta a 0 — el "settle" del item 50 es la
   matemática misma, no un caso aparte). Bus de velocity de core/scroll.js.
   CONTRATO: <div data-skew="0.35">  → factor (default 0.35). Máx ±4°.
   Convive con transforms de GSAP en el mismo nodo (propiedades distintas). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('skew-velocity', {
    selector: '[data-skew]',
    init: function (el) {
      if (!LAB.caps.tierHigh || LAB.caps.reduced || !LAB.scroll) return;
      var k = parseFloat(el.getAttribute('data-skew')) || 0.35;
      var setSkew = gsap.quickSetter(el, 'skewY', 'deg');
      var s = 0;

      var off = LAB.onTick(function () {
        /* máx 2.5° — a 4° el museo se sentía borracho [auditoría S26] */
        var target = Math.max(-2.5, Math.min(2.5, LAB.scroll.velocity() * k * 0.1));
        s += (target - s) * 0.12;
        setSkew(s);
      });

      return { cleanup: function () { off(); setSkew(0); } };
    }
  });
})();
