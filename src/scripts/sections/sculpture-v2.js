// Escultura paramétrica Bergerac v2 — LA ESCULTURA ES EL PROYECTO.
// El loop cerrado se abre, se recorre (método) y se vuelve a cerrar mejorado.
// Capas: GEOMETRÍA (costillas in-place, topología fija SIEMPRE)
//   → ESTADO NARRATIVO (7 sets interpolables, progress 0..6)
//   → AMBIENTAL (vida interna de baja amplitud)
//   → INTERACCIÓN (hover local + despliegue por click, dependiente de la etapa)
//   → COMPOSICIÓN (posición/rotación espacial, cruce derecha→izquierda en 3→4)
// GSAP/ScrollTrigger solo anima `sculpture.progress`.
// Clave técnica: la spline es un arco de longitud constante L y extensión angular
// Θ = 2π(1-open): open 0 = círculo cerrado (loop), open 1 = recorrido recto vertical.
// Los extremos se separan de verdad; nunca se cambia de objeto.
import * as THREE from 'three';

export const ORDER = ['cerrado', 'abrir', 'estudiar', 'definir', 'construir', 'afinar', 'resuelto'];

export const STATES = {
  // open: 0 loop cerrado · 1 recorrido abierto — L: longitud de arco (constante al abrir)
  // wave*: ondulación 3D del loop (freq entera = continuidad en el cierre)
  // rollTwist en cerrados = 4π para que la torsión sea continua en el empalme
  cerrado: {   // EL PROYECTO: completo, contenido, con historia (jitter moderado)
    open: 0.00, L: 5.6, waveAmp: 0.30, waveFreq: 2, xBend: 0.00,
    rBase: 0.30, rBulge: 0.06, rFreq: 3,
    spanBase: 5.40, spanDelta: 0.00,
    rollBase: 0.0, rollTwist: 12.566, rollWaveAmp: 0.25, rollWaveFreq: 2,
    thickness: 0.050, depth: 0.050, ellipse: 0.92,
    tiltBase: 0.05, tiltDelta: 0.20, jitter: 0.30, ambient: 1.00,
    posX: 0.35, posY: 0.05, rotX: 0.55, rotY: 0.45,
  },
  abrir: {     // ESTUDIAR (gesto inicial): los extremos se separan, empieza a desenredarse
    open: 0.42, L: 6.0, waveAmp: 0.26, waveFreq: 2, xBend: 0.10,
    rBase: 0.30, rBulge: 0.07, rFreq: 3,
    spanBase: 4.90, spanDelta: -0.20,
    rollBase: 0.0, rollTwist: 11.50, rollWaveAmp: 0.25, rollWaveFreq: 2,
    thickness: 0.050, depth: 0.048, ellipse: 0.94,
    tiltBase: 0.08, tiltDelta: 0.30, jitter: 0.35, ambient: 1.00,
    posX: 0.55, posY: -0.50, rotX: 0.35, rotY: 0.35,
  },
  estudiar: {  // recorrido abierto, diseccionado: capas expuestas, sale por el bottom
    open: 1.00, L: 6.8, waveAmp: 0.22, waveFreq: 2, xBend: 0.30,
    rBase: 0.32, rBulge: 0.10, rFreq: 3,
    spanBase: 3.60, spanDelta: -0.80,
    rollBase: 0.0, rollTwist: 9.00, rollWaveAmp: 0.30, rollWaveFreq: 2,
    thickness: 0.045, depth: 0.042, ellipse: 0.95,
    tiltBase: 0.12, tiltDelta: 0.45, jitter: 0.42, ambient: 1.00,
    posX: 0.95, posY: -2.10, rotX: 0.12, rotY: 0.20,
  },
  definir: {   // lo estudiado encuentra orden: ritmo, alineación, tensión controlada
    open: 1.00, L: 6.6, waveAmp: 0.18, waveFreq: 2, xBend: 0.22,
    rBase: 0.33, rBulge: 0.08, rFreq: 3,
    spanBase: 3.90, spanDelta: -0.30,
    rollBase: 0.0, rollTwist: 7.50, rollWaveAmp: 0.55, rollWaveFreq: 2,
    thickness: 0.050, depth: 0.050, ellipse: 0.98,
    tiltBase: 0.05, tiltDelta: 0.20, jitter: 0.10, ambient: 0.90,
    posX: 0.95, posY: -2.00, rotX: 0.10, rotY: 0.10,
  },
  construir: { // tras el cruce derecha→izquierda: cuerpo, espesor, estabilidad
    open: 1.00, L: 6.3, waveAmp: 0.16, waveFreq: 2, xBend: 0.16,
    rBase: 0.36, rBulge: 0.07, rFreq: 3,
    spanBase: 4.60, spanDelta: -0.25,
    rollBase: 0.0, rollTwist: 6.80, rollWaveAmp: 0.40, rollWaveFreq: 2,
    thickness: 0.085, depth: 0.068, ellipse: 1.00,
    tiltBase: 0.03, tiltDelta: 0.12, jitter: 0.05, ambient: 0.85,
    posX: -0.95, posY: -1.95, rotX: 0.10, rotY: -2.85,
  },
  afinar: {    // precisión creciente; PAYOFF: el recorrido empieza a volver a cerrarse
    open: 0.55, L: 6.0, waveAmp: 0.20, waveFreq: 2, xBend: 0.08,
    rBase: 0.34, rBulge: 0.05, rFreq: 3,
    spanBase: 4.90, spanDelta: -0.10,
    rollBase: 0.0, rollTwist: 8.50, rollWaveAmp: 0.30, rollWaveFreq: 2,
    thickness: 0.068, depth: 0.058, ellipse: 1.00,
    tiltBase: 0.02, tiltDelta: 0.08, jitter: 0.02, ambient: 0.60,
    posX: -0.75, posY: -0.90, rotX: 0.25, rotY: -2.95,
  },
  resuelto: {  // el mismo loop, devuelto mejor: jitter 0, ritmo preciso, calma
    open: 0.00, L: 5.8, waveAmp: 0.24, waveFreq: 2, xBend: 0.00,
    rBase: 0.32, rBulge: 0.04, rFreq: 3,
    spanBase: 5.40, spanDelta: 0.00,
    rollBase: 0.0, rollTwist: 12.566, rollWaveAmp: 0.35, rollWaveFreq: 2,
    thickness: 0.060, depth: 0.052, ellipse: 1.00,
    tiltBase: 0.00, tiltDelta: 0.10, jitter: 0.00, ambient: 0.50,
    posX: -0.25, posY: 0.05, rotX: 0.50, rotY: -2.70,
  },
};

