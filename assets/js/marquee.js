/* ============================================================
   BERGERAC MERGE — MARQUEE (F8: cinta infinita v9 portada)
   Contrato v9: <div data-marquee [data-marquee-speed="80"]
   [data-marquee-direction="1"] [data-marquee-reactive]
   [data-marquee-mouse]> con un ÚNICO hijo (el track).
   Reactivo: acelera con |velocidad| del scroll (Lenis) e invierte
   sentido con la dirección. reduced-motion → cinta estática.
   ============================================================ */

export function initMarquees(ctx) {
  const { gsap, caps, lenis } = ctx;
  const els = document.querySelectorAll('[data-marquee]');
  if (!els.length) return;

  let nx = 0;
  if (caps && caps.tierHigh) {
    addEventListener('pointermove', (e) => {
      nx = (e.clientX / innerWidth) * 2 - 1;
    }, { passive: true });
  }

  els.forEach((el) => {
    const track = el.firstElementChild;
    if (!track) return;

    const speed = parseFloat(el.getAttribute('data-marquee-speed')) || 80;
    const baseDir = parseInt(el.getAttribute('data-marquee-direction'), 10) || 1;
    const reactive = el.hasAttribute('data-marquee-reactive');
    const mouse = el.hasAttribute('data-marquee-mouse') && caps && caps.tierHigh;

    el.classList.add('lab-marquee');
    const mover = document.createElement('div');
    mover.className = 'lab-marquee__mover';
    track.classList.add('lab-marquee__track');
    el.insertBefore(mover, track);
    mover.appendChild(track);

    if (ctx.prefersReduced || !gsap) return; /* cinta estática accesible */

    let w = 0;
    function build() {
      for (let i = mover.children.length - 1; i > 0; i--) mover.removeChild(mover.children[i]);
      w = Math.max(track.offsetWidth, 1);
      const copies = Math.max(2, Math.ceil((el.offsetWidth * 2) / w));
      for (let j = 0; j < copies; j++) {
        const c = track.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        mover.appendChild(c);
      }
    }
    build();

    let x = 0, ts = baseDir, stretch = 1, lastT = 0;
    gsap.ticker.add((t) => {
      const dMs = lastT ? Math.min((t - lastT) * 1000, 50) : 16;
      lastT = t;
      const v = (lenis && typeof lenis.velocity === 'number') ? lenis.velocity : 0;
      const dirScroll = reactive ? (v < 0 ? -1 : 1) : 1;
      let target = baseDir * dirScroll * (1 + Math.abs(v) / 150);
      if (mouse) target *= (1 + nx * 0.18);
      target = Math.max(-3, Math.min(3, target));
      ts += (target - ts) * 0.1;
      x += speed * ts * (dMs / 1000);
      const wrapped = ((x % w) + w) % w;
      /* tensión máx 1.5% — más corría los glifos (auditoría v9 S26) */
      const sTarget = 1 + Math.min(Math.abs(v) * 0.0012, 0.015);
      stretch += (sTarget - stretch) * 0.1;
      mover.style.transform = `translate3d(${-wrapped}px,0,0) scaleX(${stretch.toFixed(4)})`;
    });

    let rT;
    addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(build, 200); });
  });
}
