/* Extrae a src/data los bloques repetitivos de las secciones.

   OJO — LEE ESTO ANTES DE RELANZARLO. El generador parte del markup de los
   componentes, así que en cuanto una sección ya usa sus datos, ese markup
   ha desaparecido y volver a lanzarlo dejaría el archivo de datos VACÍO.
   Ya pasó una vez. Por eso ahora se lee de la copia de referencia del sitio
   anterior si se le pasa por argumento, y nunca se escribe un archivo con
   cero elementos.

   Uso:
     node tools/gen-datos.mjs [ruta/al/index.html de referencia]
   Sin argumento, lee de los componentes (solo sirve la primera vez). */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : null;
const leer = (p) => REF || readFileSync(join(RAIZ, p), 'utf8');

/* No escribir nunca un archivo de datos vacío: significaría que el markup
   de origen ya no está y estaríamos borrando el contenido del sitio. */
function guardar(ruta, cuerpo, n, que) {
  if (!n) { console.log(`  ${que}: 0 encontrados — NO se toca ${ruta}`); return false; }
  writeFileSync(join(RAIZ, ruta), cuerpo);
  console.log(`  ${ruta}  ·  ${n} ${que}`);
  return true;
}
const cita = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

if (!existsSync(join(RAIZ, 'src/data'))) mkdirSync(join(RAIZ, 'src/data'), { recursive: true });

/* ---------- PUNTO DE PARTIDA: cuatro estaciones ---------- */
const partida = leer('src/components/secciones/Partida.astro');
const estaciones = [...partida.matchAll(
  /<article class="partida__panel partida__station" data-station="(\d)">([\s\S]*?)<\/article>/g
)].map(([, num, b]) => ({
  station: num,
  num: b.match(/<span class="mono partida__num">([^<]*)<\/span>/)[1],
  problema: b.match(/<h3 class="partida__problem">([\s\S]*?)<\/h3>/)[1].trim(),
  foto: b.match(/src="([^"]*)"/)[1],
  parrafo: b.match(/<div class="partida__deep-inner">\s*<p>([\s\S]*?)<\/p>/)[1].trim(),
  etiqueta: b.match(/<span class="partida__deep-label">([^<]*)<\/span>/)[1],
  campos: b.match(/<strong>([^<]*)<\/strong>/)[1],
  accion: b.match(/<button[\s\S]*?<span>([^<]*)<\/span>/)[1],
}));

const cabeceraPartida = `/* ============================================================
   PUNTO DE PARTIDA — los cuatro problemas

   El copy es de Pablo: no se reescribe.
   Cada estación lleva su color de marca (01 morado, 02 fucsia, 03 amarillo,
   04 azul) y el CSS lo saca de \`data-station\`, así que el ORDEN de este
   array no se cambia sin mirar antes sections.css.
   Las fotos son de relleno heredadas de v9: sustituirlas por material real
   manteniendo los nombres (ver docs/ESTADO.md).
   ============================================================ */

export const estaciones = [
`;
writeFileSync(join(RAIZ, 'src/data/partida.js'), cabeceraPartida + estaciones.map((e) => (
  '  {\n' + Object.entries(e).map(([k, v]) => `    ${k}: ${cita(v)},`).join('\n') + '\n  },'
)).join('\n') + '\n];\n');

console.log('src/data/partida.js  ·', estaciones.length, 'estaciones');
estaciones.forEach((e) => console.log(`   ${e.num}  ${e.problema.slice(0, 46)}…`));

/* ---------- MÉTODO: cuatro etapas ---------- */
const metodo = leer('src/components/secciones/Metodo.astro');
const etapas = [...metodo.matchAll(
  /<article class="metodo__milestone metodo__etapa" data-view="(\d)" data-etapa="([^"]+)">([\s\S]*?)<\/article>/g
)].map(([, view, slug, b]) => {
  const campos = [...b.matchAll(/<div(?: class="metodo__result")?>\s*<h4>([^<]*)<\/h4>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g)]
    .map(([full, titulo, texto]) => ({
      titulo,
      texto: texto.trim(),
      resultado: full.includes('metodo__result'),
    }));
  return {
    view,
    slug,
    num: b.match(/<span class="metodo__num" aria-hidden="true">([^<]*)<\/span>/)[1],
    nombre: b.match(/<h3 class="metodo__name">([^<]*)<\/h3>/)[1],
    lead: b.match(/<p class="metodo__etapa-lead">([\s\S]*?)<\/p>/)[1].trim(),
    accion: b.match(/<button[\s\S]*?<span>([^<]*)<\/span>/)[1],
    panel: b.match(/aria-controls="([^"]*)"/)[1],
    campos,
  };
});

