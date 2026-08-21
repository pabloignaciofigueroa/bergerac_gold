/* ============================================================
   01 · HERO — BERGERAC EN PARTÍCULAS
   Adaptación de BERGERAC-particulas_v1.html al hero azul.

   La palabra ES el instrumento: se muestrea el h1 real (misma
   fuente, misma talla, misma posición que le da hero-fit.js) y
   cada píxel de tinta se convierte en una partícula grafito.
   El cursor las desarma; un muelle las devuelve a su letra.

   DOS CAPAS — entender esto antes de tocar nada:

   · En REPOSO la palabra NO la dibujan las partículas: la dibuja un quad
     con el lienzo del glifo rasterizado a resolución de pantalla. Es
     tipografía de verdad. Un campo de discos no puede ser nítido por
     geometría: para no dejar huecos el disco sólido tiene que cubrir el
     centro de su celda, y eso obliga a apilar π/2 ≈ 1.57 discos sobre
     cada punto — un número que no cambia con la escala. 1.57 capas de
     alpha-over convierten un borde al 50% en un 66%: la rampa de
     antialiasing se aplasta y la letra se lee engordada.

   · Las partículas aparecen SOLO al arrancarse, y a la vez abren su hueco
     en el glifo. La máscara que hace ese borrado la dibujan ELLAS MISMAS,
     en una pasada aparte a un render target: cada una pinta un disco en su
     CASA con su grado de arranque, y el glifo lo resta. Así la letra se
     abre con la forma exacta del grano que se va y se cierra sola según
     vuelven, sin sincronizar nada con el cursor.
     Se probó antes con una rejilla calculada en CPU y NO SIRVE: por fino
     que se haga el paso borra en celdas y la letra se come a cuadros.

   TRES COSAS QUE COSTARON, respetarlas si se toca la máscara:
   · El render target tiene v=0 ABAJO y el lienzo del glifo v=0 ARRIBA. Sin
     voltear la coordenada al leerlo, la máscara borra el hueco espejado en
     vertical: casi acierta —la palabra es ancha y baja— pero deja hilos de
     letra sin borrar alrededor del cursor.
   · El núcleo del disco de la máscara debe ser al menos tan grande como el
     de la tinta que borra (NUCLEO = 0.44). Más pequeño deja cerco.
   · El umbral de aparecer/vaciar (uVisIn/uVisOut, ~1px) es MUCHO menor que
     el de engordar el grano (uHotIn/uHotOut, decenas de px). Con un solo
     umbral la letra aguantaba entera y se rompía de golpe.

   Diferencias con el demo original (fondo negro + additive):
   · alpha-over premultiplicado — el grafito en additive sería
     invisible sobre el azul; aquí la tinta satura a #252522 y
     nunca lo pasa, sin acumulación al superponerse.
   · sin excitación de color: el desarme se lee por movimiento y
     por un leve aumento de tamaño (decisión de dirección).
   · el color va al vertex shader (atributo aHome): se elimina la
     subida del buffer de color en cada frame.
   · 1 unidad de mundo = 1 píxel CSS del mount → las constantes
     de física se derivan del alto real, no son mágicas.

   reduced-motion: no se monta nada y el h1 real queda visible.
   ============================================================ */

import * as THREE from 'three';
import { crearBase, seguirPuntero, suavizar } from './util.js';
import { nivelDe, REDUCED } from '../calidad.js';

/* — física: adimensionales, valores del demo — */
const SPRING = 0.024;
const DAMPING = 0.90;

/* — color: sRGB crudo. Un ShaderMaterial escribe directo al framebuffer
     (no pasa por la conversión de salida de los materiales de fábrica),
     así que estos son los valores que el ojo ve: --graphite exacto. — */
const GRAFITO = [0x25 / 255, 0x25 / 255, 0x22 / 255];

const PAD = 4;          /* holgura del canvas de muestreo, px */

/* DOS POBLACIONES — la clave de la definición:
   · CONTORNO: paso fino, sin desorden, y con la opacidad REAL del píxel
     del glifo (hereda el antialiasing de la fuente) → el borde se lee
     como tipografía de verdad, no como una fila de discos.
   · INTERIOR: paso grueso y con desorden; solo tiene que tapar, y es
     donde vive la textura de tinta.
   El ojo juzga la nitidez de una letra por su borde, así que el grueso
   del presupuesto se gasta ahí. */
/* El punto de CONTORNO vale ~1 píxel del glifo: reproduce el bitmap de la
   fuente casi tal cual (definición tipográfica). Lo justo para que no
   queden costuras entre puntos vecinos: diámetro_sólido ≥ paso·√2.

   REGLA DE COBERTURA — no bajar estos diales sin rehacer la cuenta.
   Para que una retícula cuadrada no deje hueco, el disco sólido tiene que
   alcanzar el CENTRO de la celda, y en el relleno la celda se agranda con
   el desorden:
       diámetro_sólido = paso · DOT · NUCLEO · 2  ≥  (paso + 2·jitter) · √2
   El relleno la incumplía por tres sitios a la vez —DOT_INT justo, talla
   aleatoria por partícula y pulso— y el disco caía a 3.69 px cuando hacían
   falta 5.61. Como el sorteo se hace UNA vez al construir, los huecos
   salían siempre en las mismas celdas: se veían al cargar y volvían a
   aparecer intactos después de desarmar la palabra con el cursor.
   Lo verifica `node tools/qa/qa.mjs titulo`. */
