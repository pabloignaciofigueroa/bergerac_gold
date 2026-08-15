/* ============================================================
   FASE 1 DE LA MIGRACIÓN — genera src/pages/index.astro desde index.html

   Se hace con un script y no a mano a propósito: son 621 líneas y
   transcribirlas es pedir una errata que luego cuesta media tarde
   encontrar. Además queda reproducible: si hay que rehacer la fase, se
   vuelve a lanzar.

   Qué toca, y por qué cada cosa:

   · El <style> crítico y los <script> en línea llevan `is:inline`. Sin eso
     Astro los procesa y los puede mover, y el orden del bloque crítico del
     loader es justamente lo que impide que el sitio se vea antes que la
     cortina. Hay una prueba (`arranque`) que lo vigila.
   · Fuera el importmap y los <script defer> del vendor: three, GSAP y Lenis
     vienen ahora de npm y los empaqueta Vite. Ahí está el tree-shaking.
   · main.js e instrumentos.js se sustituyen por un único <script> que
     importa src/scripts/entrada.js, que hace de puente de globales.
   · Las rutas de assets pasan a absolutas (/assets/...). Con build.format
     'file' la relativa también valdría, pero la absoluta no depende de en
     qué nivel acabe la página.
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

/* ---- 1. partir el documento -------------------------------------- */
const mHead = html.match(/<head>([\s\S]*?)<\/head>/);
const mBody = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/);
if (!mHead || !mBody) { console.error('No reconozco la estructura de index.html'); process.exit(1); }
let head = mHead[1];
const bodyAttrs = mBody[1];
let body = mBody[2];

const mHtml = html.match(/<html([^>]*)>/);
const htmlAttrs = mHtml ? mHtml[1] : ' lang="es"';

/* ---- 2. head: fuera lo que ahora resuelve el build ---------------- */
head = head.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/g, '');
head = head.replace(/<script src="assets\/js\/vendor\/[^"]*"[^>]*><\/script>\s*/g, '');
head = head.replace(/<script type="module" src="assets\/js\/(main|instrumentos)\.js"><\/script>\s*/g, '');

/* ---- 3. body: el arranque pasa por la entrada única --------------- */
body = body.replace(/<script type="module" src="assets\/js\/(main|instrumentos)\.js"><\/script>\s*/g, '');

/* ---- 4. `is:inline` en todo <style> y <script> sin src ------------ */
const enLinea = (t) => t
  .replace(/<style>/g, '<style is:inline>')
  .replace(/<script>/g, '<script is:inline>');
head = enLinea(head);
body = enLinea(body);

/* ---- 5. rutas de assets a absolutas ------------------------------- */
const rutas = (t) => t.replace(/(href|src)="assets\//g, '$1="/assets/');
head = rutas(head);
body = rutas(body);

/* ---- 6. escribir el .astro ---------------------------------------- */
const salida = `---
/* GENERADO por tools/migrar-a-astro.mjs en la fase 1 de la migración.
   Es el index.html de siempre, servido por Astro y con el vendor sustituido
   por dependencias de npm. La fase 2 lo trocea en componentes; hasta
   entonces se deja de una pieza a propósito, para que la puerta de paridad
   compare generador contra generador y no dos cosas distintas a la vez. */
---
<!DOCTYPE html>
<html${htmlAttrs}>
<head>${head}</head>
<body${bodyAttrs}>${body}
<script>
  /* Entrada única: monta los globales que el código espera y arranca.
     Va sin is:inline a propósito — así lo empaqueta Vite y three entra
     con tree-shaking, que es la razón de haber pasado a npm. */
  import '../scripts/entrada.js';
</script>
</body>
</html>
`;

const destino = join(RAIZ, 'src', 'pages');
if (!existsSync(destino)) mkdirSync(destino, { recursive: true });
writeFileSync(join(destino, 'index.astro'), salida);

console.log('src/pages/index.astro generado');
console.log('  líneas:', salida.split('\n').length);
console.log('  importmap eliminado:', !/importmap/.test(salida));
console.log('  vendor eliminado:   ', !/vendor\//.test(salida));
console.log('  is:inline aplicado: ', (salida.match(/is:inline/g) || []).length, 'bloques');
console.log('  rutas /assets/:     ', (salida.match(/"\/assets\//g) || []).length);
