/* LAB · components/text-roll.js — roll de hover por caracteres (truco text-shadow)
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (idéntico al referente [MEDIDO] · motion-spec §10):
   <a data-anim="text-hover" [data-text-hover-offset="-5.25rem"]>Label</a>
   Mecánica del referente [MEDIDO, 2ª revisión]: NO hay label duplicado en DOM —
   cada carácter lleva text-shadow: 0 <altura> currentColor (la "segunda copia"
   es la sombra, exactamente una línea por debajo). Al hover, los chars suben
   su altura y la sombra ocupa su lugar dentro de la ventana de recorte.
   Valores [MEDIDO]: duration 0.6 · stagger 0.02 · ease power3.out · overwrite.
   data-text-hover-offset: distancia fija opcional (caso nav del referente);
   por defecto se mide la altura real del char (robusto a cualquier tamaño).
   Tiers: hover-only → se omite en táctil y en reduced (el label queda normal).
   A11y: SplitText 3.13 gestiona aria automáticamente (aria-label + aria-hidden). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('text-roll', {
    selector: "[data-anim='text-hover']",
    init: function (el) {
      if (!LAB.caps.tierHigh) return;              /* hover-only */
      if (!window.SplitText) { console.warn('[LAB text-roll] falta SplitText'); return; }

      el.classList.add('lab-roll');

      var split = new SplitText(el, { type: 'chars', charsClass: 'roll-char' });
      var chars = split.chars;
      if (!chars.length) return;

      var fixed = el.getAttribute('data-text-hover-offset');   /* ej. "-5.25rem" */
      var h = chars[0].offsetHeight;                           /* medida real */
      var offset = fixed || (-h + 'px');

      /* VENTANA de recorte a una línea (equivale al clip de .line del referente).
         También aísla los chars de layouts flex del padre (gap del .btn) —
         bug cazado en QA S6, gotcha #25. */
      var win = document.createElement('span');
      win.className = 'roll-window';
      while (el.firstChild) win.appendChild(el.firstChild);
      el.appendChild(win);
      win.style.height = h + 'px';

      chars.forEach(function (c) {
        c.style.textShadow = '0 ' + (fixed ? fixed.replace('-', '') : h + 'px') + ' currentColor';
      });

      function to(y) {
        gsap.to(chars, { y: y, duration: 0.6, stagger: 0.02, ease: 'power3.out', overwrite: true });
      }
      function enter() { to(offset); }
      function leave() { to(0); }

      /* host: si el roll vive en un <span> dentro de un botón (patrón S21,
         botones con flecha), el hover/focus escucha en el BOTÓN entero —
         si no, rozar la flecha no rolaba y el foco de teclado se perdía */
      var host = el.closest('a, button') || el;
      host.addEventListener('mouseenter', enter);
      host.addEventListener('mouseleave', leave);
      host.addEventListener('focus', enter);       /* teclado = mismo deleite (reglas.md) */
      host.addEventListener('blur', leave);

      return {
        cleanup: function () {
          host.removeEventListener('mouseenter', enter);
          host.removeEventListener('mouseleave', leave);
          host.removeEventListener('focus', enter);
          host.removeEventListener('blur', leave);
          split.revert();
        }
      };
    }
  });
})();
