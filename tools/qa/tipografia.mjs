/* ============================================================
   TIPOGRAFÍA — qué talla y qué tracking tiene cada titular

   No es una prueba: es un informe. Mide en el navegador porque las tallas
   salen de `clamp()` y el tracking está declarado en `em` en sitios
   distintos, así que leerlo del CSS no dice lo que se ve.

   Lo que importa para juzgar si un titular respira:

   · el tracking en `em` es lo que se declara, pero lo que el ojo ve son
     PÍXELES. El mismo -0.035em son -1,4 px a 40 px y -5,3 px a 150 px.
   · la slab de marca es MUY ancha y sus perfiles casi no tienen aire
     lateral. En negativo y a talla grande, las letras se tocan.
   · por eso se mide también el APRIETE REAL: se rasteriza el mismo texto
     con `letter-spacing: normal` y se compara el ancho. La diferencia,
     repartida entre los huecos, es cuánto se ha comido de cada uno.

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
      console.log('    talla   tracking            interlínea   texto');
    }
    const em = f.em === 0 ? '   0' : (f.em > 0 ? '+' : '') + f.em.toFixed(3).replace('0.', '.');
    const pxls = f.ls === 0 ? '0 px' : `${f.ls > 0 ? '+' : ''}${f.ls.toFixed(1)} px`;
    /* marca los que se comen más de ~2,5 px por hueco: ahí es donde la slab
       empieza a pegar los perfiles */
    const aviso = f.ls <= -2.5 ? '  ← APRETADO' : (f.ls <= -1.6 ? '  ← justo' : '');
    console.log(`    ${String(f.px).padStart(5)}   ${em.padStart(6)}em = ${pxls.padStart(8)}   ${String(f.alto).padStart(5)}       ${f.texto}${aviso}`);
  }
  await page.close();
}

console.log('\n\n  «APRETADO» = se come 2,5 px o más de cada hueco entre letras.');
console.log('  La slab casi no tiene aire lateral propio, así que ese recorte');
console.log('  sale directamente del blanco entre perfiles.\n');
await browser.close();
