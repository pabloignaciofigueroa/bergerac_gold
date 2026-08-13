/* LAB · components/tilt.js — cards que se inclinan hacia la mano
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO: <div data-tilt="6">  → grados máximos de inclinación (default 6).
   Al hover, el elemento rota en 3D según la posición LOCAL del cursor
   (perspectiva 700); al salir, vuelve con el mismo lerp. El rect se lee
   por tick (los elementos del track horizontal SE MUEVEN — el rect vivo
   lo absorbe). Compone con x/y de otros componentes (propiedades gsap
   distintas). No-op sin puntero fino. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('tilt', {
    selector: '[data-tilt]',
    init: function (el) {
      if (!LAB.mouse || !LAB.mouse.enabled) return;
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      var active = false;
      var rx = 0, ry = 0;
      gsap.set(el, { transformPerspective: 700 });
      var setRX = gsap.quickSetter(el, 'rotationX', 'deg');
      var setRY = gsap.quickSetter(el, 'rotationY', 'deg');

      function enter() { active = true; }
      function leave() { active = false; }
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);

      var off = LAB.onTick(function () {
        var tx = 0, ty = 0;
        if (active) {
          var r = el.getBoundingClientRect();
          var nx = ((LAB.mouse.raw.x - r.left) / r.width) * 2 - 1;
          var ny = ((LAB.mouse.raw.y - r.top) / r.height) * 2 - 1;
          tx = -ny * max;
          ty = nx * max;
        }
        rx += (tx - rx) * 0.12;
        ry += (ty - ry) * 0.12;
        setRX(rx); setRY(ry);
      });

      return {
        cleanup: function () {
          off();
          el.removeEventListener('mouseenter', enter);
          el.removeEventListener('mouseleave', leave);
        }
      };
    }
  });
})();
