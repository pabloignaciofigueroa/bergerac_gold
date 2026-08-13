/* ============================================================
   04 · MÉTODO BERGERAC — Escultura + siete vistas + bisagra cromática
   Comandas: 04_BERGERAC_04_METODO_FABLE_ALINEADO.md (relato/motion)
             04_BERGERAC_04A_BACKGROUND_ALINEADO.md (color, única autoridad)
   Base aprobada: Escultura_Metodo_v4.html → sculpture-v2.js + 7 vistas.

   Contrato: un único progreso normalizado T∈[0,1] recorre las 7
   vistas (cámara + escultura + escena interpoladas). El scroll
   escribe T. La bisagra cromática es un cambio de ESTADO global
   (380 ms, power2.inOut) exactamente en DEFINIR → CONSTRUIR,
   nunca un scrub largo ni un efecto dibujado.
   ============================================================ */

import { Sculpture } from './sculpture-v2.js';

/* Vistas aprobadas en la dirección v4 (editables desde el laboratorio;
   si existe una dirección guardada en localStorage, se respeta). */
const LSKEY = 'bergerac_metodo_vistas_v1';
const DEFAULT_VIEWS = [
  /* Cerrado con el ENCUADRE del cierre (pedido QA): la figura completa
     arranca centrada, igual que como termina. DUPLICADA como "hold":
     durante toda la portada METODO la vista queda ESTÁTICA — la figura
     jamás entra cortada ni morfando. */
  { name: 'Cerrado', cam: { pos: [1.7342656575629132, -2.3820533154709715, 2.277541383858402], target: [-0.33240117626450205, 0.04600553698784501, -0.4808515825743544], fov: 45 }, sculpt: { progress: 0, ribCount: 140, stations: 36, apertura: 0.4, amplitud: 2, velocidad: 2.5, torsion: 2.5 } },
  { name: 'Cerrado·hold', cam: { pos: [1.7342656575629132, -2.3820533154709715, 2.277541383858402], target: [-0.33240117626450205, 0.04600553698784501, -0.4808515825743544], fov: 45 }, sculpt: { progress: 0, ribCount: 140, stations: 36, apertura: 0.4, amplitud: 2, velocidad: 2.5, torsion: 2.5 } },
  { name: 'Abrir', cam: { pos: [1.1705532506022855, -2.062703910120465, 2.766426625631828], target: [-0.3826211344790377, -0.26033300807831855, -0.7141511728537296], fov: 45 }, sculpt: { progress: 1, ribCount: 140, stations: 36, apertura: 0.4, amplitud: 2, velocidad: 2.5, torsion: 2.5 } },
  { name: 'Estudiar', cam: { pos: [1.1705532709249153, -2.06270390551526, 2.766426618947795], target: [-0.3826211141564078, -0.26033300347311367, -0.7141511795377631], fov: 45 }, sculpt: { progress: 2, ribCount: 140, stations: 36, apertura: 0.4, amplitud: 2, velocidad: 2.5, torsion: 2.5 } },
  { name: 'Definir', cam: { pos: [1.5496354963876007, -3.5127339498922763, 1.1798773501250104], target: [-0.09511387611899196, -0.2453082052069096, -0.9163196479927584], fov: 45 }, sculpt: { progress: 3, ribCount: 140, stations: 36, apertura: 0.4, amplitud: 2, velocidad: 2.5, torsion: 2.5 } },
  { name: 'Construir', cam: { pos: [1.028746470515392, -4.071743047213754, 1.3187972749699175], target: [-1.0379203633120233, -1.6436841947549379, -1.4395956914628392], fov: 45 }, sculpt: { progress: 4, ribCount: 116, stations: 36, apertura: 1.8, amplitud: 2, velocidad: 2.5, torsion: 2.5 } },
  { name: 'Afinar', cam: { pos: [1.5227468171953833, -3.099530485377918, 1.804462370972125], target: [-0.5439200166320319, -0.6714716329191016, -0.9539305954606315], fov: 45 }, sculpt: { progress: 5, ribCount: 116, stations: 36, apertura: 1.8, amplitud: 2, velocidad: 2.5, torsion: 2.5 } },
  { name: 'Resuelto', cam: { pos: [1.7342656575629132, -2.3820533154709715, 2.277541383858402], target: [-0.33240117626450205, 0.04600553698784501, -0.4808515825743544], fov: 45 }, sculpt: { progress: 6, ribCount: 140, stations: 36, apertura: 0.4, amplitud: 2, velocidad: 2.5, torsion: 2.5 } },
  /* hold final: el cierre sostiene la figura resuelta, quieta y centrada */
  { name: 'Resuelto·hold', cam: { pos: [1.7342656575629132, -2.3820533154709715, 2.277541383858402], target: [-0.33240117626450205, 0.04600553698784501, -0.4808515825743544], fov: 45 }, sculpt: { progress: 6, ribCount: 140, stations: 36, apertura: 0.4, amplitud: 2, velocidad: 2.5, torsion: 2.5 } },
];

