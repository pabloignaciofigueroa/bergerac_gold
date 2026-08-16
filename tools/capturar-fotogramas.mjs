/* ============================================================
   FASE 5 — CAPTURA DE LOS FOTOGRAMAS FIJOS

   Los fotogramas NO son una tercera versión de Bergerac. Son la red visual
   para tres casos concretos: se pierde el contexto, la escena no llega a
   arrancar, o el visitante pidió menos movimiento. Nada más.

   POR QUÉ SE CAPTURAN DE LA ESCENA REAL Y NO SE DIBUJAN APARTE. Dibujar una
   ilustración "parecida" sería inventar una segunda dirección de arte, que
   es justo lo que no queremos: el fotograma tiene que ser el instrumento,
   detenido. Así que se le piden al propio WebGL los píxeles que acaba de
   pintar.

   CON TRANSPARENCIA, y eso importa. Las tres escenas se crean con
   `alpha: true`, así que el PNG sale con canal alfa y el fondo lo sigue
   poniendo el CSS. Consecuencia: la bisagra cromática del Método —morado
   hasta DEFINIR, fucsia desde CONSTRUIR— sigue viva por debajo del
   fotograma, y el fotograma no la congela.

   `?fotograma=1` enciende `preserveDrawingBuffer`. Sin eso el búfer se
   limpia tras pintar y `toDataURL()` devuelve un PNG vacío.

   Uso:  node tools/capturar-fotogramas.mjs
   Deja PNG y WebP en qa-out/fotogramas/ para revisarlos ANTES de integrarlos.
   ============================================================ */

import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const puppeteer = (await import('puppeteer-core')).default;
const sharp = (await import('sharp')).default;
const chrome = CHROMES.find(existsSync);
if (!chrome) { console.error('No encuentro Chrome.'); process.exit(1); }

const BASE = process.env.QA_URL || 'http://127.0.0.1:4310/';
const URL = `${BASE}?calidad=full&fotograma=1`;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const DIR = 'qa-out/fotogramas';
mkdirSync(DIR, { recursive: true });

/* Las CUATRO etapas del Método, con su vista y su luz.

   La bisagra cromática cae en CONSTRUIR: las dos primeras se capturan con la
   luz morada y las dos últimas con la fucsia, así cada fotograma se lleva ya
   su propia iluminación y el relato de transformación se sostiene.

   `idx` es el índice dentro de DEFAULT_VIEWS de metodo.js, que incluye dos
   "holds" —uno al principio y otro al final— además de las siete vistas:
   Cerrado, Cerrado·hold, Abrir, ESTUDIAR, DEFINIR, CONSTRUIR, AFINAR,
   Resuelto, Resuelto·hold. Por eso 3, 4, 5 y 6 y no 2, 3, 4 y 5: el
   `data-view` del HTML cuenta el progreso de la escultura, que es otra
   numeración. Se comprueba contra los nombres que devuelve la página. */
const ETAPAS = [
  { slug: 'estudiar',  idx: 3, nombre: 'Estudiar',  tema: 'purple' },
  { slug: 'definir',   idx: 4, nombre: 'Definir',   tema: 'purple' },
  { slug: 'construir', idx: 5, nombre: 'Construir', tema: 'fuchsia' },
  { slug: 'afinar',    idx: 6, nombre: 'Afinar',    tema: 'fuchsia' },
];

const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 120)));

