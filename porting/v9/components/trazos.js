/* LAB · components/trazos.js — anotaciones manuscritas que se dibujan
   ─────────────────────────────────────────────────────────────────────────
   El gesto del referente (el brush "ON", los subrayados de energía) hecho
   sistema: una librería de marcas vectoriales dibujadas a mano alzada que
   se trazan solas al entrar en viewport (reutiliza firma-trazo).
   CONTRATO:
   <strong class="anota" data-trazo="circulo">tu marca</strong>
   · data-trazo = circulo | subrayado | flecha
   · El componente inyecta el SVG posicionado sobre el texto; el color sale
     de currentColor → var(--theme-detail) (re-skin automático).
   · NOTA HONESTA [item 29-33 del backlog]: arte artesanal en código; un
     ilustrador con Rive supera esto — cada marca es sustituible 1:1. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  /* preserveAspectRatio=none: la marca se ESTIRA al texto que anota — con
     el "meet" por defecto el dibujo se centra y encoge en frases anchas y
     el subrayado cubría media frase (QA S22, captura real) */
  var MARCAS = {
    circulo: {
      vb: '0 0 220 90', inset: '-30% -8% -26% -8%',
      paths: ['M28 52 C18 26 82 6 138 11 C198 16 214 42 201 63 C186 85 92 89 50 77 C22 69 15 55 34 38']
    },
    subrayado: {
      /* anclado a la BASELINE real (-0.14em), no a un % del box: en display
         caps con interlineado corto el -38% aterrizaba en el renglón de
         abajo (QA S22) */
      vb: '0 0 220 26', inset: 'auto -3% -0.14em -3%', alto: '0.3em',
      paths: ['M6 12 C62 5 152 5 214 11', 'M14 21 C72 14 152 13 206 17']
    },
    flecha: {
      vb: '0 0 120 60', inset: '-10% -4%',
      paths: ['M8 32 C42 22 68 22 102 30', 'M86 15 L108 30 L84 45']
    }
  };

  LAB.register('trazos', {
    selector: '[data-trazo]',
    init: function (el) {
      var m = MARCAS[el.getAttribute('data-trazo')];
      if (!m) { console.warn('[LAB trazos] marca desconocida', el); return; }
      if (el.querySelector('.trazo-svg')) return; /* guard anti-doble-init */
      /* SplitText (wipe-lines) clona el strong al partir líneas y deja un
         gemelo VACÍO — la marca va solo al fragmento que tiene el texto
         (gotcha #36); la flecha standalone (sin texto, fuera de wipes) pasa */
      if (!el.textContent.trim() && el.closest('.lab-wipe')) return;

      el.classList.add('anota');
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', m.vb);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('class', 'trazo-svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('data-firma-trazo', '');
      if (m.inset) svg.style.inset = m.inset;
      if (m.alto) { svg.style.top = 'auto'; svg.style.height = m.alto; }
      m.paths.forEach(function (d) {
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', d);
        svg.appendChild(p);
      });
      el.appendChild(svg);

      /* el svg nació después del escaneo de firma-trazo → escaneo dirigido */
      LAB.scan(el, 'firma-trazo');
    }
  });
})();
