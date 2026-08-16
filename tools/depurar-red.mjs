/* ============================================================
   SEGUNDA EVIDENCIA: QUÉ PIDE EL NAVEGADOR DE VERDAD

   El análisis de referencias mira el código. Esto mira la realidad: se
   recorre la página entera en los tres tamaños, se abren los desplegables,
   se abre el menú, se pincha la isla y se pasa el cursor por los casos, y se
   anota CADA archivo que el navegador llega a pedir.

   Sirve para las dos direcciones:
     · si algo se pide y el análisis lo daba por muerto, el análisis se
       equivocaba y ese archivo NO se toca
     · si algo no se pide nunca, es un candidato más firme

   Ojo con leerlo al revés: que un archivo no se pida NO demuestra que sobre
   —puede estar en una rama que esta prueba no recorre—. Por eso solo se
   mueve lo que fallan las DOS pruebas, y aun así se vuelve a pasar el QA.

   Uso: node tools/depurar-red.mjs   (con el build sirviéndose)
   ============================================================ */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

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
const PANTALLAS = [[1440, 900], [768, 1024], [390, 844]];

const pedidos = new Map();       /* ruta -> estado */

const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox'],
});

for (const [w, h] of PANTALLAS) {
  const page = await browser.newPage();
  page.on('response', (r) => {
    try {
      const u = new URL(r.url());
      if (u.origin !== new URL(BASE).origin) return;
      pedidos.set(u.pathname, r.status());
    } catch { }
  });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(7000);

  /* recorrido parando en cada sección, que es lo que despierta las cargas
     perezosas (escenas, vídeos, imágenes) */
  for (const s of ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto']) {
    await page.evaluate((sel) => document.querySelector(sel)
      ?.scrollIntoView({ block: 'center', behavior: 'instant' }), s);
    await espera(2600);
  }

  /* interacciones que pueden pedir cosas nuevas */
  await page.evaluate(() => {
    document.querySelectorAll('[data-plegable] .plegable-cabeza').forEach((b) => b.click());
    document.querySelector('.menu-toggle')?.click();
  });
  await espera(2500);
  await page.evaluate(() => {
    document.querySelector('.menu-cerrar')?.click();
    document.querySelector('.estudio__canvas')?.click();   /* isla: vista de mapa */
  });
  await espera(2500);
  /* cursor por los casos, por si algo se monta al hover */
  try { await page.hover('.casos-split .mundo'); await espera(1200); } catch { }

  await page.close();
  console.log(`  ${w}x${h}  ->  ${pedidos.size} rutas distintas acumuladas`);
}

await browser.close();

mkdirSync('qa-out/depurar', { recursive: true });
const lista = [...pedidos.entries()].map(([ruta, estado]) => ({ ruta, estado })).sort((a, b) => a.ruta.localeCompare(b.ruta));
writeFileSync('qa-out/depurar/red.json', JSON.stringify(lista, null, 1));

const fallos = lista.filter((x) => x.estado >= 400);
console.log(`\n  ${lista.length} rutas pedidas · ${fallos.length} con error`);
fallos.forEach((f) => console.log(`    ${f.estado}  ${f.ruta}`));

/* qué archivos de public/ NO se pidieron nunca */
const { readdirSync, statSync } = await import('node:fs');
const { join, relative } = await import('node:path');
const publicos = [];
(function rec(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) rec(p);
    else publicos.push('/' + relative('public', p).replace(/\\/g, '/'));
  }
})('public');

const nunca = publicos.filter((p) => !pedidos.has(p));
console.log(`\n  de public/: ${publicos.length} archivos, ${nunca.length} NO se piden nunca`);
nunca.forEach((p) => console.log(`    ${p}`));
console.log('\n  detalle en qa-out/depurar/red.json\n');
