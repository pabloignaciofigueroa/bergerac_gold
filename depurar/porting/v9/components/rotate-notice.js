/* LAB · components/rotate-notice.js — aviso de rotación con gag animado
   ─────────────────────────────────────────────────────────────────────────
   El referente muestra un aviso animado en móvil apaisado ("gira el
   dispositivo"). Aquí: glifo de teléfono que rota en bucle + la voz de la
   marca desde tokens.voice.rotateNotice. La VISIBILIDAD la decide el CSS
   (media query apaisado+bajo); el componente solo construye el contenido
   → el texto y el color se re-visten solos. [item 35 del backlog]
   CONTRATO: <div class="rotate-notice" data-rotate-notice></div> */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('rotate-notice', {
    selector: '[data-rotate-notice]',
    init: function (el) {
      var voz = (LAB.tokens && LAB.tokens.voice && LAB.tokens.voice.rotateNotice) ||
                'Gira el dispositivo.';
      el.setAttribute('role', 'status');
      el.innerHTML =
        '<svg class="rotate-notice__glifo" viewBox="0 0 64 64" aria-hidden="true">' +
          '<rect x="20" y="10" width="24" height="44" rx="5"/>' +
          '<line x1="27" y1="16" x2="37" y2="16"/>' +
          '<circle cx="32" cy="47" r="1.6"/>' +
          '<path class="rotate-notice__giro" d="M50 22a22 22 0 0 1 0 20" />' +
          '<path class="rotate-notice__giro" d="M14 42a22 22 0 0 1 0-20" />' +
        '</svg>' +
        '<p class="rotate-notice__texto"></p>';
      el.querySelector('.rotate-notice__texto').textContent = voz;
    }
  });
})();
