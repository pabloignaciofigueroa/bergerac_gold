/* ============================================================
   QA — arnés de verificación en Chrome real
   Uso:
     node tools/qa/qa.mjs                 todas las pruebas
     node tools/qa/qa.mjs hero            solo una (arranque|hero|color|volver|movil|reduce|fps|foto)
     node tools/qa/qa.mjs foto 390        captura a un ancho concreto

   Requisitos: el servidor corriendo (node tools/server.mjs) y puppeteer-core.
   Si falta puppeteer:  npm i --no-save puppeteer-core
   Las capturas se guardan en tools/qa/salida/.
   ============================================================ */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, 'salida');
const URL = process.env.QA_URL || 'http://127.0.0.1:4300/';

/* Chrome del sistema: no descargamos navegador */
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

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
/* el loader del isotipo tarda ~1.6s; 6s cubre carga + construcción */
const LISTO = 6000;

let fallos = 0;
const ok = (cond, etiqueta, detalle = '') => {
  if (!cond) fallos++;
  console.log(`  ${cond ? 'OK  ' : 'FALLA'}  ${etiqueta}${detalle ? '  ·  ' + detalle : ''}`);
};

async function abrir(browser, { w = 1440, h = 900, movil = false, reduce = false } = {}) {
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  await page.setViewport({ width: w, height: h, isMobile: movil, hasTouch: movil, deviceScaleFactor: movil ? 2 : 1 });
  if (reduce) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
  await espera(LISTO);
  return { page, errores };
}

/* ---- pruebas ---------------------------------------------- */

async function hero(b) {
  console.log('\n[hero] montaje del título en partículas');
  const { page, errores } = await abrir(b);
  const st = await page.evaluate(() => ({
    activa: document.querySelector('.s-hero').classList.contains('tiene-particulas'),
    canvas: !!document.querySelector('.hero-escena canvas'),
    opacidadH1: getComputedStyle(document.querySelector('.hero-word')).opacity,
  }));
  ok(st.activa, 'partículas activas');
  ok(st.canvas, 'canvas montado');
  ok(st.opacidadH1 === '0', 'h1 oculto pero presente', `opacity=${st.opacidadH1}`);
  ok(errores.length === 0, 'sin errores de consola', errores[0] || '');
  await page.close();
}

