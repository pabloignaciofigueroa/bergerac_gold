/* ============================================================
   05 · TRABAJO SELECCIONADO — Profundidad Z
   Comanda: 05_COMANDA_05_WORKS_TRABAJO_SELECCIONADO.md

   La cámara y el espacio hacen el espectáculo; los proyectos se
   contemplan. Un único viaje: LEJANÍA → APROXIMACIÓN →
   CONTEMPLACIÓN → ATRAVESAR → NUEVA PROFUNDIDAD → … → SALIDA.
   CSS 3D + scrub. Sin slides, sin efectos por cliente.
   ============================================================ */

export function initWorks({ gsap, ScrollTrigger, prefersReduced }) {
  const section = document.querySelector('#proyectos');
  if (!section || !gsap || !ScrollTrigger) return;
  const planes = [...section.querySelectorAll('.works__plane')];
  const wide = window.matchMedia('(min-width: 1024px)');

  const DEPTH = 1700;           /* separación entre planos (px de perspectiva) */
  const EXIT = 1400;            /* el plano frontal desborda el viewport al atravesarlo */
  const LEAD = 900;             /* el título nace genuinamente lejos y crece */
  /* la salida no tiene tiempo muerto: el pin libera con AS aún atravesándose */
  const TRAVEL = LEAD + (planes.length - 1) * DEPTH + EXIT * .4;

  let built = false;
  let triggers = [];

  function build() {
    if (built || prefersReduced || !wide.matches) return;
    built = true;

    const state = { z: -LEAD };
    let openIdx = null;   /* caso abierto: contemplación garantizada */
    let settling = false; /* en viaje hacia la distancia editorial */
    /* TEXTOS QUIETOS (pedido QA): solo la IMAGEN viaja en profundidad;
       el texto de cada plano únicamente funde su opacidad — siempre 1:1 */
    const medias = planes.map((p) => p.querySelector('.works__media'));
    const apply = () => {
      planes.forEach((p, i) => {
        const eff = state.z - i * DEPTH; /* >0: ya lo atravesamos */
        /* LA ESCALA MANDA (la cámara avanza); la opacidad es atmósfera:
           - al atravesar, el plano crece hasta desbordar los cuatro bordes
             y recién entonces termina de disolverse;
           - el plano profundo apenas se insinúa hasta cruzar el anterior. */
        let op = 1;
        if (eff > 250) op = Math.max(0, 1 - (eff - 250) / (EXIT * .62));
        else if (eff < -DEPTH * .3) {
          const t = Math.min(1, (-eff - DEPTH * .3) / (DEPTH * .5));
          op = Math.max(0, 1 - t * 1.05); /* invisible durante la contemplación ajena */
        }
        /* con un caso abierto, los demás planos desaparecen de verdad */
        if (openIdx !== null && i !== openIdx) op = 0;
        p.style.opacity = op.toFixed(3);
        p.style.visibility = op < .04 ? 'hidden' : 'visible';
        p.style.zIndex = String(10 + i);
        const z = Math.min(eff, 1340); /* nunca cruzar el plano de perspectiva */
        /* El plano (y su texto) NO se transforma jamás: texto vectorial fijo.
           La profundidad vive solo en la imagen (scale = P/(P-z), P=1500). */
        p.style.transform = 'none';
        const media = medias[i];
        if (media) {
          if (Math.abs(z) < 24) {
            media.style.transform = 'none';
          } else {
            const s = 1500 / (1500 - z);
            media.style.transformOrigin = '50% 50%';
            media.style.transform = `scale(${s.toFixed(4)})`;
          }
        }
        p.style.pointerEvents = Math.abs(eff) < DEPTH * .5 ? 'auto' : 'none';
      });
    };
    apply();

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=' + Math.round(TRAVEL * 1.35), /* la ruptura Z no supera al Método en duración */
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        state.z = -LEAD + self.progress * TRAVEL;
        /* si el usuario retoma el viaje, la lectura se recoge sola
           (nunca durante el asentamiento hacia el caso) */
        if (openIdx !== null && settling && Math.abs(state.z - openIdx * DEPTH) < 90) {
          settling = false;
        }
        if (openIdx !== null && !settling && Math.abs(state.z - openIdx * DEPTH) > DEPTH * .4) {
          const btn = planes[openIdx].querySelector('.works__case-toggle[aria-expanded="true"]');
          openIdx = null;
          if (btn) btn.click();
        }
        apply();
      },
    });
    triggers.push(st);

    /* Abrir un caso = asentarse en la distancia editorial correcta */
    section.querySelectorAll('.works__case-toggle').forEach((btn) => {
      const plane = btn.closest('.works__plane');
      const idx = planes.indexOf(plane);
      btn.addEventListener('click', () => {
        /* el handler global de desplegables ya actualizó aria-expanded */
        if (btn.getAttribute('aria-expanded') === 'true') {
          openIdx = idx;
          settling = true;
          const target = st.start + ((idx * DEPTH + LEAD) / TRAVEL) * (st.end - st.start);
          window.scrollTo({ top: Math.round(target), behavior: prefersReduced ? 'auto' : 'smooth' });
        } else if (openIdx === idx) {
          openIdx = null;
          settling = false;
        }
        apply();
      });
    });
  }

  function teardown() {
    if (!built) return;
    built = false;
    triggers.forEach(t => t.kill());
    triggers = [];
    planes.forEach(p => {
      p.style.cssText = '';
      gsap.set(p, { clearProps: 'all' });
    });
  }

  build();
  wide.addEventListener('change', () => {
    teardown();
    build();
    ScrollTrigger.refresh();
  });
}
