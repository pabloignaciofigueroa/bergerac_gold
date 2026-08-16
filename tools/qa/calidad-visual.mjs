/* ============================================================
   QA — FULL vs REDUCED, PARA MIRARLO

   No es una prueba: no dice OK ni FALLA. Captura los cuatro instrumentos
   en los dos niveles, en la misma máquina y el mismo encuadre, para que la
   decisión la tome el ojo y no un número.

   Lo mismo se puede ver en vivo, que es mejor:
     http://127.0.0.1:4310/?calidad=full
     http://127.0.0.1:4310/?calidad=reduced

   Uso: node tools/qa/calidad-visual.mjs
   Deja las imágenes en qa-out/calidad/
   ============================================================ */

import { existsSync, mkdirSync } from 'node:fs';

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
const DIR = 'qa-out/calidad';
mkdirSync(DIR, { recursive: true });

const HUECOS = [
  ['hero', '.hero-escena'],
  ['estudio', '.estudio__canvas-holder'],
  ['metodo', '.metodo__stage'],
  ['contacto', '.contacto-escena'],
];

async function capturar(nivel) {
  const browser = await puppeteer.launch({
    executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE}?calidad=${nivel}`, { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(9000);

  /* Posiciones ABSOLUTAS, no scrollIntoView. El Método va con `pin`: su
     escena depende del progreso del scroll, así que dos pasadas que paran
     en sitios ligeramente distintos capturan estados distintos de la
     escultura y la comparación no vale nada. Con la Y calculada desde el
     tope —el layout es idéntico en los dos niveles, 21799 px— las dos
     pasadas caen exactamente en el mismo punto. */
  const anclas = await page.evaluate((huecos) => {
    window.scrollTo(0, 0);
    return Object.fromEntries(huecos.map(([n, s]) => {
      const el = document.querySelector(s);
      if (!el) return [n, 0];
      const r = el.getBoundingClientRect();
      return [n, Math.round(r.top + window.scrollY + r.height * 0.5 - window.innerHeight * 0.5)];
    }));
  }, HUECOS);

  const datos = {};
  for (const [nombre, sel] of HUECOS) {
    await page.evaluate((y) => window.scrollTo(0, Math.max(0, y)), anclas[nombre]);
    await espera(3500);
    const el = await page.$(sel);
    if (el) { try { await el.screenshot({ path: `${DIR}/${nombre}-${nivel}.png` }); } catch {} }
    datos[nombre] = await page.evaluate((s) => {
      const c = document.querySelector(s)?.querySelector('canvas');
      if (!c) return null;
      const caja = c.getBoundingClientRect();
      return { ancho: c.width, ratio: +(c.width / (caja.width || 1)).toFixed(2) };
    }, sel);
  }
  const particulas = await page.evaluate(() => window.__particulas?.palabra?.() ?? null);
  const niveles = await page.evaluate(() =>
    Object.fromEntries(['hero', 'estudio', 'metodo', 'contacto'].map((i) => [i, window.__calidad.nivelDe(i)])));
  await browser.close();
  return { datos, particulas, niveles };
}

console.log(`\n[calidad-visual]  ${BASE}`);
const full = await capturar('full');
const red = await capturar('reduced');

console.log('\n  instrumento   FULL              REDUCED');
for (const [n] of HUECOS) {
  const a = full.datos[n], b = red.datos[n];
  const fmt = (x) => (x ? `${String(x.ancho).padStart(4)}px ·ratio ${x.ratio}` : '     — sin lienzo');
  console.log(`  ${n.padEnd(12)}  ${fmt(a)}   ${fmt(b)}`);
}
console.log(`\n  partículas del título   ${full.particulas} → ${red.particulas}` +
  (full.particulas && red.particulas ? `   (${Math.round((1 - red.particulas / full.particulas) * 100)} % menos)` : ''));
console.log('  niveles FULL    ', JSON.stringify(full.niveles));
console.log('  niveles REDUCED ', JSON.stringify(red.niveles));
console.log(`\n  imágenes en ${DIR}/  ·  <nombre>-full.png junto a <nombre>-reduced.png\n`);