const DOT_BORDE = 1.82;
/* Relleno. El mínimo teórico sale de exigir que el disco sólido alcance el
   centro de la celda de la retícula, contando el desorden que separa a dos
   vecinos: diámetro >= (paso + 2·jitter)·raíz(2). Con JITTER 0.18 y NUCLEO
   0.44 eso pide DOT_INT >= 2.186 — el 2.15 de antes ya se quedaba corto, y
   con la talla aleatoria y el pulso encima el disco caía a 3.69 px cuando
   hacían falta 5.61. Ahí estaban los huecos del interior, y siempre en las
   mismas celdas porque el sorteo se hace una vez al construir. */
const DOT_INT = 2.30;
const NUCLEO = 0.44;     /* fracción opaca del punto (el resto, borde suave) */
const JITTER = 0.18;     /* desorden del relleno, en fracción del paso */

/* Cuántas partículas se sortean.

   Los cortes por ancho son de composición, no de máquina: un titular más
   corto pide menos puntos. Esos se quedan.

   Lo que decide REDUCED es el nivel de calidad, no la RAM ni los núcleos.
   La cuenta por núcleos era justamente la que mentía —16 hilos sin GPU
   pedían 48.000 partículas—, así que se va.

   REDUCIR LA CUENTA ES SEGURO PARA LA COBERTURA, y conviene saber por qué:
   al pasarse del cupo, muestrear() escala `gapBorde` y `gapInt` juntos por
   el mismo factor, el radio del disco sale de `gapInt · DOT_INT · NUCLEO` y
   el desorden de `gapInt · JITTER`. Todo proporcional al paso, así que la
   desigualdad `paso·DOT·NUCLEO·2 ≥ (paso + 2·jitter)·√2` se queda en
   constantes: 2.30·0.44·2 = 2.024 ≥ 1.36·√2 = 1.924. Es invariante de
   escala. Menos partículas y más grandes, letras igual de sólidas.
   Lo comprueba `node tools/qa/qa.mjs titulo`. */
function presupuesto() {
  /* el loader del isotipo cubre la construcción: se puede ser generoso */
  /* polvo: 0 — el fondo azul queda plano y gráfico (pedido QA); la palabra
     no cambia en nada, el bucle que generaba el polvo (más abajo) deja de
     ejecutarse solo porque TOTAL = letras + polvo queda igual a letras. */
  const cupo = innerWidth >= 1200 ? { palabra: 48000, polvo: 0 }
    : innerWidth >= 900 ? { palabra: 30000, polvo: 0 }
    : { palabra: 16000, polvo: 0 };
  if (nivelDe('hero') !== REDUCED) return cupo;
  return { palabra: Math.round(cupo.palabra * 0.3), polvo: Math.round(cupo.polvo * 0.5) };
}

/* ---- medición del título real ---------------------------------- */
function medirTitulo() {
  const h1 = document.querySelector('.hero-word');
  const span = h1 && h1.querySelector('span');
  if (!h1 || !span) return null;
  const nodo = span.firstChild;
  if (!nodo || nodo.nodeType !== 3) return null;

  const cs = getComputedStyle(span);
  const spanRect = span.getBoundingClientRect();
  if (spanRect.width < 4) return null;

  /* baseline exacta: una sonda de tamaño cero alineada a baseline
     (line-height .8 hace que spanRect.top NO sirva como referencia) */
  const sonda = document.createElement('span');
  sonda.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  span.appendChild(sonda);
  const baselineY = sonda.getBoundingClientRect().top;
  sonda.remove();

  return { h1, span, nodo, cs, spanRect, baselineY };
}

/* ---- muestreo de la palabra ------------------------------------
   Se dibuja LETRA A LETRA en la posición real que cada glifo ocupa
   en el DOM (medida con Range): así el canvas es tinta idéntica a
   la del navegador, sin depender de que el canvas reproduzca el
   mismo kerning ni el mismo letter-spacing.                       */
