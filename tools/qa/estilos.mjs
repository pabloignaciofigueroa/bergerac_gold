/* ============================================================
   QA — COMPARACIÓN DE ESTILOS COMPUTADOS

   La herramienta correcta para tocar CSS. Recorre el DOM de las dos
   versiones y compara, elemento por elemento, lo que el navegador ha
   decidido finalmente aplicar. Si al trocear sections.css se rompe el
   orden de la cascada, aquí sale el elemento y la propiedad exactos.

   Por qué esto y no comparar píxeles: la comparación de imágenes de
   `paridad.mjs` tiene ruido propio (reveals, cinta infinita, el <h1> que
   dimensiona hero-fit por JS) y en móvil llegó a un 3,64% que hacía
   imposible dar un veredicto. Los estilos computados son deterministas:
   dos DOM idénticos con el mismo CSS dan exactamente lo mismo, siempre.

   Uso (con las dos versiones sirviendo):
     node tools/qa/estilos.mjs http://127.0.0.1:4300 http://127.0.0.1:4310

   Se comparan los dos anchos. Los elementos se emparejan por posición en
   el recorrido: el markup ya se verifica idéntico aparte, así que si el
   número de elementos no coincide, eso ya es el fallo.
   ============================================================ */

import { existsSync } from 'node:fs';

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
if (!chrome) { console.error('No encuentro Chrome.'); process.exit(1); }

const A = process.argv[2] || 'http://127.0.0.1:4300';
const B = process.argv[3] || 'http://127.0.0.1:4310';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'];
const ANCHOS = [[1440, 900], [390, 844]];

/* dos valores que quieren decir lo mismo escritos distinto */
const EQUIV = [['0% 0%', '0px 0px'], ['0px 0px', '0% 0%']];
const equivale = (x, y) => x === y || EQUIV.some(([u, v]) => x === u && y === v);

let fallos = 0;
const ok = (cond, etiqueta, detalle = '') => {
  if (!cond) fallos++;
  console.log(`  ${cond ? 'OK  ' : 'FALLA'}  ${etiqueta}${detalle ? '  ·  ' + detalle : ''}`);
};

async function leer(browser, url, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, isMobile: w < 500, hasTouch: w < 500 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await espera(7000);
  return page.evaluate(() => {
    /* NO se congela ni se limpia nada, y esto costó un diagnóstico falso.
       El primer intento mataba los ScrollTrigger y hacía
       gsap.set('*', {clearProps:'all'}) para tener un estado estable. Eso
       borra estilos que GSAP ha puesto legítimamente —alturas de
       desplegables, por ejemplo— y CUÁLES borra depende de qué había
       corrido: el comparador acusó un nav de 39px contra 21px y un header
       de 471px, y en la página real los dos miden 26px y son idénticos.
       El instrumento fabricaba el defecto que decía encontrar.
       Se mide la página tal cual, asentada, y se dejan fuera las
       propiedades que la animación toca. */

    /* Propiedades que dependen del momento o del hardware y no de la hoja:
       se dejan fuera para que el resultado sea determinista. */
    const FUERA = new Set([
      'transform', 'opacity', 'visibility', 'transition', 'transition-duration',
      'transition-property', 'transition-timing-function', 'transition-delay',
      'animation', 'animation-name', 'animation-duration', 'animation-play-state',
      'will-change', 'perspective-origin', 'transform-origin', 'offset-path',
      'view-transition-name', 'content-visibility',
    ]);

    /* Fuera todo lo que genera el JS en tiempo de ejecución: SplitText parte
       los titulares en <div class="line"> y textroll en un <span> por letra,
       y CUÁNTOS salen depende de cuándo corrió respecto a las fuentes. Eso
       hacía que el recuento de elementos ni siquiera coincidiera (938 vs
       924) por un motivo que no tiene nada que ver con la hoja de estilos.
       Lo que se compara aquí es el CSS sobre el DOM que viene del HTML. */
    const GENERADO = '.line, .roll-char, .roll-window, .lab-wipe__curtain, .lab-wipe, .loader-acto, .loader-pct, .lab-marquee__track';
    const elementos = [...document.querySelectorAll('body *')]
      .filter((e) => !e.closest('[data-transition]'))     /* la cortina va y viene */
      .filter((e) => !e.matches(GENERADO) && !e.closest(GENERADO))
      /* El marquee se clona a sí mismo hasta cubrir el ancho: cuántas copias
         salen depende del ancho medido, y eso cambia con las fuentes. Y el
         <script> del bundle solo existe en la versión con build. */
      .filter((e) => e.tagName !== 'SCRIPT' && !e.closest('[data-marquee]'));

    const out = [];
    for (const el of elementos) {
      const cs = getComputedStyle(el);
      const props = {};
      for (let i = 0; i < cs.length; i++) {
        const p = cs[i];
        if (FUERA.has(p) || p.startsWith('--')) continue;
        props[p] = cs.getPropertyValue(p);
      }
      const r = el.getBoundingClientRect();
      out.push({
        via: el.tagName + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
        caja: [Math.round(r.width), Math.round(r.height)],
        props,
      });
    }
    return out;
  }).finally(() => page.close());
}

console.log(`\n[estilos]  A = ${A}\n           B = ${B}`);
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ARGS });
try {
  for (const [w, h] of ANCHOS) {
    console.log(`\n  ── ${w}x${h} ──`);
    const a = await leer(browser, A, w, h);
    const b = await leer(browser, B, w, h);
    ok(a.length === b.length, `${w}px · mismo número de elementos`, `A ${a.length} · B ${b.length}`);
    if (a.length !== b.length) continue;

    const difProps = [];
    const difCaja = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i].caja[0] !== b[i].caja[0] || a[i].caja[1] !== b[i].caja[1]) {
        difCaja.push(`${a[i].via}  ${a[i].caja.join('x')} → ${b[i].caja.join('x')}`);
      }
      for (const p in a[i].props) {
        /* Equivalencias de ESCRITURA, no de efecto: el minificador de CSS
           normaliza algunas formas (0% 0% pasa a 0px 0px) y el navegador las
           devuelve tal cual se escribieron. Significan lo mismo. */
        if (equivale(a[i].props[p], b[i].props[p])) continue;
        if (a[i].props[p] !== b[i].props[p]) {
          difProps.push(`${a[i].via}  ·  ${p}:  ${a[i].props[p]}  →  ${b[i].props[p]}`);
        }
      }
    }
    ok(difCaja.length === 0, `${w}px · mismas cajas`, difCaja.length ? `${difCaja.length} distintas` : '');
    difCaja.slice(0, 8).forEach((d) => console.log('        ' + d));
    ok(difProps.length === 0, `${w}px · mismos estilos computados`, difProps.length ? `${difProps.length} propiedades distintas` : '');
    difProps.slice(0, 12).forEach((d) => console.log('        ' + d));
  }
} finally {
  await browser.close();
}
console.log(fallos === 0 ? '\nEl CSS aplica exactamente igual.\n' : `\n${fallos} comprobación(es) fallaron.\n`);
process.exitCode = fallos === 0 ? 0 : 1;
