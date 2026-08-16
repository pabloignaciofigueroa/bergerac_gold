/* LAB · components/firma-trazo.js — la firma que se dibuja
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (ficha H03 — receta equivalente al `signature.riv` del referente):
   <svg data-firma-trazo viewBox="…">
     <path d="…" />  ← trazos con stroke (fill none); se dibujan en orden
   </svg>
   Mecánica: stroke-dasharray = longitud del path, dashoffset → 0.
   Valores [receta ficha]: 1.8s · power2.inOut · stagger 0.25 entre trazos ·
   ScrollTrigger top 75%, una vez. El color viene de currentColor (tema).
   reduced-motion: la firma se muestra dibujada, sin animación.
   Nota: getTotalLength() exige SVG renderizado — el motor bootea tras
   fonts.ready y layout, así que es seguro (gotcha #13). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('firma-trazo', {
    selector: '[data-firma-trazo]',
    init: function (svg) {
      var paths = svg.querySelectorAll('path');
      if (!paths.length) { console.warn('[LAB firma] sin paths', svg); return; }
      if (LAB.caps.reduced) return;

      /* NOTA: nada de start:'clamp(...)' — el clamp del vendor minificado
         congela el trigger y NUNCA dispara (A/B S23). Los starts
         inalcanzables del final del documento los resuelve el rescate
         central de core/scroll.js. */
      var tl = gsap.timeline({
        scrollTrigger: { trigger: svg, start: 'top 75%', once: true }
      });
      paths.forEach(function (p, i) {
        var len = p.getTotalLength();
        /* autoAlpha 0 hasta su turno: el stroke-linecap round dejaba un
           PUNTO visible (el cap del arranque) en trazos aún no dibujados */
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, autoAlpha: 0 });
        tl.set(p, { autoAlpha: 1 }, i * 0.25);
        tl.to(p, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }, i * 0.25);
      });

      return {
        cleanup: function () {
          if (tl.scrollTrigger) tl.scrollTrigger.kill();
          tl.kill();
        }
      };
    }
  });
})();