function muestrear(datos, gapBorde, gapInt) {
  const { nodo, cs, spanRect, baselineY } = datos;
  const crudo = nodo.textContent;
  const tr = cs.textTransform;
  const transformar = (s) =>
    tr === 'uppercase' ? s.toUpperCase() : tr === 'lowercase' ? s.toLowerCase() : s;

  const medidor = document.createElement('canvas').getContext('2d');
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  medidor.font = font;
  const m = medidor.measureText(transformar(crudo));
  const arriba = Math.ceil(m.actualBoundingBoxAscent) + PAD;
  const abajo = Math.ceil(m.actualBoundingBoxDescent) + PAD;

  const W = Math.ceil(spanRect.width) + PAD * 2;
  const H = arriba + abajo;
  if (W < 8 || H < 8) return null;

  /* El lienzo se rasteriza a RESOLUCIÓN DE PANTALLA. Sirve para dos cosas:
     muestrear las partículas con alfas más fieles, y —sobre todo— ser la
     capa de glifo que se dibuja en reposo, que a 1x se vería borrosa. */
  const esc = Math.min(devicePixelRatio || 1, 2);
  const BW = Math.ceil(W * esc), BH = Math.ceil(H * esc);
  const c = document.createElement('canvas');
  c.width = BW; c.height = BH;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.scale(esc, esc);
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';

  const rango = document.createRange();
  for (let i = 0; i < crudo.length; i++) {
    rango.setStart(nodo, i);
    rango.setEnd(nodo, i + 1);
    const rc = rango.getBoundingClientRect();
    ctx.fillText(transformar(crudo[i]), rc.left - spanRect.left + PAD, arriba);
  }

  const data = ctx.getImageData(0, 0, BW, BH).data;

  /* Cobertura en una posición CONTINUA, con interpolación bilineal.
     Antes se truncaba (`x|0`) y eso rompía la retícula: con paso 1.2 las
     columnas caían en 0,1,2,4,5,7… — separaciones reales de 1 y 2 px
     mezcladas. Donde tocaba 2 px el núcleo sólido del punto (1.92 px) no
     llegaba a cubrir, y ahí estaban las fisuras. Muestreando en continuo
     el paso es de verdad 1.2 y la cobertura queda garantizada.
     Convenio: el píxel k cubre [k, k+1) y su centro está en k+0.5, así que
     se interpola entre centros. Una partícula colocada en `u` mide en `u`:
     posición y medida coinciden, sin el sesgo de medio píxel que tenía. */
  const A = (u, v) => {
    const x = u * esc - 0.5, y = v * esc - 0.5;
    if (x < -0.5 || y < -0.5 || x > BW - 0.5 || y > BH - 0.5) return 0;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const p = (xx, yy) => (xx < 0 || yy < 0 || xx >= BW || yy >= BH)
      ? 0 : data[(yy * BW + xx) * 4 + 3];
    return p(x0, y0) * (1 - fx) * (1 - fy) + p(x0 + 1, y0) * fx * (1 - fy)
         + p(x0, y0 + 1) * (1 - fx) * fy + p(x0 + 1, y0 + 1) * fx * fy;
  };

  /* pts: [x, y, alpha, esBorde] por partícula */
  const pts = [];

  /* 1 · CONTORNO — paso fino, sin desorden, opacidad = cobertura real.
        Es borde el píxel con tinta parcial (el antialiasing de la fuente)
        o el opaco que tiene vacío dentro del radio R.
        R = radio sólido del punto de relleno: así la banda que cubre el
        contorno acaba justo donde empieza el relleno, sin hueco entre
        ambos y sin que el relleno desborde la letra. */
  const R = Math.max(2, Math.ceil(gapInt * DOT_INT * NUCLEO));

  for (let y = 0; y < H; y += gapBorde) {
    for (let x = 0; x < W; x += gapBorde) {
      const a = A(x, y);
      if (a < 10) continue;
      const esBorde = a < 250
        || A(x - R, y) < 250 || A(x + R, y) < 250
        || A(x, y - R) < 250 || A(x, y + R) < 250;
      if (esBorde) pts.push(x, y, a / 255, 1);
    }
  }

  /* 2 · INTERIOR — grilla gruesa y con desorden, solo donde el punto
        no puede desbordar el contorno (así el borde fino sigue mandando). */
  const jit = gapInt * JITTER;
  for (let y = 0; y < H; y += gapInt) {
    for (let x = 0; x < W; x += gapInt) {
      if (A(x, y) < 250) continue;
      if (A(x - R, y) < 250 || A(x + R, y) < 250
        || A(x, y - R) < 250 || A(x, y + R) < 250) continue;
      pts.push(
        x + (Math.random() - 0.5) * jit * 2,
        y + (Math.random() - 0.5) * jit * 2,
        1, 0,
      );
    }
  }

  /* origen del canvas en coordenadas de pantalla */
  return { pts, W, H, esc, lienzo: c, ox: spanRect.left - PAD, oy: baselineY - arriba };
}

