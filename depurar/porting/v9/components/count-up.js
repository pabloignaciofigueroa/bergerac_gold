/* LAB · components/count-up.js — cifras que cuentan al entrar
   ─────────────────────────────────────────────────────────────────────────
   [item 59 bloque 6 + cierra el 43 del bloque 4]
   CONTRATO: <span data-countup="48" [data-countup-desde="12"]>48</span>
   · El markup lleva el valor FINAL (sin JS la cifra está completa).
   · Cuenta desde data-countup-desde (default: 40% del valor) al entrar en
     viewport, 1.6s power2.out, una vez. reduced: valor directo, sin animar. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('count-up', {
    selector: '[data-countup]',
    init: function (el) {
      var fin = parseFloat(el.getAttribute('data-countup'));
      if (isNaN(fin)) return;
      if (LAB.caps.reduced) { el.textContent = String(fin); return; }

      var desde = parseFloat(el.getAttribute('data-countup-desde'));
      if (isNaN(desde)) desde = Math.floor(fin * 0.4);
      var pad = (el.textContent.trim().charAt(0) === '0');
      var obj = { n: desde };

      var tw = gsap.to(obj, {
        n: fin,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onUpdate: function () {
          var v = String(Math.round(obj.n));
          el.textContent = (pad && v.length < 2) ? '0' + v : v;
        }
      });

      return {
        cleanup: function () {
          if (tw.scrollTrigger) tw.scrollTrigger.kill();
          tw.kill();
        }
      };
    }
  });
})();