const KEYS = Object.keys(STATES.cerrado);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function seeded(i) {
  let t = (i + 1) * 0x9e3779b9;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return (((x ^ (x >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

// ---- GEOMETRÍA (idéntica a v1): costilla = arco con sección rectangular ----
function makeRibGeometry(S, sharedIndex) {
  const vCount = (S + 1) * 8 + 8;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vCount * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vCount * 3), 3));
  g.setIndex(sharedIndex);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
  return g;
}

function makeRibIndex(S) {
  const idx = [];
  for (let j = 0; j < S; j++) {
    const a = j * 8, b = a + 8;
    idx.push(a + 0, a + 1, b + 1, a + 0, b + 1, b + 0);
    idx.push(a + 2, a + 3, b + 3, a + 2, b + 3, b + 2);
    idx.push(a + 4, b + 4, b + 5, a + 4, b + 5, a + 5);
    idx.push(a + 6, a + 7, b + 7, a + 6, b + 7, b + 6);
  }
  const c = (S + 1) * 8;
  idx.push(c + 0, c + 1, c + 2, c + 0, c + 2, c + 3);
  idx.push(c + 4, c + 5, c + 6, c + 4, c + 6, c + 7);
  return new THREE.BufferAttribute(new Uint16Array(idx), 1);
}

function updateRibGeometry(g, S, r, span, th, dp) {
  const pos = g.attributes.position.array;
  const nor = g.attributes.normal.array;
  const ro = r + th / 2, ri = Math.max(r - th / 2, 0.005), hd = dp / 2;
  const th0 = -span / 2;
  for (let j = 0; j <= S; j++) {
    const a = th0 + (span * j) / S;
    const c = Math.cos(a), s = Math.sin(a);
    const ox = ro * c, oz = ro * s, ix = ri * c, iz = ri * s;
    let k = j * 24;
    pos[k] = ox; pos[k + 1] = hd; pos[k + 2] = oz; nor[k] = c; nor[k + 1] = 0; nor[k + 2] = s;
    pos[k + 3] = ox; pos[k + 4] = -hd; pos[k + 5] = oz; nor[k + 3] = c; nor[k + 4] = 0; nor[k + 5] = s;
    pos[k + 6] = ix; pos[k + 7] = -hd; pos[k + 8] = iz; nor[k + 6] = -c; nor[k + 7] = 0; nor[k + 8] = -s;
    pos[k + 9] = ix; pos[k + 10] = hd; pos[k + 11] = iz; nor[k + 9] = -c; nor[k + 10] = 0; nor[k + 11] = -s;
    pos[k + 12] = ox; pos[k + 13] = hd; pos[k + 14] = oz; nor[k + 12] = 0; nor[k + 13] = 1; nor[k + 14] = 0;
    pos[k + 15] = ix; pos[k + 16] = hd; pos[k + 17] = iz; nor[k + 15] = 0; nor[k + 16] = 1; nor[k + 17] = 0;
    pos[k + 18] = ox; pos[k + 19] = -hd; pos[k + 20] = oz; nor[k + 18] = 0; nor[k + 19] = -1; nor[k + 20] = 0;
    pos[k + 21] = ix; pos[k + 22] = -hd; pos[k + 23] = iz; nor[k + 21] = 0; nor[k + 22] = -1; nor[k + 23] = 0;
  }
  const c0 = Math.cos(th0), s0 = Math.sin(th0);
  const c1 = Math.cos(th0 + span), s1 = Math.sin(th0 + span);
  let k = (S + 1) * 24;
  const cap = (cc, ss, nx, nz) => {
    const pts = [[ro * cc, hd, ro * ss], [ro * cc, -hd, ro * ss], [ri * cc, -hd, ri * ss], [ri * cc, hd, ri * ss]];
    for (const p of pts) {
      pos[k] = p[0]; pos[k + 1] = p[1]; pos[k + 2] = p[2];
      nor[k] = nx; nor[k + 1] = 0; nor[k + 2] = nz; k += 3;
    }
  };
  cap(c0, s0, s0, -c0);
  cap(c1, s1, -s1, c1);
  g.attributes.position.needsUpdate = true;
  g.attributes.normal.needsUpdate = true;
  g.boundingSphere.radius = ro + hd + 0.02;
}

export class Sculpture {
  constructor(opts = {}) {
    this.group = new THREE.Group();
    this.group.name = 'proyecto_bergerac';
    this.params = Object.assign(
      { ribCount: 72, stations: 36, apertura: 1, amplitud: 1, velocidad: 1, torsion: 1 },
      opts
    );
    this.progress = 0;    // 0 cerrado · 1 abrir · 2 estudiar · 3 definir · 4 construir · 5 afinar · 6 resuelto
    this.hoverIndex = -1; // costilla bajo el cursor
    this.selected = -1;   // costilla desplegada por click (revela el momento actual)
    this._t = 0;
    this._selAct = 0;
    this._blended = {};
    this._colors = { rib: '#a084e6', emissive: '#6a3df5' };
    this._v = { p: new THREE.Vector3(), p2: new THREE.Vector3(), tan: new THREE.Vector3(), Y: new THREE.Vector3(0, 1, 0), X: new THREE.Vector3(1, 0, 0), qA: new THREE.Quaternion(), qR: new THREE.Quaternion(), qT: new THREE.Quaternion() };
    this._ribs = [];
    this.meshes = [];
    this.rebuild();
  }

  rebuild() {
    for (const rib of this._ribs) {
      this.group.remove(rib.mesh);
      rib.mesh.geometry.dispose();
      rib.mesh.material.dispose();
    }
    this._ribs = [];
    this.meshes = [];
    const N = Math.max(12, Math.round(this.params.ribCount));
    const S = Math.max(12, Math.round(this.params.stations));
    this._S = S;
    const sharedIndex = makeRibIndex(S);
    for (let i = 0; i < N; i++) {
      const rnd = seeded(i);
      const mat = new THREE.MeshStandardMaterial({
        color: this._colors.rib,
        emissive: this._colors.emissive,
        emissiveIntensity: 0,
        roughness: 0.52,
        metalness: 0.15,
        side: THREE.DoubleSide,
      });
      mat.name = 'costilla_mat_' + i;
      const mesh = new THREE.Mesh(makeRibGeometry(S, sharedIndex), mat);
      mesh.name = 'costilla_' + String(i).padStart(3, '0');
      mesh.userData.i = i;
      const rib = { mesh, geom: mesh.geometry, hover: 0, sel: 0, seed: { a: rnd(), b: rnd(), c: rnd(), d: rnd() } };
      this._ribs.push(rib);
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  setColors(rib, emissive) {
    this._colors = { rib, emissive };
    for (const r of this._ribs) {
      r.mesh.material.color.set(rib);
      r.mesh.material.emissive.set(emissive);
    }
  }

  // ---- ESTADO NARRATIVO: interpolación continua entre los 7 sets ----
  _blend(p) {
    p = clamp(p, 0, 6);
    const i = Math.min(5, Math.floor(p));
    const f = p - i;
    const a = STATES[ORDER[i]], b = STATES[ORDER[i + 1]];
    const out = this._blended;
    for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * f;
    return out;
  }

  // Spline con desenrollado de longitud constante: Θ = 2π(1-open).
  // open 0 → círculo cerrado (los extremos coinciden); open 1 → recorrido
  // vertical descendente. La longitud L se conserva: el loop se DESENREDA.
  _spine(s, st, out) {
    const Theta = Math.max(0.10, (1 - st.open) * Math.PI * 2);
    const Rc = st.L / Theta;
    const phi = Theta * (s - 0.5);
    const c0 = (Math.cos(Theta / 2) + 1) / 2;
    out.set(
      Rc * (Math.cos(phi) - c0) + st.xBend * Math.sin(Math.PI * s) * st.open,
      -Rc * Math.sin(phi),
      st.waveAmp * Math.sin(st.waveFreq * Math.PI * 2 * s + 1.3)
    );
    return out;
  }

  pick(raycaster) {
    const hits = raycaster.intersectObjects(this.meshes, false);
    return hits.length ? hits[0].object.userData.i : -1;
  }

  update(dt) {
    const P = this.params;
    this._t += dt * P.velocidad;
    const t = this._t;
    const p = clamp(this.progress, 0, 6);
    const st = this._blend(p);
    const N = this._ribs.length;
    const amp = st.ambient * P.amplitud;
    const selOn = this.selected >= 0 ? 1 : 0;
    this._selAct += (selOn - this._selAct) * Math.min(1, dt * 6);
    const { p: pos, p2, tan, Y, X, qA, qR, qT } = this._v;

    // COMPOSICIÓN: cruce 3D derecha→izquierda entre DEFINIR (3) y CONSTRUIR (4):
    // se acerca a cámara y rota mientras cruza; el color cambia aparte (limpio).
    const cross = clamp(p - 3, 0, 1);
    const hump = Math.sin(Math.PI * cross);
    this.group.position.set(st.posX, st.posY, 0.85 * hump);
    this.group.rotation.set(st.rotX, st.rotY + 0.03 * amp * Math.sin(0.2 * t), 0);

    for (let i = 0; i < N; i++) {
      const rib = this._ribs[i];
      const s = i / N; // i/N: al cerrarse, extremos separados exactamente un paso
      const jj = rib.seed;
      const phi = i * 0.42;

      // INTERACCIÓN
      let hT = 0;
      if (this.hoverIndex >= 0) {
        const d = i - this.hoverIndex;
        hT = Math.exp(-(d * d) / (2 * 3.2 * 3.2));
      }
      rib.hover += (hT - rib.hover) * Math.min(1, dt * 9);
      let sT = 0;
      if (this.selected >= 0) {
        const d = i - this.selected;
        sT = Math.exp(-(d * d) / (2 * 4.5 * 4.5));
      }
      rib.sel += (sT - rib.sel) * Math.min(1, dt * 6);
      const h = rib.hover, sel = rib.sel;
      const jit = st.jitter * (1 - 0.8 * sel);
      const dSel = this.selected >= 0 ? clamp((i - this.selected) / 4, -1, 1) : 0;
      const dHov = this.hoverIndex >= 0 ? clamp((i - this.hoverIndex) / 3, -1, 1) : 0;

      // GEOMETRÍA + AMBIENTAL
      let r = st.rBase + st.rBulge * Math.sin(st.rFreq * Math.PI * 2 * s + 0.7);
      r *= 1 + 0.16 * jit * jj.a;
      r *= 1 + 0.03 * amp * Math.sin(0.45 * t + phi * 0.8);
      r += 0.05 * h + 0.14 * sel;
      let span = st.spanBase + st.spanDelta * s - (P.apertura - 1) * 1.4;
      span += 0.45 * jit * jj.b;
      span += 0.10 * amp * Math.sin(0.5 * t + phi);
      span *= 1 - 0.25 * sel;
      span = clamp(span, 0.3, 6.2);
      const th = st.thickness * (1 + 0.15 * jit * jj.c);
      updateRibGeometry(rib.geom, this._S, r, span, th, st.depth);

      // POSICIÓN + MARCO sobre la spline
      this._spine(s, st, pos);
      const e = 0.008;
      this._spine(Math.min(1, s + e), st, p2);
      this._spine(Math.max(0, s - e), st, tan);
      tan.subVectors(p2, tan).normalize();

      // separaciones a lo largo del recorrido (ambiental + hover + despliegue)
      let tShift = 0.02 * amp * Math.sin(0.3 * t + phi * 0.6);
      tShift += 0.05 * rib.hover * dHov;
      tShift += 0.11 * sel * dSel;
      pos.addScaledVector(tan, tShift);

      let roll = st.rollBase + st.rollTwist * P.torsion * s
        + st.rollWaveAmp * Math.sin(Math.PI * 2 * st.rollWaveFreq * s)
        + 0.8 * jit * jj.d
        + 0.07 * amp * Math.sin(0.35 * t + phi * 1.35 + 1.7)
        + 0.30 * sel * dSel;
      let tilt = st.tiltBase + st.tiltDelta * Math.sin(Math.PI * 2 * s)
        + 0.05 * amp * Math.sin(0.4 * t + phi * 1.1)
        + 0.10 * h;

      const m = rib.mesh;
      m.position.copy(pos);
      qA.setFromUnitVectors(Y, tan);
      qR.setFromAxisAngle(Y, roll);
      qT.setFromAxisAngle(X, tilt);
      m.quaternion.copy(qA).multiply(qR).multiply(qT);
      m.scale.set(1, 1, st.ellipse);
      m.material.emissiveIntensity = 0.85 * h + 0.5 * sel;
    }
  }
}