/* DPR 2: el fotograma tiene que aguantar una pantalla retina, porque va a
   ocupar el sitio de una escena que sí se dibujaba a esa resolución. */
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
console.log(`\n[fotogramas]  ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
await espera(8000);

/* Saca los píxeles del lienzo tal cual, con alfa. */
async function pixeles(sel) {
  return page.evaluate((s) => {
    const c = document.querySelector(s);
    if (!c) return null;
    try { return { url: c.toDataURL('image/png'), w: c.width, h: c.height }; }
    catch (e) { return { error: e.message }; }
  }, sel);
}

async function guardar(nombre, dato) {
  if (!dato) { console.log(`  FALLA  ${nombre}: no encuentro el lienzo`); return null; }
  if (dato.error) { console.log(`  FALLA  ${nombre}: ${dato.error}`); return null; }
  const png = Buffer.from(dato.url.split(',')[1], 'base64');
  const rutaPng = join(DIR, nombre + '.png');
  writeFileSync(rutaPng, png);

  /* WebP con alfa. Se reencuadra a 1600 de ancho: es un fondo detenido, no
     hay que leer texto en él, y la diferencia de peso es enorme. */
  const rutaWebp = join(DIR, nombre + '.webp');
  await sharp(png).resize({ width: Math.min(1600, dato.w), withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 90 }).toFile(rutaWebp);

  const kb = (p) => Math.round(statSync(p).size / 1024);
  console.log(`  OK  ${nombre.padEnd(18)} ${dato.w}x${dato.h}  ·  png ${kb(rutaPng)} KB → webp ${kb(rutaWebp)} KB`);
  return { png: kb(rutaPng), webp: kb(rutaWebp) };
}

/* Coloca la página en una Y absoluta y espera a que la escena se asiente. */
async function ir(y, ms = 2500) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await espera(ms);
}

/* ---------- ISLA ---------- */
console.log('\n  ── Estudio · la isla ──');
{
  const y = await page.evaluate(() => {
    const el = document.querySelector('.estudio__canvas-holder');
    const r = el.getBoundingClientRect();
    return Math.round(r.top + window.scrollY + r.height * 0.5 - window.innerHeight * 0.5);
  });
  /* en reposo: sin hover (no se mueve el ratón) y sin el estado de mapa,
     que es el que da el clic. Es la vista en relieve, la de partida. */
  await ir(y, 4000);
  await guardar('isla', await pixeles('.estudio__canvas'));
  await page.screenshot({ path: join(DIR, 'contexto-isla.png') });
}

/* ---------- MÉTODO, las cuatro etapas ---------- */
console.log('\n  ── Método · las cuatro etapas ──');
{
  /* La sección tiene que estar en pantalla para que la escena esté viva y
     pintando; lo que ya no se adivina es el encuadre. */
  const y = await page.evaluate(() => {
    const el = document.querySelector('#metodo');
    return Math.round(el.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.5);
  });
  await ir(y, 3000);

  const nombres = await page.evaluate(() => document.querySelector('#metodo')?._vistas || null);
  if (!nombres) {
    console.log('  FALLA  la costura de captura no está: ¿falta ?fotograma=1?');
  } else {
    console.log('  vistas de la escultura:', nombres.join(' · '));
    for (const e of ETAPAS) {
      if (nombres[e.idx] !== e.nombre) {
        console.log(`  FALLA  ${e.slug}: el índice ${e.idx} es "${nombres[e.idx]}", esperaba "${e.nombre}"`);
        continue;
      }
      /* Primero se coloca la página en el anclaje de lectura de ESA etapa,
         para que su copy sea el que está en pantalla; después se fuerza el
         encuadre exacto. Así la imagen de revisión enseña lo que se verá de
         verdad: fotograma y texto juntos. */
      const yEtapa = await page.evaluate((slug) => {
        const el = document.querySelector(`.metodo__etapa[data-etapa="${slug}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return Math.round(r.top + window.scrollY + r.height * 0.5 - window.innerHeight * 0.5);
      }, e.slug);
      if (yEtapa != null) await ir(yEtapa, 2000);

      await page.evaluate((idx, tema) => {
        const s = document.querySelector('#metodo');
        s._tema(tema);
        s._vista(idx);
      }, e.idx, e.tema);
      await espera(2000);   /* la escultura reconstruye sus costillas */
      await page.evaluate((idx) => document.querySelector('#metodo')._vista(idx), e.idx);
      await espera(400);
      await guardar(`metodo-${e.slug}`, await pixeles('.metodo__canvas'));
      /* EN CONTEXTO: el fotograma va a convivir con el copy de su etapa, y
         la escultura está desplazada a un lado justamente para dejarle
         sitio. Mirarlo desnudo hace pensar que está recortado. */
      await page.screenshot({ path: join(DIR, `contexto-metodo-${e.slug}.png`) });
    }
  }
}

await browser.close();
console.log(`\n  Están en ${DIR}/  ·  a revisar ANTES de integrarlos.\n`);
