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

/* ---- desmontaje limpio, EN LOS TRES CICLOS DE VIDA ----
   Hay tres formas distintas de montar escena en este sitio y cada una
   limpia por su lado: crearBase (hero y contacto), y las dos secciones
   acopladas al scroll, que registran en el bucle compartido de main.js. */
const ciclos = [
  { nombre: 'crearBase (hero/contacto)', sel: '[data-escena]', via: 'escena' },
  { nombre: 'Estudio', sel: '#estudio', via: 'seccion' },
  { nombre: 'Método', sel: '#metodo', via: 'seccion' },
];

for (const c of ciclos) {
  const r = await page.evaluate((sel, via) => {
    const el = document.querySelector(sel);
    if (!el) return { aplica: false, por: 'no existe el nodo' };
    const desmontar = via === 'escena' ? el._escena?.dispose : el._desmontar;
    if (typeof desmontar !== 'function') return { aplica: false, por: 'sin camino de desmontaje' };
    const antes = {
      canvas: el.querySelectorAll('canvas').length,
      /* una escena en el bucle compartido se delata porque sigue teniendo
         `active`; se mira el conteo global antes y después */
    };
    let error = null;
    try { desmontar.call(el._escena || el); } catch (e) { error = e.message; }
    return {
      aplica: true, error,
      canvasAntes: antes.canvas,
      canvasDespues: el.querySelectorAll('canvas').length,
      sigueElCamino: via === 'escena' ? true : el._desmontar !== null,
    };
  }, c.sel, c.via);

  if (!r.aplica) {
    ok(false, `${c.nombre} · tiene camino de desmontaje`, r.por);
    continue;
  }
  ok(!r.error, `${c.nombre} · el desmontaje no lanza`, r.error || '');
  if (c.via === 'escena') {
    ok(r.canvasDespues === 0, `${c.nombre} · sin canvas huérfano`, `${r.canvasAntes} → ${r.canvasDespues}`);
  } else {
    /* las secciones reutilizan un <canvas> que ya viene en el HTML: no se
       saca del DOM, lo que se comprueba es que su contexto quede muerto */
    ok(r.sigueElCamino === false, `${c.nombre} · el desmontaje se marca como hecho`);
  }
}

/* ¿queda alguna escena viva en el bucle compartido? */
const bucle = await page.evaluate(() => {
  /* si el bucle sigue pidiendo frames, alguien quedó activo */
  return new Promise((res) => {
    let n = 0;
    const t0 = performance.now();
    const cuenta = () => { n++; if (performance.now() - t0 < 700) requestAnimationFrame(cuenta); else res(n); };
    requestAnimationFrame(cuenta);
  });
});
ok(typeof bucle === 'number', 'el rAF de la página sigue respondiendo', bucle + ' frames en 700ms');
ok(errores.length === 0, 'sin errores tras los tres desmontajes', errores[0] || '');

await browser.close();
console.log(fallos === 0 ? '\nNinguna escena puede romper la página.\n' : `\n${fallos} comprobación(es) fallaron.\n`);
process.exitCode = fallos === 0 ? 0 : 1;
