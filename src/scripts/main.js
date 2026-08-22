/* ============================================================
   BERGERAC — BOOT GLOBAL
   Registro único de GSAP, shell cromático, desplegables,
   ciclo de vida de escenas y arranque de secciones.
   ============================================================ */

import { initEstudio } from './sections/estudio.js';
import { initPartida } from './sections/partida.js';
import { initMetodo } from './sections/metodo.js';
import { initMotion } from './motion.js';
import { initMenu } from './menu.js';
import { initPointer } from './pointer.js';
import { initMarquees } from './marquee.js';
import { initPlegables } from './plegables.js';
import { initTextRoll } from './textroll.js';
import { initLoader } from './loader.js';
import { initHeroFit } from './hero-fit.js';
import { initVideos } from './videos.js';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- GSAP: registro único ---- */
const { gsap } = window;
if (gsap && window.ScrollTrigger) {
  gsap.registerPlugin(window.ScrollTrigger);
  window.ScrollTrigger.config({ ignoreMobileResize: true });
}
const ScrollTrigger = window.ScrollTrigger;

document.body.classList.add('js');

/* ---- Ciclo de vida de escenas: un solo rAF para toda la página ---- */
const scenes = new Set();
let rafId = null;
let lastT = performance.now();

function loop(t) {
  const dt = Math.min((t - lastT) / 1000, 1 / 20);
  lastT = t;
  let anyActive = false;
  for (const scene of scenes) {
    if (scene.active) {
      anyActive = true;
      scene.render(dt, t / 1000);
    }
  }
  rafId = anyActive ? requestAnimationFrame(loop) : null;
}

export function registerScene(scene) {
  scenes.add(scene);
  wake();
  return scene;
}
/* Sacar una escena del bucle. Hace falta para el desmontaje limpio: si una
   escena pierde su contexto y se queda en el Set, el bucle sigue llamando a
   su render sobre un contexto muerto. */
export function unregisterScene(scene) {
  scenes.delete(scene);
}

export function wake() {
  if (rafId === null) {
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
  }
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) wake();
});

/* ---- Shell cromático: el header obedece la sección bajo él ---- */
const header = document.querySelector('.site-header');

/* banda de exclusión: toma el color de la sección activa */
const shellScrim = document.createElement('div');
shellScrim.className = 'shell-scrim';
shellScrim.setAttribute('aria-hidden', 'true');
document.body.appendChild(shellScrim);
/* Cuatro estados del shell (regla del isotipo camaleónico):
   'light' = fondo blanco → logo a colores · 'dark' = grafito → logo blanco ·
   'color' = color de marca claro (azul, fucsia, amarillo) → logo negro ·
   'color-oscuro' = color de marca oscuro (el morado del Método) → logo blanco.
   El cuarto estado existe porque sobre morado la tinta negra no es legible
   (1.71:1 a 11px); ver el bloque de contraste en base.css. */
const shellSections = [
  { el: document.querySelector('#inicio'),    shell: 'color' },
  { el: document.querySelector('#estudio'),   shell: 'light' },
  { el: document.querySelector('#partida'),   shell: 'dark'  },
  { el: document.querySelector('#metodo'),    shell: () => {
      const tema = document.querySelector('#metodo').dataset.methodTheme;
      if (!tema) return 'light';
      return tema === 'purple' ? 'color-oscuro' : 'color';
    } },
  { el: document.querySelector('#proyectos'), shell: 'light' },
  { el: document.querySelector('#contacto'),  shell: 'color' },
];

