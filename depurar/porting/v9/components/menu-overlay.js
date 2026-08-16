/* BERGERAC · components/menu-overlay.js — el menú de pantalla completa [F17]
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (gesto del canon: hamburguesa → overlay tinta, links display
   gigantes, pieza del isotipo por link en SU color):
     <button data-menu-toggle aria-controls="menu-overlay">…</button>
     <div class="menu-overlay" id="menu-overlay" data-menu-overlay>…links…</div>
   · Los estados visuales viven en CSS (.is-open) — gsap solo AÑADE la
     escalera de entrada (estado final = el estático: arnés y reduced OK).
   · Cierra: ESC · click en link · click en fondo · botón cerrar.
   · Scroll parado con LAB.scroll mientras está abierto; foco al primer
     link al abrir y de vuelta al toggle al cerrar. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('menu-overlay', {
    selector: '[data-menu-toggle]',
    init: function (btn) {
      var overlay = document.querySelector('[data-menu-overlay]');
      if (!overlay) return;
      var links = overlay.querySelectorAll('a');
      var cerrarBtn = overlay.querySelector('[data-menu-cerrar]');
      var abierto = false;

      function abrir() {
        if (abierto) return;
        abierto = true;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        btn.setAttribute('aria-expanded', 'true');
        if (LAB.scroll) LAB.scroll.stop();
        if (!LAB.caps.reduced && window.gsap) {
          gsap.from(links, { yPercent: 45, autoAlpha: 0, duration: 0.6,
            ease: 'power2.out', stagger: 0.055, overwrite: 'auto',
            clearProps: 'all' });
        }
        if (links[0]) links[0].focus({ preventScroll: true });
      }
      function cerrar() {
        if (!abierto) return;
        abierto = false;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        if (LAB.scroll) LAB.scroll.start();
        btn.focus({ preventScroll: true });
      }

      btn.addEventListener('click', function () { abierto ? cerrar() : abrir(); });
      if (cerrarBtn) cerrarBtn.addEventListener('click', cerrar);
      overlay.addEventListener('click', function (e) {
        /* link (deja navegar el ancla vía Lenis) o fondo: ambos cierran */
        if (e.target.closest('a') || e.target === overlay) cerrar();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && abierto) cerrar();
      });

      return { cleanup: function () { cerrar(); } };
    }
  });
})();
