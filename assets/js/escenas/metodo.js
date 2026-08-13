/* ============ 04 MÉTODO — adaptación de webgl_instancing_dynamic ============
   Retícula de instancias con onda coordinada. Interacción: accion(nx, ny)
   lanza una onda radial desde el punto tocado que recorre toda la retícula. */

import * as THREE from 'three';
import { PALETA, crearBase, seguirPuntero, suavizar } from './util.js';

const COLS = 26, FILAS = 12, PASO = 34;

export async function init(mount) {
  const puntero = { x: 0, y: 0, tx: 0, ty: 0, dentro: false };

  const geo = new THREE.BoxGeometry(14, 14, 14);
  const mat = new THREE.MeshStandardMaterial({ roughness: .55, metalness: .05, transparent: true, opacity: .55 });
  const total = COLS * FILAS;
  const malla = new THREE.InstancedMesh(geo, mat, total);
  malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const etapas = [PALETA.morado, PALETA.fucsia, PALETA.amarillo, PALETA.azul];
  const c = new THREE.Color();
  for (let ix = 0; ix < COLS; ix++) {
    for (let iy = 0; iy < FILAS; iy++) {
      const i = ix * FILAS + iy;
      const franja = Math.floor(ix / (COLS / 4));
      malla.setColorAt(i, c.setHex(etapas[Math.min(franja, 3)]).lerp(new THREE.Color(PALETA.crema), .45));
    }
  }

  const dummy = new THREE.Object3D();
  // ondas activas: {x, y, t} en coords de retícula
  const ondas = [];

  const base = crearBase(mount, {
    fov: 42, z: 760,
    onFrame(t, dt) {
      puntero.x = suavizar(puntero.x, puntero.tx, .05);
      puntero.y = suavizar(puntero.y, puntero.ty, .05);

      for (let k = ondas.length - 1; k >= 0; k--) {
        ondas[k].t += dt;
        if (ondas[k].t > 3) ondas.splice(k, 1);
      }

      let i = 0;
      for (let ix = 0; ix < COLS; ix++) {
        for (let iy = 0; iy < FILAS; iy++) {
          const x = ix * PASO - (COLS * PASO) / 2;
          const y = iy * PASO - (FILAS * PASO) / 2;
          let z = Math.sin(ix * .45 + t * 1.4) * 30 + Math.cos(iy * .5 + t * 1.1) * 30;
          let extra = 0;

          // contribución de las ondas de click: anillo expansivo amortiguado
          for (const o of ondas) {
            const d = Math.hypot(x - o.x, y - o.y);
            const frente = o.t * 420;
            const delta = d - frente;
            extra += Math.exp(-(delta * delta) / 5200) * Math.exp(-o.t * 1.2) * 120;
          }

          dummy.position.set(x, y, z + extra);
          dummy.rotation.set(
            Math.sin(ix * .3 + t) * .5 + extra * .01,
            Math.cos(iy * .3 + t * .8) * .5,
            0
          );
          const s = .7 + Math.sin(ix * .45 + iy * .5 + t * 1.6) * .25 + extra * .004;
          dummy.scale.setScalar(s);
          dummy.updateMatrix();
          malla.setMatrixAt(i++, dummy.matrix);
        }
      }
      malla.instanceMatrix.needsUpdate = true;
      malla.rotation.y = puntero.x * .1;
      malla.rotation.x = -.28 - puntero.y * .08;
    },
  });

  base.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const luz = new THREE.DirectionalLight(0xffffff, 1.6);
  luz.position.set(200, 300, 500);
  base.scene.add(luz);
  malla.position.y = 20;
  base.scene.add(malla);

  base.accion = (nx = 0, ny = 0) => {
    ondas.push({ x: nx * (COLS * PASO) / 2, y: ny * (FILAS * PASO) / 2, t: 0 });
    if (ondas.length > 5) ondas.shift();
  };

  const soltarPuntero = seguirPuntero(mount, puntero);
  const dispose = base.dispose.bind(base);
  base.dispose = () => { soltarPuntero(); geo.dispose(); mat.dispose(); dispose(); };
  return base;
}
