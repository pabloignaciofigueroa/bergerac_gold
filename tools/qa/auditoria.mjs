/* ============================================================
   QA — AUDITORÍA COMPLETA

   Mide de una pasada, por perfil de dispositivo y de red: peso, tiempos,
   bloqueo del hilo principal, fps recorriendo la página, fps por sección,
   memoria, desbordes, errores de consola y comportamiento de los
   controles. El objetivo es saber hasta qué máquina y qué conexión
   aguanta el sitio, no si "va bien".

   Uso (con el build sirviéndose):
     npm run build && npm run preview
     node tools/qa/auditoria.mjs                    todos los perfiles
     node tools/qa/auditoria.mjs movil-3g           uno solo

   Cada perfil combina viewport + red + freno de CPU. Los frenos de CPU son
   los de Chrome: 1 = la máquina tal cual, 4 = un móvil de gama media, 6 =
   uno lento de verdad.
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

const Mbps = (m) => (m * 1024 * 1024) / 8;

/* Perfiles: nombre, viewport, red, freno de CPU.
   Las redes son las de las Devtools de Chrome. "3g-lento" es el suelo que
   hay que aguantar: es lo que se ve en una conexión mala de verdad. */
const PERFILES = {
  'escritorio':      { w: 1440, h: 900,  dpr: 2, movil: false, red: null,                                    cpu: 1 },
  'escritorio-lento':{ w: 1440, h: 900,  dpr: 2, movil: false, red: { down: Mbps(5),   up: Mbps(1), lat: 40 }, cpu: 2 },
  'tablet':          { w: 768,  h: 1024, dpr: 2, movil: true,  red: { down: Mbps(10),  up: Mbps(3), lat: 20 }, cpu: 2 },
  'tablet-h':        { w: 1024, h: 768,  dpr: 2, movil: true,  red: { down: Mbps(10),  up: Mbps(3), lat: 20 }, cpu: 2 },
  'movil':           { w: 390,  h: 844,  dpr: 3, movil: true,  red: { down: Mbps(4),   up: Mbps(1), lat: 70 }, cpu: 4 },
  'movil-3g':        { w: 360,  h: 780,  dpr: 2, movil: true,  red: { down: Mbps(1.6), up: Mbps(0.75), lat: 300 }, cpu: 6 },
};

const fmt = (n, d = 1) => n.toFixed(d);
const kb = (b) => (b / 1024).toFixed(1) + ' KB';
const mb = (b) => (b / 1048576).toFixed(2) + ' MB';

