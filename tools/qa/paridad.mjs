/* ============================================================
   QA — PARIDAD ENTRE DOS VERSIONES DEL SITIO
   Red de seguridad de la migración a Astro: si el build no es equivalente
   al sitio de hoy, aquí se ve, y con un número.

   Uso (con las dos versiones sirviendo):
     node tools/server.mjs 4300              → el sitio de hoy
     node tools/server.mjs 4310 dist         → el build de Astro
     node tools/qa/paridad.mjs http://127.0.0.1:4300 http://127.0.0.1:4310

   QUÉ SE COMPARA, y por qué así.
   Se deja el sitio en DOCUMENTO ESTÁTICO y se compara eso: markup, texto,
   CSS, layout y color — la capa que una migración puede romper. Las escenas
   WebGL y la física ya las verifican `titulo`, `hero`, `volver` y `arranque`.

   El primer intento fue pausar la animación y navegar con scrollIntoView, y
   NO SIRVE: comparando el sitio consigo mismo daba hasta un 56% de
   diferencia. Dos motivos, los dos de la medición y no del sitio:
     · Lenis va montado sobre gsap.ticker; al dormir el ticker, ScrollTrigger
       dejaba de actualizarse y los pins quedaban en un estado indefinido.
     · scrollIntoView con scroll suave de por medio no aterriza dos veces en
       el mismo píxel.
   Por eso ahora se matan los pins (el documento recupera su altura natural),
   se para el tiempo y se navega a posiciones ABSOLUTAS.
   ============================================================ */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, 'salida');

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('Falta puppeteer-core.  npm i --no-save puppeteer-core');
  process.exit(1);
}
const chrome = CHROMES.find(existsSync);
if (!chrome) { console.error('No encuentro Chrome. Edita CHROMES en este archivo.'); process.exit(1); }
if (!existsSync(SALIDA)) mkdirSync(SALIDA, { recursive: true });

const A = process.argv[2] || 'http://127.0.0.1:4300';
const B = process.argv[3] || 'http://127.0.0.1:4310';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'];
const ANCHOS = [[1440, 900], [390, 844]];
const PARADAS = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, .97];
const TOLERANCIA = 1;   /* % de píxeles distintos que se admite como ruido */

let fallos = 0;
const ok = (cond, etiqueta, detalle = '') => {
  if (!cond) fallos++;
  console.log(`  ${cond ? 'OK  ' : 'FALLA'}  ${etiqueta}${detalle ? '  ·  ' + detalle : ''}`);
};

async function capturar(browser, url, w, h) {
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.setViewport({ width: w, height: h, isMobile: w < 500, hasTouch: w < 500 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await espera(7000);

  await page.evaluate(() => {
    /* 1. matar los pins: el documento recupera su altura natural y el scroll
          deja de depender del estado de ScrollTrigger */
    if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((t) => t.kill(false));
    /* 2. parar el tiempo y, con él, Lenis (va sobre gsap.ticker) */
    if (window.gsap) { window.gsap.globalTimeline.pause(); window.gsap.ticker.sleep(); }
    /* 3. fuera lo que se dibuja solo o avanza por su cuenta */
    document.querySelectorAll('canvas').forEach((c) => { c.style.visibility = 'hidden'; });
    document.querySelectorAll('video').forEach((v) => { try { v.pause(); } catch {} v.style.visibility = 'hidden'; });
    /* El marquee es una cinta INFINITA: no se asienta nunca, así que su
       posición depende del instante exacto en que se congela. Comparando el
       sitio consigo mismo metía un 1,9% de ruido en el hero. Se oculta
       conservando su caja, que es lo que sí debe coincidir. */
    document.querySelectorAll('[data-marquee]').forEach((m) => { m.style.visibility = 'hidden'; });
    const t = document.querySelector('[data-transition]');
    if (t) t.style.display = 'none';
    document.documentElement.classList.remove('cargando');
    /* el canvas del hero queda oculto: se enseña el h1, que es texto y sí
       tiene que coincidir entre las dos versiones */
    const h1 = document.querySelector('.hero-word');
    if (h1) h1.style.opacity = '1';
    /* 4. ninguna transición a medias */
    const st = document.createElement('style');
    st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(st);
  });
  await espera(1200);

  const alto = await page.evaluate(() => document.body.scrollHeight);
  const tiros = [];
  for (const f of PARADAS) {
    const y = Math.round(Math.max(0, alto - h) * f);
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await espera(400);
    tiros.push({ f, png: (await page.screenshot()).toString('base64') });
  }
  await page.close();
  return { tiros, errores, alto };
}

/* la comparación va dentro de Chrome, que decodifica los PNG por nosotros */
async function comparar(browser, aT, bT) {
  const page = await browser.newPage();
  await page.goto('about:blank');
  const res = await page.evaluate(async (a1, b1, umbral) => {
    const carga = (b64) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = 'data:image/png;base64,' + b64; });
    const datos = async (b64) => {
      const im = await carga(b64); if (!im) return null;
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      return { d: x.getImageData(0, 0, im.width, im.height).data, w: im.width, h: im.height };
    };
    const out = [];
    for (let k = 0; k < a1.length; k++) {
      const a = await datos(a1[k].png), b = await datos(b1[k].png);
      if (!a || !b || a.w !== b.w || a.h !== b.h) { out.push({ f: a1[k].f, tamano: true }); continue; }
      /* se muestrea 1 de cada 2 píxeles en cada eje: cuatro veces más rápido
         y el diagnóstico es el mismo (un defecto de layout nunca cabe en un
         píxel suelto) */
      let distintos = 0, mirados = 0;
      for (let y = 0; y < a.h; y += 2) {
        for (let x = 0; x < a.w; x += 2) {
          const i = (y * a.w + x) * 4; mirados++;
          if (Math.abs(a.d[i] - b.d[i]) + Math.abs(a.d[i + 1] - b.d[i + 1]) + Math.abs(a.d[i + 2] - b.d[i + 2]) > umbral) distintos++;
        }
      }
      out.push({ f: a1[k].f, pct: +(100 * distintos / mirados).toFixed(3) });
    }
    return out;
  }, aT, bT, 30);
  await page.close();
  return res;
}

console.log(`\n[paridad]  A = ${A}\n           B = ${B}`);
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ARGS });
try {
  for (const [w, h] of ANCHOS) {
    console.log(`\n  ── ${w}x${h} ──`);
    const a = await capturar(browser, A, w, h);
    const b = await capturar(browser, B, w, h);
    ok(b.errores.length === 0, `${w}px · B sin errores de consola`, b.errores[0] || '');
    ok(Math.abs(a.alto - b.alto) <= 2, `${w}px · misma altura de documento`, `A ${a.alto} · B ${b.alto}`);
    const dif = await comparar(browser, a.tiros, b.tiros);
    let peor = 0, dondePeor = 0;
    for (const r of dif) {
      if (r.tamano) { ok(false, `${w}px · ${Math.round(r.f * 100)}% del scroll`, 'capturas de distinto tamaño'); continue; }
      if (r.pct > peor) { peor = r.pct; dondePeor = r.f; }
    }
    ok(peor < TOLERANCIA, `${w}px · las ${PARADAS.length} paradas coinciden`,
       `peor ${peor}% al ${Math.round(dondePeor * 100)}% del scroll`);
  }
} finally {
  await browser.close();
}
console.log(fallos === 0 ? '\nSon equivalentes.\n' : `\n${fallos} diferencia(s). Revisar antes de seguir.\n`);
process.exitCode = fallos === 0 ? 0 : 1;