/* Materia según estado cromático (04A): la escultura consume el color
   de contraste del tema, jamás causa ni dibuja la transición. */
/* MISMO OBJETO, OTRA LUZ: la escultura mantiene su familia material cálida
   y la legibilidad de costillas en ambos estados; solo cambia la iluminación
   del mundo. Jamás cae por debajo del grafito del sistema. */
const MATTER = {
  purple: { rib: '#f2ede4', emissive: '#3d1266', key: '#fff4e6', rim: '#c9b8f0', hemiSky: '#e8ddf6', hemiGround: '#43126e' },
  fuchsia: { rib: '#f6ece4', emissive: '#7a1638', key: '#fff2ea', rim: '#ffd9e9', hemiSky: '#ffe9f2', hemiGround: '#7c1240' },
};

export function initMetodo({ gsap, ScrollTrigger, prefersReduced, registerScene, wake, refreshShell, setScrim }) {
  const section = document.querySelector('#metodo');
  if (!section || !gsap || !ScrollTrigger) return;
  const canvas = section.querySelector('.metodo__canvas');
  const stage = section.querySelector('.metodo__stage');
  const milestones = [...section.querySelectorAll('.metodo__milestone')];
  const hingeMilestone = section.querySelector('[data-view="4"]');

  /* ---- Bisagra cromática: independiente del 3D, disponible desde el inicio ---- */
  let theme = 'purple';
  const matterListeners = [];
  function setTheme(next) {
    if (theme === next) return;
    theme = next;
    section.dataset.methodTheme = next; /* tokens CSS: 380ms, power2.inOut */
    refreshShell && refreshShell();
    /* la banda del shell acompaña la bisagra aunque el scroll esté quieto */
    setScrim && setScrim(next === 'purple' ? '#6F02BA' : '#FB0278');
    matterListeners.forEach(fn => fn(next));
  }
  /* La bisagra cromática vive ahora en el ANCLAJE de CONSTRUIR (03):
     el mundo cambia exactamente cuando 03 toma el centro — no antes.
     (Con los anclajes, el marcador DOM viejo disparaba en pleno 02.)
     Fallback reduced-motion: marcador DOM clásico. */
  if (prefersReduced) {
    ScrollTrigger.create({
      trigger: hingeMilestone,
      start: 'top 62%',
      onEnter: () => setTheme('fuchsia'),
      onLeaveBack: () => setTheme('purple'),
    });
  }

  /* ---- Revelado del copy por hito ---- */
  milestones.forEach((m) => {
    /* un hito puede tener varios bloques de copy (portada + intro):
       cada uno revela con SU propia entrada al viewport */
    m.querySelectorAll('.metodo__copy').forEach((copy) => {
      if (prefersReduced) return;
      /* el cierre tiene su propio fade */
      if (copy.classList.contains('metodo__cierre')) return;
      /* las ETAPAS no se desvanecen al salir (van a quedar ancladas al
         centro para leerse — un fade de salida pelearía con el pin) */
      const esEtapa = !!copy.closest('.metodo__etapa');
      gsap.fromTo(copy,
        { opacity: 0, y: 36 },
        {
          opacity: 1, y: 0, ease: 'power3.out', duration: .8,
          scrollTrigger: {
            trigger: copy,
            start: 'top 72%',
            end: 'bottom 28%',
            toggleActions: esEtapa ? 'play none none reverse' : 'play reverse play reverse',
          },
        });
    });
  });

  /* ---- METODO del cierre: fade SIMPLE de una sola dirección — aparece
     al entrar (zoom-out con clase) y se queda; sin pin, sin cortes, sin
     dobles apariciones. El "hold" de la vista final sostiene la figura. ---- */
  const cierre = section.querySelector('.metodo__cierre');
  if (cierre && !prefersReduced) {
    gsap.fromTo(cierre,
      { opacity: 0, scale: .955 },
      {
        opacity: 1, scale: 1, duration: .55, ease: 'power2.out',
        scrollTrigger: {
          trigger: cierre,
          start: 'top 68%',
          toggleActions: 'play none none reverse',
        },
      });
  }

  /* ---- LECTURA GARANTIZADA (diseño QA): cada etapa COMPLETA (el hito
     entero, no solo el texto) se ancla al centro durante ~2 pantallas.
     Durante el anclaje el MORPH de la escultura se CONGELA (los tramos
     anclados se descuentan de su timeline — sin saltos al soltar), pero
     las costillas siguen vivas: la sección se para, el 3D respira. ---- */
  const etapaPins = [];
  if (!prefersReduced) {
    section.querySelectorAll('.metodo__etapa').forEach((etapa) => {
      etapaPins.push(ScrollTrigger.create({
        trigger: etapa,
        start: 'center center',
        end: '+=90%', /* 1 pantalla de lectura (2 era mucho — pedido QA) */
        pin: etapa,
        anticipatePin: 1,
      }));
    });
    /* Bisagra cromática en el PUNTO MEDIO del viaje 02 → 03 (pedido QA):
       exactamente entre la liberación de DEFINIR y el anclaje de
       CONSTRUIR — el mundo cambia en plena transición, no al llegar. */
    if (etapaPins.length >= 3) {
      ScrollTrigger.create({
        start: () => (etapaPins[1].end + etapaPins[2].start) / 2,
        end: () => (etapaPins[1].end + etapaPins[2].start) / 2 + 1,
        onEnter: () => setTheme('fuchsia'),
        onLeaveBack: () => setTheme('purple'),
      });
    }
  }

  /* ---- Escena 3D (lazy) ---- */
  let booted = false;
  async function boot() {
    if (booted) return;
    booted = true;
    const THREE = await import('three');

    let views = DEFAULT_VIEWS;
    try {
      const stored = JSON.parse(localStorage.getItem(LSKEY) || 'null');
      if (Array.isArray(stored) && stored.length >= 2) views = stored;
    } catch (e) { /* dirección por defecto */ }

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    let stageW = 0, stageH = 0;
    const scene3 = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
    const target = new THREE.Vector3();

    const escultura = new Sculpture();
    escultura.update(1 / 60);
    scene3.add(escultura.group);

    const key = new THREE.DirectionalLight('#fff4e6', 2.2);
    key.position.set(3.5, 5, 4.5);
    scene3.add(key);
    const rim = new THREE.DirectionalLight('#c9b8f0', 1.3);
    rim.position.set(-4, 1.2, -5);
    scene3.add(rim);
    const hemi = new THREE.HemisphereLight('#e8ddf6', '#43126e', .55);
    scene3.add(hemi);

    function applyMatter(t, instant) {
      const c = MATTER[t];
      const dur = instant || prefersReduced ? 0 : .38;
      escultura.setColors(c.rib, c.emissive);
      gsap.to(key.color, { r: new THREE.Color(c.key).r, g: new THREE.Color(c.key).g, b: new THREE.Color(c.key).b, duration: dur, ease: 'power2.inOut' });
      gsap.to(rim.color, { r: new THREE.Color(c.rim).r, g: new THREE.Color(c.rim).g, b: new THREE.Color(c.rim).b, duration: dur, ease: 'power2.inOut' });
      hemi.color.set(c.hemiSky);
      hemi.groundColor.set(c.hemiGround);
    }
    applyMatter(theme, true);
    matterListeners.push((t) => applyMatter(t));

    /* ---- Timeline normalizada (contrato v4): T ∈ [0,1] ---- */
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const _arr = [0, 0, 0];
    const lerp3 = (a, b, f) => {
      _arr[0] = a[0] + (b[0] - a[0]) * f;
      _arr[1] = a[1] + (b[1] - a[1]) * f;
      _arr[2] = a[2] + (b[2] - a[2]) * f;
      return _arr;
    };
    function setRibCount(rc) {
      rc = Math.round(rc);
      if (rc !== escultura.meshes.length) {
        escultura.params.ribCount = rc;
        escultura.rebuild();
      }
    }
    /* Composición texto/objeto: desplazamiento de encuadre por vista
       (la escultura convive con el copy sin taparlo; el objeto es el mismo).
       Positivo = escultura hacia la derecha del viewport. */
    /* vista 0 al CENTRO como el cierre; índices con los dos "holds" */
    const SHIFT = [.06, .06, .16, .12, .12, -.12, -.12, .06, .06];
    /* desplazamiento VERTICAL por vista (positivo = figura hacia ABAJO):
       en portada y cierre la figura baja al centro real del viewport */
    /* portada baja .24 (centra con METODO); el cierre solo .08 — con .24
       el anillo final salía cortado por abajo */
    const VSHIFT = [.24, .24, 0, 0, 0, 0, 0, .08, .08];
    let T = 0;
    function applyTimeline(t) {
      T = clamp(t, 0, 1);
      if (!views.length) return;
      const seg = T * (views.length - 1);
      const i = Math.min(views.length - 2, Math.floor(seg));
      const f = seg - i;
      const a = views[i], b = views[i + 1];
      camera.position.fromArray(lerp3(a.cam.pos, b.cam.pos, f));
      target.fromArray(lerp3(a.cam.target, b.cam.target, f));
      camera.fov = a.cam.fov + (b.cam.fov - a.cam.fov) * f;
      const s = (SHIFT[i] ?? 0) + ((SHIFT[i + 1] ?? 0) - (SHIFT[i] ?? 0)) * f;
      const v = (VSHIFT[i] ?? 0) + ((VSHIFT[i + 1] ?? 0) - (VSHIFT[i] ?? 0)) * f;
      if (stageW > 2) camera.setViewOffset(stageW, stageH, -s * stageW, -v * stageH, stageW, stageH);
      camera.updateProjectionMatrix();
      camera.lookAt(target);
      const sa = a.sculpt, sb = b.sculpt;
      for (const k in sa) {
        if (k === 'progress' || k === 'ribCount') continue;
        if (typeof sa[k] === 'number' && typeof sb[k] === 'number') {
          escultura.params[k] = sa[k] + (sb[k] - sa[k]) * f;
        }
      }
      escultura.progress = sa.progress + (sb.progress - sa.progress) * f;
      setRibCount(sa.ribCount + ((sb.ribCount ?? sa.ribCount) - sa.ribCount) * f);
    }

    /* ---- Scroll → T (con TRAMOS CONGELADOS) ----
       Los anclajes de lectura de las etapas se descuentan del progreso:
       mientras una etapa está anclada, el morph queda quieto en su valor
       exacto; al soltar, continúa desde ahí. Remapeo lineal por tramos —
       monótono y continuo en ambas direcciones (cero saltos). */
    let spans = [], spanTotal = 0;
    const mainST = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: prefersReduced ? true : .8,
      onUpdate: (self) => { applyTimeline(remapT(self.progress)); },
    });
    function computeSpans() {
      const len = mainST.end - mainST.start;
      if (len <= 0) { spans = []; spanTotal = 0; return; }
      spans = etapaPins
        .map((p) => [
          Math.max(0, Math.min(1, (p.start - mainST.start) / len)),
          Math.max(0, Math.min(1, (p.end - mainST.start) / len)),
        ])
        .sort((x, y) => x[0] - y[0]);
      spanTotal = spans.reduce((acc, s) => acc + (s[1] - s[0]), 0);
    }
    function remapT(T) {
      if (!spans.length || spanTotal >= 1) return T;
      let sub = 0, eff = null;
      for (const [a, b] of spans) {
        if (T >= b) { sub += (b - a); }            /* tramo ya pasado: se descuenta */
        else if (T > a) { eff = a - sub; break; }  /* dentro del anclaje: congelado */
      }
      if (eff === null) eff = T - sub;
      return Math.max(0, Math.min(1, eff / (1 - spanTotal)));
    }
    ScrollTrigger.addEventListener('refresh', computeSpans);
    computeSpans();

    /* ---- Hover local (raycasting real de la v4) + click = profundizar ---- */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let pointerIn = false;
    stage.style.pointerEvents = 'auto';
    stage.addEventListener('pointermove', (ev) => {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      const r = stage.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      pointerIn = true;
    });
    stage.addEventListener('pointerleave', () => {
      pointerIn = false;
      escultura.hoverIndex = -1;
    });
    stage.addEventListener('click', () => {
      if (escultura.hoverIndex < 0) return;
      /* profundizar en la ETAPA ACTIVA: la geometría no adelanta etapas */
      const active = milestones
        .filter(m => m.dataset.etapa)
        .map(m => ({ m, d: Math.abs(m.getBoundingClientRect().top + m.getBoundingClientRect().height / 2 - innerHeight / 2) }))
        .sort((x, y) => x.d - y.d)[0];
      if (active && active.d < innerHeight) {
        const btn = active.m.querySelector('.disclosure__toggle');
        if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click();
      }
    });

    /* ---- Render ---- */
    function resize() {
      const r = stage.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      stageW = r.width; stageH = r.height;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      applyTimeline(T);
    }
    resize();
    window.addEventListener('resize', () => { resize(); });

    function render(dt) {
      if (pointerIn) {
        ray.setFromCamera(ndc, camera);
        escultura.hoverIndex = escultura.pick(ray);
        canvas.style.cursor = escultura.hoverIndex >= 0 ? 'pointer' : '';
      }
      escultura.update(prefersReduced ? 0 : dt);
      renderer.render(scene3, camera);
    }

    applyTimeline(0);
    if (prefersReduced) {
      gsap.ticker.add(() => render(0));
    } else {
      const scene = registerScene({ active: true, render });
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => { scene.active = self.isActive; if (self.isActive) wake(); },
      });
    }
    /* sin refresh aquí: el boot no cambia alturas de layout y un refresh
       tardío durante un pin activo desplaza los rangos bajo el usuario */
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        boot().catch(e => console.warn('Método 3D no disponible:', e));
      }
    }, { rootMargin: '900px 0px' });
    io.observe(section);
  } else {
    boot().catch(e => console.warn('Método 3D no disponible:', e));
  }
}