/* ---- shaders ---------------------------------------------------- */
const VERT = /* glsl */`
  attribute float aSize;
  attribute float aRand;
  attribute float aAlpha;
  attribute float aGrow;
  attribute float aPulso;
  attribute float aPolvo;
  attribute vec3  aHome;
  uniform float uTime;
  uniform float uScale;
  uniform float uHotIn;
  uniform float uHotOut;
  uniform float uVisIn;
  uniform float uVisOut;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float disp = length(position.xy - aHome.xy);
    /* DOS umbrales distintos, y esto importa:
       · vis   — aparecer y vaciar el glifo. Tiene que arrancar en cuanto la
                 partícula se despega de su sitio (~1px), o la letra aguanta
                 entera un buen rato y luego se rompe de golpe: se veía tosco.
       · crece — engordar el grano. Ese sí es un gesto lento y largo. */
    float hotVis = smoothstep(uVisIn, uVisOut, disp);
    float hot = smoothstep(uHotIn, uHotOut, disp);
    /* EN REPOSO LAS PARTÍCULAS DE LA PALABRA NO SE DIBUJAN: la palabra la
       pinta la capa de glifo, que es tipografía de verdad y no admite
       comparación. Cada partícula aparece a medida que se arranca, y a la
       vez borra su hueco en el glifo (mapa de vaciado) — así la letra se
       desintegra en el sitio exacto del que sale el grano.
       aPolvo=1 en el polvo ambiental, que sí vive siempre. */
    vAlpha = mix(aAlpha * aPolvo, 1.0, hotVis);
    /* El pulso encoge el punto hasta el 76% de su talla. En el relleno y en
       el polvo sobra margen y ahí da la vida de grano que buscamos; en el
       CONTORNO no: a talla mínima el núcleo sólido caía a 1.46 px cuando la
       retícula pide 1.70, y el borde se abría y cerraba con el ciclo.
       aPulso vale 0 en el contorno (talla exacta, cobertura garantizada) y
       0.12 en el resto — con 0.12 la fórmula es idéntica a la de siempre. */
    float pulse = 1.0 - aPulso + aPulso * sin(uTime * 1.6 + aRand * 6.2831);
    /* el contorno vale ~1 píxel en reposo (definición) y crece mucho al
       arrancarse (grano visible); el relleno apenas cambia */
    float ps = aSize * pulse * (1.0 + aGrow * hot) * uScale / -mv.z;
    gl_PointSize = min(ps, 40.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  precision mediump float;
  uniform vec3 uColor;
  uniform float uNucleo;
  varying float vAlpha;
  void main() {
    /* disco analítico: más nítido y barato que un sprite de textura.
       El núcleo opaco tapa la grilla; el borde suave evita el aliasing. */
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, uNucleo, d) * vAlpha;
    if (a < 0.01) discard;
    /* el contexto es premultipliedAlpha: se emite color premultiplicado */
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/* Capa de glifo: la palabra en reposo. Un quad con el mismo lienzo que se
   muestrea, a resolución de pantalla, así que es EXACTAMENTE la tipografía
   que dibujaría el navegador. `uVacio` es un mapa de baja resolución que
   marca de qué zonas se han ido las partículas; ahí el glifo se retira. */
/* Pasada de máscara: los mismos puntos, pero en su CASA y con el grado de
   arranque como valor. Blending MAX = unión de discos, sin acumular. */
const VERT_MASK = /* glsl */`
  attribute float aSize;
  attribute float aPolvo;
  attribute vec3  aHome;
  uniform float uScaleMask;
  uniform float uVisIn;
  uniform float uVisOut;
  varying float vHot;
  void main() {
    float disp = length(position.xy - aHome.xy);
    vHot = smoothstep(uVisIn, uVisOut, disp) * (1.0 - aPolvo);
    /* se dibuja donde ESTABA, no donde está: lo que hay que abrir en el
       glifo es el hueco que la partícula ha dejado */
    gl_Position = projectionMatrix * modelViewMatrix * vec4(aHome, 1.0);
    gl_PointSize = aSize * uScaleMask;
  }
`;

const FRAG_MASK = /* glsl */`
  precision mediump float;
  varying float vHot;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    /* El núcleo de la máscara tiene que ser AL MENOS tan grande como el de la
       tinta que borra (NUCLEO = 0.44). Con 0.28 se quedaba corto y dejaba un
       cerco de glifo sin borrar: se veían hilos rectos alrededor del cursor. */
    float a = smoothstep(0.5, 0.44, d) * vHot;
    if (a <= 0.0) discard;
    gl_FragColor = vec4(a, a, a, a);
  }
