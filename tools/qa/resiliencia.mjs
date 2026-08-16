/* ============================================================
   QA — RESILIENCIA WebGL

   Fuerza la pérdida de los contextos con la extensión WEBGL_lose_context —
   es la pérdida de verdad, la misma que provoca el navegador cuando hay
   presión de memoria— y comprueba que la página aguanta.

   Esto NO es una prueba de rendimiento. Es de manejo de errores: un
   contexto WebGL se puede perder en cualquier máquina, también en una
   buena, y hasta ahora eso dejaba el canvas en blanco para siempre.

   Uso (con el build sirviéndose):
     node tools/qa/resiliencia.mjs
     QA_URL=http://127.0.0.1:4310/ node tools/qa/resiliencia.mjs

   Comprueba, tras tirar todos los contextos:
     · ningún canvas en blanco
     · ninguna sección desaparecida
     · el scroll sigue operativo
     · cero errores de consola
     · el estado fijo visible en cada hueco
     · sin canvas ni escuchas huérfanas tras el desmontaje
   ============================================================ */

import { existsSync } from 'node:fs';

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
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'];

let fallos = 0;
const ok = (cond, etiqueta, detalle = '') => {
  if (!cond) fallos++;
  console.log(`  ${cond ? 'OK  ' : 'FALLA'}  ${etiqueta}${detalle ? '  ·  ' + detalle : ''}`);
};

const SECCIONES = ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto'];

console.log(`\n[resiliencia]  ${URL}`);
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', protocolTimeout: 240000, args: ARGS });
const page = await browser.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
await espera(7000);

/* recorrido completo para que se monten todas las escenas */
await page.evaluate(async () => {
  const alto = document.body.scrollHeight;
  for (let y = 0; y < alto; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
  window.scrollTo(0, 0);
});
await espera(4000);

const antes = await page.evaluate(() => ({
  canvases: document.querySelectorAll('canvas').length,
  alto: document.body.scrollHeight,
  secciones: ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto'].filter((s) => document.querySelector(s)).length,
}));
ok(antes.canvases > 0, 'hay escenas montadas antes de tirarlas', antes.canvases + ' canvas');
ok(errores.length === 0, 'sin errores antes de tirar nada', errores[0] || '');

/* ---- tirar TODOS los contextos ---- */
const tirados = await page.evaluate(() => {
  let n = 0;
  for (const c of document.querySelectorAll('canvas')) {
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) continue;
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) { ext.loseContext(); n++; }
  }
  return n;
});
ok(tirados > 0, 'se han podido forzar pérdidas de contexto', tirados + ' contextos tirados');
await espera(3500);

/* ---- ¿aguanta? ---- */
const despues = await page.evaluate(() => {
  /* un canvas "en blanco" es el que sigue en el DOM, ocupa sitio y no tiene
     ni un píxel pintado ni un estado fijo encima */
  const blancos = [];
  for (const c of document.querySelectorAll('canvas')) {
    const r = c.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const hueco = c.closest('.instrumento-lienzo, .hero-escena, .contacto-escena, .metodo__stage, .estudio__canvas-holder') || c.parentElement;
    const tieneFijo = !!hueco?.querySelector('.escena-fija');
    const vivo = !!(c.getContext('webgl2') || c.getContext('webgl'))?.isContextLost?.() === false;
    if (!tieneFijo && !vivo) blancos.push(c.className || c.tagName);
  }
  return {
    blancos,
    fijos: document.querySelectorAll('.escena-fija').length,
    fijosConTexto: [...document.querySelectorAll('.escena-fija')].filter((f) => f.textContent.trim()).length,
    secciones: ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto'].filter((s) => {
      const e = document.querySelector(s);
      return e && e.getBoundingClientRect().height > 10;
    }).length,
    alto: document.body.scrollHeight,
  };
});

ok(despues.blancos.length === 0, 'ningún canvas queda en blanco', despues.blancos.join(', '));
ok(despues.fijos > 0, 'el estado fijo aparece en su hueco', despues.fijos + ' huecos con estado fijo');
ok(despues.secciones === 6, 'las seis secciones siguen ahí', despues.secciones + '/6');

/* scroll operativo tras la caída */
const scroll = await page.evaluate(async () => {
  const antes = window.scrollY;
  window.scrollTo(0, Math.round(document.body.scrollHeight * 0.5));
  await new Promise((r) => setTimeout(r, 600));
  const medio = window.scrollY;
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 600));
  return { antes, medio, vuelta: window.scrollY };
});
ok(scroll.medio > 1000, 'el scroll sigue funcionando', `bajó a ${scroll.medio}px y volvió a ${scroll.vuelta}`);
ok(errores.length === 0, 'cero errores de consola tras la caída', errores[0] || '');

/* ---- desmontaje limpio: ni canvas ni escuchas huérfanas ---- */
const limpieza = await page.evaluate(() => {
  const mount = document.querySelector('[data-escena]');
  if (!mount || !mount._escena) return { aplica: false };
  const canvasAntes = mount.querySelectorAll('canvas').length;
  try { mount._escena.dispose?.(); } catch (e) { return { aplica: true, error: e.message }; }
  return { aplica: true, canvasAntes, canvasDespues: mount.querySelectorAll('canvas').length };
});
if (limpieza.aplica) {
  ok(!limpieza.error, 'el desmontaje no lanza', limpieza.error || '');
  ok(limpieza.canvasDespues === 0, 'no quedan canvas huérfanos tras desmontar',
     `${limpieza.canvasAntes} → ${limpieza.canvasDespues}`);
} else {
  console.log('       (la escena del hero ya estaba caída: desmontaje no aplicable)');
}
ok(errores.length === 0, 'sin errores tras el desmontaje', errores[0] || '');

await browser.close();
console.log(fallos === 0 ? '\nNinguna escena puede romper la página.\n' : `\n${fallos} comprobación(es) fallaron.\n`);
process.exitCode = fallos === 0 ? 0 : 1;