async function auditar(browser, nombre, p) {
  const page = await browser.newPage();
  const errores = [];
  const avisos = [];
  const recursos = [];

  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push('console: ' + m.text());
    if (m.type() === 'warning') avisos.push(m.text().slice(0, 90));
  });
  page.on('response', async (r) => {
    const url = r.url().replace(URL, '');
    const tipo = r.request().resourceType();
    /* El cuerpo de un vídeo no se puede leer (va por rangos y se aborta),
       así que para esos se usa content-length: si no, los 14 MB de los dos
       casos no aparecerían en el recuento y el peso saldría falseado. */
    let bytes = 0;
    try { bytes = (await r.buffer()).length; }
    catch { bytes = Number(r.headers()['content-length'] || 0); }
    recursos.push({ url, bytes, tipo });
  });

  await page.setViewport({ width: p.w, height: p.h, deviceScaleFactor: p.dpr, isMobile: p.movil, hasTouch: p.movil });
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  if (p.red) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: p.red.lat, downloadThroughput: p.red.down, uploadThroughput: p.red.up,
    });
  }
  if (p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });

  /* registrador de hitos y de tareas largas, instalado antes de que corra nada */
  await page.evaluateOnNewDocument(() => {
    window.__hitos = {};
    window.__largas = [];
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__largas.push(Math.round(e.duration)); })
        .observe({ entryTypes: ['longtask'] });
    } catch {}
    const marca = (k) => { if (!window.__hitos[k]) window.__hitos[k] = Math.round(performance.now()); };
    const obs = new MutationObserver(() => {
      if (!document.documentElement.classList.contains('cargando')) marca('cortinaArranca');
      const t = document.querySelector('[data-transition]');
      if (t && getComputedStyle(t).display === 'none') marca('cortinaSale');
      if (document.querySelector('.s-hero.tiene-particulas')) marca('particulas');
    });
    addEventListener('DOMContentLoaded', () => obs.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] }));
  });

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'load', timeout: 180000 });
  const tLoad = Date.now() - t0;

  /* La carga "inicial" se mide con la página ya asentada y SIN haber hecho
     scroll: medirla en el evento load engaña, porque los módulos y las
     escenas se piden después. */
  await espera(p.cpu > 3 ? 12000 : 8000);
  const bytesInicial = recursos.reduce((a, r) => a + r.bytes, 0);
  const nInicial = recursos.length;

  const pintados = await page.evaluate(() => performance.getEntriesByType('paint').map((e) => ({ n: e.name, ms: Math.round(e.startTime) })));
  const hitos = await page.evaluate(() => window.__hitos);

  /* ---- fps recorriendo toda la página ---- */
  const fpsScroll = await page.evaluate(async () => {
    let f = 0; const contar = () => { f++; requestAnimationFrame(contar); }; requestAnimationFrame(contar);
    const t = performance.now();
    const alto = document.body.scrollHeight;
    for (let y = 0; y < alto; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    return Math.round(f / ((performance.now() - t) / 1000));
  });

  /* ---- fps por sección, con el cursor moviéndose sobre ella ---- */
  const porSeccion = {};
  for (const sel of ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto']) {
    await page.evaluate((s) => { const e = document.querySelector(s); if (e) window.scrollTo(0, e.offsetTop + 100); }, sel);
    await espera(1200);
    await page.evaluate(() => { window.__f = 0; const c = () => { window.__f++; requestAnimationFrame(c); }; requestAnimationFrame(c); });
    const ini = Date.now();
    for (let i = 0; i < 14; i++) {
      await page.mouse.move(p.w * 0.2 + ((i * 37) % (p.w * 0.6)), p.h * 0.3 + ((i * 23) % (p.h * 0.3)));
      await espera(45);
    }
    const f = await page.evaluate(() => window.__f);
    porSeccion[sel.slice(1)] = Math.round(f / ((Date.now() - ini) / 1000));
  }

  const bytesTotal = recursos.reduce((a, r) => a + r.bytes, 0);

  /* ---- layout y comportamiento ---- */
  await page.evaluate(() => window.scrollTo(0, 0));
  await espera(800);
  const estado = await page.evaluate(() => {
    const d = document.documentElement;
    const sel = '.t-impact, .partida__title, .metodo__title, .metodo__portada-word, .metodo__name, .mundo-word, .lema, .partida__problem, .hero-claim-top';
    const fuera = [];
    document.querySelectorAll(sel).forEach((el) => {
      const r = el.getBoundingClientRect();
      /* Solo cuenta si está EN PANTALLA verticalmente: las estaciones del
         Punto de partida viven en un travelling horizontal y están fuera
         del viewport a propósito, no por un fallo de layout. */
      if (r.bottom < 0 || r.top > d.clientHeight) return;
      if (r.right > d.clientWidth + 2) fuera.push(el.textContent.trim().slice(0, 26));
    });
    const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    return {
      desborde: d.scrollWidth - d.clientWidth,
      titularesFuera: fuera,
      memoriaMB: mem,
      canvases: document.querySelectorAll('canvas').length,
      particulas: window.__particulas ? window.__particulas.total() : null,
      videos: [...document.querySelectorAll('video')].map((v) => ({ src: !!v.src, listo: v.readyState })),
      alto: document.body.scrollHeight,
    };
  });

  /* ---- controles: menú, desplegables, formulario ---- */
  const controles = {};
  try {
    await page.evaluate(() => document.querySelector('[data-menu-toggle]')?.click());
    await espera(700);
    controles.menuAbre = await page.evaluate(() => document.querySelector('[data-menu-overlay]')?.classList.contains('is-open') ?? false);
    await page.evaluate(() => document.querySelector('[data-menu-toggle]')?.click());
    await espera(700);
    controles.menuCierra = await page.evaluate(() => !(document.querySelector('[data-menu-overlay]')?.classList.contains('is-open')));
  } catch { controles.menuAbre = controles.menuCierra = false; }

  try {
    const r = await page.evaluate(async () => {
      const b = document.querySelector('#partida button[aria-controls], #metodo button[aria-controls]');
      if (!b) return null;
      const panel = document.getElementById(b.getAttribute('aria-controls'));
      const antes = panel.getBoundingClientRect().height;
      b.click();
      await new Promise((r) => setTimeout(r, 900));
      return { antes: Math.round(antes), despues: Math.round(panel.getBoundingClientRect().height), aria: b.getAttribute('aria-expanded') };
    });
    controles.desplegable = r ? (r.despues > r.antes && r.aria === 'true') : 'sin desplegables';
  } catch { controles.desplegable = false; }

  try {
    controles.formulario = await page.evaluate(async () => {
      const f = document.querySelector('[data-formulario]');
      if (!f) return 'sin formulario';
      f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
      return f.hidden === true && document.querySelector('.formulario-confirmacion')?.hidden === false;
    });
  } catch { controles.formulario = false; }

  const largas = await page.evaluate(() => window.__largas || []);
  await page.close();

  return {
    nombre, perfil: p, tLoad, bytesInicial, nInicial, bytesTotal, nTotal: recursos.length,
    pintados, hitos, fpsScroll, porSeccion, estado, controles, errores, avisos,
    largas: { n: largas.length, total: largas.reduce((a, b) => a + b, 0), peor: Math.max(0, ...largas) },
    recursos,
  };
}

