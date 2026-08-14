/* ============================================================
   01 · HERO — BERGERAC EN PARTÍCULAS
   Adaptación de BERGERAC-particulas_v1.html al hero azul.

   La palabra ES el instrumento: se muestrea el h1 real (misma
   fuente, misma talla, misma posición que le da hero-fit.js) y
   cada píxel de tinta se convierte en una partícula grafito.
   El cursor las desarma; un muelle las devuelve a su letra.

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
   queden costuras entre puntos vecinos: diámetro_sólido ≥ paso·√2. */
const DOT_BORDE = 1.82;
const DOT_INT = 2.15;    /* íd. del relleno (mayor: tiene que tapar) */
const NUCLEO = 0.44;     /* fracción opaca del punto (el resto, borde suave) */
const JITTER = 0.18;     /* desorden del relleno, en fracción del paso */

function presupuesto() {
  const flojo = (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  /* el loader del isotipo cubre la construcción: se puede ser generoso */
  if (flojo) return { palabra: 14000, polvo: 250 };
  if (innerWidth >= 1200) return { palabra: 48000, polvo: 600 };
  if (innerWidth >= 900) return { palabra: 30000, polvo: 400 };
  return { palabra: 16000, polvo: 250 };
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

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
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

  const data = ctx.getImageData(0, 0, W, H).data;
  const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H)
    ? 0 : data[((y | 0) * W + (x | 0)) * 4 + 3];

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
  return { pts, W, H, ox: spanRect.left - PAD, oy: baselineY - arriba };
}

/* ---- shaders ---------------------------------------------------- */
const VERT = /* glsl */`
  attribute float aSize;
  attribute float aRand;
  attribute float aAlpha;
  attribute float aGrow;
  attribute vec3  aHome;
  uniform float uTime;
  uniform float uScale;
  uniform float uHotIn;
  uniform float uHotOut;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float disp = length(position.xy - aHome.xy);
    float hot = smoothstep(uHotIn, uHotOut, disp);
    /* MATERIALIZACIÓN: en reposo las partículas del contorno llevan la
       opacidad parcial del antialiasing (la palabra se lee como fuente);
       al arrancarse ganan cuerpo y se revelan como partículas. */
    vAlpha = mix(aAlpha, 1.0, hot);
    float pulse = 0.88 + 0.12 * sin(uTime * 1.6 + aRand * 6.2831);
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
  });
  camara = base.camera;
  camara.position.z = (mount.clientHeight || 1) * 1.20711;
  base.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  /* ---- construcción ---------------------------------------------- */
  function construir() {
    const datos = medirTitulo();
    if (!datos) return false;

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
      aSize[i] = esBorde ? 1 : sizeInt * (0.88 + Math.random() * 0.3);
      aGrow[i] = esBorde ? 2.4 : 0.45;
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
      aAlpha[i] = 0.10 + Math.random() * 0.12;
      aRand[i] = Math.random();
      peso[i] = 1.6 + Math.random() * 1.2;
    }

    pos.set(home);
    vel.fill(0);

    if (points) { base.scene.remove(points); geo.dispose(); }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aHome', new THREE.BufferAttribute(home, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(aAlpha, 1));
    geo.setAttribute('aGrow', new THREE.BufferAttribute(aGrow, 1));
    geo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
    points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    base.scene.add(points);

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
    points.position.set(par.x * -9, par.y * -6.3, 0);

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
    mat.dispose();
    dispose();
  };
  return base;
}
