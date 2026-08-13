/* ============ 02 EL ESTUDIO — adaptación de webgl_lines_fat ============
   Trazos gruesos (Line2 / LineMaterial / LineGeometry) que se dibujan.
   Interacción: accion() redibuja — cambia a la siguiente composición y
   las líneas vuelven a trazarse desde cero. */

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { PALETA, crearBase, seguirPuntero, suavizar } from './util.js';

export async function init(mount) {
  const puntero = { x: 0, y: 0, tx: 0, ty: 0, dentro: false };
  const grupo = new THREE.Group();
  let materiales = [];
  let composicion = 0;
  let tDibujo = 0;

  const COMPOSICIONES = [
    // 01 — planta y sección
    [
      { color: PALETA.grafito, ancho: 3, puntos: caja(180, 240, 60) },
      { color: PALETA.morado, ancho: 4, puntos: [[-140, -90, 30], [-40, -90, 30], [-40, 10, 30], [80, 10, 30], [80, 120, 30], [150, 120, 30]] },
      { color: PALETA.fucsia, ancho: 4, puntos: [[-150, 130, -40], [-60, 60, -40], [-60, -30, -40], [60, -30, -40], [60, -120, -40], [150, -120, -40]] },
      { color: PALETA.amarillo, ancho: 5, puntos: [[-160, -140, 0], [160, 150, 0]] },
      { color: 0xa29f98, ancho: 1.5, puntos: [[-180, -60, -60], [180, -60, -60]] },
      { color: 0xa29f98, ancho: 1.5, puntos: [[-180, 40, -60], [180, 40, -60]] },
    ],
    // 02 — retícula en profundidad
    [
      { color: PALETA.grafito, ancho: 2.5, puntos: caja(220, 160, 120) },
      { color: PALETA.azul, ancho: 4, puntos: [[-110, -80, 60], [-110, 80, 60], [110, 80, 60], [110, -80, 60], [-110, -80, 60]] },
      { color: PALETA.morado, ancho: 3, puntos: [[-110, -80, -60], [-110, 80, -60], [110, 80, -60], [110, -80, -60], [-110, -80, -60]] },
      { color: PALETA.fucsia, ancho: 5, puntos: [[-110, -80, 60], [110, 80, -60]] },
      { color: PALETA.amarillo, ancho: 5, puntos: [[110, -80, 60], [-110, 80, -60]] },
    ],
    // 03 — el corte
    [
      { color: PALETA.grafito, ancho: 3, puntos: [[-170, -130, 0], [-170, 130, 0], [170, 130, 0], [170, -130, 0], [-170, -130, 0]] },
      { color: PALETA.amarillo, ancho: 6, puntos: [[-170, 0, 20], [-60, 0, 20], [-20, 90, 20], [30, -70, 20], [70, 40, 20], [170, 40, 20]] },
      { color: PALETA.morado, ancho: 3, puntos: [[-120, -130, -30], [-120, 130, -30]] },
      { color: PALETA.fucsia, ancho: 3, puntos: [[120, -130, -30], [120, 130, -30]] },
      { color: 0xa29f98, ancho: 1.5, puntos: [[-170, -65, -50], [170, -65, -50]] },
      { color: 0xa29f98, ancho: 1.5, puntos: [[-170, 65, -50], [170, 65, -50]] },
    ],
  ];

  function construir(idx) {
    grupo.children.slice().forEach(l => {
      grupo.remove(l);
      l.geometry.dispose();
      l.material.dispose();
    });
    materiales = [];
    COMPOSICIONES[idx].forEach(({ color, ancho, puntos }) => {
      const geo = new LineGeometry();
      geo.setPositions(puntos.flat());
      const mat = new LineMaterial({
        color, linewidth: ancho, dashed: true,
        dashSize: 26, gapSize: 10, alphaToCoverage: true,
      });
      mat.resolution.set(mount.clientWidth || 1, mount.clientHeight || 1);
      const linea = new Line2(geo, mat);
      linea.computeLineDistances();
      grupo.add(linea);
      materiales.push(mat);
    });
    tDibujo = 0;
  }

  const base = crearBase(mount, {
    fov: 40, z: 420,
    onFrame(t, dt) {
      tDibujo += dt;
      puntero.x = suavizar(puntero.x, puntero.tx, .05);
      puntero.y = suavizar(puntero.y, puntero.ty, .05);
      materiales.forEach((m, i) => {
        m.dashOffset = -tDibujo * (6 + i * 2.5);
        // al redibujar, el gap se cierra progresivamente: efecto de trazado
        m.gapSize = Math.max(0, 10 - tDibujo * 3);
        m.resolution.set(mount.clientWidth, mount.clientHeight);
      });
      grupo.rotation.y = .25 + puntero.x * .22 + Math.sin(t * .12) * .06;
      grupo.rotation.x = -.12 - puntero.y * .14;
    },
  });

  construir(0);
  base.scene.add(grupo);

  base.accion = () => {
    composicion = (composicion + 1) % COMPOSICIONES.length;
    construir(composicion);
  };

  const soltarPuntero = seguirPuntero(mount, puntero);
  const dispose = base.dispose.bind(base);
  base.dispose = () => {
    soltarPuntero();
    grupo.children.forEach(l => { l.geometry.dispose(); l.material.dispose(); });
    dispose();
  };
  return base;
}

function caja(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2;
  return [
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [-x, -y, z],
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, -z],
  ];
}