/* ---- salida ---- */
function informe(r) {
  const p = r.perfil;
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ${r.nombre.toUpperCase()}   ${p.w}x${p.h} @${p.dpr}x   ` +
    `${p.red ? (p.red.down * 8 / 1048576).toFixed(1) + ' Mbps / ' + p.red.lat + 'ms' : 'red libre'}   CPU ÷${p.cpu}`);
  console.log('═'.repeat(64));

  const fcp = r.pintados.find((x) => x.n === 'first-contentful-paint');
  console.log('\n  TIEMPOS');
  console.log(`    primer pintado         ${r.pintados[0] ? r.pintados[0].ms + ' ms' : '—'}`);
  console.log(`    primer pintado con contenido  ${fcp ? fcp.ms + ' ms' : '—'}`);
  console.log(`    cortina de carga aparece   ${r.hitos.cortinaArranca ?? '—'} ms`);
  console.log(`    cortina se retira          ${r.hitos.cortinaSale ?? '—'} ms`);
  console.log(`    partículas montadas        ${r.hitos.particulas ?? '—'} ms`);
  console.log(`    evento load                ${r.tLoad} ms`);

  console.log('\n  PESO');
  console.log(`    carga inicial          ${mb(r.bytesInicial)}  en ${r.nInicial} recursos`);
  console.log(`    tras recorrer todo     ${mb(r.bytesTotal)}  en ${r.nTotal} recursos`);
  const top = [...r.recursos].sort((a, b) => b.bytes - a.bytes).slice(0, 5);
  top.forEach((t) => console.log(`      ${kb(t.bytes).padStart(10)}  ${t.url.slice(0, 52)}`));

  console.log('\n  FLUIDEZ');
  console.log(`    recorriendo la página  ${r.fpsScroll} fps`);
  Object.entries(r.porSeccion).forEach(([s, f]) => {
    const marca = f >= 50 ? 'bien' : f >= 30 ? 'justo' : 'MAL';
    console.log(`      ${s.padEnd(12)} ${String(f).padStart(3)} fps   ${marca}`);
  });
  console.log(`    tareas largas (>50ms)  ${r.largas.n}  ·  suman ${r.largas.total} ms  ·  la peor ${r.largas.peor} ms`);

  console.log('\n  ESTADO');
  console.log(`    desborde horizontal    ${r.estado.desborde}px`);
  console.log(`    titulares fuera        ${r.estado.titularesFuera.length ? r.estado.titularesFuera.join(', ') : 'ninguno'}`);
  console.log(`    partículas del título  ${r.estado.particulas ?? '—'}`);
  console.log(`    canvas montados        ${r.estado.canvases}`);
  console.log(`    memoria JS             ${r.estado.memoriaMB ?? '—'} MB`);
  console.log(`    vídeos cargados        ${r.estado.videos.filter((v) => v.src).length}/${r.estado.videos.length}`);

  console.log('\n  CONTROLES');
  Object.entries(r.controles).forEach(([k, v]) => {
    console.log(`    ${k.padEnd(14)} ${v === true ? 'OK' : v === false ? 'FALLA' : v}`);
  });

  console.log('\n  CONSOLA');
  console.log(`    errores  ${r.errores.length}${r.errores.length ? ': ' + r.errores[0].slice(0, 70) : ''}`);
  if (r.avisos.length) console.log(`    avisos   ${r.avisos.length}: ${[...new Set(r.avisos)][0]}`);
}

const cual = process.argv[2];
const aCorrer = cual ? { [cual]: PERFILES[cual] } : PERFILES;
if (cual && !PERFILES[cual]) {
  console.error(`Perfil desconocido. Disponibles: ${Object.keys(PERFILES).join(', ')}`);
  process.exit(1);
}

console.log(`\nAUDITORÍA — ${URL}`);
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ARGS });
const todos = [];
try {
  for (const [nombre, p] of Object.entries(aCorrer)) {
    const r = await auditar(browser, nombre, p);
    informe(r);
    todos.push(r);
  }
} finally { await browser.close(); }

/* ---- resumen ---- */
console.log(`\n${'═'.repeat(64)}\n  RESUMEN\n${'═'.repeat(64)}`);
console.log('\n  perfil            inicial   total    scroll  peor sección   errores');
for (const r of todos) {
  const peor = Object.entries(r.porSeccion).sort((a, b) => a[1] - b[1])[0];
  console.log(`  ${r.nombre.padEnd(17)} ${mb(r.bytesInicial).padStart(8)} ${mb(r.bytesTotal).padStart(8)}` +
    ` ${String(r.fpsScroll).padStart(6)}  ${(peor[0] + ' ' + peor[1]).padEnd(14)} ${r.errores.length}`);
}
console.log('');
