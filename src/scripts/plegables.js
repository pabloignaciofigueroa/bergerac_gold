/* ============================================================
   BERGERAC MERGE — PLEGABLES (acordeones v9, ahora ANIMADOS)
   Apertura pausada y corta (0.42s power2.inOut): la altura se
   despliega con easing y el contenido entra con fundido
   escalonado sutil — nada aparece de sopetón. Cierre 0.32s.
   data-grupo: abrir uno cierra (animado) a los demás del grupo.
   reduced-motion: cambio instantáneo accesible.
   Tras cada cambio, safeRefresh de ScrollTrigger.
   ============================================================ */

export function initPlegables(ctx) {
  const plegables = Array.from(document.querySelectorAll('[data-plegable]'));
  if (!plegables.length) return;
  const { gsap, prefersReduced } = ctx;

  /* refresh compartido y debounced del boot (un solo refresh aunque se
     abran/cierren varios paneles seguidos) */
  const safeRefresh = ctx.safeRefresh || (() => {});

  function abrir(cuerpo) {
    if (prefersReduced || !gsap) { cuerpo.hidden = false; safeRefresh(); return; }
    cuerpo.hidden = false;
    gsap.killTweensOf(cuerpo);
    gsap.fromTo(cuerpo,
      { height: 0, autoAlpha: 0 },
      {
        height: cuerpo.scrollHeight, autoAlpha: 1,
        duration: .42, ease: 'power2.inOut',
        onComplete: () => { cuerpo.style.height = 'auto'; safeRefresh(); },
      });
    gsap.from(cuerpo.children, {
      y: 10, autoAlpha: 0,
      duration: .3, ease: 'power2.out',
      stagger: .05, delay: .14, clearProps: 'all',
    });
  }

  function cerrar(cuerpo) {
    if (prefersReduced || !gsap) { cuerpo.hidden = true; safeRefresh(); return; }
    gsap.killTweensOf(cuerpo);
    gsap.fromTo(cuerpo,
      { height: cuerpo.offsetHeight },
      {
        height: 0, autoAlpha: 0,
        duration: .32, ease: 'power2.inOut',
        onComplete: () => {
          cuerpo.hidden = true;
          cuerpo.style.height = '';
          cuerpo.style.opacity = '';
          cuerpo.style.visibility = '';
          safeRefresh();
        },
      });
  }

  plegables.forEach((pl) => {
    const boton = pl.querySelector('.plegable-cabeza');
    const cuerpo = pl.querySelector('.plegable-cuerpo');
    if (!boton || !cuerpo) return;
    boton.addEventListener('click', () => {
      const abierto = !cuerpo.hidden;
      const grupo = pl.dataset.grupo;
      if (grupo && !abierto) {
        plegables.filter((o) => o !== pl && o.dataset.grupo === grupo).forEach((o) => {
          const c = o.querySelector('.plegable-cuerpo');
          if (c && !c.hidden) cerrar(c);
          o.classList.remove('is-open');
          o.querySelector('.plegable-cabeza')?.setAttribute('aria-expanded', 'false');
        });
      }
      if (abierto) cerrar(cuerpo); else abrir(cuerpo);
      pl.classList.toggle('is-open', !abierto);
      boton.setAttribute('aria-expanded', String(!abierto));
    });
  });
}
