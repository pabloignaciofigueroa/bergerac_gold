/* ============ UTIL — base común de escenas: renderer, cámara, resize, loop ============ */

import * as THREE from 'three';

export const PALETA = {
  azul: 0x00a1ff,
  grafito: 0x282828,
  crema: 0xfdfcfa,
  amarillo: 0xffb701,
  morado: 0x6f02ba,
  fucsia: 0xfb0278,
};

/* Crea renderer + escena + cámara montados en `mount`.
   `onFrame(t, dt)` corre en cada frame mientras la escena está activa. */
export function crearBase(mount, { fov = 45, z = 600, onFrame }) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 1, 8000);
  camera.position.set(0, 0, z);

  const resize = () => {
    const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(mount);

  const clock = new THREE.Clock();
  let raf = 0, activo = false;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dt = clock.getDelta();
    onFrame?.(clock.elapsedTime, dt);
    renderer.render(scene, camera);
  };

  return {
    renderer, scene, camera, resize,
    start() {
      if (activo) return;
      activo = true;
      clock.getDelta();
      loop();
    },
    stop() {
      if (!activo) return;
      activo = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      this.stop();
      ro.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/* Sigue el puntero sobre `elemento` y entrega coordenadas normalizadas (-1..1). */
export function seguirPuntero(elemento, objetivo) {
  const onMove = e => {
    const r = elemento.getBoundingClientRect();
    objetivo.tx = ((e.clientX - r.left) / r.width - .5) * 2;
    objetivo.ty = -((e.clientY - r.top) / r.height - .5) * 2;
    objetivo.dentro = true;
  };
  const onLeave = () => { objetivo.dentro = false; };
  elemento.addEventListener('pointermove', onMove);
  elemento.addEventListener('pointerleave', onLeave);
  return () => {
    elemento.removeEventListener('pointermove', onMove);
    elemento.removeEventListener('pointerleave', onLeave);
  };
}

/* Suavizado exponencial estándar de las escenas. */
export function suavizar(actual, objetivo, factor) {
  return actual + (objetivo - actual) * factor;
}
