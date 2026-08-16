/* ============================================================
   FASE 3 — trocea sections.css en archivos por sección

   POR QUÉ SE CORTA Y NO SE REAGRUPA. El archivo tiene dos generaciones: los
   bloques 01–06 originales y una segunda tanda (v9 y arreglos de QA) que los
   sobreescribe. Juntar las dos partes de cada sección en un solo archivo
   obligaría a REORDENAR la cascada, y hay reglas transversales —.s, .cover,
   t-impact, .plegable, .instrumento— que se pisan entre bloques de secciones
   distintas. Así que se corta respetando el orden exacto y se importa en ese
   mismo orden: el resultado es idéntico byte a byte, y aun así cada archivo
   es pequeño y dice en su nombre de qué va.

   Lo verifica tools/qa/estilos.mjs, que compara los estilos computados
   elemento por elemento contra la versión anterior.

   Uso: node tools/trocear-css.mjs
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(RAIZ, 'public/assets/css/sections.css');
const DESTINO = join(RAIZ, 'src/styles/secciones');

const lineas = readFileSync(ORIGEN, 'utf8').split('\n');

/* [nombre, primera línea (1-indexada), qué es] — el corte sale de las
   cabeceras del propio archivo, no de un criterio inventado. */
const CORTES = [
  ['_cabecera',        1,    'cabecera del archivo original'],
  ['hero',             7,    '01 · Hero'],
  ['estudio',          103,  '02 · El estudio'],
  ['partida',          158,  '03 · El punto de partida'],
  ['metodo',           403,  '04 · Método'],
  ['casos',            509,  '05 · Trabajo seleccionado'],
  ['contacto',         663,  '06 · Contacto'],
  ['responsive-fino',  787,  'ajustes responsive del primer pase'],
  ['hero-v9',          798,  '01 · Hero — pase v9 (roles t-*, estructura)'],
  ['estudio-v9',       972,  '02 · Estudio v9 + piezas transversales (.s, .cover, t-impact, plegable)'],
  ['contacto-v9',      1071, '06 · Contacto v9 + cierre'],
  ['partida-color',    1160, '03 · Partida: fotos y un color de marca por problema'],
  ['casos-split',      1302, '05 · Casos: split de mundos v9'],
  ['niebla',           1394, 'niebla de color dentro de las letras del hero'],
  ['metodo-qa',        1416, '04 · Método: reestructura de QA (portada, ritmo, cierre)'],
  ['movil',            1506, 'móvil: los titulares slab tienen que caber. VA EL ÚLTIMO.'],
];

if (!existsSync(DESTINO)) mkdirSync(DESTINO, { recursive: true });

const escritos = [];
for (let i = 0; i < CORTES.length; i++) {
  const [nombre, desde, que] = CORTES[i];
  const hasta = CORTES[i + 1] ? CORTES[i + 1][1] - 1 : lineas.length;
  const cuerpo = lineas.slice(desde - 1, hasta).join('\n').replace(/\s+$/, '') + '\n';
  if (nombre === '_cabecera') continue;          /* la cabecera se reescribe en el índice */
  writeFileSync(join(DESTINO, nombre + '.css'), cuerpo);
  escritos.push({ nombre, que, lineas: cuerpo.split('\n').length });
}

/* índice: el orden de estos @import ES la cascada. No reordenar. */
const indice = `/* ============================================================
   LAS SEIS SECCIONES — índice de la cascada

   EL ORDEN DE ESTOS IMPORTS ES LA CASCADA. No reordenar sin comprobarlo con
   \`node tools/qa/estilos.mjs\`, que compara los estilos computados elemento
   por elemento contra la versión anterior.

   Aparecen dos veces varias secciones porque el CSS tiene dos generaciones:
   los bloques originales y una segunda tanda (v9 y arreglos de QA) que los
   sobreescribe. Se respetó ese orden en vez de fusionarlas, porque hay
   reglas transversales que se pisan entre secciones distintas.
   ============================================================ */

${escritos.map((e) => `@import './secciones/${e.nombre}.css';   /* ${e.que} */`).join('\n')}
`;
writeFileSync(join(RAIZ, 'src/styles/secciones.css'), indice);

console.log('sections.css troceado en', escritos.length, 'archivos:');
escritos.forEach((e) => console.log(`  ${String(e.lineas).padStart(5)} líneas  ${e.nombre}.css`));
