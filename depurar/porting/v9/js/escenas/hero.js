/* ============ 01 HERO — adaptación de webgl_gpgpu_birds ============
   Bandada de 700 piezas pequeñas en una sola tonalidad (la del "01"
   fantasma). Reglas boids (separación, alineación, cohesión) sobre una
   grilla espacial + un punto de deriva que la hace barrer el hero como
   un enjambre. El cursor la repele; accion(nx, ny) = estallido. */

import * as THREE from 'three';
import { PALETA, crearBase, seguirPuntero, suavizar } from './util.js';

const N = 700;
const LIMITE = new THREE.Vector3(660, 360, 280);
const VISION = 100;               // radio de vecindad (= celda de la grilla)

export async function init(mount) {
  const puntero = { x: 0, y: 0, tx: 0, ty: 0, dentro: false };

  const posiciones = [], velocidades = [];
  for (let i = 0; i < N; i++) {
    posiciones.push(new THREE.Vector3(
      (Math.random() - .5) * 2 * LIMITE.x,
      (Math.random() - .5) * 2 * LIMITE.y,
      (Math.random() - .5) * 2 * LIMITE.z
    ));
    velocidades.push(new THREE.Vector3(
      Math.random() - .5, Math.random() - .5, Math.random() - .5
    ).normalize().multiplyScalar(1 + Math.random()));
  }

  // Pieza pequeña: plaquita triangular apuntando a +Z
  const geo = new THREE.ConeGeometry(3.2, 12, 4, 1);
  geo.rotateX(Math.PI / 2);
  geo.scale(1, .35, 1);

  // Una sola tonalidad, la del "01" fantasma: azul del fondo hundido a grafito
  const tono = new THREE.Color(PALETA.azul).lerp(new THREE.Color(PALETA.grafito), .12);
  const mat = new THREE.MeshBasicMaterial({ color: tono });
  const malla = new THREE.InstancedMesh(geo, mat, N);
  malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const mira = new THREE.Vector3();
  const aux = new THREE.Vector3();
  const repulsor = new THREE.Vector3();
  const estallido = new THREE.Vector3();
  const deriva = new THREE.Vector3();
  let estallidoFuerza = 0;

  // FUGITIVAS: el imán de la bandada tiene límite. Cada tanto una pieza
  // arranca en una dirección propia por unos segundos; su velocidad pesa
  // más en la alineación de las vecinas, así que alguien siempre la sigue.
  const fuga = new Float32Array(N);          // segundos restantes de fuga
  const fugaDir = [];
  for (let i = 0; i < N; i++) fugaDir.push(new THREE.Vector3());

  // Grilla espacial: vecinos en O(n) en lugar de O(n²)
  const celdas = new Map();
  const claveDe = p => {
    const cx = Math.floor(p.x / VISION), cy = Math.floor(p.y / VISION), cz = Math.floor(p.z / VISION);
    return ((cx + 512) << 20) | ((cy + 512) << 10) | (cz + 512);
  };

  const base = crearBase(mount, {
    fov: 50, z: 700,
    onFrame(t, dt) {
      const paso = Math.min(dt, .05) * 60;
      puntero.x = suavizar(puntero.x, puntero.tx, .06);
      puntero.y = suavizar(puntero.y, puntero.ty, .06);
      repulsor.set(puntero.x * LIMITE.x, puntero.y * LIMITE.y, 0);
      estallidoFuerza = Math.max(0, estallidoFuerza - dt * 1.6);

      // punto de deriva: recorre el hero lentamente y la bandada lo persigue
      deriva.set(
        Math.sin(t * .17) * LIMITE.x * .55,
        Math.sin(t * .23 + 2) * LIMITE.y * .55,
        Math.cos(t * .13) * LIMITE.z * .4
      );

      // nuevas fugitivas: ~24 por segundo, cada una arranca 3–6 s
      // (~100 fugas simultáneas → la bandada vive fragmentándose)
      for (let intento = 0; intento < 12; intento++) {
        if (Math.random() < dt * 2) {
          const i = (Math.random() * N) | 0;
          if (fuga[i] <= 0) {
            fuga[i] = 3 + Math.random() * 3;
            fugaDir[i].set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
          }
        }
      }

      // reconstruir grilla
      celdas.clear();
      for (let i = 0; i < N; i++) {
        const k = claveDe(posiciones[i]);
        let lista = celdas.get(k);
        if (!lista) { lista = []; celdas.set(k, lista); }
        lista.push(i);
      }

      for (let i = 0; i < N; i++) {
        const p = posiciones[i], v = velocidades[i];
        let sepX = 0, sepY = 0, sepZ = 0;
        let aliX = 0, aliY = 0, aliZ = 0;
        let cohX = 0, cohY = 0, cohZ = 0, vecinos = 0;

        const cx = Math.floor(p.x / VISION), cy = Math.floor(p.y / VISION), cz = Math.floor(p.z / VISION);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            for (let oz = -1; oz <= 1; oz++) {
              const lista = celdas.get((((cx + ox) + 512) << 20) | (((cy + oy) + 512) << 10) | ((cz + oz) + 512));
              if (!lista) continue;
              for (let n = 0; n < lista.length; n++) {
                const j = lista[n];
                if (j === i) continue;
                const q = posiciones[j];
                const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
                const d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < VISION * VISION && d2 > 0) {
                  vecinos++;
                  const w = 1 / d2;
                  sepX += dx * w; sepY += dy * w; sepZ += dz * w;
                  const u = velocidades[j];
                  // una fugitiva pesa 48x en la alineación: arrastra un subgrupo
                  const peso = fuga[j] > 0 ? 48 : 1;
                  aliX += u.x * peso; aliY += u.y * peso; aliZ += u.z * peso;
                  cohX += q.x; cohY += q.y; cohZ += q.z;
                }
              }
            }
          }
        }

        const enFuga = fuga[i] > 0;
        if (vecinos > 0) {
          // SEPARACIÓN ×3 de nuevo (768): repelente máximo — la bandada
          // existe por alineación, no por amontonamiento
          v.x += sepX * 768 * paso * .01;
          v.y += sepY * 768 * paso * .01;
          v.z += sepZ * 768 * paso * .01;
          v.x += (aliX / vecinos - v.x) * .04 * paso;
          v.y += (aliY / vecinos - v.y) * .04 * paso;
          v.z += (aliZ / vecinos - v.z) * .04 * paso;
          if (!enFuga) {
            // el imán de la bandada solo aplica a quien no está arrancando
            v.x += (cohX / vecinos - p.x) * .0014 * paso;
            v.y += (cohY / vecinos - p.y) * .0014 * paso;
            v.z += (cohZ / vecinos - p.z) * .0014 * paso;
          }
        }

        // vuelo propio: ruido individual — ninguna vuela en línea perfecta
        v.x += (Math.random() - .5) * .16 * paso;
        v.y += (Math.random() - .5) * .16 * paso;
        v.z += (Math.random() - .5) * .16 * paso;

        // fuga activa: rompe el imán y tira fuerte hacia su propia dirección
        if (enFuga) {
          fuga[i] -= dt;
          v.addScaledVector(fugaDir[i], 6 * paso);
        }

        // persecución mínima del punto de deriva (los subgrupos mandan)
        v.x += (deriva.x - p.x) * .00013 * paso;
        v.y += (deriva.y - p.y) * .00013 * paso;
        v.z += (deriva.z - p.z) * .00013 * paso;

        if (puntero.dentro) {
          aux.subVectors(p, repulsor);
          const d = aux.length();
          if (d < 200 && d > 0) v.addScaledVector(aux.normalize(), (1 - d / 200) * 1.5 * paso);
        }

        if (estallidoFuerza > 0) {
          aux.subVectors(p, estallido);
          const d = aux.length();
          if (d < 640 && d > 0.01) {
            v.addScaledVector(aux.normalize(), (1 - d / 640) * estallidoFuerza * 7 * paso);
          }
        }

        v.x -= Math.sign(p.x) * Math.max(0, Math.abs(p.x) - LIMITE.x) * .004 * paso;
        v.y -= Math.sign(p.y) * Math.max(0, Math.abs(p.y) - LIMITE.y) * .004 * paso;
        v.z -= Math.sign(p.z) * Math.max(0, Math.abs(p.z) - LIMITE.z) * .006 * paso;

        // velocidad de crucero al 50%: mismas conductas, vuelo calmo
        const rapidez = v.length();
        const max = (enFuga ? 4.25 : 2.3) + estallidoFuerza * 2, min = .9;
        if (rapidez > max) v.multiplyScalar(max / rapidez);
        else if (rapidez < min) v.multiplyScalar(min / Math.max(rapidez, .0001));

        p.addScaledVector(v, paso);

        dummy.position.copy(p);
        mira.copy(p).add(v);
        dummy.lookAt(mira);
        dummy.rotation.z += Math.sin(t * 6 + i) * .12;
        dummy.updateMatrix();
        malla.setMatrixAt(i, dummy.matrix);
      }
      malla.instanceMatrix.needsUpdate = true;

      base.camera.position.x = puntero.x * 46;
      base.camera.position.y = puntero.y * 30;
      base.camera.lookAt(0, 0, 0);
    },
  });

  base.scene.add(malla);

  const soltarPuntero = seguirPuntero(mount.parentElement, puntero);

  base.accion = (nx = 0, ny = 0) => {
    estallido.set(nx * LIMITE.x, ny * LIMITE.y, 0);
    estallidoFuerza = 1;
  };

  const dispose = base.dispose.bind(base);
  base.dispose = () => { soltarPuntero(); geo.dispose(); mat.dispose(); dispose(); };
  return base;
}
