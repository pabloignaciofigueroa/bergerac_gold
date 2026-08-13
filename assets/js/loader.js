/* ============================================================
   BERGERAC MERGE — LOADER DE ENTRADA (transition v9, adaptado)
   Pantalla de carga antes de entrar: el ISOTIPO oficial Bergerac
   se revela con el PROGRESO REAL de carga (fuentes 25% + imágenes
   eager 75%, mínimo 750ms, techo 6s) con contador %, y la cortina
   sale en DOS ACTOS (tinta + franja accent que la persigue).
   Sin texto (el gag "entrando al estudio" fue eliminado a pedido).
   reduced-motion: overlay fuera, contenido inmediato.
   ============================================================ */

export function initLoader(ctx) {
  const el = document.querySelector('[data-transition]');
  if (!el) return;
  const { gsap, prefersReduced } = ctx;

  if (prefersReduced || !gsap) { el.style.display = 'none'; return; }

  const logo = el.querySelector('.loader-logo');
  const pct = document.createElement('span');
  pct.className = 'loader-pct';
  pct.textContent = '0%';
  el.appendChild(pct);

  /* dos actos: cortina tinta (encima) + franja accent (debajo, la persigue) */
  const acto2 = document.createElement('div');
  acto2.className = 'loader-acto is-2';
  const acto1 = document.createElement('div');
  acto1.className = 'loader-acto is-1';
  el.appendChild(acto2);
  el.appendChild(acto1);
  /* logo y % por encima de las cortinas */
  if (logo) el.appendChild(logo);
  el.appendChild(pct);

  /* ── el arte se FIRMA (v9): cada pieza del isotipo se traza con el
     progreso, una tras otra, y al completar se rellena de su color ── */
  const paths = logo ? Array.from(logo.querySelectorAll('path')) : [];
  const lens = paths.map((p) => {
    const L = p.getTotalLength();
    p.style.fill = p.getAttribute('fill');
    p.style.fillOpacity = '0';
    p.style.stroke = p.getAttribute('fill');
    p.style.strokeWidth = '5';
    p.style.strokeLinejoin = 'round';
    p.style.strokeLinecap = 'round';
    p.style.strokeDasharray = L;
    p.style.strokeDashoffset = L;
    return L;
  });

  /* ── progreso INTERPOLADO (fix "a saltos"): la carga real llega en
     brincos discretos (fuentes, imágenes) — un proxy desliza suave hacia
     el objetivo y pinta los trazos EN CADA FRAME, sin tweens que muerdan ── */
  const prog = { v: 0 };
  let objetivo = 0;

  function aplicar(p) {
    const n = paths.length || 1;
    paths.forEach((path, i) => {
      const local = Math.min(1, Math.max(0, p * n - i));
      path.style.strokeDashoffset = lens[i] * (1 - local);
    });
    pct.textContent = Math.round(p * 100) + '%';
  }

  function empujar() {
    gsap.to(prog, {
      v: objetivo,
      duration: 0.9, ease: 'power1.inOut', overwrite: 'auto',
      onUpdate: () => aplicar(prog.v),
    });
  }

  function abrir() {
    /* FIX carrera de tiempos: nada de abrir mientras el trazo va a medias.
       Acto 1: se COMPLETA el dibujo (todas las piezas a offset 0).
       Acto 2: relleno en cascada + pulso. Acto 3: cortinas. */
    gsap.killTweensOf(prog);
    gsap.killTweensOf(paths);
    const tl = gsap.timeline();
    let tCort = 0.15;
    if (logo && paths.length) {
      tl.to(paths, {
        strokeDashoffset: 0,
        duration: 0.45, ease: 'power2.inOut', stagger: 0.05,
      }, 0);
      const tFill = 0.45 + 0.05 * (paths.length - 1);   /* fin del trazo */
      tl.to(paths, { fillOpacity: 1, duration: 0.35, ease: 'power2.out', stagger: 0.06 }, tFill)
        .to(paths, { strokeOpacity: 0, duration: 0.3 }, tFill + 0.15)
        .to(logo, { scale: 1.05, duration: 0.3, ease: 'power1.inOut', yoyo: true, repeat: 1, transformOrigin: '50% 50%' }, tFill + 0.1);
      tCort = tFill + 0.75;
      tl.to([logo, pct], { autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, tCort);
    }
    tl.call(() => document.dispatchEvent(new CustomEvent('lab:open')), [], tCort)
      .to(acto1, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, tCort)
      .to(acto2, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, tCort + 0.12)
      .set(el, { display: 'none' });
  }

  /* ── PAUSA de entrada (pedido): 0.5s de grafito puro, luego el logo y
     el % aparecen en fundido lento, y recién entonces se dibuja ── */
  const INTRO = 500;               /* ms de fondo solo */
  const MIN_TOTAL = INTRO + 1100;  /* nada abre antes de esto: respiración */
  gsap.set([logo, pct].filter(Boolean), { autoAlpha: 0 });
  let introLista = false;
  setTimeout(() => {
    gsap.to([logo, pct].filter(Boolean), { autoAlpha: 1, duration: 0.6, ease: 'power2.out' });
    introLista = true;
    empujar(); /* arranca el dibujo con lo que ya haya cargado */
  }, INTRO);

  /* preloader real: fuentes 25% + imágenes eager 75% */
  const t0 = Date.now();
  const eager = [].filter.call(document.images, (i) => i.getAttribute('loading') !== 'lazy');
  let hechas = 0, fontsOK = false, abierto = false, seguridad;

  function update() {
    if (abierto) return;
    objetivo = (fontsOK ? 0.25 : 0) + 0.75 * (eager.length ? hechas / eager.length : 1);
    if (introLista) empujar();
    if (objetivo >= 0.995) {
      clearTimeout(seguridad);
      abierto = true;
      setTimeout(abrir, Math.max(200, MIN_TOTAL - (Date.now() - t0)));
    }
  }

  const cargada = () => { hechas++; update(); };
  eager.forEach((i) => {
    if (i.complete) hechas++;
    else {
      i.addEventListener('load', cargada, { once: true });
      i.addEventListener('error', cargada, { once: true });
    }
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { fontsOK = true; update(); });
  } else { fontsOK = true; }

  seguridad = setTimeout(() => { fontsOK = true; hechas = eager.length; update(); }, 6000);
  update();
}
