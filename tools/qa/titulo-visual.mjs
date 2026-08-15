/* ============================================================
   QA — INSPECCIÓN VISUAL DEL TÍTULO
   El complemento de `qa.mjs titulo`: aquel da un número, este da las
   imágenes para mirarlas. Se usó para afinar las dos capas del hero.

   Uso (con el servidor corriendo):
     node tools/qa/titulo-visual.mjs           las dos cosas
     node tools/qa/titulo-visual.mjs zoom      solo la comparación
     node tools/qa/titulo-visual.mjs desarme   solo el desarme

   · zoom     — recorte de "GE" a 4 aumentos, con el TEXTO REAL debajo.
                Arriba las dos capas del hero, abajo la tipografía del
                navegador: si se distinguen, algo se rompió.
   · desarme  — el desarme en CUATRO posiciones de cursor, más el reposo.
                Cuatro y no una: los defectos del vaciado (cuadros, hilos
                de letra sin borrar) no salen en todas las posiciones, y
                dar una sola por buena ya costó una entrega devuelta.

   Las imágenes van a tools/qa/salida/.
   ============================================================ */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, 'salida');
const URL = process.env.QA_URL || 'http://127.0.0.1:4300/';

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
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'];

async function abrir(browser, dpr) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: dpr });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
  await espera(7000);
  return page;
}

/* ---- comparación a 4 aumentos contra el texto real ---------------- */
async function zoom(browser) {
  const page = await abrir(browser, 2);
  await page.mouse.move(700, 880);   /* centrado en x: el parallax queda ~0 */
  await espera(2500);

  const caja = await page.evaluate(() => {
    const nodo = document.querySelector('.hero-word span').firstChild;
    const r = document.createRange();
    r.setStart(nodo, 3); r.setEnd(nodo, 5);          /* "GE" de BERGERAC */
    const rc = r.getBoundingClientRect();
    return { x: Math.round(rc.left) - 4, y: Math.round(rc.top) - 4,
             width: Math.round(rc.width) + 8, height: Math.round(rc.height) + 8 };
  });

  const conParticulas = await page.screenshot({ clip: caja });
  /* el texto real: se apaga el lienzo y se enciende el h1 */
  await page.evaluate(() => {
    document.querySelector('.hero-escena canvas').style.opacity = '0';
    document.querySelector('.hero-word').style.opacity = '1';
  });
  await espera(500);
  const real = await page.screenshot({ clip: caja });

  const png = await page.evaluate(async (a, b) => {
    const cargar = (b64) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const ia = await cargar(a), ib = await cargar(b);
    const Z = 4, HUECO = 16;
    const c = document.createElement('canvas');
    c.width = ia.width * Z; c.height = ia.height * Z * 2 + HUECO;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;               /* sin suavizar: se trata de ver el píxel */
    x.fillStyle = '#00a1ff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(ia, 0, 0, c.width, ia.height * Z);
    x.fillStyle = '#fff'; x.fillRect(0, ia.height * Z, c.width, HUECO);
    x.drawImage(ib, 0, ia.height * Z + HUECO, c.width, ib.height * Z);
    return c.toDataURL('image/png');
  }, conParticulas.toString('base64'), real.toString('base64'));

  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(SALIDA, 'titulo-zoom.png'), Buffer.from(png.split(',')[1], 'base64'));
  console.log('  titulo-zoom.png    arriba: el hero · abajo: el texto real');
  await page.close();
}

/* ---- el desarme en cuatro posiciones ------------------------------ */
async function desarme(browser) {
  const page = await abrir(browser, 1);
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  const clip = { x: 40, y: 110, width: 1320, height: 230 };
  const puntos = [[330, 215], [640, 235], [950, 205], [1180, 230]];

  let n = 0;
  for (const [x, y] of puntos) {
    for (let i = 0; i < 16; i++) {
      await page.mouse.move(x - 300 + i * 20, y + Math.sin(i / 3) * 20);
      await espera(30);
    }
    await espera(150);
    await page.screenshot({ path: join(SALIDA, `titulo-desarme-${++n}.png`), clip });
    /* Tras un barrido concentrado la palabra tarda ~9s en recomponerse
       (muelle 0.024). Con menos, el "reposo" sale a medias y parece un
       fallo que no lo es. */
    await page.mouse.move(700, 875);
    await espera(10000);
  }
  await espera(2000);
  await page.screenshot({ path: join(SALIDA, 'titulo-reposo.png'), clip });
  const d = await page.evaluate(() => window.__particulas?.maxDesplazamiento() ?? -1);
  console.log(`  titulo-desarme-1..4.png + titulo-reposo.png   ·  vuelta: ${d.toFixed(2)}px`);
  if (errores.length) console.log('  ERRORES:', errores.slice(0, 3).join(' | '));
  await page.close();
}

/* ---- ejecución ---------------------------------------------------- */
const cual = process.argv[2];
console.log('\n[titulo-visual] capturas en tools/qa/salida/');
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ARGS });
try {
  if (!cual || cual === 'zoom') await zoom(browser);
  if (!cual || cual === 'desarme') await desarme(browser);
} finally {
  await browser.close();
}
console.log('');
