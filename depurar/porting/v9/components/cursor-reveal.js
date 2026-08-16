/* LAB · components/cursor-reveal.js — la segunda cara se revela BAJO la mano
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO: <div data-cursor-reveal> …capa base… <div class="cr-top">…</div> </div>
   La capa .cr-top (la cara "encendida") vive recortada en un círculo de
   radio 0; al entrar el cursor, el círculo crece (~9rem) y SIGUE la posición
   local de la mano con lerp 0.18 — la versión 2D del hover-reveal con shader
   del referente (uHoverReveal). Al salir, el círculo colapsa donde quedó.
   No-op sin puntero fino (la capa top queda oculta y el hover CSS de
   respaldo, si existe, sigue funcionando). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('cursor-reveal', {
    selector: '[data-cursor-reveal]',
    init: function (el) {
      var top = el.querySelector('.cr-top');
      if (!top) { console.warn('[LAB cursor-reveal] falta .cr-top', el); return; }
      if (!LAB.mouse || !LAB.mouse.enabled) return;

      var active = false;
      var r = 0, targetR = 0;
      var lx = 0, ly = 0, tx = 0, ty = 0;
      var MAXR; /* px, calculado por tamaño del elemento */

      function enter(e) {
        var rect = el.getBoundingClientRect();
        MAXR = Math.max(rect.width, rect.height) * 0.55;
        tx = lx = e.clientX - rect.left;
        ty = ly = e.clientY - rect.top;
        active = true; targetR = MAXR;
      }
      function move(e) {
        var rect = el.getBoundingClientRect();
        tx = e.clientX - rect.left;
        ty = e.clientY - rect.top;
      }
      function leave() { active = false; targetR = 0; }

      el.addEventListener('mouseenter', enter);
      el.addEventListener('mousemove', move);
      el.addEventListener('mouseleave', leave);

      var off = LAB.onTick(function () {
        r += (targetR - r) * 0.16;
        lx += (tx - lx) * 0.18;
        ly += (ty - ly) * 0.18;
        if (r < 0.5 && !active) { top.style.clipPath = 'circle(0px at ' + lx + 'px ' + ly + 'px)'; return; }
        top.style.clipPath = 'circle(' + r.toFixed(1) + 'px at ' + lx.toFixed(1) + 'px ' + ly.toFixed(1) + 'px)';
      });

      return {
        cleanup: function () {
          off();
          el.removeEventListener('mouseenter', enter);
          el.removeEventListener('mousemove', move);
          el.removeEventListener('mouseleave', leave);
        }
      };
    }
  });
})();