const cabeceraMetodo = `/* ============================================================
   MÉTODO — las cuatro etapas

   El copy es de Pablo: no se reescribe.
   \`view\` es el índice de vista de la escultura: metodo.js lo usa para
   saber qué encuadre corresponde a cada etapa, así que NO se toca sin
   mirar DEFAULT_VIEWS en sections/metodo.js.
   La bisagra cromática (morado → fucsia) salta en el anclaje de Construir.
   ============================================================ */

export const etapas = [
`;
const serializa = (e) => (
  '  {\n' +
  `    view: ${cita(e.view)},\n    slug: ${cita(e.slug)},\n    num: ${cita(e.num)},\n` +
  `    nombre: ${cita(e.nombre)},\n    lead: ${cita(e.lead)},\n` +
  `    accion: ${cita(e.accion)},\n    panel: ${cita(e.panel)},\n` +
  '    campos: [\n' +
  e.campos.map((c) => `      { titulo: ${cita(c.titulo)}, texto: ${cita(c.texto)}${c.resultado ? ', resultado: true' : ''} },`).join('\n') +
  '\n    ],\n  },'
);
writeFileSync(join(RAIZ, 'src/data/metodo.js'), cabeceraMetodo + etapas.map(serializa).join('\n') + '\n];\n');
console.log('\nsrc/data/metodo.js    ·', etapas.length, 'etapas');
etapas.forEach((e) => console.log(`   ${e.num}  ${e.nombre}  ·  ${e.campos.length} campos`));

/* ---------- CASOS: los dos proyectos ---------- */
const casosSrc = leer('src/components/secciones/Casos.astro');
/* Trocear por la posición de cada <div class="mundo">, no con un regex de
   cierre: el markup tiene divs anidados y cualquier `</div></div></div>`
   cortaba el bloque antes del enlace "visitar". */
const marcas = [];
const reMundo = /<div class="mundo" data-theme="light">/g;
let mm;
while ((mm = reMundo.exec(casosSrc))) marcas.push(mm.index);
const casos = marcas
  .map((ini, k) => casosSrc.slice(ini, marcas[k + 1] ?? casosSrc.length))
  .map((b) => ({
    /* Los dos casos son ESPEJO: uno entra por la derecha y el otro por la
       izquierda, y el color del eyebrow cambia. Va como dato, no a fuego. */
    animEyebrow: b.match(/<p class="t-eyebrow" data-anim-high="([^"]*)"/)[1],
    animPalabra: b.match(/<p class="mundo-word" data-anim-high="([^"]*)"/)[1],
    animClaim: b.match(/<p class="t-body-display caso-claim" data-anim-high="([^"]*)"/)[1],
    eyebrow: b.match(/<p class="t-eyebrow"[^>]*>([\s\S]*?)<\/p>/)[1].trim(),
    palabra: b.match(/<span>([^<]*)<\/span><span class="l2">([^<]*)<\/span>/).slice(1, 3),
    claim: b.match(/<p class="t-body-display caso-claim"[^>]*>([\s\S]*?)<\/p>/)[1].trim(),
    intro: b.match(/<p class="caso-intro">([\s\S]*?)<\/p>/)[1].trim(),
    video: b.match(/data-src="([^"]*)"/)[1],
    videoAlt: b.match(/aria-label="([^"]*)"/)[1],
    pie: [...b.matchAll(/<figcaption class="t-eyebrow"><span>([^<]*)<\/span><span>([^<]*)<\/span>/g)][0].slice(1, 3),
    areas: b.match(/<div class="caso-areas t-eyebrow"><span>([^<]*)<\/span>([\s\S]*?)<\/div>/).slice(1, 3),
    accion: b.match(/<span data-anim="text-hover">([^<]*)<\/span>/)[1],
    ficha: [...b.matchAll(/<div><h4>([^<]*)<\/h4><p>([\s\S]*?)<\/p><\/div>/g)].map((m) => ({ titulo: m[1], texto: m[2].trim() })),
    enlace: b.match(/<a class="t-eyebrow caso-visitar" href="([^"]*)"[^>]*>([^<]*)<\/a>/).slice(1, 3),
  }));

const cabeceraCasos = `/* ============================================================
   CASOS — los dos proyectos

   El copy es de Pablo: no se reescribe.
   OJO: \`enlace[0]\` sigue apuntando a #proyectos en los dos. Son los enlaces
   de verdad que faltan por poner (ver docs/ESTADO.md).
   ============================================================ */

export const casos = [
`;
const serCaso = (c) => (
  '  {\n' +
  `    animEyebrow: ${cita(c.animEyebrow)},\n    animPalabra: ${cita(c.animPalabra)},\n` +
  `    animClaim: ${cita(c.animClaim)},\n` +
  `    eyebrow: ${cita(c.eyebrow)},\n` +
  `    palabra: [${cita(c.palabra[0])}, ${cita(c.palabra[1])}],\n` +
  `    claim: ${cita(c.claim)},\n    intro: ${cita(c.intro)},\n` +
  `    video: ${cita(c.video)},\n    videoAlt: ${cita(c.videoAlt)},\n` +
  `    pie: [${cita(c.pie[0])}, ${cita(c.pie[1])}],\n` +
  `    areas: [${cita(c.areas[0])}, ${cita(c.areas[1].trim())}],\n` +
  `    accion: ${cita(c.accion)},\n` +
  `    enlace: [${cita(c.enlace[0])}, ${cita(c.enlace[1])}],\n` +
  '    ficha: [\n' +
  c.ficha.map((f) => `      { titulo: ${cita(f.titulo)}, texto: ${cita(f.texto)} },`).join('\n') +
  '\n    ],\n  },'
);
guardar('src/data/casos.js', cabeceraCasos + casos.map(serCaso).join('\n') + '\n];\n', casos.length, 'casos');
