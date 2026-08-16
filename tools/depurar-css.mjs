/* ============================================================
   DETECTOR DE CSS MUERTO

   Saca todos los selectores de la hoja publicada y prueba cada uno contra el
   DOM vivo, en los tres tamaños y en todos los estados que sabe alcanzar:
   con el menú abierto, con los desplegables abiertos, con la isla en modo
   mapa, con el cursor sobre un caso y con la página recorrida entera.

   CUIDADO CON LOS FALSOS POSITIVOS, que aquí borran cosas:

     · las pseudo-clases de estado (:hover, :focus-visible, :active) no se
       pueden consultar con querySelector — se les quita la pseudo-clase y se
       prueba el resto del selector
     · las pseudo-clases de MEDIA (prefers-reduced-motion, print) no se dan
       en un recorrido normal: sus reglas se marcan aparte, no como muertas
     · hay clases que solo aparecen unos milisegundos, puestas por JS. Por eso
       se recorre la página de verdad y se disparan las interacciones, en vez
       de leer el HTML estático.

   Un selector solo se declara muerto si NO encaja con nada en NINGUNO de los
   tres tamaños ni en ningún estado.

   Uso: node tools/depurar-css.mjs
   ============================================================ */

import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/* ---- selectores de las fuentes, no del bundle: así se sabe qué archivo
       y qué línea hay que tocar ---- */
const reglas = [];
(function rec(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { rec(p); continue; }
    if (!e.name.endsWith('.css')) continue;
    const archivo = p.replace(/\\/g, '/').replace('src/styles/', '');
    const txt = readFileSync(p, 'utf8');
    /* fuera comentarios y bloques @ que no llevan selectores propios */
    const limpio = txt.replace(/\/\*[\s\S]*?\*\//g, '');
    let media = null;
    let prof = 0;
    for (const linea of limpio.split('\n')) {
      const nLinea = limpio.slice(0, limpio.indexOf(linea)).split('\n').length;
      const m = /^\s*@media([^{]*)\{/.exec(linea);
      if (m) { media = m[1].trim(); prof++; continue; }
      if (/^\s*\}/.test(linea) && prof > 0 && !/[^\s}]/.test(linea.replace(/\}/g, ''))) { prof--; if (!prof) media = null; }
      const s = /^\s*([^@{}][^{}]*)\{/.exec(linea);
      if (!s) continue;
      const sel = s[1].trim();
      if (!sel || sel.startsWith('@') || /^\d/.test(sel)) continue;
      reglas.push({ archivo, selector: sel, media });
    }
  }
})('src/styles');

/* localizar la línea de verdad de cada selector */
for (const r of reglas) {
  const txt = readFileSync(join('src/styles', r.archivo), 'utf8');
  const i = txt.indexOf(r.selector + ' {') >= 0 ? txt.indexOf(r.selector + ' {') : txt.indexOf(r.selector);
  r.linea = i >= 0 ? txt.slice(0, i).split('\n').length : 0;
}

console.log(`\n  ${reglas.length} reglas en ${new Set(reglas.map((r) => r.archivo)).size} archivos`);

/* ---- probar contra el DOM vivo ---- */
const vivos = new Set();
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox'],
});

