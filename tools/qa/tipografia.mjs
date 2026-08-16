/* ============================================================
   TIPOGRAFÍA — qué talla y qué tracking tiene cada titular

   No es una prueba: es un informe. Mide en el navegador porque las tallas
   salen de `clamp()` y el tracking está declarado en `em` en sitios
   distintos, así que leerlo del CSS no dice lo que se ve.

   SE MIDE EN PROPORCIÓN, NO EN PÍXELES. Un mismo recorte en píxeles no
   aprieta lo mismo a tallas distintas: al agrandar una palabra, el hueco
   natural entre letras crece con ella. Los píxeles solo comparan bien a
   igualdad de talla, y aquí las tallas van de 27 a 216 px.

   Lo que compara bien es el `em`, que es proporción pura.

   NO ENTRA el BERGERAC del hero: las partículas muestrean esa caja para
   colocarse, así que su tracking no es una decisión revisable.

   La referencia la puso la propia página: los titulares que se leen bien
   están en -.015em.

   Uso:
     node tools/qa/tipografia.mjs            (1440 y 390)
     node tools/qa/tipografia.mjs 1440
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
const ANCHOS = process.argv[2] ? [Number(process.argv[2])] : [1440, 390];

const SECCIONES = {
  inicio: '01 · Hero', estudio: '02 · Estudio', partida: '03 · Punto de partida',
  metodo: '04 · Método', proyectos: '05 · Casos', contacto: '06 · Contacto',
};

const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox'],
});

for (const ancho of ANCHOS) {
  const page = await browser.newPage();
  await page.setViewport({ width: ancho, height: ancho < 600 ? 844 : 900, deviceScaleFactor: 1 });
  await page.goto(BASE + '?calidad=full', { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(6000);
  /* recorrido para que nada quede sin medir por estar oculto tras un reveal */
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
    window.scrollTo(0, 0);
  });
  await espera(2500);

  const filas = await page.evaluate(() => {
    /* ¿usa la slab de marca? */
    const esSlab = (ff) => /balimo|demodisplay/i.test(ff);

    /* Mide el ancho del mismo texto SIN tracking, con la misma fuente y
       talla, en un nodo fuera de pantalla. La diferencia es el apriete. */
    const sonda = document.createElement('span');
    sonda.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:pre;visibility:hidden';
    document.body.appendChild(sonda);
    const anchoSuelto = (texto, cs) => {
      sonda.style.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
      sonda.style.letterSpacing = 'normal';
      sonda.style.textTransform = cs.textTransform;
      sonda.style.fontStretch = cs.fontStretch;
      sonda.textContent = texto;
      return sonda.getBoundingClientRect().width;
    };

    const out = [];
    const vistos = new Set();
    for (const el of document.querySelectorAll('h1,h2,h3,p,span,div')) {
      const cs = getComputedStyle(el);
      if (!esSlab(cs.fontFamily)) continue;
      /* solo el nodo más externo con esa fuente: si no, cada .line y cada
         .roll-char de SplitText saldría repetido */
      if (el.parentElement && esSlab(getComputedStyle(el.parentElement).fontFamily)) continue;
      /* FUERA el BERGERAC del hero. No es una decisión tipográfica que se
         pueda revisar: las partículas muestrean ESA caja —fuente, talla,
         tracking y posición que le da hero-fit.js— para colocarse. Cambiarle
         el tracking movería el instrumento entero. No se toca, así que no
         cuenta como referencia ni como problema. */
      if (el.closest('.hero-word')) continue;

      const texto = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!texto || texto.length < 2) continue;
      const px = parseFloat(cs.fontSize);
      if (px < 18) continue;                       /* antetítulos y menudencias fuera */

      const sec = el.closest('section')?.id || '—';
      const clave = sec + '|' + texto.slice(0, 40);
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
      /* una sola línea del texto, para que la comparación sea justa */
      const linea = texto.split(/(?<=\.)\s/)[0].slice(0, 60);
      const suelto = anchoSuelto(linea, cs);
      const huecos = Math.max(1, linea.length - 1);

      out.push({
        sec,
        clase: (el.className || el.tagName).toString().split(' ').slice(0, 2).join(' '),
        texto: texto.slice(0, 34),
        px: +px.toFixed(1),
        ls: +ls.toFixed(2),
        em: +(ls / px).toFixed(4),
        alto: +(parseFloat(cs.lineHeight) / px).toFixed(2),
        /* cuánto se come de cada hueco, en px, medido de verdad */
        apriete: +(suelto ? (ls) : 0).toFixed(2),
        anchoSuelto: Math.round(suelto),
        huecos,
      });
    }
    sonda.remove();
    return out;
  });

  console.log(`\n\n════ ${ancho} px ════════════════════════════════════════════════`);
  let secActual = null;
  for (const f of filas.sort((a, b) => Object.keys(SECCIONES).indexOf(a.sec) - Object.keys(SECCIONES).indexOf(b.sec) || b.px - a.px)) {
    if (f.sec !== secActual) {
      secActual = f.sec;
      console.log(`\n  ${SECCIONES[f.sec] || f.sec}`);
      console.log('    tracking    talla   interlínea   texto');
    }
    const em = f.em === 0 ? '0' : (f.em > 0 ? '+' : '') + f.em.toFixed(3).replace('0.', '.');
    /* El umbral no sale de un manual: lo puso la propia página. Lo que se
       lee bien está en -.010/-.015em; en -.020/-.025 empieza a cerrar, y
       desde -.030 los perfiles de la slab se sueldan. */
    const aviso = f.em <= -0.030 ? '  ← APRETADO' : (f.em <= -0.020 ? '  ← al límite' : '');
    console.log(`    ${em.padStart(7)}em   ${String(f.px).padStart(5)}   ${String(f.alto).padStart(6)}       ${f.texto}${aviso}`);
  }
  await page.close();
}

console.log('\n\n  El tracking va en PROPORCIÓN (em): es lo único que compara bien entre');
console.log('  tallas distintas. La escala la puso la propia página, no un manual:');
console.log('    -.015em          se lee bien');
console.log('    -.020 / -.025em  al límite');
console.log('    -.030em o más    apretado: los perfiles de la slab se sueldan');
console.log('\n  El BERGERAC del hero queda fuera del estudio: no se toca.\n');
await browser.close();
