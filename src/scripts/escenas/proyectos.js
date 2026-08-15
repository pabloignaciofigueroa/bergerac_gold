/* ============ 05 CASOS — adaptación de webgl_postprocessing_transition ============
   Dos escenas a render target mezcladas con el shader de transición del
   ejemplo (mixRatio + threshold sobre ruido). Interacción: accion() alterna
   ANTES (material disperso) ↔ DESPUÉS (sistema construido) con la transición
   shader; ya no es un ciclo automático — la maneja el click. */

import * as THREE from 'three';
import { PALETA } from './util.js';

const FRAG = `
uniform sampler2D tDiffuse1;
uniform sampler2D tDiffuse2;
uniform float mixRatio;
uniform float threshold;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 4; k++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
void main(){
  vec4 texel1 = texture2D(tDiffuse1, vUv);
  vec4 texel2 = texture2D(tDiffuse2, vUv);
  float n = fbm(vUv * 5.0);
  float r = mixRatio * (1.0 + threshold * 2.0) - threshold;
  float mixf = clamp((n - r) * (1.0 / threshold), 0.0, 1.0);
  gl_FragColor = mix(texel2, texel1, mixf);
}`;

const VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`;

export async function init(mount) {
  const esSurvec = (mount.dataset.variante || 'survec') === 'survec';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  mount.appendChild(renderer.domElement);

  const camara = new THREE.PerspectiveCamera(45, 1, 1, 4000);
  camara.position.set(0, 90, 480);
  camara.lookAt(0, 0, 0);

  /* Escena ANTES — el material disperso */
  const escenaA = new THREE.Scene();
  escenaA.background = new THREE.Color(esSurvec ? 0xeef6fb : 0x1f1d1c);
  escenaA.add(new THREE.AmbientLight(0xffffff, 1.4));
  const luzA = new THREE.DirectionalLight(0xffffff, 1.6);
  luzA.position.set(200, 300, 400);
  escenaA.add(luzA);

  let terreno = null;
  if (esSurvec) {
    const geoT = new THREE.PlaneGeometry(900, 500, 64, 36);
    terreno = new THREE.Mesh(
      geoT,
      new THREE.MeshBasicMaterial({ color: PALETA.azul, wireframe: true, transparent: true, opacity: .6 })
    );
    terreno.rotation.x = -Math.PI / 2.4;
    escenaA.add(terreno);
  } else {
    for (let i = 0; i < 14; i++) {
      const caja = new THREE.Mesh(
        new THREE.BoxGeometry(40 + Math.random() * 60, 20 + Math.random() * 80, 40),
        new THREE.MeshStandardMaterial({ color: 0x8f8d87, roughness: .7 })
      );
      caja.position.set((Math.random() - .5) * 600, (Math.random() - .5) * 260, (Math.random() - .5) * 200);
      caja.rotation.y = Math.random() * Math.PI;
      escenaA.add(caja);
    }
  }

  /* Escena DESPUÉS — el sistema construido */
  const escenaB = new THREE.Scene();
  escenaB.background = new THREE.Color(0xfdfcfa);
  escenaB.add(new THREE.AmbientLight(0xffffff, 1.4));
  const luzB = new THREE.DirectionalLight(0xffffff, 1.8);
  luzB.position.set(-200, 300, 400);
  escenaB.add(luzB);

  const ordenado = new THREE.Group();
  const acento = esSurvec ? PALETA.morado : PALETA.amarillo;
  const filas = 4, cols = 7;
  for (let ix = 0; ix < cols; ix++) {
    for (let iy = 0; iy < filas; iy++) {
      const esAcento = (ix + iy) % 5 === 0;
      const placa = new THREE.Mesh(
        new THREE.BoxGeometry(80, 52, 10),
        new THREE.MeshStandardMaterial({
          color: esAcento ? acento : (esSurvec ? PALETA.azul : PALETA.grafito),
          roughness: .5,
        })
      );
      placa.position.set(ix * 100 - (cols - 1) * 50, iy * 72 - (filas - 1) * 36, 0);
      ordenado.add(placa);
    }
  }
  escenaB.add(ordenado);

  const tam = () => ({ w: mount.clientWidth || 1, h: mount.clientHeight || 1 });
  let { w, h } = tam();
  const rtA = new THREE.WebGLRenderTarget(w, h);
  const rtB = new THREE.WebGLRenderTarget(w, h);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse1: { value: rtA.texture },
      tDiffuse2: { value: rtB.texture },
      mixRatio: { value: 0 },
      threshold: { value: .12 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  const quadEscena = new THREE.Scene();
  const quadCamara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quadEscena.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  const resize = () => {
    ({ w, h } = tam());
    renderer.setSize(w, h);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    rtA.setSize(w, h);
    rtB.setSize(w, h);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(mount);

  const reloj = new THREE.Clock();
  let raf = 0, activo = false;
  let objetivo = 0; // 0 = ANTES (material disperso); 1 = DESPUÉS (sistema construido)

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const t = reloj.getElapsedTime();

    if (terreno) {
      const pos = terreno.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        pos.setZ(i, Math.sin(x * .02 + t * .8) * 18 + Math.cos(y * .03 + t * .6) * 14);
      }
      pos.needsUpdate = true;
    }
    escenaA.rotation.y = Math.sin(t * .2) * .08;
    ordenado.rotation.y = Math.sin(t * .18) * .1;
    ordenado.children.forEach((p, i) => { p.position.z = Math.sin(t * .9 + i * .55) * 10; });

    const u = material.uniforms.mixRatio;
    u.value += (objetivo - u.value) * .045;

    renderer.setRenderTarget(rtA);
    renderer.render(escenaA, camara);
    renderer.setRenderTarget(rtB);
    renderer.render(escenaB, camara);
    renderer.setRenderTarget(null);
    renderer.render(quadEscena, quadCamara);
  };

  return {
    accion() { objetivo = objetivo > .5 ? 0 : 1; },
    start() {
      if (activo) return;
      activo = true;
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
      rtA.dispose(); rtB.dispose();
      [escenaA, escenaB, quadEscena].forEach(sc => sc.traverse(o => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      }));
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
