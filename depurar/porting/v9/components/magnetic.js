/* LAB · components/magnetic.js — botones que se atraen al cursor
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO: <a class="btn" data-magnetic>…  (opcional data-magnetic="12"
   = desplazamiento máximo en px, default 10). Dentro de un radio de
   1.6× el tamaño del elemento, el botón se inclina hacia la mano con
   falloff suave; al salir, vuelve con muelle corto. No-op sin puntero. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('magnetic', {
    selector: '[data-magnetic]',
    init: function (el) {
      if (!LAB.mouse || !LAB.mouse.enabled) return;
      var amp = parseFloat(el.getAttribute('data-magnetic')) || 10;
      var setX = gsap.quickSetter(el, 'x', 'px');
      var setY = gsap.quickSetter(el, 'y', 'px');
      var cx = 0, cy = 0;

      var off = LAB.onTick(function () {
        var r = el.getBoundingClientRect();
        var mx = LAB.mouse.raw.x, my = LAB.mouse.raw.y;
        var ex = r.left + r.width / 2, ey = r.top + r.height / 2;
        var dx = mx - ex, dy = my - ey;
        var radius = Math.max(r.width, r.height) * 1.6;
        var dist = Math.hypot(dx, dy);
        var tx = 0, ty = 0;
        if (dist < radius) {
          var pull = (1 - dist / radius);           /* falloff lineal suave */
          tx = (dx / radius) * amp * 2 * pull;
          ty = (dy / radius) * amp * 2 * pull;
        }
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        setX(cx); setY(cy);
      });
      return { cleanup: off };
    }
  });
})();
