/* ============================================================
   BERGERAC MERGE — PUNTERO (F7: paquete completo v9 portado)
   Bus de mouse + cursor propio con etiquetas + indicador oval
   + botones magnéticos, sobre el ticker de GSAP (sin motor LAB).
   Contratos v9:
   · <div data-lab-cursor></div>  — cursor (punto + halo + label);
     los targets declaran data-cursor="tocar|abrir|ir|…".
   · <div data-oval-indicator></div> — cápsula de progreso de scroll,
     el punto se estira con la velocidad.
   · [data-magnetic] (opcional ="12" px máx) — atracción al puntero.
   Todo se apaga en táctil / reduced-motion (bus inerte, cursor nativo).
   ============================================================ */

export function initPointer(ctx) {
  const { gsap, caps, lenis } = ctx;
  const enabled = !!(gsap && caps && caps.tierHigh);
  const cursorRoot = document.querySelector('[data-lab-cursor]');
  const ovalRoot = document.querySelector('[data-oval-indicator]');

  if (!enabled) {
    if (cursorRoot) cursorRoot.style.display = 'none';
    if (ovalRoot) ovalRoot.style.display = 'none';
    return;
  }

  document.documentElement.classList.add('pointer-fine');

  /* ---- bus de mouse (lerp compartido, inercia gratis) ---- */
  const raw = { x: innerWidth / 2, y: innerHeight / 2 };
  const trackers = [];
  const tracker = (lerp) => {
    const t = { x: raw.x, y: raw.y, lerp };
    trackers.push(t);
    return t;
  };
  addEventListener('pointermove', (e) => { raw.x = e.clientX; raw.y = e.clientY; }, { passive: true });

  const tickFns = [];
  gsap.ticker.add(() => {
    for (const t of trackers) {
      t.x += (raw.x - t.x) * t.lerp;
      t.y += (raw.y - t.y) * t.lerp;
    }
    for (const fn of tickFns) fn();
  });

  /* ---- cursor propio (punto rápido, halo lento, blend difference) ---- */
  if (cursorRoot) {
    cursorRoot.classList.add('lab-cursor');
    cursorRoot.setAttribute('aria-hidden', 'true');
    const dot = document.createElement('div'); dot.className = 'lab-cursor__dot';
    const halo = document.createElement('div'); halo.className = 'lab-cursor__halo';
    const label = document.createElement('span'); label.className = 'lab-cursor__label';
    halo.appendChild(label);
    cursorRoot.appendChild(halo); cursorRoot.appendChild(dot);

    const tDot = tracker(0.35);
    const tHalo = tracker(0.12);
    let scale = 1, targetScale = 1;

    tickFns.push(() => {
      scale += (targetScale - scale) * 0.2;
      dot.style.transform = `translate3d(${tDot.x}px,${tDot.y}px,0) translate(-50%,-50%)`;
      halo.style.transform = `translate3d(${tHalo.x}px,${tHalo.y}px,0) translate(-50%,-50%) scale(${scale.toFixed(3)})`;
    });

    const over = (e) => {
      const t = e.target.closest ? e.target.closest('[data-cursor], a, button, input') : null;
      if (!t) { targetScale = 1; label.textContent = ''; cursorRoot.classList.remove('is-active'); return; }
      const txt = t.getAttribute && t.getAttribute('data-cursor');
      label.textContent = txt || '';
      /* con etiqueta: 50% del tamaño original (2.6 → 1.3, pedido) */
      targetScale = txt ? 1.3 : 1.8;
      cursorRoot.classList.add('is-active');
    };
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', over);
  }

  /* ---- indicador oval de progreso ----
     (medidas CACHEADAS: leer clientHeight/offsetHeight/scrollHeight cada
     frame fuerza reflow — se re-mide solo en resize) ---- */
  if (ovalRoot) {
    ovalRoot.classList.add('lab-oval');
    ovalRoot.setAttribute('aria-hidden', 'true');
    const dot = document.createElement('span');
    dot.className = 'lab-oval__dot';
    ovalRoot.appendChild(dot);

    let ovalH = 0, dotH = 0, maxScroll = 0;
    const medir = () => {
      ovalH = ovalRoot.clientHeight;
      dotH = dot.offsetHeight;
      maxScroll = document.documentElement.scrollHeight - innerHeight;
    };
    medir();
    addEventListener('resize', medir);
    /* la altura de página cambia con plegables/pins: re-medida barata y espaciada */
    setInterval(() => { maxScroll = document.documentElement.scrollHeight - innerHeight; }, 800);

    let lastY = scrollY, vel = 0;
    tickFns.push(() => {
      const p = maxScroll > 0 ? scrollY / maxScroll : 0;
      const v = (lenis && typeof lenis.velocity === 'number')
        ? Math.abs(lenis.velocity)
        : Math.abs((vel = vel * 0.8 + (scrollY - lastY) * 0.2, lastY = scrollY, vel * 10));
      const stretch = Math.min(1.8, 1 + v / 250);
      const travel = ovalH - dotH * stretch;
      dot.style.transform = `translate(-50%,${(Math.min(1, p) * Math.max(0, travel)).toFixed(1)}px) scaleY(${stretch.toFixed(3)})`;
    });
  }

  /* ---- botones magnéticos ----
     (optimización: el rect se mide UNA vez por frame compartido y solo
     mientras el puntero está cerca; en reposo el tick sale gratis) ---- */
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const amp = parseFloat(el.getAttribute('data-magnetic')) || 10;
    const setX = gsap.quickSetter(el, 'x', 'px');
    const setY = gsap.quickSetter(el, 'y', 'px');
    let cx = 0, cy = 0, r = null, cool = 0;
    tickFns.push(() => {
      /* re-medir el rect solo cada ~6 frames: transform del propio imán
         no altera el layout, y el scroll lo desplaza suave */
      if (--cool <= 0) { r = el.getBoundingClientRect(); cool = 6; }
      if (!r.width) { return; }
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const dx = raw.x - ex, dy = raw.y - ey;
      const radius = Math.max(r.width, r.height) * 1.6;
      const dist = Math.hypot(dx, dy);
      let tx = 0, ty = 0;
      if (dist < radius) {
        const pull = 1 - dist / radius;
        tx = (dx / radius) * amp * 2 * pull;
        ty = (dy / radius) * amp * 2 * pull;
      } else if (Math.abs(cx) < .01 && Math.abs(cy) < .01) {
        return; /* en reposo y lejos: nada que animar */
      }
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      setX(cx); setY(cy);
    });
  });
}
