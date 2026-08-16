/* BERGERAC · components/ensamblaje.js — el signature move: la B se ARMA [F8]
   ─────────────────────────────────────────────────────────────────────────
   Las 4 piezas del isotipo (tokens.shapes.isotipo) entran A COLOR con el
   PROGRESO DE CARGA REAL y encajan formando la B. Reglas anti-cutre:
   · desplazamientos CORTOS y direccionales (cada pieza desde su esquina
     natural hacia el encaje) — nada vuela desde lejos
   · sin rotaciones, sin rebotes, sin elastic: power2.out de la casa
   · el color viene CON la pieza (entrada por opacidad, cero flashes)
   · umbrales de carga: caja 10% · flecha 35% · rayo 60% · D 85% (la pieza
     grande REMATA) · al 100%: UNA respiración mínima y la cortina (que
     sigue siendo de transition — este componente NO lo toca, mandamiento 3;
     lee el % que transition ya publica en .lab-transition__pct)
   Rollback: quitar este script + el bloque F8 de bergerac.css. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  var COLORES = {
    'pieza-caja':   'morado',
    'pieza-flecha': 'fucsia',
    'pieza-rayo':   'amarillo',
    'pieza-d':      'azul'
  };
  /* offsets iniciales CORTOS, hacia el encaje (esquina natural de cada una) */
  var OFFSETS = {
    'pieza-caja':   { x: -22, y: -18 },
    'pieza-flecha': { x:  22, y: -18 },
    'pieza-rayo':   { x: -22, y:  18 },
    'pieza-d':      { x:  26, y:  22 }
  };
  var UMBRALES = [
    ['pieza-caja',   10],
    ['pieza-flecha', 35],
    ['pieza-rayo',   60],
    ['pieza-d',      85]
  ];

  LAB.register('ensamblaje', {
    selector: '[data-transition]',
    init: function (overlay) {
      var shapes = LAB.tokens && LAB.tokens.shapes;
      var iso = shapes && shapes.isotipo;
      var colores = LAB.tokens && LAB.tokens.color;
      if (!iso || !colores || LAB.caps.reduced) return;
      /* navegación interna (fast): transition no crea el pct → sin B */
      var pct = overlay.querySelector('.lab-transition__pct');
      if (!pct) return;

      /* el lienzo de la B, sobre los actos y junto al gag */
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 400 300');
      svg.setAttribute('class', 'lab-ens');
      svg.setAttribute('aria-hidden', 'true');
      var piezas = {};
      Object.keys(COLORES).forEach(function (n) {
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', iso[n]);
        p.setAttribute('fill', colores[COLORES[n]] || '#282828');
        svg.appendChild(p);
        piezas[n] = p;
        var o = OFFSETS[n];
        gsap.set(p, { x: o.x, y: o.y, autoAlpha: 0 });
      });
      overlay.insertBefore(svg, overlay.firstChild.nextSibling || null);

      var hechas = {};
      var cola = 0;
      var respirado = false;

      /* la B se FUNDE con la apertura (transition emite lab:open al arrancar
         la cortina) — sin esto quedaba flotando sobre el hero [QA F8] */
      function fundir() {
        gsap.to(svg, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' });
      }
      document.addEventListener('lab:open', fundir, { once: true });

      function asentar(nombre) {
        if (hechas[nombre]) return;
        hechas[nombre] = true;
        gsap.to(piezas[nombre], {
          x: 0, y: 0, autoAlpha: 1,
          duration: 0.55, ease: 'power2.out',
          delay: cola * 0.14
        });
        cola++;
      }

      var off = LAB.onTick(function () {
        var p = pct ? parseInt(pct.textContent, 10) : 100;
        if (isNaN(p)) p = 0;
        cola = 0; /* la cola solo escalona umbrales alcanzados en el mismo tick */
        for (var i = 0; i < UMBRALES.length; i++) {
          if (p >= UMBRALES[i][1]) asentar(UMBRALES[i][0]);
        }
        if (p >= 100 && !respirado && hechas['pieza-d']) {
          respirado = true;
          gsap.to(svg, { scale: 1.02, duration: 0.25, ease: 'power1.inOut',
            yoyo: true, repeat: 1, transformOrigin: '50% 50%', delay: 0.5 });
          off(); /* trabajo hecho: fuera del ticker */
        }
      });

      return { cleanup: function () { off(); } };
    }
  });
})();
