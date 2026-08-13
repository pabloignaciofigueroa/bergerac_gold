/* LAB · tokens.js — Instancia de marca activa (runtime)
   ─────────────────────────────────────────────────────────────────────────
   INSTANCIA 2 · RE-SKIN DE PRUEBA: "TERRA ATELIER" (marca DEMO ficticia,
   carácter OPUESTO a la instancia 1 — subtono CÁLIDO, display slab, formas
   angulares). Mismo esquema, mismo motor, cero cambios en componentes.
   La display se sirve del MISMO nombre de archivo (assets/fonts/demo-display
   .woff2) — el archivo es la interfaz; aquí se vendorizó Alfa Slab One (OFL).
   Reglas: LAB-BRIEF/reglas.md · Protocolo: LAB-EXTRACCION-LN/05-REPLICA-PROTOCOL.md */
(function () {
  'use strict';

  var T = {
    meta: { instance: 'bergerac', version: '0.1.0' },

    color: {
      /* ═══ PALETA OFICIAL BERGERAC (la receta F3v2 que Pablo validó:
         "se ve azul, todo funciona") ═══ */
      'accent':      '#00a1ff',
      'accent-soft': '#7fcdff',
      'accent-zero': '#00a1ff00',
      'accent-warm': '#ffb701',
      'azul':        '#00a1ff',
      'morado':      '#6f02ba',
      'fucsia':      '#fb0278',
      'amarillo':    '#ffb701',
      'azul-soft':   '#7fcdff',
      'morado-soft': '#b57ae0',
      'fucsia-soft': '#ff7ab5',
      'amarillo-soft':'#ffd97a',
      'ink':         '#282828',
      'ink-tint-1':  '#3d3844',
      'ink-tint-2':  '#5c5563',
      'paper':       '#fdfcfa',
      'paper-tint-1':'#f3f0ea',
      'paper-tint-2':'#e7e1d6',
      'black-abs':   '#1a1817'
    },

    type: {
      families: {
        display: '"DemoDisplay", Georgia, serif',
        utility: '"Mona Sans", Arial, sans-serif'
      },
      roles: {
        'giant':        { size: '23rem',     lh: '0.8',  ls: '-0.4rem',    caps: true  },
        'impact-lg':    { size: '8.25rem',   lh: '0.83', ls: '-0.19rem',   caps: true  },
        'impact':       { size: '7.31rem',   lh: '0.81', ls: '-0.22rem',   caps: true  },
        'impact-sm':    { size: '5.44rem',   lh: '0.86', ls: '-0.13rem',   caps: true  },
        'title-lg':     { size: '4.69rem',   lh: '0.89', ls: '0rem',       caps: false },
        'title':        { size: '2.75rem',   lh: '0.89', ls: '-0.13rem',   caps: false },
        'body-display': { size: '2.25rem',   lh: '1.1',  ls: '-0.06rem',   caps: false },
        'quote':        { size: '1.5rem',    lh: '0.95', ls: '-0.03rem',   caps: false },
        'body':         { size: '1rem',      lh: '1.4',  ls: '0rem',       caps: false },
        'eyebrow':      { size: '0.578rem',  lh: '1',    ls: '0.08em',     caps: true  },
        'btn':          { size: '1rem',      lh: '1',    ls: '0rem',       caps: false },
        'btn-nav':      { size: '1.7rem',    lh: '1',    ls: '0rem',       caps: false }
      },
      variation: { heading: "'wght' 660, 'wdth' 93", body: "'wght' 500, 'wdth' 100" }
    },

    shape: { 'radius-small': '1rem', 'radius-med': '3rem', 'radius-large': '6.25rem' },

    /* siluetas de TERRA: angulares/facetadas (vs. orgánicas de la instancia 1) */
    shapes: {
      organica: 'M200 8L376 92 340 258 96 292 12 128Z',
      capsula: 'M112 8h176l104 142-104 142H112L8 150Z',
      /* el MOTIVO BERGERAC [F13]: la ISLA DE CHILOÉ tumbada (norte a la
         izquierda) trazada como pista de circuito — decisión de Pablo S58.
         Arriba la costa interior con sus entradas (Ancud, Dalcahue, el
         ESTERO DE CASTRO como fiordo profundo, Chonchi, Queilén); abajo
         el Pacífico, liso. El segundo path es el NODO de Castro (pad de
         circuito + pata), que se dibuja al final: la isla aparece y Castro
         se marca. (viewBox 0 0 1200 120) */
      motivo: [
        'M80 62 L124 40 L200 36 L224 54 L248 38 L340 32 L420 38 L444 56 L468 40 L560 34 L590 32 L596 72 L604 72 L610 32 L700 38 L720 52 L740 40 L830 36 L858 54 L880 38 L980 42 L1060 54 L1120 66 L1050 94 L900 103 L700 106 L500 105 L300 99 L160 88 L96 74 Z',
        'M320 18 L336 12 L352 18 L336 24 Z M440 16 L472 10 L500 16 L470 22 Z M632 16 L648 10 L664 16 L648 22 Z M706 14 L730 8 L754 14 L730 22 Z',
        'M600 80 L609 89 L600 98 L591 89 Z M600 98 L600 110'
      ],
      /* MONOGRAMA con peso (re-armado S28): "TA" slab angular */
      monograma: 'M45 55H215M130 55V245M92 245H168M225 245L295 55L365 245M247 185H343',
      /* familia de formas TERRA [re-armado S28]: talla angular */
      gema: 'M200 10L342 72 372 192 268 290 108 282 28 158 92 40Z',
      ola: 'M40 278L200 22L360 278Z',
      arco: 'M45 102H355V162H295V222H235V282H45Z',
      canto: 'M62 42H338V122L280 162L338 202V282H62V202L122 162L62 122Z',
      /* ═══ LAS 4 PIEZAS DEL ISOTIPO BERGERAC [F7] — extraídas de los SVG
         oficiales (transformación Illustrator→sistema verificada en
         brand-bergerac/specimen-piezas.png). Individuales = siluetas;
         `isotipo` = el conjunto ensamblado (la B) para el loader F8. ═══ */
      'pieza-d': 'M78.3 150.6C78.3 115.6 78.3 80.7 78.3 45.8C78.3 32.8 86.5 22.3 99.0 19.0C101.5 18.4 104.0 18.1 106.5 18.1C136.7 18.0 166.9 18.0 197.0 18.1C213.5 18.1 229.3 21.5 244.3 28.2C262.0 36.0 277.2 47.2 289.5 62.4C302.6 78.4 311.1 96.7 315.6 116.7C321.7 143.7 319.2 170.2 309.6 196.0C300.0 221.6 284.4 242.7 262.3 258.9C248.8 268.9 233.7 275.8 217.3 279.5C211.1 280.9 204.6 281.7 198.3 281.8C167.4 282.0 136.6 281.9 105.7 281.9C100.1 281.9 94.8 280.7 90.1 277.5C82.3 272.2 78.3 264.8 78.3 255.4C78.3 220.4 78.3 185.5 78.3 150.6Z',
      'pieza-caja': 'M319.8 149.8C319.8 180.6 319.8 211.4 319.8 242.3C319.8 262.7 304.1 279.9 283.9 281.5C279.0 281.9 274.1 281.8 269.2 281.8C221.4 281.8 173.5 282.0 125.7 281.7C107.4 281.6 93.2 273.6 84.6 257.0C81.5 251.0 80.2 244.5 80.2 237.8C80.2 190.4 80.2 143.0 80.2 95.6C80.2 84.8 80.2 74.1 80.2 63.3C80.3 42.4 95.0 23.9 115.4 19.3C118.5 18.6 121.8 18.1 125.1 18.1C176.7 18.1 228.3 18.0 279.9 18.1C295.8 18.2 307.5 25.7 315.3 39.4C318.6 45.2 319.8 51.7 319.8 58.3C319.8 88.8 319.8 119.3 319.8 149.8Z',
      'pieza-flecha': 'M77.6 149.9C77.6 118.3 77.6 86.6 77.6 54.9C77.6 36.8 89.5 22.3 107.2 18.6C109.4 18.2 111.6 18.1 113.7 18.1C149.2 18.0 184.7 18.0 220.1 18.0C231.7 18.0 240.6 22.9 247.2 32.4C269.4 64.6 291.7 96.8 314.0 129.0C322.5 141.3 322.4 156.8 313.8 169.0C297.7 192.1 281.7 215.3 265.7 238.5C258.9 248.4 252.3 258.4 245.4 268.1C239.8 275.9 232.0 280.4 222.3 281.3C217.6 281.7 212.7 281.6 208.0 281.6C182.7 281.6 157.5 281.6 132.2 281.6C124.9 281.6 117.6 282.0 110.4 281.3C91.4 279.5 77.6 264.0 77.5 244.9C77.5 213.3 77.5 181.6 77.5 149.9Z',
      'pieza-rayo': 'M203.8 18.0C231.8 18.0 259.8 18.0 287.8 18.1C301.6 18.1 313.0 27.3 315.7 40.5C317.4 49.2 314.7 56.9 309.0 63.5C296.8 77.4 284.5 91.3 272.3 105.1C259.5 119.7 246.8 134.2 234.0 148.8C218.7 166.3 203.5 183.8 188.2 201.3C178.0 213.1 167.7 224.8 157.5 236.6C148.1 247.5 138.8 258.5 129.4 269.4C118.5 282.0 98.7 281.4 88.5 268.0C84.7 263.0 82.6 257.4 82.6 251.0C82.6 192.9 82.6 134.7 82.6 76.5C82.6 69.5 82.6 62.6 82.6 55.6C82.6 37.0 96.8 20.9 115.2 18.5C117.7 18.2 120.2 18.1 122.6 18.1C149.7 18.0 176.7 18.0 203.8 18.0Z',
      isotipo: {
        'pieza-d': 'M199.2 219.2C199.2 200.9 199.2 182.7 199.2 164.4C199.2 157.6 203.4 152.1 210.0 150.4C211.3 150.1 212.6 149.9 213.9 149.9C229.7 149.9 245.5 149.9 261.3 149.9C269.9 149.9 278.2 151.7 286.0 155.2C295.3 159.3 303.3 165.2 309.7 173.1C316.6 181.5 321.0 191.0 323.4 201.5C326.5 215.6 325.2 229.5 320.2 243.0C315.2 256.4 307.0 267.4 295.5 275.9C288.4 281.1 280.5 284.8 271.9 286.7C268.6 287.4 265.3 287.9 261.9 287.9C245.8 288.0 229.6 287.9 213.5 287.9C210.5 287.9 207.8 287.3 205.4 285.6C201.3 282.9 199.2 279.0 199.2 274.1C199.2 255.8 199.2 237.5 199.2 219.2Z',
        'pieza-caja': 'M190.4 76.3C190.4 91.3 190.4 106.4 190.4 121.4C190.4 131.4 182.8 139.8 172.9 140.6C170.5 140.8 168.1 140.7 165.7 140.7C142.4 140.7 119.1 140.8 95.7 140.7C86.8 140.6 79.9 136.7 75.7 128.6C74.2 125.7 73.5 122.5 73.5 119.2C73.6 96.1 73.5 73.0 73.5 49.9C73.5 44.6 73.5 39.4 73.5 34.1C73.6 23.9 80.7 14.9 90.7 12.7C92.2 12.3 93.8 12.1 95.4 12.1C120.6 12.0 145.8 12.0 171.0 12.1C178.7 12.1 184.5 15.8 188.2 22.5C189.8 25.3 190.4 28.4 190.4 31.7C190.4 46.5 190.4 61.4 190.4 76.3Z',
        'pieza-flecha': 'M199.2 76.5C199.2 61.0 199.2 45.5 199.2 30.1C199.2 21.2 205.0 14.1 213.7 12.3C214.7 12.1 215.8 12.1 216.8 12.1C234.2 12.0 251.5 12.0 268.8 12.0C274.4 12.0 278.8 14.4 282.0 19.0C292.9 34.8 303.7 50.5 314.6 66.2C318.8 72.2 318.7 79.8 314.5 85.8C306.7 97.0 298.9 108.4 291.0 119.7C287.7 124.5 284.5 129.4 281.1 134.1C278.4 138.0 274.6 140.2 269.9 140.6C267.5 140.8 265.2 140.7 262.8 140.7C250.5 140.7 238.2 140.7 225.9 140.7C222.3 140.7 218.7 140.9 215.2 140.6C205.9 139.7 199.2 132.2 199.2 122.8C199.2 107.4 199.2 91.9 199.2 76.5Z',
        'pieza-rayo': 'M134.2 150.0C148.2 150.0 162.2 150.0 176.2 150.0C183.1 150.0 188.8 154.6 190.2 161.2C191.1 165.6 189.7 169.4 186.8 172.7C180.7 179.7 174.6 186.7 168.5 193.6C162.1 200.9 155.7 208.2 149.3 215.5C141.6 224.2 134.0 233.0 126.4 241.8C121.2 247.6 116.1 253.5 111.0 259.4C106.3 264.9 101.6 270.4 96.9 275.9C91.5 282.2 81.5 281.8 76.4 275.2C74.5 272.7 73.5 269.9 73.5 266.7C73.5 237.5 73.5 208.4 73.5 179.3C73.5 175.8 73.5 172.3 73.5 168.8C73.5 159.5 80.6 151.4 89.8 150.2C91.0 150.1 92.3 150.0 93.5 150.0C107.1 150.0 120.6 150.0 134.2 150.0Z'
      }
    },

    /* objeto 3D de TERRA: pieza FACETADA de torno (flat-shading), giro lento
       de horno — mismos shaders, otros parámetros [S19, bloque 2] */
    object3d: { amp: 0.16, speed: 0.14, facet: 1, spin: 0.07 },

    space: {
      'gap': '1.25rem',
      'container-padding': '2rem',
      'section-padding': 'calc(3.5rem + (1.25rem * 2))',
      'grid-spacer': '31.51vh',
      'pad-mini': '1rem', 'pad-small': '2rem', 'pad-med': '3rem',
      'pad-large': '4rem', 'pad-xlarge': '5rem'
    },

    scaling: { designWidth: 1728, designUnit: 16, minWidth: 992, maxWidth: 1920,
               mobileDesignWidth: 390, scaleFactor: 1 },

    motion: {
      ease: { cssDefault: 'cubic-bezier(0.65, 0.05, 0, 1)', enter: 'power2.out',
              micro: 'power2.out', big: 'expo.inOut', roll: 'power3.out',
              playful: 'elastic.out(1, 0.75)', ambient: 'power1.inOut' },
      dur:  { cssDefault: 0.75, micro: 0.3, enter: 0.55, roll: 0.6, big: 1.0, ambient: 2.2 },
      stagger: { words: 0.02, chars: 0.02, items: 0.05, groupAmount: 0.35, delayStepMs: 200 },
      wipeLines: { curtainIn: 0.6, curtainOut: 0.6, lineStagger: 0.15 },
      lerp: { pointerSlow: 0.025, pointerObject: 0.05, driftPace: 0.01, velocityBus: 0.1 },
      scroll: { touchMultiplier: 2 }
    },

    voice: {
      /* ═══ VOZ BERGERAC [F6] — literal del copy canónico
         (brand-bergerac/BERGERAC_text.md) donde existe ═══ */
      brand: 'BERGERAC',
      gagLoader: 'Abriendo el estudio…',
      rotateNotice: 'Gira el dispositivo — esto se recorre en vertical.',
      marquee: 'bergerac · estudio digital · castro, chiloé',
      motto: 'Una misma dirección, de principio a fin.',
      liveLabel: 'primera lectura',
      dragLabel: 'examina',
      formEmpty: 'Falta el correo para poder responderte.',
      formErr: 'Eso no parece un correo.',
      formOk: 'Recibimos tu punto de partida. Revisaremos el contexto y te responderemos con una primera lectura.',
      notFound: 'Esta página no está acá.',
      backHome: 'Volver al inicio'
    }
  };

  /* ── generación de custom properties (idéntica a la instancia 1) ─────── */
  var css = ':root{';
  Object.keys(T.color).forEach(function (k) { css += '--color--' + k + ':' + T.color[k] + ';'; });
  Object.keys(T.type.roles).forEach(function (k) {
    var r = T.type.roles[k];
    css += '--text--' + k + ':' + r.size + ';--lh--' + k + ':' + r.lh + ';--ls--' + k + ':' + r.ls + ';';
  });
  css += '--font-display:' + T.type.families.display + ';--font-utility:' + T.type.families.utility + ';';
  css += '--fvs-heading:' + T.type.variation.heading + ';--fvs-body:' + T.type.variation.body + ';';
  Object.keys(T.shape).forEach(function (k) { css += '--' + k + ':' + T.shape[k] + ';'; });
  Object.keys(T.space).forEach(function (k) { css += '--' + k + ':' + T.space[k] + ';'; });
  css += '--cubic-default:' + T.motion.ease.cssDefault + ';';
  css += '--duration-default:' + T.motion.dur.cssDefault + 's;';
  css += '--animation-default:var(--duration-default) var(--cubic-default);';
  css += '--design-width:' + T.scaling.designWidth + ';--design-unit:' + T.scaling.designUnit + ';';
  css += '--min-width:' + T.scaling.minWidth + 'px;--max-width:' + T.scaling.maxWidth + 'px;';
  css += '--mobile-design-width:' + T.scaling.mobileDesignWidth + ';--scale-factor:' + T.scaling.scaleFactor + ';';
  css += '}';

  var style = document.createElement('style');
  style.id = 'lab-tokens';
  style.textContent = css;
  document.head.appendChild(style);

  /* favicon = EL ISOTIPO a color (la B de 4 piezas) [F9 — L3: el favicon es
     uno de los momentos polícromos permitidos] */
  if (T.shapes && T.shapes.isotipo) {
    var mapa = { 'pieza-caja': 'morado', 'pieza-flecha': 'fucsia',
                 'pieza-rayo': 'amarillo', 'pieza-d': 'azul' };
    var partes = '';
    Object.keys(mapa).forEach(function (n) {
      if (T.shapes.isotipo[n]) {
        partes += '<path d="' + T.shapes.isotipo[n] + '" fill="' +
                  T.color[mapa[n]] + '"/>';
      }
    });
    var fav = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="60 0 280 300">' +
              partes + '</svg>';
    var link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'data:image/svg+xml,' + encodeURIComponent(fav);
    document.head.appendChild(link);
  }
  var tc = document.createElement('meta');
  tc.name = 'theme-color';
  tc.content = T.color.accent;
  document.head.appendChild(tc);

  window.LAB_TOKENS = T;
})();
