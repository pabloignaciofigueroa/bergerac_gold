/* ============================================================
   QA — WEBGL COMPLETAMENTE NO DISPONIBLE

   Camino distinto al de `resiliencia.mjs`. Allí se tiran contextos que YA
   se habían creado; aquí WebGL no existe desde el primer momento, que es
   lo que ocurre con la aceleración por hardware desactivada, con una GPU
   en la lista negra del navegador o con extensiones que lo bloquean.

   Es un caso real y frecuente: un portátil de oficina cualquiera.

   Comprueba que:
     · las seis secciones existen y tienen altura
     · los CUATRO instrumentos enseñan su estado fijo (hero, estudio,
       método y contacto), no solo los que cuelgan de .instrumento-lienzo
     · el título del hero se lee como tipografía real
     · no hay huecos en blanco
     · el scroll funciona
     · cero errores de consola

   Uso: node tools/qa/sin-webgl.mjs
   ============================================================ */

import { existsSync, mkdirSync } from 'node:fs';

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('Falta puppeteer-core.'); process.exit(1); }
const chrome = CHROMES.find(existsSync);
if (!chrome) { console.error('No encuentro Chrome.'); process.exit(1); }

const URL = process.env.QA_URL || 'http://127.0.0.1:4310/';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let fallos = 0;
const ok = (cond, etiqueta, detalle = '') => {
  if (!cond) fallos++;
  console.log(`  ${cond ? 'OK  ' : 'FALLA'}  ${etiqueta}${detalle ? '  ·  ' + detalle : ''}`);
};

/* Los cuatro huecos de instrumento y cómo se llaman en el HTML. */
const HUECOS = [
  ['hero', '.hero-escena'],
  ['estudio', '.estudio__canvas-holder'],
  ['método', '.metodo__stage'],
  ['contacto', '.contacto-escena'],
];

console.log(`\n[sin-webgl]  ${URL}`);
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new', protocolTimeout: 240000,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

/* WebGL desaparece antes de que corra nada de la página */
await page.evaluateOnNewDocument(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
    if (/webgl|experimental-webgl/i.test(tipo)) return null;
    return orig.call(this, tipo, ...resto);
  };
});

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
await espera(8000);

/* recorrido completo: los instrumentos se montan por viewport */
await page.evaluate(async () => {
  const alto = document.body.scrollHeight;
  for (let y = 0; y < alto; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
  window.scrollTo(0, 0);
});
await espera(3000);

const r = await page.evaluate((huecos) => {
  const secciones = ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto']
    .map((s) => { const e = document.querySelector(s); return { s, alto: e ? Math.round(e.getBoundingClientRect().height) : 0 }; });

  const estados = huecos.map(([nombre, sel]) => {
    const el = document.querySelector(sel);
    if (!el) return { nombre, existe: false };
    const caja = el.getBoundingClientRect();
    return {
      nombre, existe: true,
      alto: Math.round(caja.height),
      fijo: !!el.querySelector('.escena-fija'),
      canvas: el.querySelectorAll('canvas').length,
      /* "en blanco" = ocupa sitio visible y no hay ni canvas ni estado fijo */
      enBlanco: caja.height > 40 && !el.querySelector('.escena-fija') && el.querySelectorAll('canvas').length === 0,
    };
  });

  /* Los vídeos de los casos llevan .instrumento-lienzo pero no tocan WebGL.
     Marcarlos ponía "necesita aceleración gráfica" encima de un vídeo que
     se ve perfectamente. */
  const videos = [...document.querySelectorAll('.caso-video')];

  return {
    secciones, estados,
    videos: videos.length,
    videosMarcados: videos.filter((v) => v.querySelector('.escena-fija')).length,
    h1: getComputedStyle(document.querySelector('.hero-word')).opacity,
    tieneParticulas: document.querySelector('.s-hero').classList.contains('tiene-particulas'),
    alto: document.body.scrollHeight,
  };
}, HUECOS);

ok(r.secciones.every((s) => s.alto > 10), 'las seis secciones existen y tienen altura',
   r.secciones.filter((s) => s.alto <= 10).map((s) => s.s).join(', ') || '6/6');

for (const e of r.estados) {
  if (!e.existe) { ok(false, `${e.nombre} · el hueco existe`, 'no encontrado'); continue; }
  ok(e.fijo, `${e.nombre} · enseña su estado fijo`, e.fijo ? '' : `alto ${e.alto}px, ${e.canvas} canvas`);
  ok(!e.enBlanco, `${e.nombre} · no queda en blanco`);
}

ok(r.videos > 0 && r.videosMarcados === 0, 'los vídeos de casos NO reciben el aviso de WebGL',
   `${r.videos} vídeos, ${r.videosMarcados} marcados`);
ok(r.h1 === '1', 'el título del hero se lee como tipografía real', 'opacity=' + r.h1);
ok(!r.tieneParticulas, 'no se marca la sección como si tuviera partículas');

const scroll = await page.evaluate(async () => {
  window.scrollTo(0, Math.round(document.body.scrollHeight * 0.5));
  await new Promise((r) => setTimeout(r, 600));
  const medio = window.scrollY;
  window.scrollTo(0, 0);
  return medio;
});
ok(scroll > 1000, 'el scroll funciona', 'bajó a ' + scroll + 'px');
ok(errores.length === 0, 'cero errores de consola', errores.slice(0, 2).join(' | '));

/* Capturas: "no queda en blanco" es una comprobación de programa. Estas son
   para mirarlas con los ojos, que es lo único que decide si algo se ve bien. */
if (process.env.QA_CAPTURAS !== '0') {
  const dir = 'qa-out/sin-webgl';
  mkdirSync(dir, { recursive: true });
  for (const [nombre, sel] of HUECOS) {
    const el = await page.$(sel);
    if (!el) continue;
    await page.evaluate((s) => document.querySelector(s)
      .scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
    await espera(500);
    try { await el.screenshot({ path: `${dir}/${nombre.replace('é', 'e')}.png` }); } catch {}
  }
  console.log(`  capturas en ${dir}/`);
}

await browser.close();
console.log(fallos === 0 ? '\nSin WebGL, Bergerac sigue en pie.\n' : `\n${fallos} comprobación(es) fallaron.\n`);
process.exitCode = fallos === 0 ? 0 : 1;
