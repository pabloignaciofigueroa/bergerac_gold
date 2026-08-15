/* ============================================================
   02 · EL ESTUDIO — Chiloé 3D
   Comanda: 02_COMANDA_SECCION_02_EL_ESTUDIO_CHILOE_3D.md
   Base técnica aprobada: isla_chiloe.html (pipeline en isla-geo.js)

   Tres niveles de comportamiento:
   - REPOSO → TERRITORIO: relieve real, cámara oblicua, parallax
     suave con peso. Sin auto-rotación de demo.
   - HOVER → GEOMETRÍA: la triangulación del mesh se revela como
     barrido desde el punto de contacto. Sin explosión, sin perder
     la silueta.
   - CLIC → REPRESENTACIÓN: la maqueta se vuelve documento
     cartográfico (cámara cenital, relieve contenido, curvas de
     nivel, retícula sutil, vértices). Segundo clic: retorno.
   ============================================================ */

import { buildIsland, fieldContour, findPeaks } from './isla-geo.js';

export function initEstudio({ ScrollTrigger, prefersReduced, registerScene, wake }) {
  const section = document.querySelector('#estudio');
  const holder = section.querySelector('.estudio__canvas-holder');
  const canvas = section.querySelector('.estudio__canvas');
  if (!canvas) return;

  let booted = false;

  async function boot() {
    if (booted) return;
    booted = true;

    const THREE = await import('three');
    const { geo, tex, land, coast, hgt, F, W, H, WD, D, vScale } = await buildIsland(THREE, {
      mask: 'assets/img/isla/isla-mask.png',
      elev: 'assets/img/isla/isla-elev.png',
      tex: 'assets/img/isla/isla-satelite.jpg',
    }, { exaggeration: 3 }); /* maqueta con cuerpo: la topografía quiebra la silueta */

    /* --- Uniformes compartidos --- */
    const U = {
      uFlat: { value: 0 },   /* 0 maqueta · 1 cartografía */
      uMapa: { value: 0 },
      uWireOp: { value: 0 }, /* barrido de triangulación (hover) */
      uCenter: { value: new THREE.Vector3(0, 0, 0) },
      uRadius: { value: 0 },
    };

    /* --- Material satelital con inyección --- */
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: .92, metalness: 0, side: THREE.DoubleSide,
    });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          attribute float aElevM;
          uniform float uFlat;
          varying float vElevM;
          varying vec3 vWPos;`)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), uFlat * 0.85));`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          transformed.y = mix(transformed.y, transformed.y * 0.05 + 0.002, uFlat);
          vElevM = aElevM;
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uFlat;
          uniform float uMapa;
          uniform float uWireOp;
          uniform vec3 uCenter;
          uniform float uRadius;
          varying float vElevM;
          varying vec3 vWPos;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          {
            vec3 ink = vec3(0.145, 0.145, 0.134);
            /* lámina cartográfica: tono papel propio + retícula apenas perceptible.
               Las curvas de nivel y la costa son trazos vectoriales aparte. */
            vec3 paper = vec3(0.968, 0.955, 0.925);
            vec2 g = abs(fract(vWPos.xz / 0.075) - 0.5);
            float ret = 1.0 - smoothstep(0.0, 0.03, min(g.x, g.y));
            vec3 mapCol = mix(paper, ink, ret * 0.10);
            diffuseColor.rgb = mix(diffuseColor.rgb, mapCol, uMapa);
            /* HOVER → GEOMETRÍA: bajo el barrido la materia cede a una
               superficie de maqueta neutra con variación tonal por faceta.
               Cambio de estado inequívoco; silueta y volumen intactos. */
            float sweep = (1.0 - smoothstep(uRadius * 0.72, uRadius, distance(vWPos, uCenter))) * uWireOp;
            vec2 cell = floor(vWPos.xz / 0.031);
            float facet = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
            vec3 clay = vec3(0.885, 0.872, 0.845) * (0.94 + facet * 0.10);
            diffuseColor.rgb = mix(diffuseColor.rgb, clay, sweep * 0.82);
          }`);
    };

    /* --- Triangulación legible: TIN decimado cuyas aristas SIGUEN la
       superficie (cada arista se subdivide muestreando el relieve real:
       nada de cuerdas rectas atravesando valles). --- */
    const STEPW = Math.max(8, Math.round(W / 20));
    const posA = geo.attributes.position;
    const yGrid = (ix, iy) => posA.getY(iy * W + ix);
    const onLand = (ix, iy) => !!land[iy * W + ix];
    const yAt = (fx, fy) => {
      const x0 = Math.min(Math.floor(fx), W - 2), y0 = Math.min(Math.floor(fy), H - 2);
      const tx = fx - x0, ty = fy - y0;
      return yGrid(x0, y0) * (1 - tx) * (1 - ty) + yGrid(x0 + 1, y0) * tx * (1 - ty)
           + yGrid(x0, y0 + 1) * (1 - tx) * ty + yGrid(x0 + 1, y0 + 1) * tx * ty;
    };
    const wireVerts = [];
    const SUB = 7; /* subdivisiones por arista: la línea se asienta en el terreno */
    function addEdge(ax, ay, bx, by) {
      if (!onLand(ax, ay) || !onLand(bx, by)) return;
      let px = (ax / (W - 1) - .5) * WD, pz = (ay / (H - 1) - .5) * D, py = yGrid(ax, ay) + .0012;
      for (let s = 1; s <= SUB; s++) {
        const fx = ax + (bx - ax) * s / SUB;
        const fy = ay + (by - ay) * s / SUB;
        const nx = (fx / (W - 1) - .5) * WD;
        const nz = (fy / (H - 1) - .5) * D;
        const ny = yAt(fx, fy) + .0012;
        wireVerts.push(px, py, pz, nx, ny, nz);
        px = nx; py = ny; pz = nz;
      }
    }
    for (let iy = 0; iy < H - STEPW; iy += STEPW) {
      for (let ix = 0; ix < W - STEPW; ix += STEPW) {
        addEdge(ix, iy, ix + STEPW, iy);
        addEdge(ix, iy, ix, iy + STEPW);
        addEdge(ix, iy, ix + STEPW, iy + STEPW); /* diagonal → triangulación */
      }
    }
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wireVerts), 3));
    const wireMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uFlat: U.uFlat, uCenter: U.uCenter, uRadius: U.uRadius,
        uWireOp: U.uWireOp, uMapa: U.uMapa,
      },
      vertexShader: `
        uniform float uFlat;
        varying vec3 vWPos;
        void main() {
          vec3 p = position;
          p.y = mix(p.y, p.y * 0.05 + 0.0032, uFlat);
          vWPos = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uCenter;
        uniform float uRadius;
        uniform float uWireOp;
        uniform float uMapa;
        varying vec3 vWPos;
        void main() {
          float sweep = (1.0 - smoothstep(uRadius * 0.72, uRadius, distance(vWPos, uCenter))) * uWireOp;
          float a = max(sweep * 0.88, uMapa * 0.20);
          if (a < 0.012) discard;
          gl_FragColor = vec4(vec3(0.145, 0.145, 0.134), a);
        }`,
    });

    /* --- Vértices de la retícula (nodos TIN, subconjunto) --- */
    const NODE_STEP = Math.max(12, Math.round(W / 10));
    const ptsPos = [];
    const posAttr = geo.attributes.position;
    for (let iy = 0; iy < H; iy += NODE_STEP) {
      for (let ix = 0; ix < W; ix += NODE_STEP) {
        const p = iy * W + ix;
        if (!land[p] || coast[p] < 3) continue;
        ptsPos.push(posAttr.getX(p), posAttr.getY(p) + .0015, posAttr.getZ(p));
      }
    }
    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ptsPos), 3));
    const ptsMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uFlat: U.uFlat, uOp: { value: 0 },
        uCenter: U.uCenter, uRadius: U.uRadius, uWireOp: U.uWireOp, uMapa: U.uMapa,
      },
      vertexShader: `
        uniform float uFlat;
        varying vec3 vWPos;
        void main() {
          vec3 p = position;
          p.y = mix(p.y, p.y * 0.05 + 0.0035, uFlat);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vWPos = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_PointSize = ${(130 * Math.min(window.devicePixelRatio || 1, 2)).toFixed(1)} / -mv.z * 0.01;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uOp;
        uniform vec3 uCenter;
        uniform float uRadius;
        uniform float uWireOp;
        uniform float uMapa;
        varying vec3 vWPos;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float sweep = (1.0 - smoothstep(uRadius * 0.72, uRadius, distance(vWPos, uCenter))) * uWireOp;
          float a = max(sweep, uMapa * 0.8) * uOp * (1.0 - smoothstep(0.3, 0.5, d));
          if (a < 0.01) discard;
          gl_FragColor = vec4(vec3(0.145, 0.145, 0.134), a);
        }`,
    });

    /* --- Escena --- */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene3 = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .05, 10);

    /* --- Lámina cartográfica: trazos vectoriales (solo modo documento) --- */
    function mapLineMat(alphaFactor, width) {
      return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uFlat: U.uFlat, uMapa: U.uMapa, uA: { value: alphaFactor } },
        vertexShader: `
          uniform float uFlat;
          void main() {
            vec3 p = position;
            p.y = mix(p.y, p.y * 0.05 + 0.0038, uFlat);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: `
          uniform float uMapa;
          uniform float uA;
          void main() {
            float a = uMapa * uA;
            if (a < 0.02) discard;
            gl_FragColor = vec4(vec3(0.145, 0.145, 0.134), a);
          }`,
      });
    }
    /* costa de precisión vectorial: iso 0.5 del campo alfa en alta resolución */
    const coastSeg = fieldContour(F, W, H, .5, WD, D, .0022);
    const coastGeo = new THREE.BufferGeometry();
    coastGeo.setAttribute('position', new THREE.BufferAttribute(coastSeg, 3));
    const coastLine = new THREE.LineSegments(coastGeo, mapLineMat(.85));

    /* curvas de nivel reales a intervalo fijo (100 m) */
    const contourSegs = [];
    for (let level = 100; level <= 700; level += 100) {
      contourSegs.push(fieldContour(hgt, W, H, level, WD, D, level * vScale));
    }
    const contourAll = new Float32Array(contourSegs.reduce((n, s) => n + s.length, 0));
    {
      let off = 0;
      for (const s of contourSegs) { contourAll.set(s, off); off += s.length; }
    }
    const contourGeo = new THREE.BufferGeometry();
    contourGeo.setAttribute('position', new THREE.BufferAttribute(contourAll, 3));
    const contourLines = new THREE.LineSegments(contourGeo, mapLineMat(.34));

    /* cumbres seleccionadas + conexiones geométricas */
    const peaks = findPeaks(hgt, land, W, H, 9, Math.round(W / 8));
    const peakPos = peaks.map(pk => [
      (pk.ix / (W - 1) - .5) * WD,
      pk.v * vScale,
      (pk.iy / (H - 1) - .5) * D,
    ]);
    const chainSeg = [];
    {
      /* encadenar cada cumbre con su vecina más cercana ya visitada */
      const visited = [0];
      for (let i = 1; i < peakPos.length; i++) {
        let bi = visited[0], bd = 1e9;
        for (const v of visited) {
          const d = Math.hypot(peakPos[i][0] - peakPos[v][0], peakPos[i][2] - peakPos[v][2]);
          if (d < bd) { bd = d; bi = v; }
        }
        chainSeg.push(...peakPos[i], ...peakPos[bi]);
        visited.push(i);
      }
    }
    const chainGeo = new THREE.BufferGeometry();
    chainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(chainSeg), 3));
    const chainLines = new THREE.LineSegments(chainGeo, mapLineMat(.24));

    const peakGeo = new THREE.BufferGeometry();
    peakGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(peakPos.flat()), 3));
    const peakMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uFlat: U.uFlat, uMapa: U.uMapa },
      vertexShader: `
        uniform float uFlat;
        void main() {
          vec3 p = position;
          p.y = mix(p.y, p.y * 0.05 + 0.0042, uFlat);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = ${(340 * Math.min(window.devicePixelRatio || 1, 2)).toFixed(1)} / -mv.z * 0.01;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uMapa;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          /* punto anular: centro papel, aro grafito */
          float ring = smoothstep(0.16, 0.22, d) * (1.0 - smoothstep(0.38, 0.48, d));
          float a = uMapa * max(ring, 0.0);
          if (a < 0.02) discard;
          gl_FragColor = vec4(vec3(0.145, 0.145, 0.134), a);
        }`,
    });
    const peakPts = new THREE.Points(peakGeo, peakMat);

    const group = new THREE.Group();
    group.name = 'isla_de_chiloe';
    const terreno = new THREE.Mesh(geo, mat);
    terreno.name = 'terreno';
    group.add(terreno);
    group.add(new THREE.LineSegments(wireGeo, wireMat));
    group.add(new THREE.Points(ptsGeo, ptsMat));
    group.add(coastLine);
    group.add(contourLines);
    group.add(chainLines);
    group.add(peakPts);
    scene3.add(group);

    /* luz rasante: el volumen se modela solo */
    const sun = new THREE.DirectionalLight(0xfff3e2, 3.1);
    sun.position.set(-.85, .42, -.3);
    scene3.add(sun);
    scene3.add(new THREE.AmbientLight(0xeaf2f8, .95));
    const fill = new THREE.DirectionalLight(0xdde9f2, .55);
    fill.position.set(.6, .5, .6);
    scene3.add(fill);

    /* asiento: oclusión de contacto mínima bajo la maqueta (nunca sombra de card) */
    const poolGeo = new THREE.PlaneGeometry(WD * 1.5, D * 1.25);
    const poolMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uMapa: U.uMapa },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float uMapa;
        varying vec2 vUv;
        void main() {
          vec2 c = (vUv - 0.5) * vec2(1.0, 1.35);
          float d = length(c);
          float a = (1.0 - smoothstep(0.12, 0.5, d)) * 0.085 * (1.0 - uMapa);
          if (a < 0.004) discard;
          gl_FragColor = vec4(vec3(0.145, 0.145, 0.134), a);
        }`,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -.004;
    /* asiento ELIMINADO (pedido QA): el degradé bajo la isla se leía como
       borde difuminado del holder — la isla flota limpia sobre el blanco */
    // group.add(pool);

    /* --- Cámara: esférica con parallax de peso --- */
    const base = { theta: -.62, phi: 1.12, dist: .84 }; /* oblicua baja: perfil del terreno visible */
    const mapView = { theta: 0, phi: .14, dist: 1.06 }; /* cenital, norte arriba, isla completa */
    const cam = { ...base };
    const par = { x: 0, y: 0, tx: 0, ty: 0 };
    const lookAt = new THREE.Vector3(0, .015, 0);

    function applyCamera(drift) {
      const phi = cam.phi + par.y * .05;
      const theta = cam.theta + par.x * .09 + (drift || 0);
      camera.position.set(
        Math.sin(theta) * Math.sin(phi) * cam.dist,
        Math.cos(phi) * cam.dist,
        Math.cos(theta) * Math.sin(phi) * cam.dist
      );
      camera.lookAt(lookAt);
    }

    function resize() {
      const r = holder.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(() => { resize(); renderOnce(); }).observe(holder);

    /* --- Interacción --- */
    const gsap = window.gsap;
    let mapMode = false;
    let hovering = false;
    const raycaster = new THREE.Raycaster();
    const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();

    /* punto bajo el cursor → ¿está sobre la isla? (lookup O(1) en la máscara) */
    function islandHit(ev) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(planeY, hit)) return null;
      const ix = Math.round((hit.x / WD + .5) * (W - 1));
      const iy = Math.round((hit.z / D + .5) * (H - 1));
      if (ix < 1 || ix >= W - 1 || iy < 1 || iy >= H - 1) return { point: hit, onLand: false };
      return { point: hit, onLand: !!land[iy * W + ix] };
    }

    canvas.__islandHit = islandHit; /* hook de QA (capturas); inocuo en producción */

    const dur = prefersReduced ? .01 : 1;

    function setHover(on, point) {
      if (hovering === on) return;
      hovering = on;
      canvas.style.cursor = on ? 'pointer' : '';
      if (mapMode) return;
      if (on && point) U.uCenter.value.copy(point);
      gsap.killTweensOf([U.uWireOp, U.uRadius, ptsMat.uniforms.uOp]);
      if (on) {
        gsap.to(U.uWireOp, { value: 1, duration: .55 * dur, ease: 'power2.out' });
        gsap.to(U.uRadius, { value: .62, duration: 1.15 * dur, ease: 'power2.out' });
        gsap.to(ptsMat.uniforms.uOp, { value: 1, duration: .6 * dur, ease: 'power2.out' });
      } else {
        gsap.to(U.uWireOp, { value: 0, duration: .6 * dur, ease: 'power2.inOut' });
        gsap.to(U.uRadius, { value: 0, duration: .8 * dur, ease: 'power2.inOut' });
        gsap.to(ptsMat.uniforms.uOp, { value: 0, duration: .5 * dur, ease: 'power2.inOut' });
      }
    }

    function setMap(on) {
      mapMode = on;
      canvas.setAttribute('aria-pressed', String(on));
      gsap.killTweensOf([U.uFlat, U.uMapa, cam, ptsMat.uniforms.uOp]);
      const target = on ? mapView : base;
      gsap.to(U.uFlat, { value: on ? 1 : 0, duration: 1.05 * dur, ease: 'power2.inOut' });
      gsap.to(U.uMapa, { value: on ? 1 : 0, duration: .95 * dur, ease: 'power2.inOut' });
      gsap.to(ptsMat.uniforms.uOp, { value: on ? 1 : 0, duration: .8 * dur, ease: 'power2.inOut' });
      gsap.to(cam, {
        theta: target.theta, phi: target.phi, dist: target.dist,
        duration: 1.15 * dur, ease: 'power3.inOut',
      });
      if (on) {
        gsap.to(U.uWireOp, { value: 0, duration: .4 * dur, ease: 'power2.out' });
        gsap.to(U.uRadius, { value: 0, duration: .4 * dur, ease: 'power2.out' });
      }
    }

    section.addEventListener('pointermove', (ev) => {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      const r = section.getBoundingClientRect();
      par.tx = ((ev.clientX - r.left) / r.width - .5) * 2;
      par.ty = ((ev.clientY - r.top) / r.height - .5) * 2;
      if (mapMode) return;
      const h = islandHit(ev);
      if (h && h.onLand) {
        if (!hovering) setHover(true, h.point);
        else U.uCenter.value.lerp(h.point, .06); /* el centro respira, sin perseguir */
      } else {
        setHover(false);
      }
    });
    section.addEventListener('pointerleave', () => {
      par.tx = 0; par.ty = 0;
      setHover(false);
    });

    canvas.addEventListener('click', (ev) => {
      if (mapMode) { setMap(false); return; }
      const h = islandHit(ev);
      if (h && (h.onLand || hovering)) setMap(true);
      else if (ev.pointerType === 'touch' || !window.matchMedia('(hover: hover)').matches) setMap(true);
    });
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'button');
    canvas.setAttribute('aria-pressed', 'false');
    canvas.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setMap(!mapMode); }
    });

    /* --- Render --- */
    function render(dt, t) {
      par.x += (par.tx - par.x) * Math.min(1, dt * 2.2);
      par.y += (par.ty - par.y) * Math.min(1, dt * 2.2);
      /* respiración mínima: la pieza está viva incluso sin cursor */
      group.position.y = Math.sin(t * .35) * .0012;
      applyCamera(Math.sin(t * .12) * .012);
      renderer.render(scene3, camera);
    }
    function renderOnce() {
      applyCamera(0);
      renderer.render(scene3, camera);
    }

    if (prefersReduced) {
      renderOnce();
      gsap.ticker.add(renderOnce); /* estados cambian instantáneo; repintado barato */
    } else {
      const scene = registerScene({ active: true, render });
      if (ScrollTrigger) {
        ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => { scene.active = self.isActive; if (self.isActive) wake(); },
        });
      }
      renderOnce();
    }
  }

  /* Lazy boot al aproximarse la sección */
  const safeBoot = () => boot().catch((e) => {
    /* jamás un hueco en blanco: sin 3D, la sección colapsa a su versión editorial */
    console.warn('Chiloé 3D no disponible:', e);
    section.classList.add('estudio--sin3d');
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        safeBoot();
      }
    }, { rootMargin: '600px 0px' });
    io.observe(section);
  } else {
    safeBoot();
  }
}
