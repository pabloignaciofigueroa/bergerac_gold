/* LAB · components/oval-indicator.js — indicador oval de scroll (transversal)
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (referente [MEDIDO]: `data-oval-scroll` presente en TODAS las
   páginas + `.scroll-indicator` con mix-blend-mode: difference — se invierte
   sobre cualquier fondo sin conocer el tema):
   <div data-oval-indicator></div>                 ← una vez por página
   Cápsula fija al borde derecho; el punto interior viaja con el progreso de
   scroll y se ESTIRA con la |velocity| del bus (carácter del motor, [PROPIO]).
   Cuelga del ticker único; transform-only. reduced-motion: progreso sin
   estiramiento vía scroll nativo. aria-hidden (decorativo — el progreso ya
   lo da el propio scrollbar). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('oval-indicator', {
    selector: '[data-oval-indicator]',
    init: function (el) {
      el.classList.add('lab-oval');
      el.setAttribute('aria-hidden', 'true');
      var dot = document.createElement('span');
      dot.className = 'lab-oval__dot';
      el.appendChild(dot);

      function maxScroll() {
        return document.documentElement.scrollHeight - window.innerHeight;
      }
      function place(p, stretch) {
        var travel = el.clientHeight - dot.offsetHeight * stretch;
        dot.style.transform =
          'translate(-50%,' + (p * Math.max(0, travel)).toFixed(1) + 'px)' +
          ' scaleY(' + stretch.toFixed(3) + ')';
      }

      if (LAB.caps.reduced) {
        var onScroll = function () {
          var m = maxScroll();
          place(m > 0 ? (window.scrollY / m) : 0, 1);
        };
        addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return { cleanup: function () { removeEventListener('scroll', onScroll); } };
      }

      var off = LAB.onTick(function () {
        var m = maxScroll();
        var p = m > 0 ? (window.scrollY / m) : 0;
        var v = LAB.scroll ? Math.abs(LAB.scroll.velocity()) : 0;
        place(p, Math.min(1.8, 1 + v / 250));
      });
      return { cleanup: off };
    }
  });
})();
