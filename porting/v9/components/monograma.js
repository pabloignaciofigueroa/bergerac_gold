/* LAB · components/monograma.js — la firma corta de la marca [re-armado S28]
   ─────────────────────────────────────────────────────────────────────────
   El monograma ("DB" / "TA") vive en tokens.shapes.monograma como path de
   TRAZO GRUESO y se dibuja al entrar (reutiliza firma-trazo). Sustituye a
   las formas genéricas en el sello — y el loader lo usa directamente.
   CONTRATO: <svg class="sello-mono" data-monograma aria-hidden="true"></svg> */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('monograma', {
    selector: '[data-monograma]',
    init: function (el) {
      var shapes = (LAB.tokens && LAB.tokens.shapes) || {};
      if (!shapes.monograma) return;
      el.setAttribute('viewBox', '0 0 400 300');
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', shapes.monograma);
      el.appendChild(p);
      el.setAttribute('data-firma-trazo', '');
      LAB.scan(el, 'firma-trazo');
    }
  });
})();
