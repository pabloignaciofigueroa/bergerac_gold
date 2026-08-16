/* ============================================================
   QA — LOS FOTOGRAMAS FIJOS

   Comprueba las dos mitades del trato:

   1. QUE APAREZCAN CUANDO TOCA. Sin WebGL, con el contexto perdido, con
      menos movimiento pedido, o cuando una escena no llega a arrancar.
      Y en el Método, que los CUATRO se turnen con las etapas y que la
      bisagra cromática los acompañe: un fotograma iluminado en fucsia sobre
      fondo morado sería peor que no tener fotograma.

   2. QUE NO APAREZCAN CUANDO NO TOCA. En FULL y en REDUCED no se pide ni
      uno. Son 392 KB que el visitante normal no debe ver pasar nunca, y
      esto es fácil de romper sin enterarse.

   Uso: node tools/qa/fotogramas.mjs
   ============================================================ */

import { existsSync } from 'node:fs';

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const puppeteer = (await import('puppeteer-core')).default;
const chrome = CHROMES.find(existsSync);
if (!chrome) { console.error('No encuentro Chrome.'); process.exit(1); }

const BASE = process.env.QA_URL || 'http://127.0.0.1:4310/';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let fallos = 0;
const ok = (cond, etiqueta, detalle = '') => {
  if (!cond) fallos++;
  console.log(`  ${cond ? 'OK  ' : 'FALLA'}  ${etiqueta}${detalle ? '  ·  ' + detalle : ''}`);
};

const ETAPAS = [
  ['estudiar',  'purple'],
  ['definir',   'purple'],
  ['construir', 'fuchsia'],
  ['afinar',    'fuchsia'],
];

/* Abre la página con el perfil pedido y devuelve la sonda. */
async function abrir({ url = BASE, sinWebGL = false, reduced = false } = {}) {
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errores = [];
  const pedidos = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  page.on('request', (r) => { if (/fotogramas\/.+\.webp/.test(r.url())) pedidos.push(r.url().split('/').pop()); });

  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (sinWebGL) {
    await page.evaluateOnNewDocument(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, ...r) {
        if (/webgl|experimental-webgl/i.test(t)) return null;
        return orig.call(this, t, ...r);
      };
    });
  }
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(7000);
  return { browser, page, errores, pedidos };
}

/* Recorre las cuatro etapas y anota qué fotograma y qué tema hay en cada una. */
async function recorrerEtapas(page) {
  const visto = [];
  for (const [slug] of ETAPAS) {
    await page.evaluate((s) => {
      const el = document.querySelector(`.metodo__etapa[data-etapa="${s}"]`);
      el?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, slug);
    await espera(1400);
    visto.push(await page.evaluate(() => {
      const img = document.querySelector('.metodo__stage .escena-fija img');
      return {
        foto: img ? img.getAttribute('src').split('/').pop().replace('.webp', '') : null,
        tema: document.querySelector('#metodo')?.dataset.methodTheme || 'purple',
      };
    }));
  }
  return visto;
}

console.log(`\n[fotogramas]  ${BASE}`);

/* ---------- 1 · en FULL no se pide ninguno ---------- */
{
  console.log('\n  ── FULL · la red no se despliega ──');
  const { browser, page, pedidos, errores } = await abrir({ url: BASE + '?calidad=full' });
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  });
  await espera(4000);
  const fijos = await page.evaluate(() => document.querySelectorAll('.escena-fija').length);
  await browser.close();
  ok(pedidos.length === 0, 'no se descarga ningún fotograma', pedidos.join(', ') || '0 peticiones');
  ok(fijos === 0, 'ningún hueco enseña estado fijo', fijos + ' fijos');
  ok(errores.length === 0, 'consola limpia', errores[0] || '');
}

/* ---------- 2 · en REDUCED tampoco ---------- */
{
  console.log('\n  ── REDUCED · tampoco ──');
  const { browser, page, pedidos } = await abrir({ url: BASE + '?calidad=reduced' });
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  });
  await espera(4000);
  await browser.close();
  ok(pedidos.length === 0, 'no se descarga ningún fotograma', pedidos.join(', ') || '0 peticiones');
}