`;

const VERT_GLIFO = /* glsl */`
  varying vec2 vUv;
  void main() {
    /* el lienzo tiene la fila 0 arriba; el quad, la v=1. Se voltea aquí
       para que ambas texturas se indexen igual y no dependa de flipY. */
    vUv = vec2(uv.x, 1.0 - uv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG_GLIFO = /* glsl */`
  precision mediump float;
  uniform sampler2D uGlifo;
  uniform sampler2D uVacio;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float cobertura = texture2D(uGlifo, vUv).a;
    /* El render target tiene v=0 ABAJO (así es como escribe WebGL), mientras
       el lienzo del glifo la tiene ARRIBA. Sin voltear, la máscara borraba
       el hueco espejado en vertical: casi acertaba —la palabra es ancha y
       baja— pero dejaba hilos de letra sin borrar donde no coincidía. */
    float vacio = texture2D(uVacio, vec2(vUv.x, 1.0 - vUv.y)).r;
    /* resta directa: la máscara ya tiene la forma exacta del grano que se
       ha ido, así que no hay curva que disimule nada */
    float a = cobertura * (1.0 - vacio);
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export async function init(mount) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return { start() {}, stop() {}, dispose() {} };
  }

  const seccion = mount.closest('.s-hero') || mount.parentElement;
  const puntero = { x: 0, y: 0, tx: 0, ty: 0, dentro: false };
  const par = { x: 0, y: 0 };

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1 },
      uColor: { value: new THREE.Vector3(...GRAFITO) },
      uNucleo: { value: NUCLEO },
      uHotIn: { value: 40 },
      uHotOut: { value: 180 },
      uVisIn: { value: 0.8 },
      uVisOut: { value: 9 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    /* alpha-over premultiplicado (ver cabecera) */
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });

  let TOTAL = 0, LETRAS = 0, home = null, pos = null, vel = null, aRand = null, peso = null;
  let geo = null, points = null;
  /* capa de glifo + mapa de vaciado */
  let grupo = null, glifo = null, texGlifo = null;
  /* La máscara de vaciado la dibujan LAS PROPIAS PARTÍCULAS en un render
     target: cada una pinta un disco en su CASA con su grado de arranque.
     Antes era una rejilla calculada en CPU y, por fino que se hiciera el
     paso, borraba en celdas: la letra se comía a cuadros en vez de
     deshacerse en grano. */
  let rt = null, escenaMask = null, camMask = null, puntosMask = null;
  const matMask = new THREE.ShaderMaterial({
    uniforms: {
      uScaleMask: { value: 1 },
      uVisIn: { value: 0.8 },
      uVisOut: { value: 9 },
    },
    vertexShader: VERT_MASK,
    fragmentShader: FRAG_MASK,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    /* MAX: la unión de los discos. Sumando, dos vecinas darían más de 1 y el
       vaciado se comería más de lo que le toca. */
    blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendEquationAlpha: THREE.MaxEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const matGlifo = new THREE.ShaderMaterial({
    uniforms: {
      uGlifo: { value: null },
      uVacio: { value: null },
      uColor: { value: new THREE.Vector3(...GRAFITO) },
    },
    vertexShader: VERT_GLIFO,
    fragmentShader: FRAG_GLIFO,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  let REPEL_R = 200, REPEL_F = 240, TURB = 20;
  let DMIN = 30, VMAX = 70, VMAX2 = 4900;
  let listo = false, quietos = 0;
  /* declaradas ANTES de crearBase: su primer resize() corre de forma
     síncrona dentro de la llamada, cuando `base` aún no existe */
  let camara = null;
  let buildT = 0;

  function programarBuild() {
    clearTimeout(buildT);
    buildT = setTimeout(construir, 180);
  }

  const base = crearBase(mount, {
    fov: 45,
    z: 0,
    onResize: (w, h) => {
      /* 1 unidad de mundo = 1 px CSS: la altura visible en z=0 es h */
      if (camara) camara.position.z = h * 1.20711;
      programarBuild();
    },
    onFrame,
    instrumento: 'hero',
  });
  camara = base.camera;
  camara.position.z = (mount.clientHeight || 1) * 1.20711;
  /* el ratio ya lo puso crearBase según el nivel: no volver a fijarlo aquí,
     que pisaría la reducción */

  /* ---- construcción ---------------------------------------------- */
  /* Firma de lo que determina el muestreo. Si no ha cambiado, reconstruir
     es tirar entre 130 y 206 ms de CPU en un móvil, y se hacía TRES veces:
     una al arrancar, otra en el doble rAF que espera a hero-fit, y otra
     cuando el ResizeObserver de crearBase dispara su primer resize. Ahora
     las dos últimas salen gratis si nada se movió. */
  let firmaUltima = null;
  const firmaDe = (d) => [
    Math.round(d.spanRect.width), Math.round(d.spanRect.height),
    Math.round(d.baselineY), d.cs.fontSize, d.cs.fontFamily,
    mount.clientWidth, mount.clientHeight,
  ].join('|');

  function construir() {
    const datos = medirTitulo();
    if (!datos) return false;
    const firma = firmaDe(datos);
    if (firma === firmaUltima && points) return true;   /* nada cambió */
    firmaUltima = firma;

    const cupo = presupuesto();
    /* los pasos escalan con la altura de la tinta: fijos, se ven finos en
       desktop y gruesos en móvil, donde el título mide 4× menos */
    const altoTinta = parseFloat(datos.cs.fontSize) || 200;
    let gapBorde = Math.max(1.2, Math.min(1.7, altoTinta / 180));
    let gapInt = Math.max(2.0, Math.min(4.2, altoTinta / 72));
    let m = muestrear(datos, gapBorde, gapInt);
    if (!m || !m.pts.length) return false;
    /* segunda pasada: el conteo escala con el cuadrado del ancho */
    const n0 = m.pts.length / 4;
    if (n0 > cupo.palabra) {
      const k = Math.sqrt(n0 / cupo.palabra);
      gapBorde *= k; gapInt *= k;
      m = muestrear(datos, gapBorde, gapInt);
      if (!m || !m.pts.length) return false;
    }

    const letras = m.pts.length / 4;
    const W = mount.clientWidth || 1, H = mount.clientHeight || 1;
    const mr = mount.getBoundingClientRect();

    /* constantes lineales derivadas del alto real (demo: alto visible 4.059u) */
    REPEL_R = 0.2341 * H;
    REPEL_F = 0.28331 * H;
    TURB = 0.02464 * H;
    DMIN = REPEL_R * 0.16;   /* saturación de la fuerza cerca del cursor */
    VMAX = REPEL_R * 0.22;   /* velocidad máxima, px por frame */
    VMAX2 = VMAX * VMAX;
    mat.uniforms.uHotIn.value = 0.06 * H;
    mat.uniforms.uHotOut.value = 0.28 * H;

    /* zona de la foto: el polvo que caiga ahí queda tapado (z-index 1) */
    const foto = seccion && seccion.querySelector('.hero-photo');
    const fr = foto ? foto.getBoundingClientRect() : null;

    TOTAL = letras + cupo.polvo;
    LETRAS = letras;
    home = new Float32Array(TOTAL * 3);
    pos = new Float32Array(TOTAL * 3);
    vel = new Float32Array(TOTAL * 3);
    aRand = new Float32Array(TOTAL);
    peso = new Float32Array(TOTAL);
    const aSize = new Float32Array(TOTAL);
    const aAlpha = new Float32Array(TOTAL);
    const aGrow = new Float32Array(TOTAL);
    const aPulso = new Float32Array(TOTAL);
    const aPolvo = new Float32Array(TOTAL);

    /* origen del canvas de muestreo, relativo al mount */
    const ox = m.ox - mr.left;
    const oy = m.oy - mr.top;

    /* el punto de contorno es la unidad de escala; el de relleno es un
       múltiplo suyo (aSize), para que ambos convivan con un solo uScale */
    const sizeInt = (gapInt * DOT_INT) / (gapBorde * DOT_BORDE);
    for (let i = 0; i < letras; i++) {
      const px = m.pts[i * 4], py = m.pts[i * 4 + 1];
      const alfa = m.pts[i * 4 + 2], esBorde = m.pts[i * 4 + 3] === 1;
      home[i * 3] = ox + px - W / 2;
      home[i * 3 + 1] = H / 2 - (oy + py);
      home[i * 3 + 2] = 0;
      /* En reposo el relleno está tapado por tinta plena: su variación de
         talla no se ve y en cambio abría celdas. Se pasa al término `hot`,
         donde sí se ve — al desarmarse — y el reposo queda garantizado. */
      aSize[i] = esBorde ? 1 : sizeInt;
      aGrow[i] = esBorde ? 2.4 : 0.45 * (0.6 + Math.random() * 0.9);
      /* Ni contorno ni relleno pulsan de tamaño: los dos tienen que cubrir
         en reposo. El pulso se queda solo en el polvo, que es decorativo. */
      aPulso[i] = 0;
      aPolvo[i] = 0;   /* palabra: invisible en reposo, la pinta el glifo */
      aAlpha[i] = alfa;
      aRand[i] = Math.random();
      peso[i] = esBorde ? 0.9 + Math.random() * 0.4 : 0.8 + Math.random() * 0.55;
    }

    for (let i = letras; i < TOTAL; i++) {
      let hx = 0, hy = 0;
      for (let intento = 0; intento < 6; intento++) {
        const a = Math.random() * Math.PI * 2;
        const r = (0.34 + Math.random() * 0.28) * H;
        hx = Math.cos(a) * r * 1.35;
        hy = Math.sin(a) * r * 0.55;
        if (!fr) break;
        /* rechazo: pantalla → mundo */
        const sx = hx + W / 2 + mr.left;
        const sy = H / 2 - hy + mr.top;
        if (sx < fr.left || sx > fr.right || sy < fr.top || sy > fr.bottom) break;
      }
      home[i * 3] = hx;
      home[i * 3 + 1] = hy;
      home[i * 3 + 2] = 0;
      aSize[i] = 1.6 + Math.random() * 1.4;
      aGrow[i] = 0.6;
      aPulso[i] = 0.12;
      aPolvo[i] = 1;   /* polvo ambiental: siempre visible */
      aAlpha[i] = 0.10 + Math.random() * 0.12;
      aRand[i] = Math.random();
      peso[i] = 1.6 + Math.random() * 1.2;
    }

    pos.set(home);
    vel.fill(0);

    if (!grupo) { grupo = new THREE.Group(); base.scene.add(grupo); }
    if (points) { grupo.remove(points); geo.dispose(); }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aHome', new THREE.BufferAttribute(home, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(aAlpha, 1));
    geo.setAttribute('aGrow', new THREE.BufferAttribute(aGrow, 1));
    geo.setAttribute('aPulso', new THREE.BufferAttribute(aPulso, 1));
    geo.setAttribute('aPolvo', new THREE.BufferAttribute(aPolvo, 1));
    geo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
    points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 2;
    grupo.add(points);

    /* ---- capa de glifo: la palabra en reposo ---------------------- */
    if (glifo) { grupo.remove(glifo); glifo.geometry.dispose(); }
    if (texGlifo) texGlifo.dispose();
    texGlifo = new THREE.CanvasTexture(m.lienzo);
    texGlifo.minFilter = THREE.LinearFilter;
    texGlifo.magFilter = THREE.LinearFilter;
    texGlifo.generateMipmaps = false;
    texGlifo.flipY = false;
    texGlifo.colorSpace = THREE.NoColorSpace;   /* es una máscara, no color */

    /* ---- máscara de vaciado: un render target del tamaño del lienzo ----
       Las partículas la dibujan solas (pasada aparte, geometría compartida),
       cada una en su casa. Así el glifo se abre con la forma exacta del grano
       que se ha ido, y no en celdas. */
    const rtW = Math.max(2, Math.round(m.W * m.esc));
    const rtH = Math.max(2, Math.round(m.H * m.esc));
    if (rt) rt.dispose();
    rt = new THREE.WebGLRenderTarget(rtW, rtH, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });

    /* cámara ortográfica que encuadra EXACTAMENTE el rectángulo del lienzo,
       en el espacio local del grupo: así el parallax no la afecta */
    camMask = new THREE.OrthographicCamera(-m.W / 2, m.W / 2, m.H / 2, -m.H / 2, -1000, 1000);
    camMask.position.set(ox + m.W / 2 - W / 2, H / 2 - oy - m.H / 2, 0);
    camMask.updateProjectionMatrix();

    /* el punto de la máscara mide lo mismo que el de verdad, en píxeles del
       render target (que tiene m.esc px por unidad de mundo) */
    /* un pelo más grande que el punto real (×1.15) para cerrar la costura
       entre discos vecinos sin comerse la tinta de las que no se han movido */
    matMask.uniforms.uScaleMask.value = gapBorde * DOT_BORDE * m.esc * 1.15;
    matMask.uniforms.uVisIn.value = mat.uniforms.uVisIn.value;
    matMask.uniforms.uVisOut.value = mat.uniforms.uVisOut.value;

    if (!escenaMask) escenaMask = new THREE.Scene();
    if (puntosMask) escenaMask.remove(puntosMask);
    puntosMask = new THREE.Points(geo, matMask);
    puntosMask.frustumCulled = false;
    escenaMask.add(puntosMask);

    matGlifo.uniforms.uVacio.value = rt.texture;

    matGlifo.uniforms.uGlifo.value = texGlifo;

    /* el quad ocupa exactamente el rectángulo del lienzo, en px CSS = mundo */
    glifo = new THREE.Mesh(new THREE.PlaneGeometry(m.W, m.H), matGlifo);
    glifo.position.set(ox + m.W / 2 - W / 2, H / 2 - oy - m.H / 2, 0);
    glifo.frustumCulled = false;
    glifo.renderOrder = 1;                      /* debajo de las partículas */
    grupo.add(glifo);

    /* tamaño de punto: la unidad es el punto de CONTORNO (world = px CSS) */
    const worldDot = gapBorde * DOT_BORDE;
    const hPx = base.renderer.domElement.height || H;
    mat.uniforms.uScale.value =
      worldDot * (hPx * 0.5) / Math.tan(THREE.MathUtils.degToRad(45 * 0.5));

    /* sonda de diagnóstico para el arnés de QA (tools/qa): permite medir
       la física en vez de comparar capturas. Coste cero si no se llama. */
    window.__particulas = {
      total: () => TOTAL,
      palabra: () => LETRAS,
      /* soloPalabra: ignora el polvo ambiental, que puede estar
         legítimamente desplazado si el cursor sigue dentro de la sección */
      maxDesplazamiento(soloPalabra = true) {
        const n = soloPalabra ? LETRAS : TOTAL;
        let m = 0;
        for (let i = 0; i < n; i++) {
          const ix = i * 3, iy = ix + 1;
          const d = Math.abs(pos[ix] - home[ix]) + Math.abs(pos[iy] - home[iy]);
          if (d > m) m = d;
        }
        return m;
      },
    };

    if (!listo) {
      listo = true;
      seccion && seccion.classList.add('tiene-particulas');
      document.dispatchEvent(new CustomEvent('bergerac:particulas'));
    }
    quietos = 0;
    return true;
  }

  /* ---- ciclo ------------------------------------------------------ */
  function onFrame(t, dt) {
    if (!points) return;
    mat.uniforms.uTime.value = t;

    /* parallax v9 sobre el objeto: mismas amplitudes que tenía el h1 */
    par.x = suavizar(par.x, puntero.tx, 0.05);
    par.y = suavizar(par.y, puntero.ty, 0.05);
    grupo.position.set(par.x * -9, par.y * -6.3, 0);   /* mueve glifo y grano a la vez */

    puntero.x = suavizar(puntero.x, puntero.tx, 0.3);
    puntero.y = suavizar(puntero.y, puntero.ty, 0.3);

    /* reposo: sin puntero y sin energía, no se toca la física */
    if (!puntero.dentro && quietos > 20) return;

    const W = mount.clientWidth || 1, H = mount.clientHeight || 1;
    const mX = puntero.x * W / 2, mY = puntero.y * H / 2;
    const r2 = REPEL_R * REPEL_R;
    const paso = Math.min(dt, 0.05) * 60;
    /* constantes del frame: fuera del bucle (un pow por partícula costaba
       la mitad del presupuesto de CPU con 48k partículas) */
    const amort = Math.pow(DAMPING, paso);
    const muelle = SPRING * paso;
    let maxV = 0, maxD = 0;

    for (let i = 0; i < TOTAL; i++) {
      const ix = i * 3, iy = ix + 1;
      const tx = home[ix], ty = home[iy];
      let px = pos[ix], py = pos[iy];
      let vx = vel[ix], vy = vel[iy];

      vx += (tx - px) * muelle;
      vy += (ty - py) * muelle;

      if (puntero.dentro) {
        const dx = px - mX, dy = py - mY;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          /* la fuerza va como 1/d: justo bajo el cursor eso es una
             singularidad que dispara la partícula fuera de la sección y
             tarda una eternidad en volver. Se satura a partir de DMIN. */
          const d = Math.max(Math.sqrt(d2), DMIN);
          const f = 1 - d / REPEL_R;
          const push = f * f * REPEL_F * peso[i] / d;
          const rnd = aRand[i] * 6.2831 + t * 3;
          vx += (dx * push + Math.sin(rnd) * f * TURB * peso[i]) * paso;
          vy += (dy * push + Math.cos(rnd * 1.3) * f * TURB * peso[i]) * paso;
        }
      }

      /* techo de velocidad: ninguna partícula puede escaparse de la
         palabra por mucho que se insista con el cursor */
      const v2 = vx * vx + vy * vy;
      if (v2 > VMAX2) {
        const k = VMAX / Math.sqrt(v2);
        vx *= k; vy *= k;
      }

      vx *= amort; vy *= amort;
      px += vx * paso; py += vy * paso;

      pos[ix] = px; pos[iy] = py;
      vel[ix] = vx; vel[iy] = vy;

      const v = Math.abs(vx) + Math.abs(vy);
      if (v > maxV) maxV = v;
      const d = Math.abs(px - tx) + Math.abs(py - ty);
      if (d > maxD) maxD = d;
    }

    /* reposo solo si además TODAS volvieron a su letra: con el criterio
       de velocidad a secas, las últimas se congelaban a medio camino y la
       palabra quedaba mal cerrada tras cada interacción */
    quietos = (!puntero.dentro && maxV < 0.04 && maxD < 0.35) ? quietos + 1 : 0;
    geo.attributes.position.needsUpdate = true;

    /* PASADA DE MÁSCARA. Va aquí, justo antes de que crearBase pinte la
       escena: las partículas dibujan en su casa el hueco que han dejado y
       el glifo lo lee en el mismo frame. */
    if (rt && escenaMask && camMask) {
      const previo = base.renderer.getRenderTarget();
      base.renderer.setRenderTarget(rt);
      base.renderer.setClearColor(0x000000, 0);
      base.renderer.clear(true, false, false);
      base.renderer.render(escenaMask, camMask);
      base.renderer.setRenderTarget(previo);
    }
  }

  /* ---- puntero, acción, resize ------------------------------------ */
  const soltarPuntero = seguirPuntero(seccion || mount, puntero);
  /* despertar del reposo al primer movimiento */
  const despertar = () => { quietos = 0; };
  (seccion || mount).addEventListener('pointermove', despertar, { passive: true });

  base.accion = (nx = 0, ny = 0) => {
    if (!points) return;
    const W = mount.clientWidth || 1, H = mount.clientHeight || 1;
    const cx = nx * W / 2, cy = ny * H / 2;
    const R = REPEL_R * 2.2;
    for (let i = 0; i < TOTAL; i++) {
      const ix = i * 3, iy = ix + 1;
      const dx = pos[ix] - cx, dy = pos[iy] - cy;
      const d = Math.hypot(dx, dy) || 1e-3;
      if (d > R) continue;
      const f = (1 - d / R) * REPEL_F * 0.06 * peso[i] / d;
      vel[ix] += dx * f;
      vel[iy] += dy * f;
    }
    quietos = 0;
  };

  /* la fuente display es font-display:swap — muestrear antes daría Arial */
  const fuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  await fuentes;
  if (!construir()) {
    console.warn('[hero-particulas] muestreo no válido: se conserva el título de texto');
  }
  /* segundo intento tras el ajuste de hero-fit (mide en rAF) */
  requestAnimationFrame(() => requestAnimationFrame(construir));

  const dispose = base.dispose.bind(base);
  base.dispose = () => {
    clearTimeout(buildT);
    soltarPuntero();
    (seccion || mount).removeEventListener('pointermove', despertar);
    seccion && seccion.classList.remove('tiene-particulas');
    if (geo) geo.dispose();
    if (glifo) glifo.geometry.dispose();
    if (texGlifo) texGlifo.dispose();
    if (rt) rt.dispose();
    matMask.dispose();
    matGlifo.dispose();
    mat.dispose();
    dispose();
  };
  return base;
}