for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(BASE + '?calidad=full', { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(6000);

  const comprobar = async () => {
    const encajan = await page.evaluate((lista) => {
      const ok = [];
      for (const sel of lista) {
        /* quitar pseudo-clases de estado y pseudo-elementos: no se consultan */
        const limpio = sel
          .replace(/::[a-z-]+(\([^)]*\))?/g, '')
          .replace(/:(focus-within|focus-visible|hover|focus|active|target|visited|checked|disabled|placeholder-shown|user-invalid)(\([^)]*\))?/g, '')
          .trim();
        if (!limpio) { ok.push(sel); continue; }
        for (const parte of limpio.split(',')) {
          try { if (document.querySelector(parte.trim())) { ok.push(sel); break; } } catch { ok.push(sel); break; }
        }
      }
      return ok;
    }, reglas.map((r) => r.selector));
    encajan.forEach((s) => vivos.add(s));
  };

  await comprobar();
  /* recorrido completo, que despierta clases puestas por JS */
  for (const s of ['#inicio', '#estudio', '#partida', '#metodo', '#proyectos', '#contacto']) {
    await page.evaluate((x) => document.querySelector(x)?.scrollIntoView({ block: 'center', behavior: 'instant' }), s);
    await espera(2200);
    await comprobar();
  }
  /* estados que solo existen si se interactúa */
  await page.evaluate(() => {
    document.querySelectorAll('[data-plegable] .plegable-cabeza').forEach((b) => b.click());
    document.querySelector('.menu-toggle')?.click();
  });
  await espera(1800); await comprobar();
  await page.evaluate(() => {
    document.querySelector('.menu-cerrar')?.click();
    document.querySelector('.estudio__canvas')?.click();      /* isla → mapa */
    document.querySelector('[data-accion-escena]')?.click();  /* soltar el hero */
  });
  await espera(2200); await comprobar();
  try { await page.hover('.casos-split .mundo'); await espera(900); await comprobar(); } catch { }
  await page.close();
  console.log(`  ${w}x${h}  ->  ${vivos.size} selectores vistos vivos`);
}
await browser.close();

/* ---- veredicto ---- */
const REDUCIDO = /prefers-reduced-motion|print|forced-colors|hover: *none|pointer: *coarse/;

/* NO SON MUERTOS AUNQUE NO ENCAJEN. Un recorrido sano no puede alcanzarlos,
   y confundirlos con basura sería borrar justo las redes de seguridad:
     .escena-fija   solo aparece si falla WebGL o una escena no arranca
     .no-js         solo sin JavaScript
     [hidden]       estados de formulario enviado
     [data-theme]   temas que se aplican por atributo
     .cargando      la cortina, que se quita al terminar de cargar */
const RED_DE_SEGURIDAD = /escena-fija|\.no-js|\[hidden\]|\[data-theme|\.cargando|:not\(\.cargando\)/;

const muertos = [], soloEnMedia = [], salvados = [];
for (const r of reglas) {
  if (vivos.has(r.selector)) continue;
  if (RED_DE_SEGURIDAD.test(r.selector)) { salvados.push(r); continue; }
  (r.media && REDUCIDO.test(r.media) ? soloEnMedia : muertos).push(r);
}

mkdirSync('qa-out/depurar', { recursive: true });
writeFileSync('qa-out/depurar/css-muerto.json', JSON.stringify({ muertos, soloEnMedia, salvados }, null, 1));

console.log(`\n  encajan con algo   ${vivos.size}`);
console.log(`  en media especial  ${soloEnMedia.length}   (no se tocan: reduced-motion, print…)`);
console.log(`  redes de seguridad ${salvados.length}   (no se tocan: fallbacks, no-js, hidden…)`);
console.log(`  NO ENCAJAN NUNCA   ${muertos.length}\n`);

/* cuántos selectores tiene cada archivo EN TOTAL: si están casi todos
   muertos, lo que sobra es el archivo entero, no una regla suelta */
const totalPorArchivo = {};
for (const r of reglas) totalPorArchivo[r.archivo] = (totalPorArchivo[r.archivo] || 0) + 1;

const porArchivo = {};
for (const m of muertos) (porArchivo[m.archivo] ||= []).push(m);
for (const [a, v] of Object.entries(porArchivo).sort((x, y) => y[1].length - x[1].length)) {
  const tot = totalPorArchivo[a];
  const pct = Math.round(v.length / tot * 100);
  console.log(`  ${a.padEnd(30)} ${String(v.length).padStart(3)} de ${String(tot).padStart(3)} muertos  (${pct} %)${pct >= 90 ? '   <- SOBRA EL ARCHIVO ENTERO' : ''}`);
}
console.log('\n  detalle en qa-out/depurar/css-muerto.json\n');
