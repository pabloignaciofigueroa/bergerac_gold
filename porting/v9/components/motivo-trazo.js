/* LAB · components/motivo-trazo.js — el motivo de marca que recorre la página
   ─────────────────────────────────────────────────────────────────────────
   Una línea decorativa LARGA (el "trazado" del referente: la pista, la ruta)
   que se dibuja al entrar en viewport. El PATH vive en tokens.shapes.motivo
   → cada marca dibuja SU recorrido (DEMO: fluido con bucle · TERRA: zigzag
   de sierra) sin tocar este archivo. [item 34+36 del backlog]
   CONTRATO: <div class="motivo" data-motivo aria-hidden="true"></div> */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('motivo-trazo', {
    selector: '[data-motivo]',
    init: function (el) {
      var shapes = (LAB.tokens && LAB.tokens.shapes) || {};
      var d = shapes.motivo;
      if (!d) return; /* marca sin motivo: el hueco simplemente no existe */

      var lista = Array.isArray(d) ? d : [d];
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 1200 120');
      svg.setAttribute('class', 'motivo-svg');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('data-firma-trazo', '');
      lista.forEach(function (pd) {
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', pd);
        svg.appendChild(p);
      });
      el.appendChild(svg);
      LAB.scan(el, 'firma-trazo');
    }
  });
})();
