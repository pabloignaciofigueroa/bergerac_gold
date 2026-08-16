/* ============================================================
   QA — CALIDAD ADAPTATIVA EN CHROME DE VERDAD

   La parte pura del decisor la prueba `calidad.test.mjs` en seco. Esto
   comprueba lo otro: que las señales del navegador se leen bien, que cada
   instrumento arranca donde debe y —lo más importante— que en hardware
   sano Bergerac NO se toca.

   Tres perfiles:

     normal    GPU de verdad. Los cuatro instrumentos en FULL, y siguen en
               FULL al final del recorrido. Es la garantía de que esto no
               degrada nada a quien no le hace falta.

     software  ANGLE sobre SwiftShader. Hero, Estudio y Método arrancan en
               REDUCED; Contacto arranca FULL y responde por sí mismo, que
               es lo que pidió Pablo: en el perfil por software fue la
               única que se sostuvo, y apagar lo que funciona por ser
               decorativo sería nivelar hacia abajo sin motivo.

     lento     CPU estrangulada 6×. PRUEBA EL MECANISMO DE BAJADA, no
               simula una GPU débil: estrangular la CPU no reduce el
               relleno, que es donde sufren estas escenas. Lo que verifica
               es que la bajada ocurre, que ocurre una sola vez y que no
               deja hueco blanco ni salto.

   Uso: node tools/qa/calidad.mjs
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
const SW = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'];

let fallos = 0;
const ok = (cond, etiqueta, detalle = '') => {
  if (!cond) fallos++;
  console.log(`  ${cond ? 'OK  ' : 'FALLA'}  ${etiqueta}${detalle ? '  ·  ' + detalle : ''}`);
};

const INSTRUMENTOS = ['hero', 'estudio', 'metodo', 'contacto'];

/* `node tools/qa/calidad.mjs lento` corre un solo perfil. Los tres tardan
   varios minutos —SwiftShader va a lo que va— y al afinar solo interesa uno. */
const SOLO = process.argv[2] || null;
const toca = (n) => !SOLO || SOLO === n;

