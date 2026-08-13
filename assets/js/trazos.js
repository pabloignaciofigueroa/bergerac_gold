/* ============================================================
   BERGERAC MERGE — TRAZOS (F8: anotaciones manuscritas v9)
   Contrato v9: <strong data-trazo="circulo|subrayado|flecha">texto</strong>
   Inyecta el SVG estirado sobre el texto y lo dibuja (stroke) al
   entrar en viewport. Color: var(--theme-detail). En reduced-motion
   el trazo aparece ya dibujado.
   ============================================================ */

const MARCAS = {
  circulo: {
    vb: '0 0 220 90', inset: '-30% -8% -26% -8%',
    paths: ['M28 52 C18 26 82 6 138 11 C198 16 214 42 201 63 C186 85 92 89 50 77 C22 69 15 55 34 38'],
  },
  subrayado: {
    vb: '0 0 220 26', inset: 'auto -3% -0.14em -3%', alto: '0.3em',
    paths: ['M6 12 C62 5 152 5 214 11', 'M14 21 C72 14 152 13 206 17'],
  },
  flecha: {
    vb: '0 0 120 60', inset: '-10% -4%',
    paths: ['M8 32 C42 22 68 22 102 30', 'M86 15 L108 30 L84 45'],
  },
};

export function initTrazos(ctx) {
  /* tras fonts.ready y DESPUÉS de los wipes (SplitText ya partió líneas) */
  const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  ready.then(() => mountAll(ctx));
}

function mountAll(ctx) {
  const { gsap, prefersReduced } = ctx;

  document.querySelectorAll('[data-trazo]').forEach((el) => {
    const m = MARCAS[el.getAttribute('data-trazo')];
    if (!m || el.querySelector('.trazo-svg')) return;
    /* SplitText clona el strong al partir líneas y deja un gemelo vacío:
       la marca va solo al fragmento con texto (gotcha v9 #36) */
    if (!el.textContent.trim() && el.closest('.lab-wipe')) return;

    el.classList.add('anota');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', m.vb);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'trazo-svg');
    svg.setAttribute('aria-hidden', 'true');
    if (m.inset) svg.style.inset = m.inset;
    if (m.alto) { svg.style.top = 'auto'; svg.style.height = m.alto; }
    const paths = m.paths.map((d) => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
      return p;
    });
    el.appendChild(svg);

    if (prefersReduced || !gsap) return; /* trazo ya dibujado */

    paths.forEach((p, i) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(p, {
        strokeDashoffset: 0,
        duration: 0.7,
        delay: 0.15 * i,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });
  });
}
