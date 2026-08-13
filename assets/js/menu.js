/* ============================================================
   BERGERAC MERGE — MENÚ OVERLAY (F6: v9 adaptado al boot vgold)
   Contrato v9: [data-menu-toggle] abre [data-menu-overlay];
   cierra con ESC, click en link, click en fondo o botón cerrar.
   Estados visuales en CSS (.is-open); GSAP solo añade la escalera
   de entrada. Con el overlay abierto, Lenis se detiene.
   ============================================================ */

export function initMenu(ctx) {
  const btn = document.querySelector('[data-menu-toggle]');
  const overlay = document.querySelector('[data-menu-overlay]');
  if (!btn || !overlay) return;

  const { gsap, prefersReduced } = ctx;
  const links = overlay.querySelectorAll('a');
  const cerrarBtn = overlay.querySelector('[data-menu-cerrar]');
  let abierto = false;

  function abrir() {
    if (abierto) return;
    abierto = true;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    if (ctx.lenis) ctx.lenis.stop();
    if (!prefersReduced && gsap) {
      gsap.from(links, {
        yPercent: 45, autoAlpha: 0, duration: 0.6,
        ease: 'power2.out', stagger: 0.055, overwrite: 'auto',
        clearProps: 'all',
      });
    }
    if (links[0]) links[0].focus({ preventScroll: true });
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    if (ctx.lenis) ctx.lenis.start();
    btn.focus({ preventScroll: true });
  }

  btn.addEventListener('click', () => (abierto ? cerrar() : abrir()));
  if (cerrarBtn) cerrarBtn.addEventListener('click', cerrar);
  /* capture: cerrar (y reactivar Lenis) ANTES de que el ancla navegue */
  overlay.addEventListener('click', (e) => {
    if (e.target.closest('a') || e.target === overlay) cerrar();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && abierto) cerrar();
  });
}