async function color(b) {
  console.log('\n[color] tinta grafito exacta sobre azul');
  const { page } = await abrir(b);
  const m = await page.evaluate(() => {
    /* muestreo directo del canvas del hero */
    const c = document.querySelector('.hero-escena canvas');
    const r = document.querySelector('.hero-word span').getBoundingClientRect();
    const cv = document.createElement('canvas');
    cv.width = c.width; cv.height = c.height;
    return { x: Math.round(r.left + r.width * 0.08), y: Math.round(r.top + r.height * 0.5) };
  });
  const shot = await page.screenshot({ encoding: 'base64', clip: { x: m.x, y: m.y, width: 6, height: 6 } });
  const fondo = await page.screenshot({ encoding: 'base64', clip: { x: 700, y: 700, width: 6, height: 6 } });
  /* PNG mínimo: comparamos por tamaño no sirve — usamos evaluate sobre el DOM */
  const px = await page.evaluate(async () => {
    const c = document.querySelector('.hero-escena canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return !!gl;
  });
  ok(px, 'contexto WebGL vivo');
  console.log('       (para el color exacto: abrir la captura y usar cuentagotas → debe dar #252522)');
  await page.screenshot({ path: join(SALIDA, 'color-hero.png'), clip: { x: 0, y: 130, width: 1440, height: 200 } });
  await page.close();
}

async function volver(b) {
  /* Se mide la FÍSICA, no una captura: las partículas tienen un pulso
     senoidal, así que dos fotos nunca son idénticas byte a byte. */
  console.log('\n[volver] la palabra recompone tras el desarme');
  const { page } = await abrir(b);
  const sonda = () => page.evaluate(() => window.__particulas?.maxDesplazamiento() ?? -1);

  const reposo = await sonda();
  ok(reposo >= 0, 'sonda de diagnóstico disponible');
  ok(reposo < 1, 'en reposo las partículas están en su letra', `max ${reposo.toFixed(2)}px`);

  /* paseo lento y directo sobre las letras: el gesto que rompía */
  for (let i = 0; i < 70; i++) {
    await page.mouse.move(140 + i * 18, 220 + Math.sin(i / 6) * 45);
    await espera(32);
  }
  const durante = await sonda();
  ok(durante > 40, 'el cursor desarma de verdad', `max ${durante.toFixed(0)}px`);
  ok(durante < 2000, 'ninguna partícula se escapa lejos', `max ${durante.toFixed(0)}px`);

  await page.mouse.move(700, 860);           /* retirar el cursor */
  await espera(4000);
  const vuelta = await sonda();
  ok(vuelta < 1.5, 'todas vuelven a su sitio', `max ${vuelta.toFixed(2)}px`);
  await page.close();
}

async function arranque(b) {
  /* La pantalla de carga tiene que ser LO PRIMERO que se ve.
     Ya falló una vez: `loader.js` es un módulo (diferido) y sus capas opacas
     las crea él, así que hasta que arrancaba se veía el sitio entero con el
     isotipo flotando encima y la cortina entraba DESPUÉS.

     Ojo con cómo se mide: entonces el <div> del loader ya estaba ahí y era el
     elemento superior, solo que transparente. Un `elementFromPoint` habría
     dicho "tapado" y no habría cazado nada. Lo que se comprueba es que en cada
     fotograma haya algo REALMENTE OPACO cubriendo: la clase `cargando` del
     <html>, o el contenedor con fondo no transparente, o sus dos actos. */
  console.log('\n[arranque] la cortina es lo primero que se ve');
  const page = await b.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  await page.setViewport({ width: 1280, height: 800 });

  /* Red estrangulada a propósito: con conexión rápida el hueco es tan corto
     que no se ve. El segundo fallo (destello del fondo claro antes de que
     llegara base.css) solo aparecía así. */
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 200,
    downloadThroughput: 1.2 * 1024 * 1024 / 8, uploadThroughput: 600 * 1024 / 8,
  });

  await page.evaluateOnNewDocument(() => {
    window.__arranque = [];
    const opaco = (c) => !!c && c !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c);
    const tick = () => {
      const t = document.querySelector('[data-transition]');
      const visible = t && getComputedStyle(t).display !== 'none';
      window.__arranque.push({
        ms: Math.round(performance.now()),
        cargando: document.documentElement.classList.contains('cargando'),
        cortina: !!(visible && (opaco(getComputedStyle(t).backgroundColor) || t.querySelector('.loader-acto'))),
        fuera: !!(t && !visible),
        /* ¿asoma el sitio? el hero pintado bajo la cortina */
        heroVisible: (() => {
          const h = document.querySelector('#inicio');
          if (!h) return false;
          const r = h.getBoundingClientRect();
          return r.top < innerHeight && r.bottom > 0;
        })(),
      });
      if (performance.now() < 12000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await espera(9000);

  const reg = await page.evaluate(() => window.__arranque);
  ok(reg.length > 10, 'el registro de arranque tiene fotogramas', `${reg.length} muestras`);

  /* Traspaso: el primer fotograma en que la cortina ya está fuera. */
  const salida = reg.findIndex((f) => f.fuera);
  const antes = salida === -1 ? reg : reg.slice(0, salida);

  const descubierto = antes.filter((f) => !f.cargando && !f.cortina);
  ok(descubierto.length === 0,
    'nada del sitio se ve antes que la cortina',
    descubierto.length ? `${descubierto.length} fotograma(s) sin cubrir, el 1º a ${descubierto[0].ms}ms` : '');

  ok(antes.length > 0 && (antes[0].cargando || antes[0].cortina),
    'el primer fotograma ya está cubierto',
    antes[0] ? `${antes[0].ms}ms` : 'sin muestras');

  /* La cortina tiene que irse: si `cargando` se quedara, el sitio no aparece. */
  const fin = reg[reg.length - 1];
  ok(fin && !fin.cargando, 'al terminar, el grafito de <html> se ha retirado');
  ok(salida !== -1, 'la cortina acaba saliendo');

  const st = await page.evaluate(() => ({
    heroPintado: getComputedStyle(document.querySelector('.s-hero')).backgroundColor,
    loader: (() => { const t = document.querySelector('[data-transition]'); return !t ? 'no existe' : getComputedStyle(t).display; })(),
  }));
  ok(st.loader === 'none', 'el loader queda fuera del paso', st.loader);
  ok(errores.length === 0, 'sin errores de consola', errores[0] || '');
  await page.close();
}

async function movil(b) {
  console.log('\n[movil] sin desbordes ni titulares cortados');
  for (const [w, h, nom] of [[390, 844, 'iphone'], [360, 780, 'android'], [768, 1024, 'ipad']]) {
    const { page, errores } = await abrir(b, { w, h, movil: true });
    const st = await page.evaluate(() => {
      const d = document.documentElement;
      const sel = '.t-impact, .partida__title, .metodo__title, .metodo__portada-word, .metodo__name, .mundo-word, .lema, .partida__problem, .hero-claim-top';
      const fuera = [];
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > d.clientWidth + 2) fuera.push(el.textContent.trim().slice(0, 22));
      });
      return { overflow: d.scrollWidth - d.clientWidth, fuera, particulas: document.querySelector('.s-hero').classList.contains('tiene-particulas') };
    });
    ok(st.overflow === 0, `${nom} ${w}px · sin scroll horizontal`, st.overflow ? `+${st.overflow}px` : '');
    ok(st.fuera.length === 0, `${nom} ${w}px · titulares dentro de margen`, st.fuera.join(', '));
    ok(errores.length === 0, `${nom} ${w}px · sin errores`, errores[0] || '');
    await page.close();
  }
}

