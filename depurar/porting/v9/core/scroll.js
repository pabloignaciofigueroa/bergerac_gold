/* LAB · core/scroll.js — Lenis + bus de velocity + integración ScrollTrigger
   ─────────────────────────────────────────────────────────────────────────
   · Config [MEDIDO en referente]: smoothWheel true, touchMultiplier 2.
   · Integración oficial Lenis↔ScrollTrigger (gotcha #15): lenis.raf cuelga del
     ticker ÚNICO de gsap; lenis.on('scroll') actualiza ScrollTrigger.
   · Bus de velocity: valor lerp-suavizado (lerp 0.1 [tokens]) + dirección,
     para marquees reactivos y skews. LAB.scroll.velocity() / .direction().
   · Lock API para el futuro modo "tap to lock" (H01): .stop() / .start().
   · reduced-motion (reglas.md): SIN Lenis — scroll nativo, bus a cero,
     ScrollTrigger funciona nativo. El contrato de LAB.scroll no cambia.
   Requiere: vendor (gsap, ScrollTrigger, SplitText, CustomEase, lenis) + engine. */
(function () {
  'use strict';

  if (!window.LAB || LAB.error) return;
  if (!window.gsap || !window.ScrollTrigger) {
    console.error('[LAB] scroll.js necesita gsap + ScrollTrigger (vendor/)');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText)  gsap.registerPlugin(SplitText);
  if (window.CustomEase) {
    gsap.registerPlugin(CustomEase);
    /* la curva CSS de la casa disponible también en GSAP [MEDIDO]:
       cubic-bezier(0.65, 0.05, 0, 1) → ease "lab-css" */
    try {
      CustomEase.create('lab-css', '0.65, 0.05, 0, 1');
      /* curvas de casa por GESTO [item 48, bloque 4]:
         lab-settle: aterriza con un 4% de sobrepaso y asienta (entradas
         de piezas físicas) · lab-out: salida seca, decidida (exits) */
      CustomEase.create('lab-settle', 'M0,0 C0.22,0 0.31,1.04 0.52,1.04 C0.7,1.04 0.84,1 1,1');
      CustomEase.create('lab-out', '0.5, 0, 0.85, 0.15');
    }
    catch (e) { console.warn('[LAB] CustomEases de casa no registradas', e); }
  }

  /* ── rescate de triggers inalcanzables (S23) ─────────────────────────
     En la ÚLTIMA pantalla, un start tipo "top 75%" puede quedar más allá
     del scroll máximo → el elemento jamás se revela (visto en captura real:
     subrayado y flecha del fin muertos). El clamp() del vendor minificado
     NO es fiable (congela el trigger — A/B S23), así que el rescate es
     nuestro: tras cada refresh, los `once` cuyo start no existe se
     reprograman al fondo alcanzable — la animación se ve AL LLEGAR. */
  ScrollTrigger.addEventListener('refresh', function () {
    var max = ScrollTrigger.maxScroll(window);
    ScrollTrigger.getAll().forEach(function (st) {
      if (st.vars.once && !st._labRescate && st.animation && st.start > max - 1) {
        st._labRescate = true;
        /* NUNCA st.refresh() aquí dentro (riesgo de bucle refresh→refresh,
           S26): se sustituye por un trigger nuevo, simple y numérico */
        var anim = st.animation;
        st.kill();
        ScrollTrigger.create({
          start: Math.max(0, max - 2),
          once: true,
          onEnter: function () { anim.play(); }
        });
      }
    });
  });

  var T = (LAB.tokens && LAB.tokens.motion) || {};
  var LERP = (T.lerp && T.lerp.velocityBus) || 0.1;

  var vel = 0;          /* velocity suavizada (px/frame aprox de Lenis) */
  var dir = 1;          /* 1 abajo · -1 arriba */

  if (LAB.caps.reduced) {
    /* ── modo reduced: nativo, sin smoothing ─────────────────────────── */
    LAB.scroll = {
      lenis: null,
      velocity: function () { return 0; },
      direction: function () { return dir; },
      stop: function () {},
      start: function () {}
    };
    return;
  }

  if (!window.Lenis) {
    console.error('[LAB] scroll.js: falta vendor/lenis.min.js');
    return;
  }

  var lenis = new Lenis({
    smoothWheel: true,
    touchMultiplier: (T.scroll && T.scroll.touchMultiplier) || 2
  });

  lenis.on('scroll', ScrollTrigger.update);
  LAB.onTick(function (timeSec) { lenis.raf(timeSec * 1000); });
  gsap.ticker.lagSmoothing(0);

  LAB.onTick(function () {
    var raw = lenis.velocity || 0;
    vel += (raw - vel) * LERP;
    if (Math.abs(raw) > 0.01) dir = raw > 0 ? 1 : -1;
  });

  LAB.scroll = {
    lenis: lenis,
    velocity: function () { return vel; },
    direction: function () { return dir; },
    stop: function () { lenis.stop(); },   /* modo lock (H01) — restaurar con start() */
    start: function () { lenis.start(); }
  };
})();
