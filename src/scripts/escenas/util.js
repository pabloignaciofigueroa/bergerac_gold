/* ============ UTIL — base común de escenas: renderer, cámara, resize, loop ============ */

import * as THREE from 'three';
import { protegerContexto, liberarEscena, mostrarFijo, esDecorativo } from '../resiliencia.js';
import { crearObservador, nivelDe, ratioDe, ratioReducido, paraCaptura, REDUCED } from '../calidad.js';

export const PALETA = {
  azul: 0x00a1ff,
  grafito: 0x282828,
  crema: 0xfdfcfa,
  amarillo: 0xffb701,
  morado: 0x6f02ba,
  fucsia: 0xfb0278,
};

/* Crea renderer + escena + cámara montados en `mount`.
   `onFrame(t, dt)` corre en cada frame mientras la escena está activa.
   `onResize(w, h)` (opcional) corre tras cada redimensionado, para escenas
   que derivan su geometría o su cámara del tamaño real del mount.
   `instrumento` (opcional) engancha la calidad adaptativa: con él la escena
   arranca en el nivel que le toque y se vigila a sí misma. Sin él, FULL
   siempre — así las escenas que no están en la página no pagan nada. */
export function crearBase(mount, { fov = 45, z = 600, onFrame, onResize, instrumento = null }) {
  const nivel0 = instrumento ? nivelDe(instrumento) : null;
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: nivel0 !== REDUCED,
    preserveDrawingBuffer: paraCaptura(),
  });
  renderer.setPixelRatio(instrumento ? ratioDe(nivel0) : Math.min(devicePixelRatio, 2));
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
    onResize?.(w, h);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(mount);

  const clock = new THREE.Clock();
  let raf = 0, activo = false, caida = false;

  /* Vigilancia de calidad. Solo mira los primeros segundos útiles y se
     apaga sola: ver src/scripts/calidad.js. La bajada en caliente toca
     únicamente el ratio de píxel —el dial que más rinde en estas escenas,
     limitadas por relleno— para no rehacer nada delante del visitante. */
  const vigilante = instrumento
    ? crearObservador(mount, instrumento, {
        alReducir() {
          renderer.setPixelRatio(ratioReducido());
          resize();
        },
        alRendirse() {
          /* Ni siquiera REDUCED es usable. No se inventa un tercer nivel:
             se entrega a la red que ya existe desde la fase 3. */
          caida = true;
          activo = false;
          cancelAnimationFrame(raf);
          ro.disconnect();
          mostrarFijo(mount, esDecorativo(mount) ? 'perdido-fondo' : 'perdido');
        },
      })
    : null;

  const loop = () => {
    if (caida) return;                 /* el contexto se fue: no se pinta más */
    raf = requestAnimationFrame(loop);
    const dt = clock.getDelta();
    onFrame?.(clock.elapsedTime, dt);
    renderer.render(scene, camera);
    vigilante?.frame();
  };

  /* Si el contexto se pierde, la escena se para y en su hueco aparece el
     estado fijo. No se reconstruye: ver src/scripts/resiliencia.js. */
  const despegarContexto = protegerContexto(renderer, mount, {
    alPerder() {
      caida = true;
      activo = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      vigilante?.destruir();
    },
  });

  return {
    renderer, scene, camera, resize,
    get caida() { return caida; },
    start() {
      if (activo || caida) return;
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
      vigilante?.destruir();
      despegarContexto();
      /* el orden importa: primero los recursos del grafo, luego el
         renderer, y al final se saca el canvas del DOM */
      liberarEscena(scene);
      renderer.dispose();
      renderer.forceContextLoss?.();
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
