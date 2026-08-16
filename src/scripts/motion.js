/* ============================================================
   BERGERAC MERGE — MOTION GLOBAL (F4: fusión aprobada)
   Piel de v9 portada al boot vgold:
   · Lenis smooth scroll integrado con ScrollTrigger (los pins
     de vgold siguen mandando; Lenis solo suaviza el desplazamiento).
   · Reveals "wipe-lines" (contrato v9): cortina de color por línea.
     <el data-anim-high="dirección, color[, delay-ms]">
     dirección: right | left | top · color: token sin prefijo
     (accent, morado, ink-tint-1, …) · delay en múltiplos de 200.
     Modo bloque: añadir data-anim-high-block.
   Tier: en touch / reduced-motion el contenido queda visible sin
   coreografía y Lenis no se activa (scroll nativo).
   ============================================================ */

const DUR_IN = 0.6, DUR_OUT = 0.6, STAG = 0.15, EASE = 'power2.inOut';

function computeCaps(prefersReduced) {
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  return { reduced: prefersReduced, touch: coarse, tierHigh: !coarse && !prefersReduced };
}

/* ---- Lenis ---- */
function initLenis(ctx, caps) {
  const { gsap, ScrollTrigger } = ctx;
  if (!caps.tierHigh || !window.Lenis || !gsap || !ScrollTrigger) return null;

  /* Lenis toma el control del desplazamiento: el smooth CSS estorba */
  document.documentElement.style.scrollBehavior = 'auto';

  const lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* anclas internas vía Lenis (reemplaza el scroll-behavior CSS) */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.length < 2) return;
    a.addEventListener('click', (e) => {
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0 });
    });
  });

  return lenis;
}

/* ---- Wipe-lines (reveal por cortina, contrato v9) ---- */
function tokenColor(name) {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue('--color--' + name.trim());
  return v ? v.trim() : 'var(--color--accent)';
}

function parseSpec(raw) {
  const p = (raw || '').split(',').map((s) => s.trim());
  return {
    dir: p[0] || 'right',
    color: p[1] ? tokenColor(p[1]) : tokenColor('accent'),
    delay: p[2] ? (parseInt(p[2], 10) || 0) / 1000 : 0,
  };
}

function origins(dir) {
  if (dir === 'left') return { axis: 'scaleX', inO: '100% 50%', outO: '0% 50%' };
  if (dir === 'top') return { axis: 'scaleY', inO: '50% 100%', outO: '50% 0%' };
  return { axis: 'scaleX', inO: '0% 50%', outO: '100% 50%' }; /* right */
}

function buildCurtain(color) {
  const c = document.createElement('div');
  c.className = 'lab-wipe__curtain';
  c.style.background = color;
  c.setAttribute('aria-hidden', 'true');
  return c;
}

function mountWipe(el, ctx) {
  const { gsap } = ctx;
  const spec = parseSpec(el.getAttribute('data-anim-high'));
  const o = origins(spec.dir);
  const isBlock = el.hasAttribute('data-anim-high-block') || !el.textContent.trim();
  const units = [];
  let split = null;

  if (isBlock) {
    el.classList.add('lab-wipe', 'lab-wipe--block');
    const inner = document.createElement('div');
    inner.className = 'lab-wipe__inner';
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
    const curtain = buildCurtain(spec.color);
    el.appendChild(curtain);
    units.push({ inner, curtain });
  } else {
    el.classList.add('lab-wipe');
    split = new window.SplitText(el, { type: 'lines', linesClass: 'line' });
    split.lines.forEach((line) => {
      const inner = document.createElement('span');
      inner.className = 'lab-wipe__inner';
      while (line.firstChild) inner.appendChild(line.firstChild);
      line.appendChild(inner);
      const curtain = buildCurtain(spec.color);
      line.appendChild(curtain);
      units.push({ inner, curtain });
    });
  }

  units.forEach((u) => {
    gsap.set(u.inner, { autoAlpha: 0 });
    gsap.set(u.curtain, { transformOrigin: o.inO });
    gsap.set(u.curtain, o.axis === 'scaleX' ? { scaleX: 0 } : { scaleY: 0 });
  });

  const tl = gsap.timeline({
    delay: spec.delay,
    scrollTrigger: { trigger: el, start: 'top 85%', once: true },
  });

  units.forEach((u, i) => {
    const at = i * STAG;
    const grow = {}, shrink = {};
    grow[o.axis] = 1; shrink[o.axis] = 0;
    grow.duration = DUR_IN; grow.ease = EASE;
    shrink.duration = DUR_OUT; shrink.ease = EASE;
    tl.to(u.curtain, grow, at)
      .set(u.inner, { autoAlpha: 1 }, at + DUR_IN)
      .set(u.curtain, { transformOrigin: o.outO }, at + DUR_IN)
      .to(u.curtain, shrink, at + DUR_IN);
  });
}

function initWipes(ctx, caps) {
  if (!caps.tierHigh || !window.SplitText || !ctx.gsap) return;
  /* SplitText mide líneas falsas si la fuente no cargó (gotcha v9 #13) */
  const fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  /* con loader presente, los reveals esperan a que la cortina abra
     (lab:open) — si no, se dispararían escondidos detrás de ella */
  const loader = document.querySelector('[data-transition]');
  const opened = (loader && getComputedStyle(loader).display !== 'none')
    ? new Promise((res) => document.addEventListener('lab:open', res, { once: true }))
    : Promise.resolve();
  Promise.all([fonts, opened]).then(() => {
    document.querySelectorAll('[data-anim-high]').forEach((el) => mountWipe(el, ctx));
    if (ctx.ScrollTrigger) ctx.ScrollTrigger.refresh();
  });
}

/* ---- API ---- */
export function initMotion(ctx) {
  const caps = computeCaps(ctx.prefersReduced);
  if (window.CustomEase && ctx.gsap) ctx.gsap.registerPlugin(window.CustomEase);
  const lenis = initLenis(ctx, caps);
  initWipes(ctx, caps);
  return { caps, lenis };
}
