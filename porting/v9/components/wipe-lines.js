/* LAB · components/wipe-lines.js — la firma visual: reveal por líneas con cortina de color
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (idéntico al referente [MEDIDO] · motion-spec §9):
   <h2 data-anim-high="dirección, color[, delay-ms]">Texto…</h2>
   · dirección  right | left | top   (hacia dónde barre la cortina)
   · color      nombre de token SIN prefijo → var(--color--<token>)
                (accent, accent-soft, ink-tint-1, paper-tint-2, …)
   · delay-ms   opcional, múltiplos de 200 (regla de la casa)
   Modo bloque (imágenes/cards sin texto): añadir data-anim-high-block —
   una sola cortina sobre el elemento completo.
   Parámetros de fábrica [MEDIDO valores / DEDUCIDO roles — gotcha #9]:
   cortina entra 0.6s · sale 0.6s (power2.inOut) · stagger 0.15 entre líneas;
   el contenido aparece en el pico (cuando la cortina cubre).
   Tiers (motion-spec §4): SOLO tier high; en base/reduced el contenido queda
   visible sin animación. Dispara por ScrollTrigger (top 85%), una vez.
   Requiere: SplitText (vendor) — el motor bootea tras fonts.ready (gotcha #13). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  var DUR_IN = 0.6, DUR_OUT = 0.6, STAG = 0.15, EASE = 'power2.inOut';

  function tokenColor(name) {
    var v = getComputedStyle(document.documentElement)
      .getPropertyValue('--color--' + name.trim());
    return v ? v.trim() : 'var(--color--accent)';
  }

  function parseSpec(raw) {
    var p = (raw || '').split(',').map(function (s) { return s.trim(); });
    return {
      dir: p[0] || 'right',
      color: p[1] ? tokenColor(p[1]) : tokenColor('accent'),
      delay: p[2] ? (parseInt(p[2], 10) || 0) / 1000 : 0
    };
  }

  /* origen de la cortina: entra creciendo HACIA la dirección, sale al revés */
  function origins(dir) {
    if (dir === 'left')  return { axis: 'scaleX', inO: '100% 50%', outO: '0% 50%' };
    if (dir === 'top')   return { axis: 'scaleY', inO: '50% 100%', outO: '50% 0%' };
    return               { axis: 'scaleX', inO: '0% 50%',  outO: '100% 50%' }; /* right */
  }

  function buildCurtain(color) {
    var c = document.createElement('div');
    c.className = 'lab-wipe__curtain';
    c.style.background = color;
    c.setAttribute('aria-hidden', 'true');
    return c;
  }

  LAB.register('wipe-lines', {
    selector: '[data-anim-high]',
    init: function (el) {
      var spec = parseSpec(el.getAttribute('data-anim-high'));
      var o = origins(spec.dir);

      /* tier base / reduced: contenido visible, sin coreografía */
      if (!LAB.caps.tierHigh) return;

      var isBlock = el.hasAttribute('data-anim-high-block') ||
                    !el.textContent.trim();

      var units = [];   /* [{clip, inner, curtain}] por línea (o 1 por bloque) */
      var split = null;

      if (isBlock) {
        el.classList.add('lab-wipe', 'lab-wipe--block');
        var inner = document.createElement('div');
        inner.className = 'lab-wipe__inner';
        while (el.firstChild) inner.appendChild(el.firstChild);
        el.appendChild(inner);
        var curtain = buildCurtain(spec.color);
        el.appendChild(curtain);
        units.push({ inner: inner, curtain: curtain });
      } else {
        el.classList.add('lab-wipe');
        split = new SplitText(el, { type: 'lines', linesClass: 'line' });
        split.lines.forEach(function (line) {
          var inner = document.createElement('span');
          inner.className = 'lab-wipe__inner';
          while (line.firstChild) inner.appendChild(line.firstChild);
          line.appendChild(inner);
          var curtain = buildCurtain(spec.color);
          line.appendChild(curtain);
          units.push({ inner: inner, curtain: curtain });
        });
      }

      /* estado inicial: contenido oculto, cortinas plegadas hacia el origen de entrada */
      units.forEach(function (u) {
        gsap.set(u.inner, { autoAlpha: 0 });
        gsap.set(u.curtain, { transformOrigin: o.inO });
        gsap.set(u.curtain, o.axis === 'scaleX' ? { scaleX: 0 } : { scaleY: 0 });
      });

      var tl = gsap.timeline({
        delay: spec.delay,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });

      units.forEach(function (u, i) {
        var at = i * STAG;
        var grow = {}, shrink = {};
        grow[o.axis] = 1; shrink[o.axis] = 0;
        grow.duration = DUR_IN; grow.ease = EASE;
        shrink.duration = DUR_OUT; shrink.ease = EASE;
        tl.to(u.curtain, grow, at)
          .set(u.inner, { autoAlpha: 1 }, at + DUR_IN)
          .set(u.curtain, { transformOrigin: o.outO }, at + DUR_IN)
          .to(u.curtain, shrink, at + DUR_IN);
      });

      return {
        cleanup: function () {
          if (tl.scrollTrigger) tl.scrollTrigger.kill();
          tl.kill();
          if (split) split.revert();
        }
      };
    }
  });
})();