export function refreshShell() {
  const y = 40; /* línea de lectura bajo el borde superior */
  for (const { el, shell } of shellSections) {
    const r = el.getBoundingClientRect();
    if (r.top <= y && r.bottom > y) {
      const val = typeof shell === 'function' ? shell() : shell;
      if (header.dataset.shell !== val) header.dataset.shell = val;
      shellScrim.style.setProperty('--shell-scrim-color', getComputedStyle(el).backgroundColor);
      const id = el.id;
      document.querySelectorAll('.site-header__nav a[href^="#"]').forEach(a => {
        const current = a.getAttribute('href') === '#' + id && !a.classList.contains('site-header__cta');
        if (current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      return;
    }
  }
}
window.addEventListener('scroll', refreshShell, { passive: true });
window.addEventListener('resize', refreshShell);

/* ---- Desplegables accesibles (sistema compartido) ---- */
/* Refrescar triggers SOLO cuando ningún pin está activo: dentro de una
   sección pineada la apertura ocurre en escena y nada refluye fuera. */
/* DEBOUNCED (optimización QA): refresh completo con 3 pins es caro; si se
   despliegan varias cosas seguidas, un solo refresh al final — sin tirones. */
let refreshT = null;
function safeRefresh() {
  if (!ScrollTrigger) return;
  clearTimeout(refreshT);
  refreshT = setTimeout(() => {
    if (ScrollTrigger.getAll().some(t => t.pin && t.isActive)) return;
    ScrollTrigger.refresh();
  }, 220);
}

function animatePanel(panel, open) {
  const target = open ? panel.scrollHeight : 0;
  if (prefersReduced || !gsap) {
    panel.style.height = open ? 'auto' : '0px';
    safeRefresh();
    return;
  }
  gsap.killTweensOf(panel);
  if (open) {
    gsap.fromTo(panel, { height: panel.offsetHeight }, {
      height: target, duration: .42, ease: 'power2.inOut',
      onComplete: () => { panel.style.height = 'auto'; safeRefresh(); }
    });
  } else {
    gsap.fromTo(panel, { height: panel.offsetHeight }, {
      height: 0, duration: .36, ease: 'power2.inOut',
      onComplete: safeRefresh
    });
  }
}

document.querySelectorAll('[aria-controls]').forEach(btn => {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  if (!panel || btn.tagName !== 'BUTTON') return;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    const sym = btn.querySelector('.disclosure__sym');
    if (sym) sym.textContent = open ? '×' : '+';
    animatePanel(panel, open);
  });
});

/* ---- Refresh tras carga de fuentes (evita triggers desplazados) ---- */
if (document.fonts && ScrollTrigger) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

/* ---- Arranque de secciones ---- */
const setScrim = (color) => shellScrim.style.setProperty('--shell-scrim-color', color);
const ctx = { gsap, ScrollTrigger, prefersReduced, registerScene, unregisterScene, wake, refreshShell, setScrim, safeRefresh };

/* Ajuste del título BERGERAC al ancho del contenedor — ANTES de que
   los wipes partan el texto (mismo fonts.ready, registrado primero) */
initHeroFit();

/* Loader de entrada (isotipo + cortina en dos actos) — primero de todo */
initLoader(ctx);

/* Motion global v9 (F4): Lenis + reveals wipe. Los pins de las secciones
   se crean después y conviven con Lenis vía ScrollTrigger.update. */
const motion = initMotion(ctx);
ctx.lenis = motion.lenis;
ctx.caps = motion.caps;
initMenu(ctx);
initPointer(ctx);

/* Parallax ESTILO v9 — exclusivo del hero (pedido QA):
   · BERGERAC deriva CONTRA el cursor (amp -9, separa planos)
   · el 01 fantasma SIGUE al cursor (amp 30) y además deriva ±10% de su
     alto con el scroll (scrub directo, regla de la casa v9)
   · los paraguas van en DOS capas (pedido de dirección): el racimo
     negro/gris deriva leve (amp 5) y la estrella amarilla deriva más
     (amp 18) — la diferencia de amplitud es lo que las lee como dos
     planos, no el mismo grupo moviéndose junto.
   Mouse: x/y en px con lerp 0.05 · Scroll: yPercent — componen sin pisarse. */
if (gsap && !prefersReduced) {
  const word = document.querySelector('.hero-word');
  const ghost = document.querySelector('.s-hero .ghost');
  const racimo = document.querySelector('.hero-umbrellas__racimo');
  const estrella = document.querySelector('.hero-umbrellas__estrella');

  /* deriva de scroll del fantasma (v9 parallax.js, data-parallax="0.1") */
  if (ghost && ScrollTrigger) {
    gsap.fromTo(ghost,
      { yPercent: -10 },
      {
        yPercent: 10, ease: 'none',
        scrollTrigger: { trigger: ghost, start: 'top bottom', end: 'bottom top', scrub: true },
      });
  }

  /* deriva de cursor (v9 mouse-parallax.js) — solo puntero fino */
  const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fino && (word || ghost || racimo || estrella)) {
    const t = { nx: 0, ny: 0 };
    let rx = 0, ry = 0;
    addEventListener('pointermove', (e) => {
      rx = (e.clientX / innerWidth) * 2 - 1;
      ry = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
    /* Con las partículas activas, el título lo lleva el canvas: su
       transform contaminaría el rect que la escena mide para alinear
       el muestreo, así que se excluye de esta capa. */
    const heroSec = word && word.closest('.s-hero');
    const conParticulas = () => !!heroSec && heroSec.classList.contains('tiene-particulas');
    const capas = [];
    if (word) capas.push({ amp: -9, salta: conParticulas, sx: gsap.quickSetter(word, 'x', 'px'), sy: gsap.quickSetter(word, 'y', 'px') });
    if (ghost) capas.push({ amp: 30, sx: gsap.quickSetter(ghost, 'x', 'px'), sy: gsap.quickSetter(ghost, 'y', 'px') });
    if (racimo) capas.push({ amp: 5, sx: gsap.quickSetter(racimo, 'x', 'px'), sy: gsap.quickSetter(racimo, 'y', 'px') });
    if (estrella) capas.push({ amp: 18, sx: gsap.quickSetter(estrella, 'x', 'px'), sy: gsap.quickSetter(estrella, 'y', 'px') });
    gsap.ticker.add(() => {
      t.nx += (rx - t.nx) * 0.05;
      t.ny += (ry - t.ny) * 0.05;
      for (const c of capas) {
        if (c.salta && c.salta()) continue;
        c.sx(t.nx * c.amp);
        c.sy(t.ny * c.amp * 0.7);
      }
    });
  }
}
initVideos();
initMarquees(ctx);
initPlegables(ctx);
initTextRoll(ctx);

initEstudio(ctx);
initPartida(ctx);
initMetodo(ctx);

refreshShell();
window.addEventListener('load', () => ScrollTrigger && ScrollTrigger.refresh());
