/* LAB · core/mouse.js — el bus del ratón: la vida bajo el cursor
   ─────────────────────────────────────────────────────────────────────────
   El referente respira porque TODO sigue al puntero con lerps distintos
   [MEDIDO: createEasedNormalized(0.025/0.05) + createEasedPace(0.01)].
   Este bus da esa física a cualquier componente:
   · LAB.mouse.raw            → { x, y, nx, ny, vx, vy } sin suavizar
                                 (nx/ny normalizados -1..1 desde el centro)
   · LAB.mouse.tracker(lerp)  → objeto { x, y, nx, ny } que persigue al raw
                                 con ese lerp, actualizado en el ticker ÚNICO.
                                 La INERCIA es gratis: el tracker sigue
                                 moviéndose cuando la mano para.
   · LAB.mouse.enabled        → false en táctil/reduced (bus inerte en reposo,
                                 los componentes deben no-op si !enabled).
   Requiere: gsap + core/engine.js. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  /* el comentario siempre dijo "sin reduced" — el código ahora también
     (bug S18 cazado en la auditoría del bloque 8): con esto, cursor,
     magnetic, tilt, mouse-parallax y cursor-reveal se apagan de golpe */
  var enabled = LAB.caps.tierHigh && !LAB.caps.reduced;
  var raw = {
    x: window.innerWidth / 2, y: window.innerHeight / 2,
    nx: 0, ny: 0, vx: 0, vy: 0
  };
  var trackers = [];
  var lastX = raw.x, lastY = raw.y;

  function tracker(lerp) {
    var t = { x: raw.x, y: raw.y, nx: 0, ny: 0, lerp: lerp || 0.05 };
    trackers.push(t);
    return t;
  }

  if (enabled) {
    window.addEventListener('pointermove', function (e) {
      raw.x = e.clientX; raw.y = e.clientY;
      raw.nx = (e.clientX / window.innerWidth) * 2 - 1;
      raw.ny = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    LAB.onTick(function () {
      /* velocity del puntero (para estiramientos e inercias) */
      raw.vx = (raw.x - lastX) * 0.9 + raw.vx * 0.1;
      raw.vy = (raw.y - lastY) * 0.9 + raw.vy * 0.1;
      lastX = raw.x; lastY = raw.y;

      for (var i = 0; i < trackers.length; i++) {
        var t = trackers[i];
        t.x += (raw.x - t.x) * t.lerp;
        t.y += (raw.y - t.y) * t.lerp;
        t.nx = (t.x / window.innerWidth) * 2 - 1;
        t.ny = (t.y / window.innerHeight) * 2 - 1;
      }
    });
  }

  LAB.mouse = { enabled: enabled, raw: raw, tracker: tracker };
})();
