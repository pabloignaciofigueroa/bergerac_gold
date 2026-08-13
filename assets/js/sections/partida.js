/* ============================================================
   03 · EL PUNTO DE PARTIDA — Travelling horizontal cinematográfico
   Comanda: 03_PUNTO_DE_PARTIDA_DIRECCION_DISENO_MOTION.md

   Contrato: el usuario hace scroll vertical; la página se desplaza
   lateralmente. Pin limpio, cuatro estaciones con protagonismo
   secuencial, apertura de profundidad dentro de la escena,
   entrada y salida naturales. Sin slider, sin cards, sin acordeón.
   ============================================================ */

export function initPartida({ gsap, ScrollTrigger, prefersReduced }) {
  const section = document.querySelector('#partida');
  if (!section || !gsap || !ScrollTrigger) return;
  const track = section.querySelector('.partida__track');
  const stations = [...section.querySelectorAll('.partida__station')];

  const wide = window.matchMedia('(min-width: 1024px)');

  let built = false;
  let tween = null;
  const stTriggers = [];

  function build() {
    if (built || prefersReduced || !wide.matches) return;
    built = true;

    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    /* protagonismo: EXACTAMENTE una dominante — la estación cuyo centro
       está más cerca del centro del viewport; las demás, en reposo. */
    stations.forEach((st) => { st.dataset.active = 'false'; });
    const updateProtagonist = () => {
      const vwC = window.innerWidth / 2;
      let best = -1, bd = 1e9;
      stations.forEach((st, i) => {
        const r = st.getBoundingClientRect();
        const d = Math.abs((r.left + r.right) / 2 - vwC);
        if (d < bd) { bd = d; best = i; }
      });
      const active = bd < window.innerWidth * .42 ? best : -1;
      stations.forEach((st, i) => {
        const v = String(i === active);
        if (st.dataset.active !== v) st.dataset.active = v;
      });
    };

    tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + distance(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: updateProtagonist,
      },
    });
    updateProtagonist();
  }

  function teardown() {
    if (!built) return;
    built = false;
    stTriggers.forEach(t => t.kill());
    stTriggers.length = 0;
    if (tween) {
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
      tween = null;
    }
    gsap.set(track, { clearProps: 'transform' });
    stations.forEach(st => { delete st.dataset.active; });
  }

  build();
  wide.addEventListener('change', () => {
    teardown();
    build();
    ScrollTrigger.refresh();
  });
}
