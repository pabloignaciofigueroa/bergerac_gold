/* ============ 06 CONTACTO — adaptación de webgl_interactive_points ============
   Partículas sobre el amarillo: crecen cerca del cursor, y accion(nx, ny)
   lanza un pulso que las atrae hacia el punto tocado y luego las suelta. */

import * as THREE from 'three';
import { PALETA, crearBase, seguirPuntero, suavizar } from './util.js';

const N = 900;

const VERT = `
attribute float tam;
attribute vec3 color;
varying vec3 vColor;
void main(){
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = tam * (320.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, smoothstep(0.5, 0.35, d));
}`;

export async function init(mount) {
  const puntero = { x: 0, y: 0, tx: 0, ty: 0, dentro: false };

  const posiciones = new Float32Array(N * 3);
  const colores = new Float32Array(N * 3);
  const tams = new Float32Array(N);
  const basePos = [];
  const despl = [];   // desplazamiento actual por el pulso

  /* Como la bandada del hero (pedido QA): un solo tono, el color de la
     sección hundido hacia grafito — aquí amarillo más oscuro, con leve
     variación de profundidad para que el campo no sea plano. */
  const c = new THREE.Color();
  const tonoBase = new THREE.Color(PALETA.amarillo).lerp(new THREE.Color(PALETA.grafito), .3);
  for (let i = 0; i < N; i++) {
    const p = new THREE.Vector3(
      (Math.random() - .5) * 1500,
      (Math.random() - .5) * 800,
      (Math.random() - .5) * 500
    );
    basePos.push(p);
    despl.push(new THREE.Vector3());
    posiciones.set([p.x, p.y, p.z], i * 3);
    c.copy(tonoBase).lerp(new THREE.Color(PALETA.grafito), Math.random() * .18);
    colores.set([c.r, c.g, c.b], i * 3);
    tams[i] = 4 + Math.random() * 4;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  geo.setAttribute('tam', new THREE.BufferAttribute(tams, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false,
  });
  const puntos = new THREE.Points(geo, mat);

  const cursor3d = new THREE.Vector3();
  const pulso = new THREE.Vector3();
  let pulsoFuerza = 0;
  const aux = new THREE.Vector3();

  const base = crearBase(mount, {
    fov: 50, z: 750,
    onFrame(t, dt) {
      puntero.x = suavizar(puntero.x, puntero.tx, .07);
      puntero.y = suavizar(puntero.y, puntero.ty, .07);
      const alcanceY = Math.tan((base.camera.fov * Math.PI / 180) / 2) * base.camera.position.z;
      cursor3d.set(puntero.x * alcanceY * base.camera.aspect, puntero.y * alcanceY, 0);
      pulsoFuerza = Math.max(0, pulsoFuerza - dt * .8);

      const pos = geo.attributes.position;
      const tam = geo.attributes.tam;
      for (let i = 0; i < N; i++) {
        const b = basePos[i], d = despl[i];

        // atracción del pulso hacia el punto tocado, luego regreso elástico
        if (pulsoFuerza > 0) {
          aux.set(pulso.x - (b.x + d.x), pulso.y - (b.y + d.y), -d.z);
          const dist = Math.max(aux.length(), 1);
          if (dist < 900) d.addScaledVector(aux.normalize(), pulsoFuerza * dt * 620 * (1 - dist / 900));
        }
        d.multiplyScalar(1 - dt * 1.8); // regreso a casa

        const x = b.x + d.x + Math.sin(t * .5 + i) * 14;
        const y = b.y + d.y + Math.cos(t * .4 + i * 1.7) * 14;
        pos.setXYZ(i, x, y, b.z + d.z);

        let objetivo = 4 + (i % 5);
        if (puntero.dentro) {
          const dx = x - cursor3d.x, dy = y - cursor3d.y;
          const dd = Math.sqrt(dx * dx + dy * dy + b.z * b.z * .25);
          if (dd < 260) objetivo += (1 - dd / 260) * 22;
        }
        if (pulsoFuerza > 0) objetivo += pulsoFuerza * 6;
        tam.setX(i, suavizar(tam.getX(i), objetivo, .12));
      }
      pos.needsUpdate = true;
      tam.needsUpdate = true;

      puntos.rotation.y = Math.sin(t * .08) * .12;
      base.camera.position.x = puntero.x * 30;
      base.camera.position.y = puntero.y * 20;
      base.camera.lookAt(0, 0, 0);
    },
  });

  base.scene.add(puntos);

  base.accion = (nx = 0, ny = 0) => {
    const alcanceY = Math.tan((base.camera.fov * Math.PI / 180) / 2) * base.camera.position.z;
    pulso.set(nx * alcanceY * base.camera.aspect, ny * alcanceY, 0);
    pulsoFuerza = 1;
  };

  const soltarPuntero = seguirPuntero(mount.parentElement, puntero);
  const dispose = base.dispose.bind(base);
  base.dispose = () => { soltarPuntero(); geo.dispose(); mat.dispose(); dispose(); };
  return base;
}