/* Abre la página, la recorre entera y devuelve el diagnóstico de calidad. */
async function medir({ args = ['--no-sandbox'], throttle = 0, reposo = 9000 }) {
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: 'new', protocolTimeout: 300000, args,
  });
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  if (throttle) {
    const cdp = await page.target().createCDPSession();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(reposo);

  /* recorrido lento: cada instrumento necesita segundos ÚTILES en pantalla,
     y el observador solo cuenta mientras el suyo está delante */
  const paradas = ['#inicio', '#estudio', '#metodo', '#contacto'];
  for (const sel of paradas) {
    await page.evaluate((s) => document.querySelector(s)
      ?.scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
    await espera(reposo);
  }

  const diag = await page.evaluate(() => window.__calidad?.diagnostico?.() || null);
  const niveles = await page.evaluate((lista) => {
    const out = {};
    for (const i of lista) out[i] = window.__calidad?.nivelDe?.(i) || null;
    return out;
  }, INSTRUMENTOS);

  const estado = await page.evaluate(() => ({
    canvas: document.querySelectorAll('canvas').length,
    fijos: document.querySelectorAll('.escena-fija').length,
    secciones: ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto']
      .filter((s) => document.querySelector(s)?.getBoundingClientRect().height > 10).length,
    alto: document.body.scrollHeight,
  }));

  await browser.close();
  return { diag, niveles, estado, errores };
}

console.log(`\n[calidad]  ${URL}`);

/* ---------- perfil NORMAL: no se toca nada ---------- */
let altoNormal = 0;
if (toca('normal')) {
console.log('\n  ── normal · GPU de verdad ──');
const normal = await medir({});
ok(normal.diag !== null, 'el módulo de calidad está vivo', normal.diag?.renderer?.slice(0, 48) || '');
ok(normal.diag && !normal.diag.porSoftware, 'no se confunde una GPU real con software',
   normal.diag?.renderer?.slice(0, 48) || '');
ok(INSTRUMENTOS.every((i) => normal.niveles[i] === 'full'),
   'los CUATRO instrumentos se quedan en FULL', JSON.stringify(normal.niveles));
ok(normal.estado.secciones === 6, 'las seis secciones siguen ahí', normal.estado.secciones + '/6');
ok(normal.estado.fijos === 0, 'ningún hueco cae a la red de emergencia', normal.estado.fijos + ' fijos');
ok(normal.errores.length === 0, 'consola limpia', normal.errores[0] || '');
altoNormal = normal.estado.alto;
console.log('    lo que vio el decisor:', JSON.stringify(normal.diag?.rastro || {}));
}

/* ---------- perfil SOFTWARE: arranque por instrumento ---------- */
if (toca('software')) {
console.log('\n  ── software · ANGLE/SwiftShader ──');
const soft = await medir({ args: SW });
ok(soft.diag?.porSoftware === true, 'se detecta el rasterizador por software',
   soft.diag?.renderer?.slice(0, 48) || '');
for (const i of ['hero', 'estudio', 'metodo']) {
  ok(soft.niveles[i] === 'reduced', `${i} arranca en REDUCED`, soft.niveles[i] || '');
}
ok(soft.niveles.contacto === 'full' || soft.niveles.contacto === 'reduced',
   'contacto NO se apaga por decorativo · responde por sí mismo', 'nivel ' + soft.niveles.contacto);
ok(soft.estado.secciones === 6, 'las seis secciones siguen ahí', soft.estado.secciones + '/6');
ok(soft.errores.length === 0, 'consola limpia', soft.errores[0] || '');
if (altoNormal) {
  ok(Math.abs(soft.estado.alto - altoNormal) < 40,
     'la composición no cambia respecto a FULL', `${altoNormal} vs ${soft.estado.alto}px`);
}
console.log('    niveles  ', JSON.stringify(soft.niveles));

/* La cuenta de partículas del hero: la señal más clara de que REDUCED hizo
   algo de verdad, y de que nunca se piden 48.000 en una máquina así. */
{
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: SW,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(12000);
  const n = await page.evaluate(() => window.__particulas?.palabra?.() ?? null);
  await browser.close();
  ok(n !== null && n < 48000, 'el hero nunca pide 48.000 partículas por software',
     n === null ? 'sonda no disponible' : n + ' partículas');
}
}

/* ---------- perfil LENTO: el mecanismo de bajada ---------- */
if (toca('lento')) {
console.log('\n  ── lento · CPU 6× (prueba el mecanismo, no simula una GPU) ──');
const lento = await medir({ throttle: 6, reposo: 11000 });
const rastro = lento.diag?.rastro || {};
for (const [i, r] of Object.entries(rastro)) {
  console.log(`    ${i.padEnd(9)} medianas ${JSON.stringify(r.medianas)} · techo ${r.techo} · racha ${r.racha}`);
}

/* NO se afirma "alguien tiene que bajar". Estrangular la CPU deja a varias
   escenas justo rozando el techo, así que quién cruza depende de la máquina
   del día: una puerta montada sobre eso pasa o falla por azar, no por
   corrección. Lo que sí se puede exigir siempre es el CONTRATO: baja
   exactamente quien acumuló dos ventanas seguidas por encima de su techo,
   y no baja nadie más. Eso se cumple en cualquier hardware. */
const bajados = INSTRUMENTOS.filter((i) => lento.niveles[i] === 'reduced');
let coherente = true;
const desajustes = [];
for (const [i, r] of Object.entries(rastro)) {
  const deberia = r.racha >= 2;
  const esta = lento.niveles[i] === 'reduced';
  if (deberia !== esta) { coherente = false; desajustes.push(`${i}: racha ${r.racha} pero ${lento.niveles[i]}`); }
}
ok(coherente, 'baja exactamente quien cruzó el techo dos ventanas seguidas',
   desajustes.join(' · ') || `bajó: ${bajados.join(', ') || 'nadie'}`);

const exigidos = Object.values(rastro).filter((r) => r.racha >= 2).length;
console.log(exigidos > 0
  ? `    el mecanismo se ejerció de verdad: ${exigidos} instrumento(s) cruzaron el techo`
  : '    aviso: con esta CPU ninguna escena cruzó el techo; el mecanismo no llegó a dispararse');
ok(lento.estado.secciones === 6, 'las seis secciones siguen ahí tras bajar', lento.estado.secciones + '/6');
ok(lento.errores.length === 0, 'consola limpia tras bajar', lento.errores[0] || '');
if (altoNormal) {
  ok(Math.abs(lento.estado.alto - altoNormal) < 40,
     'bajar de nivel no mueve la composición', `${altoNormal} vs ${lento.estado.alto}px`);
}
console.log('    niveles  ', JSON.stringify(lento.niveles));
}

/* ---------- perfil FORZADO: el camino completo, sin depender de la suerte ----------
   Con un techo imposible la bajada ocurre siempre, así que se puede
   comprobar de punta a punta lo que importa: que el nivel cambia, que el
   LIENZO REAL encoge —o sea, que la reducción llegó a la GPU y no se quedó
   en una etiqueta— y que la escena sigue viva y la página entera intacta. */
if (toca('forzado')) {
  console.log('\n  ── forzado · techo imposible, para probar el camino entero ──');
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(2000);

  /* techo de 0 ms: ninguna máquina lo cumple */
  await page.evaluate(() => window.__calidad.forzarPresupuesto(0));

  const lienzo = (sel) => page.evaluate((s) => {
    const c = document.querySelector(s)?.querySelector('canvas');
    if (!c) return null;
    const caja = c.getBoundingClientRect();
    return { ancho: c.width, css: Math.round(caja.width), ratio: +(c.width / (caja.width || 1)).toFixed(2) };
  }, sel);

  const HUECOS = [['estudio', '.estudio__canvas-holder'], ['metodo', '.metodo__stage'], ['contacto', '.contacto-escena']];
  const antes = {};
  for (const [nombre, sel] of HUECOS) {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
    await espera(2500);
    antes[nombre] = await lienzo(sel);
  }
  /* segunda vuelta: ahora ya han tenido sus segundos útiles y han bajado */
  const despues = {};
  for (const [nombre, sel] of HUECOS) {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
    await espera(9000);
    despues[nombre] = await lienzo(sel);
  }

  const niveles = await page.evaluate((l) => Object.fromEntries(l.map((i) => [i, window.__calidad.nivelDe(i)])), INSTRUMENTOS);
  const estado = await page.evaluate(() => ({
    secciones: ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto']
      .filter((s) => document.querySelector(s)?.getBoundingClientRect().height > 10).length,
    alto: document.body.scrollHeight,
    fijos: document.querySelectorAll('.escena-fija').length,
  }));
  await browser.close();

  for (const [nombre] of HUECOS) {
    const a = antes[nombre], d = despues[nombre];
    if (!a || !d) { ok(false, `${nombre} · hay lienzo que medir`, 'no encontrado'); continue; }
    console.log(`    ${nombre.padEnd(9)} ${a.ancho}px (ratio ${a.ratio}) → ${d.ancho}px (ratio ${d.ratio})`);
    ok(niveles[nombre] === 'reduced', `${nombre} · baja a REDUCED`, niveles[nombre]);
    ok(d.ancho < a.ancho, `${nombre} · el lienzo REAL encoge`, `${a.ancho} → ${d.ancho}px`);
    ok(d.ratio >= 0.75, `${nombre} · nunca baja de 0,75`, 'ratio ' + d.ratio);
  }
  ok(estado.secciones === 6, 'las seis secciones siguen ahí', estado.secciones + '/6');
  ok(estado.fijos === 0, 'nadie cae a la red de emergencia por bajar de nivel', estado.fijos + ' fijos');
  ok(errores.length === 0, 'consola limpia', errores[0] || '');
  if (altoNormal) {
    ok(Math.abs(estado.alto - altoNormal) < 40, 'la composición no se mueve',
       `${altoNormal} vs ${estado.alto}px`);
  }
}

console.log(fallos === 0
  ? '\nFULL donde se puede, REDUCED donde hace falta.\n'
  : `\n${fallos} comprobación(es) fallaron.\n`);
process.exitCode = fallos === 0 ? 0 : 1;
