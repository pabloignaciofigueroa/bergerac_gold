/* LAB · components/form-estados.js — el formulario habla con voz de marca
   ─────────────────────────────────────────────────────────────────────────
   [item 65, bloque 6] El mock visual gana estados REALES: vacío / error /
   éxito, con la voz de tokens (voice.formEmpty / formErr / formOk).
   CONTRATO:
   <div data-form-lab>
     <input class="email-input" type="email">
     <a class="btn" …>enviar</a>
   </div>
   · Error: mensaje + shake (playful de tokens NO — seco, 3 golpes).
   · Éxito: la fila se funde y entra el mensaje con el trazo de subrayado.
   · Sigue siendo demo: no envía nada a ningún sitio (regla del lab). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('form-estados', {
    selector: '[data-form-lab]',
    init: function (el) {
      var input = el.querySelector('input');
      var btn = el.querySelector('.btn, button, a');
      if (!input || !btn) return;
      var V = (LAB.tokens && LAB.tokens.voice) || {};

      var msg = document.createElement('p');
      msg.className = 'form-msg t-eyebrow';
      msg.setAttribute('role', 'status');
      el.appendChild(msg);

      function decir(texto, tipo) {
        msg.textContent = texto;
        el.classList.remove('is-err', 'is-ok');
        if (tipo) el.classList.add(tipo);
      }

      function onSubmit(e) {
        e.preventDefault();
        var v = (input.value || '').trim();
        if (!v) {
          decir(V.formEmpty || 'Falta el correo.', 'is-err');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
          decir(V.formErr || 'Correo no válido.', 'is-err');
        } else {
          decir(V.formOk || 'Dentro.', 'is-ok');
          if (!LAB.caps.reduced) {
            gsap.to([input, btn], { autoAlpha: 0.35, duration: 0.4, ease: 'power2.out' });
          }
          input.setAttribute('disabled', '');
          return;
        }
        if (!LAB.caps.reduced) {
          gsap.fromTo(el, { x: 0 }, { keyframes: [{ x: -6 }, { x: 6 }, { x: -4 }, { x: 0 }],
            duration: 0.35, ease: 'power2.out' });
        }
        input.focus();
      }

      btn.addEventListener('click', onSubmit);
      function onKey(e) { if (e.key === 'Enter') onSubmit(e); }
      input.addEventListener('keydown', onKey);

      return {
        cleanup: function () {
          btn.removeEventListener('click', onSubmit);
          input.removeEventListener('keydown', onKey);
        }
      };
    }
  });
})();