/* ---------- 3 · sin WebGL: aparecen, y el Método se turna ---------- */
{
  console.log('\n  ── sin WebGL · la red entera ──');
  const { browser, page, pedidos, errores } = await abrir({ sinWebGL: true });

  await page.evaluate(() => document.querySelector('.estudio__canvas-holder')
    ?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await espera(2500);
  const isla = await page.evaluate(() => {
    const img = document.querySelector('.estudio__canvas-holder .escena-fija img');
    return img ? { src: img.getAttribute('src'), ancho: img.naturalWidth } : null;
  });
  ok(!!isla, 'la isla enseña su fotograma', isla?.src || 'sin imagen');
  ok(isla?.ancho > 0, 'y la imagen carga de verdad', 'naturalWidth ' + (isla?.ancho ?? 0));

  const visto = await recorrerEtapas(page);
  await browser.close();

  visto.forEach((v, i) => {
    const [slug, tema] = ETAPAS[i];
    ok(v.foto === 'metodo-' + slug, `${slug} · su fotograma`, v.foto || 'ninguno');
    ok(v.tema === tema, `${slug} · su luz`, `${v.tema} (esperado ${tema})`);
  });
  const distintos = new Set(visto.map((v) => v.foto)).size;
  ok(distintos === 4, 'los cuatro fotogramas son distintos', distintos + '/4');
  ok(pedidos.length > 0, 'se descargan solo los que se ven', pedidos.length + ' peticiones');
  ok(errores.length === 0, 'consola limpia', errores[0] || '');
}

/* ---------- 4 · reduced-motion: los mismos recursos ---------- */
{
  console.log('\n  ── prefers-reduced-motion · mismos recursos ──');
  const { browser, page, errores } = await abrir({ reduced: true });

  await page.evaluate(() => document.querySelector('.estudio__canvas-holder')
    ?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await espera(2500);
  const r = await page.evaluate(() => ({
    isla: !!document.querySelector('.estudio__canvas-holder .escena-fija img'),
    /* con menos movimiento ya no se monta un contexto para pintar un cuadro
       quieto: la isla no debe tener lienzo vivo */
    lienzoIsla: (() => {
      const c = document.querySelector('.estudio__canvas');
      return c ? c.width : 0;
    })(),
    h1: getComputedStyle(document.querySelector('.hero-word')).opacity,
  }));
  const visto = await recorrerEtapas(page);
  await browser.close();

  ok(r.isla, 'la isla enseña su fotograma');
  ok(r.lienzoIsla <= 300, 'y no se monta un contexto para nada', 'lienzo ' + r.lienzoIsla + 'px');
  ok(r.h1 === '1', 'el título del hero se lee como tipografía real', 'opacity=' + r.h1);
  visto.forEach((v, i) => {
    const [slug, tema] = ETAPAS[i];
    ok(v.foto === 'metodo-' + slug && v.tema === tema,
       `${slug} · fotograma y luz`, `${v.foto} · ${v.tema}`);
  });
  ok(errores.length === 0, 'consola limpia', errores[0] || '');
}

/* ---------- 5 · el contexto se pierde en marcha ---------- */
{
  console.log('\n  ── se pierde el contexto ──');
  const { browser, page, errores } = await abrir({ url: BASE + '?calidad=full' });
  /* Las dos escenas tienen que estar VIVAS antes de tirarles el contexto.
     Si el Método no ha arrancado todavía no hay contexto suyo que perder, y
     la prueba estaría midiendo otra cosa. */
  for (const sel of ['.estudio__canvas-holder', '.metodo__stage']) {
    await page.evaluate((s) => document.querySelector(s)
      ?.scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
    await espera(3500);
  }
  const vivas = await page.evaluate(() => [...document.querySelectorAll('canvas')]
    .filter((c) => c.width > 300).length);
  ok(vivas >= 3, 'las escenas están vivas antes de tirarlas', vivas + ' lienzos con tamaño');
  await page.evaluate(() => {
    for (const c of document.querySelectorAll('canvas')) {
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    }
  });
  await espera(3000);
  const r = await page.evaluate(() => ({
    isla: !!document.querySelector('.estudio__canvas-holder .escena-fija img'),
    metodo: !!document.querySelector('.metodo__stage .escena-fija'),
  }));
  await browser.close();
  ok(r.isla, 'la isla cae a su fotograma');
  ok(r.metodo, 'el método cae a los suyos');
  ok(errores.length === 0, 'consola limpia', errores[0] || '');
}

/* ---------- 6 · la escena que NO LLEGA A ARRANCAR ----------
   Éste es el caso que faltaba cubrir y que abrió esta fase: la escena no
   falla, no lanza, no da error de red — simplemente no llega. Pasa en
   máquinas muy lentas. Se simula bloqueando el código de la escultura, que
   viaja en su propio trozo y se pide al acercarse la sección. */
{
  console.log('\n  ── la escena no llega a arrancar ──');
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.setRequestInterception(true);
  let bloqueadas = 0;
  page.on('request', (r) => {
    if (/sculpture-v2\.[^/]*\.js$/.test(r.url())) { bloqueadas++; r.abort(); return; }
    r.continue();
  });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(BASE + '?calidad=full', { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(5000);
  await page.evaluate(() => document.querySelector('.metodo__stage')
    ?.scrollIntoView({ block: 'center', behavior: 'instant' }));

  /* el vigilante espera unos segundos ESTANDO a la vista antes de rendirse */
  await espera(13000);
  const r = await page.evaluate(() => {
    const img = document.querySelector('.metodo__stage .escena-fija img');
    const c = document.querySelector('.metodo__canvas');
    return {
      foto: img ? img.getAttribute('src').split('/').pop() : null,
      lienzo: c ? c.width : 0,
      secciones: ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto']
        .filter((s) => document.querySelector(s)?.getBoundingClientRect().height > 10).length,
    };
  });
  await browser.close();

  ok(bloqueadas > 0, 'se ha podido bloquear el código de la escultura', bloqueadas + ' peticiones');
  ok(r.lienzo <= 300, 'la escultura efectivamente no arrancó', 'lienzo ' + r.lienzo + 'px');
  ok(!!r.foto, 'aun así el hueco NO se queda vacío', r.foto || 'vacío');
  ok(r.secciones === 6, 'las seis secciones siguen ahí', r.secciones + '/6');
}

console.log(fallos === 0
  ? '\nLa red visual está donde tiene que estar, y solo ahí.\n'
  : `\n${fallos} comprobación(es) fallaron.\n`);
process.exitCode = fallos === 0 ? 0 : 1;
