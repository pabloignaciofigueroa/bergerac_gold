/* Unifica el camino "no hay WebGL" para los cuatro instrumentos.

   Antes solo se marcaba `.instrumento-lienzo`, que ni cubre a los cuatro
   (deja fuera hero, método y contacto) ni es una lista de escenas WebGL:
   esa clase la llevan también los vídeos de los casos.

   Uso: node tools/unificar-sin-webgl.mjs   (idempotente) */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => readFileSync(join(RAIZ, p), 'utf8');
const guardar = (p, s) => writeFileSync(join(RAIZ, p), s);

/* El proyecto tiene archivos en LF y archivos en CRLF. Se respeta el final
   de línea de cada uno: normalizarlo dejaría un diff de archivo entero por
   un cambio de tres líneas, y eso hace irrevisable el commit. */
function cambiar(archivo, pares) {
  let s = leer(archivo);
  const crlf = s.includes('\r\n');
  const ajustar = (t) => (crlf ? t.replace(/\r?\n/g, '\r\n') : t.replace(/\r\n/g, '\n'));
  for (const [de0, a0] of pares) {
    const de = ajustar(de0), a = ajustar(a0);
    if (s.includes(a)) continue;                     /* ya aplicado */
    if (!s.includes(de)) throw new Error(`${archivo}: no encuentro\n${de0}`);
    s = s.replace(de, a);
  }
  guardar(archivo, s);
  console.log('  ' + archivo);
}

/* ---------- 1 · resiliencia.js: la decisión vive en un solo sitio ---------- */
cambiar('src/scripts/resiliencia.js', [
  [
    `  safe: '',   /* la fase 4 lo usa cuando decide no montar por rendimiento */
};`,
    `  'sin-webgl-fondo': '',   /* capa decorativa: no falta nada que explicar */
  safe: '',   /* la fase 4 lo usa cuando decide no montar por rendimiento */
};

/* ¿Hay WebGL en esta máquina? Se pregunta una vez y se recuerda: crear un
   canvas y pedirle contexto no es gratis, y lo consultan cuatro sitios. */
let _soporta = null;
export function soportaWebGL() {
  if (_soporta !== null) return _soporta;
  try {
    const c = document.createElement('canvas');
    _soporta = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { _soporta = false; }
  return _soporta;
}

/* Los CUATRO huecos que de verdad necesitan WebGL.

   No vale \`.instrumento-lienzo\`: esa clase la llevan también los vídeos de
   los casos, que no tocan WebGL. Marcarlos habría puesto un aviso de
   "necesita aceleración gráfica" encima de un vídeo que se ve perfectamente,
   y a la vez dejaba sin marcar el hero, el método y el contacto.

   \`texto: true\`  → el instrumento ES el contenido y su ausencia deja un
                    hueco que hay que explicar (la isla, la escultura).
   \`texto: false\` → capa decorativa sobre contenido que se lee completo por
                    sí solo: el hero tiene su título en tipografía real y el
                    contacto su formulario. Los dos van \`aria-hidden\` en el
                    HTML por esta misma razón, así que tampoco hay nada que
                    contarle a un lector de pantalla. */
export const HUECOS_WEBGL = [
  { sel: '.hero-escena',            texto: false },
  { sel: '.estudio__canvas-holder', texto: true  },
  { sel: '.metodo__stage',          texto: true  },
  { sel: '.contacto-escena',        texto: false },
];

/* Deja los cuatro huecos en su estado sin-WebGL. */
export function marcarSinWebGL() {
  for (const { sel, texto } of HUECOS_WEBGL) {
    document.querySelectorAll(sel).forEach((m) => {
      mostrarFijo(m, texto ? 'sin-webgl' : 'sin-webgl-fondo');
    });
  }
}`,
  ],
]);

/* ---------- 2 · instrumentos.js: usa la decisión común ---------- */
cambiar('src/scripts/instrumentos.js', [
  [
    `import { mostrarFijo, estaCaida } from './resiliencia.js';

function soportaWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

if (!soportaWebGL()) {
  /* Mismo camino que la pérdida de contexto: un solo estado fijo para las
     dos situaciones, con estilos en la hoja y no incrustados aquí. En la
     fase 5 este hueco lo ocupa el fotograma de la escena real. */
  document.querySelectorAll('.instrumento-lienzo').forEach((m) => mostrarFijo(m, 'sin-webgl'));
} else {`,
    `import { estaCaida, soportaWebGL, marcarSinWebGL } from './resiliencia.js';

if (!soportaWebGL()) {
  /* Mismo camino que la pérdida de contexto: un solo estado fijo para las
     dos situaciones, con estilos en la hoja y no incrustados aquí. En la
     fase 5 este hueco lo ocupa el fotograma de la escena real.
     Marca los cuatro huecos, no solo los que cuelgan de esta carga: el
     estudio y el método arrancan por su cuenta desde main.js. */
  marcarSinWebGL();
} else {`,
  ],
]);

/* ---------- 3 · las dos secciones: ni lo intentan si no hay WebGL ----------
   Sin esto construían un WebGLRenderer condenado al fallo, que además de
   ensuciar la consola se traía `three` y la malla de la isla para nada. */
cambiar('src/scripts/sections/estudio.js', [
  [
    `import { protegerContexto, liberarEscena } from '../resiliencia.js';`,
    `import { protegerContexto, liberarEscena, soportaWebGL, estaCaida } from '../resiliencia.js';`,
  ],
  [
    `  async function boot() {
    if (booted) return;
    booted = true;`,
    `  async function boot() {
    if (booted) return;
    /* Sin WebGL no se intenta: \`marcarSinWebGL()\` ya dejó el estado fijo en
       el hueco. Y si el contexto ya cayó en esta sesión, tampoco se rehace. */
    if (!soportaWebGL() || estaCaida(holder)) return;
    booted = true;`,
  ],
]);

cambiar('src/scripts/sections/metodo.js', [
  [
    `import { protegerContexto, liberarEscena } from '../resiliencia.js';`,
    `import { protegerContexto, liberarEscena, soportaWebGL, estaCaida } from '../resiliencia.js';`,
  ],
  [
    `  async function boot() {
    if (booted) return;
    booted = true;`,
    `  async function boot() {
    if (booted) return;
    /* Igual que en Estudio: sin WebGL no se construye nada. La bisagra
       cromática y el recorrido de etapas son independientes y siguen. */
    if (!soportaWebGL() || estaCaida(stage)) return;
    booted = true;`,
  ],
]);

console.log('camino sin-WebGL unificado en los cuatro instrumentos');
