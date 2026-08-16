/* ============ 03 EL PUNTO DE PARTIDA — adaptación de webgl_interactive_raycasting_points ============
   Campo de puntos en onda. Interacción: el Raycaster sigue al cursor con un
   halo; el click deja una marca permanente en el campo (accion con raycast),
   y setAcento(i) tiñe las próximas marcas con el color de la puerta activa. */

import * as THREE from 'three';
import { PALETA, crearBase, seguirPuntero } from './util.js';

const COLS = 90, FILAS = 42, PASO = 26;
const ACENTOS = [PALETA.morado, PALETA.fucsia, PALETA.amarillo, PALETA.azul];

export async function init(mount) {
  const puntero = { x: 0, y: 0, tx: 0, ty: 0, dentro: false };

  const total = COLS * FILAS;
  const posiciones = new Float32Array(total * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));

  const mat = new THREE.PointsMaterial({ color: 0x8f8d87, size: 2.6, transparent: true, opacity: .8 });
  const puntos = new THREE.Points(geo, mat);
  puntos.rotation.x = -.9;
  puntos.position.y = -140;

  // Halo que sigue al cursor + marcas permanentes que deja el click
  let acento = 0;
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(6, 12, 12),
    new THREE.MeshBasicMaterial({ color: ACENTOS[0], transparent: true, opacity: .9 })
  );
  halo.visible = false;
  const marcas = [];

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 14;
  const ndc = new THREE.Vector2();
  let ultimoHit = null;

  const base = crearBase(mount, {
    fov: 45, z: 900,
    onFrame(t, dt) {
      let i = 0;
      for (let ix = 0; ix < COLS; ix++) {
        for (let iy = 0; iy < FILAS; iy++) {
          posiciones[i] = ix * PASO - (COLS * PASO) / 2;
          posiciones[i + 1] = iy * PASO - (FILAS * PASO) / 2;
          posiciones[i + 2] =
            Math.sin((ix + t * 2.4) * .3) * 24 +
            Math.sin((iy + t * 1.8) * .5) * 24;
          i += 3;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeBoundingSphere();

      ultimoHit = null;
      if (puntero.dentro) {
        ndc.set(puntero.tx, puntero.ty);
        raycaster.setFromCamera(ndc, base.camera);
        const hits = raycaster.intersectObject(puntos);
        if (hits.length) {
          ultimoHit = hits[0].point;
          halo.visible = true;
          halo.position.copy(ultimoHit);
          halo.scale.setScalar(1 + Math.sin(t * 6) * .18);
        } else {
          halo.visible = false;
        }
      } else {
        halo.visible = false;
      }

      marcas.forEach(m => {
        m.userData.vida += dt;
        m.scale.setScalar(1 + Math.sin(m.userData.vida * 3) * .1);
      });

      base.camera.position.x = puntero.tx * 60;
      base.camera.position.y = puntero.ty * 40 - 40;
      base.camera.lookAt(0, -80, 0);
    },
  });

  base.scene.add(puntos);
  base.scene.add(halo);

  base.accion = () => {
    if (!ultimoHit) return;
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(5, 12, 12),
      new THREE.MeshBasicMaterial({ color: ACENTOS[acento] })
    );
    m.position.copy(ultimoHit);
    m.userData.vida = 0;
    base.scene.add(m);
    marcas.push(m);
    if (marcas.length > 24) {
      const viejo = marcas.shift();
      base.scene.remove(viejo);
      viejo.geometry.dispose();
      viejo.material.dispose();
    }
  };

  base.setAcento = i => {
    acento = ((i % ACENTOS.length) + ACENTOS.length) % ACENTOS.length;
    halo.material.color.setHex(ACENTOS[acento]);
  };

  const soltarPuntero = seguirPuntero(mount, puntero);
  const dispose = base.dispose.bind(base);
  base.dispose = () => {
    soltarPuntero();
    geo.dispose(); mat.dispose();
    halo.geometry.dispose(); halo.material.dispose();
    marcas.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
    dispose();
  };
  return base;
}
