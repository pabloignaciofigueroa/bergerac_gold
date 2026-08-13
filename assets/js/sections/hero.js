/* ============================================================
   01 · HERO — Grilla de partículas + magnetismo textual
   Comanda: 01_COMANDA_HERO_BERGERAC_PARTICULAS_MAGNETISMO.md

   Sistema (r05 final):
   - Grilla ordenada, 3 azules más oscuros que el fondo, deriva mínima.
   - Cuatro campos magnéticos independientes (eyebrow, titular, bajada,
     CTA) con activación interpolada por proximidad y selectividad:
     el bloque más cercano manda, los lejanos decaen.
   - El halo sigue la SILUETA real del texto (línea a línea, ragged
     right incluido) y se degrada hacia afuera: banda densa → aura →
     campo. Más denso en el lado del cursor.
   - Exclusión dura por línea: nada pisa jamás un glifo.
   - BERGERAC gigante: niebla cromática interior solo en hover real
     sobre los glifos (CSS + hit-test tipográfico).
   ============================================================ */

export function initHero({ ScrollTrigger, prefersReduced, registerScene, wake }) {
  const section = document.querySelector('#inicio');
  const canvas = section.querySelector('.hero__field');
  const ctx2d = canvas.getContext('2d', { alpha: true });
  const blocks = [...section.querySelectorAll('[data-magnet]')];
  const brandword = section.querySelector('.hero__brandword');

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* --- Constantes del campo --- */
  const TONES = ['#0089db', '#006bb2', '#004f8a'];
  const SPACING = 38;
  const DOT_R = [1.9, 1.7, 1.5];
  const AMBIENT_AMP = 1.4;
  const MOUSE_R = 120, MOUSE_PUSH = 5;
  const INFLUENCE = 150;            /* flujo de puntos del campo */
  const PAD = 10;                   /* margen limpio alrededor de cada línea */
  const RING = 9;                   /* banda ↔ línea */
  const RING_ROW = 8;               /* separación fila 1 ↔ fila 2 */
  const AURA_1 = 30, AURA_2 = 52;   /* anillos de emergencia (gradiente) */
  const ACT_NEAR = 24, ACT_FAR = 150;
  const RANK_FALLOFF = 90;          /* decaimiento de bloques no-cercanos */
  const HALO_STEP = 7;
  const FLOW_MAX = .55;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0, H = 0;
  let points = [];
  let magnets = [];                 /* { union, lines[], band[], aura[] } por bloque */
  let mouse = { x: -9999, y: -9999, inside: false };
  let act = blocks.map(() => 0);
  let brandGlyphRect = null;

  /* --- sprites --- */
  const sprites = {};
  function sprite(tone, r) {
    const key = tone + '|' + r;
    if (sprites[key]) return sprites[key];
    const s = Math.ceil((r + 1) * 2 * DPR);
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    g.scale(DPR, DPR);
    g.fillStyle = tone;
    g.beginPath();
    g.arc(s / DPR / 2, s / DPR / 2, r, 0, Math.PI * 2);
    g.fill();
    return (sprites[key] = { c, s });
  }

  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const rectDist = (r, x, y) => {
    const dx = Math.max(r.x0 - x, 0, x - r.x1);
    const dy = Math.max(r.y0 - y, 0, y - r.y1);
    return Math.hypot(dx, dy);
  };
  const inRect = (r, x, y) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;

  function projectOut(r, x, y, ring) {
    const cx = Math.min(Math.max(x, r.x0), r.x1);
    const cy = Math.min(Math.max(y, r.y0), r.y1);
    let nx = x - cx, ny = y - cy;
    const len = Math.hypot(nx, ny);
    if (len > 1e-3) return { x: cx + (nx / len) * ring, y: cy + (ny / len) * ring };
    const dl = x - r.x0, dr = r.x1 - x, dt = y - r.y0, db = r.y1 - y;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) return { x: r.x0 - ring, y };
    if (m === dr) return { x: r.x1 + ring, y };
    if (m === dt) return { x, y: r.y0 - ring };
    return { x, y: r.y1 + ring };
  }

  /* --- Niebla BERGERAC: hit-test sobre los glifos reales --- */
  function measureBrandGlyphs(heroRect) {
    const box = brandword.getBoundingClientRect();
    const cs = getComputedStyle(brandword);
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = meas.measureText(brandword.textContent.trim());
    const lineH = box.height;
    const fontAsc = m.fontBoundingBoxAscent ?? parseFloat(cs.fontSize) * .8;
    const fontDesc = m.fontBoundingBoxDescent ?? parseFloat(cs.fontSize) * .2;
    const half = (lineH - (fontAsc + fontDesc)) / 2;
    const baseline = box.top + half + fontAsc;
    const gTop = baseline - (m.actualBoundingBoxAscent ?? fontAsc);
    const gBottom = baseline + (m.actualBoundingBoxDescent ?? 0);
    const cx = (box.left + box.right) / 2;
    const halfText = m.width / 2;
    brandGlyphRect = {
      x0: cx - halfText - heroRect.left + 4,
      x1: cx + halfText - heroRect.left - 4,
      y0: gTop - heroRect.top + 4,
      y1: gBottom - heroRect.top - 2,
    };
  }

  function updateFog() {
    if (!finePointer || !brandGlyphRect) return;
    let inside = mouse.inside && inRect(brandGlyphRect, mouse.x, mouse.y);
    if (inside) {
      for (const mg of magnets) {
        if (inRect(mg.union, mouse.x, mouse.y)) { inside = false; break; }
      }
    }
    brandword.classList.toggle('is-fogged', inside);
  }

  /* --- Medición: silueta por línea + banda + aura --- */
  function measure() {
    const heroRect = section.getBoundingClientRect();
    W = heroRect.width; H = heroRect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);

    magnets = blocks.map((el, bi) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      let lineRects = [...range.getClientRects()]
        .filter(r => r.width > 2 && r.height > 2)
        .map(r => ({
          x0: r.left - heroRect.left - PAD,
          y0: r.top - heroRect.top - PAD,
          x1: r.right - heroRect.left + PAD,
          y1: r.bottom - heroRect.top + PAD,
        }));
      if (!lineRects.length) {
        const b = el.getBoundingClientRect();
        lineRects = [{
          x0: b.left - heroRect.left - PAD, y0: b.top - heroRect.top - PAD,
          x1: b.right - heroRect.left + PAD, y1: b.bottom - heroRect.top + PAD,
        }];
      }
      /* fusionar fragmentos de una misma línea visual (em inline, etc.) */
      lineRects.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
      const lines = [];
      for (const r of lineRects) {
        const last = lines[lines.length - 1];
        if (last && Math.abs(r.y0 - last.y0) < 12) {
          last.x0 = Math.min(last.x0, r.x0);
          last.x1 = Math.max(last.x1, r.x1);
          last.y0 = Math.min(last.y0, r.y0);
          last.y1 = Math.max(last.y1, r.y1);
        } else {
          lines.push({ ...r });
        }
      }
      const union = {
        x0: Math.min(...lines.map(l => l.x0)),
        y0: Math.min(...lines.map(l => l.y0)),
        x1: Math.max(...lines.map(l => l.x1)),
        y1: Math.max(...lines.map(l => l.y1)),
      };

      /* Muestrear el contorno EXPUESTO de la silueta (ragged right incluido) */
      const segs = []; /* {x,y,nx,ny} puntos de contorno con normal exterior */
      const sample = (x0, y0, x1, y1, nx, ny) => {
        const len = Math.hypot(x1 - x0, y1 - y0);
        const n = Math.max(1, Math.round(len / HALO_STEP));
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          segs.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, nx, ny });
        }
      };
      lines.forEach((L, li) => {
        const A = lines[li - 1] || null;
        const B = lines[li + 1] || null;
        sample(L.x0, L.y0, L.x0, L.y1, -1, 0);          /* borde izquierdo */
        sample(L.x1, L.y0, L.x1, L.y1, 1, 0);           /* borde derecho */
        /* borde superior: solo lo no cubierto por la línea anterior */
        if (!A || A.y1 < L.y0 - 4) sample(L.x0, L.y0, L.x1, L.y0, 0, -1);
        else {
          if (L.x0 < A.x0 - 6) sample(L.x0, L.y0, Math.min(A.x0, L.x1), L.y0, 0, -1);
          if (L.x1 > A.x1 + 6) sample(Math.max(A.x1, L.x0), L.y0, L.x1, L.y0, 0, -1);
        }
        /* borde inferior: solo lo no cubierto por la línea siguiente */
        if (!B || B.y0 > L.y1 + 4) sample(L.x0, L.y1, L.x1, L.y1, 0, 1);
        else {
          if (L.x0 < B.x0 - 6) sample(L.x0, L.y1, Math.min(B.x0, L.x1), L.y1, 0, 1);
          if (L.x1 > B.x1 + 6) sample(Math.max(B.x1, L.x0), L.y1, L.x1, L.y1, 0, 1);
        }
      });

      /* Banda (2 filas) + aura (2 anillos de emergencia, densidad menguante) */
      const band = [], aura = [];
      segs.forEach((s, i) => {
        const j = i * 7 + bi * 13;
        band.push({
          x: s.x + s.nx * RING, y: s.y + s.ny * RING,
          tone: 1, thr: (j % 22) / 100, phase: (j % 12) / 12 * Math.PI * 2,
        });
        if (i % 2 === 0) {
          band.push({
            x: s.x + s.nx * (RING + RING_ROW) + (s.ny ? ((j % 5) - 2) : 0),
            y: s.y + s.ny * (RING + RING_ROW) + (s.nx ? ((j % 5) - 2) : 0),
            tone: 2, thr: ((j * 3) % 25) / 100, phase: ((j * 5) % 12) / 12 * Math.PI * 2,
          });
        }
        if (i % 3 === 0) {
          aura.push({
            x: s.x + s.nx * (AURA_1 + (j % 9)), y: s.y + s.ny * (AURA_1 + ((j * 3) % 9)),
            tone: 0, a: .55, thr: ((j * 7) % 30) / 100, phase: (j % 10) / 10 * Math.PI * 2,
          });
        }
        if (i % 5 === 0) {
          aura.push({
            x: s.x + s.nx * (AURA_2 + ((j * 3) % 12)), y: s.y + s.ny * (AURA_2 + ((j * 5) % 12)),
            tone: 1, a: .3, thr: ((j * 11) % 35) / 100, phase: ((j * 3) % 10) / 10 * Math.PI * 2,
          });
        }
      });

      return { union, lines, band, aura };
    });

    measureBrandGlyphs(heroRect);

    /* Grilla base: hogares dentro de una LÍNEA de texto se omiten */
    points = [];
    const cols = Math.ceil(W / SPACING) + 1;
    const rows = Math.ceil(H / SPACING) + 1;
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const hx = ix * SPACING + SPACING / 2;
        const hy = iy * SPACING + SPACING / 2;
        let hidden = false;
        for (const mg of magnets) {
          if (!inRect(mg.union, hx, hy)) continue;
          for (const L of mg.lines) {
            if (inRect(L, hx, hy)) { hidden = true; break; }
          }
          if (hidden) break;
        }
        if (hidden) continue;
        points.push({
          hx, hy, x: hx, y: hy,
          tone: (ix * 7 + iy * 13) % 9 < 4 ? 0 : ((ix * 5 + iy * 3) % 9 < 6 ? 1 : 2),
          phase: ((ix * 131 + iy * 71) % 100) / 100 * Math.PI * 2,
          speed: .35 + ((ix + iy * 3) % 7) / 7 * .4,
        });
      }
    }
  }

  /* punto no puede quedar dentro de ninguna línea de ningún bloque */
  function containOutside(p) {
    for (let pass = 0; pass < 2; pass++) {
      let moved = false;
      for (const mg of magnets) {
        if (!inRect(mg.union, p.x, p.y)) continue;
        for (const L of mg.lines) {
          if (inRect(L, p.x, p.y)) {
            const proj = projectOut(L, p.x, p.y, RING);
            p.x = proj.x; p.y = proj.y;
            moved = true;
            break;
          }
        }
        if (moved) break;
      }
      if (!moved) return;
    }
  }

  function render(dt, t) {
    ctx2d.clearRect(0, 0, W, H);

    /* Activación con selectividad: el bloque más cercano manda */
    const dists = magnets.map(mg => (mouse.inside ? rectDist(mg.union, mouse.x, mouse.y) : 1e9));
    const dmin = Math.min(...dists);
    for (let i = 0; i < magnets.length; i++) {
      let target = 0;
      if (mouse.inside) {
        const proximity = 1 - smooth(ACT_NEAR, ACT_FAR, dists[i]);
        const rank = Math.max(0, 1 - Math.max(0, dists[i] - dmin) / RANK_FALLOFF);
        target = proximity * rank;
      }
      act[i] += (target - act[i]) * Math.min(1, dt * 5);
    }

    /* Campo base */
    const k = Math.min(1, dt * 4.2);
    for (const p of points) {
      const ax = Math.sin(t * p.speed + p.phase) * AMBIENT_AMP;
      const ay = Math.cos(t * p.speed * .8 + p.phase * 1.7) * AMBIENT_AMP;
      let tx = p.hx + ax, ty = p.hy + ay;

      if (mouse.inside) {
        const dx = tx - mouse.x, dy = ty - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_R && d > .5) {
          const f = (1 - smooth(0, MOUSE_R, d)) * MOUSE_PUSH;
          tx += (dx / d) * f;
          ty += (dy / d) * f;
        }
      }

      /* flujo hacia el bloque activo más influyente */
      let best = -1, bestW = 0;
      for (let i = 0; i < magnets.length; i++) {
        if (act[i] < .03) continue;
        const d = rectDist(magnets[i].union, p.hx, p.hy);
        if (d < INFLUENCE) {
          const w = act[i] * (1 - smooth(0, INFLUENCE, d));
          if (w > bestW) { bestW = w; best = i; }
        }
      }
      if (best >= 0) {
        /* proyección hacia la LÍNEA más cercana del bloque (silueta real) */
        const mg = magnets[best];
        let nearL = mg.lines[0], nd = 1e9;
        for (const L of mg.lines) {
          const d = rectDist(L, p.hx, p.hy);
          if (d < nd) { nd = d; nearL = L; }
        }
        const proj = projectOut(nearL, p.hx, p.hy, RING + RING_ROW + 6 + (p.tone + 1) * 4 + Math.sin(p.phase) * 2);
        const w = bestW * FLOW_MAX;
        tx += (proj.x - tx) * w;
        ty += (proj.y - ty) * w;
      }

      p.x += (tx - p.x) * k;
      p.y += (ty - p.y) * k;
      containOutside(p);

      const sp = sprite(TONES[p.tone], DOT_R[p.tone]);
      ctx2d.drawImage(sp.c, p.x - sp.s / DPR / 2, p.y - sp.s / DPR / 2, sp.s / DPR, sp.s / DPR);
    }

    /* Halo: banda de silueta + aura de emergencia, con sesgo hacia el cursor */
    for (let i = 0; i < magnets.length; i++) {
      const a = act[i];
      if (a < .04) continue;
      const mg = magnets[i];

      for (const e of mg.band) {
        const alpha = smooth(e.thr, Math.min(1, e.thr + .22), a);
        if (alpha <= .01) continue;
        const dCur = Math.hypot(e.x - mouse.x, e.y - mouse.y);
        const bias = .55 + .45 * (1 - smooth(0, 320, dCur)); /* más denso hacia el cursor */
        const px = e.x + Math.sin(t * .8 + e.phase) * 1;
        const py = e.y + Math.cos(t * .7 + e.phase) * 1;
        let blocked = false;
        for (const om of magnets) {
          if (om === mg || !inRect(om.union, px, py)) continue;
          for (const L of om.lines) if (inRect(L, px, py)) { blocked = true; break; }
          if (blocked) break;
        }
        if (blocked) continue;
        const sp = sprite(TONES[e.tone], 2.0);
        ctx2d.globalAlpha = alpha * bias;
        ctx2d.drawImage(sp.c, px - sp.s / DPR / 2, py - sp.s / DPR / 2, sp.s / DPR, sp.s / DPR);
      }

      for (const e of mg.aura) {
        const alpha = smooth(e.thr, Math.min(1, e.thr + .3), a) * e.a;
        if (alpha <= .01) continue;
        const dCur = Math.hypot(e.x - mouse.x, e.y - mouse.y);
        const bias = .5 + .5 * (1 - smooth(0, 340, dCur));
        const px = e.x + Math.sin(t * .6 + e.phase) * 1.5;
        const py = e.y + Math.cos(t * .5 + e.phase) * 1.5;
        let blocked = false;
        for (const om of magnets) {
          if (!inRect(om.union, px, py)) continue;
          for (const L of om.lines) if (inRect(L, px, py)) { blocked = true; break; }
          if (blocked) break;
        }
        if (blocked) continue;
        const sp = sprite(TONES[e.tone], 1.8);
        ctx2d.globalAlpha = alpha * bias;
        ctx2d.drawImage(sp.c, px - sp.s / DPR / 2, py - sp.s / DPR / 2, sp.s / DPR, sp.s / DPR);
      }
      ctx2d.globalAlpha = 1;
    }
  }

  function renderStatic() {
    ctx2d.clearRect(0, 0, W, H);
    for (const p of points) {
      const sp = sprite(TONES[p.tone], DOT_R[p.tone]);
      ctx2d.drawImage(sp.c, p.hx - sp.s / DPR / 2, p.hy - sp.s / DPR / 2, sp.s / DPR, sp.s / DPR);
    }
  }

  /* --- Entrada del contenido --- */
  const revealEls = [...section.querySelectorAll('.hero__content > *'), brandword];
  if (!prefersReduced && window.gsap) {
    window.gsap.from(revealEls, {
      y: 26, opacity: 0, duration: .9, ease: 'power3.out',
      stagger: .09, delay: .15,
      clearProps: 'transform,opacity',
      onComplete: measure,
    });
  }

  measure();
  if (document.fonts) document.fonts.ready.then(measure);

  if (prefersReduced) {
    renderStatic();
    window.addEventListener('resize', () => { measure(); renderStatic(); });
    return;
  }

  const scene = registerScene({ active: true, render });

  section.addEventListener('pointermove', (ev) => {
    if (ev.pointerType && ev.pointerType !== 'mouse') return;
    const r = section.getBoundingClientRect();
    mouse.x = ev.clientX - r.left;
    mouse.y = ev.clientY - r.top;
    mouse.inside = true;
    updateFog();
  });
  section.addEventListener('pointerleave', () => {
    mouse.inside = false;
    updateFog();
  });

  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(measure, 120);
  });

  if (ScrollTrigger) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => { scene.active = self.isActive; if (self.isActive) wake(); },
    });
  }
}