async function reduce(b) {
  console.log('\n[reduce] prefers-reduced-motion');
  const { page, errores } = await abrir(b, { reduce: true });
  const st = await page.evaluate(() => ({
    particulas: document.querySelector('.s-hero').classList.contains('tiene-particulas'),
    opacidad: getComputedStyle(document.querySelector('.hero-word')).opacity,
  }));
  ok(!st.particulas, 'no monta las partículas');
  ok(st.opacidad === '1', 'el título queda como texto nítido');
  ok(errores.length === 0, 'sin errores', errores[0] || '');
  await page.close();
}

async function fps(b) {
  console.log('\n[fps] rendimiento con interacción continua');
  const { page } = await abrir(b);
  await page.evaluate(() => { window.__f = 0; const c = () => { window.__f++; requestAnimationFrame(c); }; requestAnimationFrame(c); });
  const t0 = Date.now();
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(300 + ((i * 37) % 900), 200 + ((i * 23) % 120));
    await espera(50);
  }
  const f = await page.evaluate(() => window.__f);
  const valor = f / ((Date.now() - t0) / 1000);
  ok(valor >= 55, 'sostiene 55+ fps', valor.toFixed(0) + ' fps');
  console.log('       (headless no tiene vsync: es holgura, no fps reales)');
  await page.close();
}

async function foto(b, ancho = 1440) {
  const w = Number(ancho) || 1440;
  console.log(`\n[foto] capturas a ${w}px`);
  const { page } = await abrir(b, { w, h: w < 600 ? 800 : 900, movil: w < 600 });
  await page.screenshot({ path: join(SALIDA, `hero-${w}.png`) });
  for (const s of ['#estudio', '#partida', '#metodo', '#proyectos', '#contacto']) {
    await page.evaluate((sel) => document.querySelector(sel).scrollIntoView(), s);
    await espera(1800);
    await page.screenshot({ path: join(SALIDA, `${s.slice(1)}-${w}.png`) });
  }
  console.log(`       capturas en tools/qa/salida/`);
  await page.close();
}

/* ---- ejecución --------------------------------------------- */

const PRUEBAS = { arranque, hero, color, volver, movil, reduce, fps, foto };
const cual = process.argv[2];
const arg = process.argv[3];

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new' });
try {
  if (cual && PRUEBAS[cual]) {
    await PRUEBAS[cual](browser, arg);
  } else if (cual) {
    console.error(`Prueba desconocida: ${cual}. Disponibles: ${Object.keys(PRUEBAS).join(', ')}`);
    process.exitCode = 1;
  } else {
    for (const n of ['arranque', 'hero', 'volver', 'movil', 'reduce', 'fps']) await PRUEBAS[n](browser);
  }
} finally {
  await browser.close();
}

console.log(fallos === 0 ? '\nTodo en orden.\n' : `\n${fallos} comprobación(es) fallaron.\n`);
process.exitCode = fallos === 0 ? 0 : 1;
