/* ============================================================
   MOVER —NO COPIAR— LO QUE NO SE USA

   Deja cada archivo en `depurar/` conservando su ruta original, para que se
   pueda deshacer con exactitud y para que se vea de dónde salió. Escribe un
   manifiesto con el motivo de cada uno.

   QUÉ NO SE MUEVE, aunque el navegador no lo pida nunca. Esto es lo que
   distingue una depuración de un destrozo:

     · los fotogramas fijos — son la red para cuando falla WebGL; que no se
       pidan en una visita sana es justo lo que se les exige, y hay una
       puerta de QA que lo comprueba
     · og-bergerac.jpg — no lo pide el navegador, lo piden los rastreadores
       que dibujan la vista previa de un enlace
     · los vídeos grandes — son la variante de pantalla grande; en la prueba
       se eligieron las `-sm`
     · las herramientas de tools/qa — son el arnés vivo del proyecto

   Uso:  node tools/depurar-mover.mjs          (mueve)
         node tools/depurar-mover.mjs --volver (lo devuelve todo a su sitio)
   ============================================================ */

import { readdirSync, statSync, mkdirSync, renameSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const DESTINO = 'depurar';
const MANIFIESTO = join(DESTINO, 'MANIFIESTO.json');

/* ---- lo que sale, con su motivo ---- */
const GRUPOS = [
  {
    motivo: 'Página anterior a Astro y su lanzador. El sitio se compone hoy desde src/pages/index.astro.',
    rutas: ['index.html', 'BERGERAC-particulas_v1.html', 'INICIAR_MERGE.cmd'],
  },
  {
    motivo: 'Carpeta de portado de la versión v9. Su contenido ya está incorporado en src/; nada del proyecto la alcanza.',
    carpeta: 'porting',
  },
  {
    motivo: 'Logos de marca en archivo. El header, el loader y el menú dibujan el isotipo INLINE en el Astro; el único archivo que se usa es el favicon isotipo-color.svg, que se queda.',
    rutas: [
      'public/assets/img/brand/isotipo-black.svg',
      'public/assets/img/brand/isotipo-official-inline.svg',
      'public/assets/img/brand/logotipo-black.svg',
      'public/assets/img/brand/logotipo-color.svg',
      'public/assets/img/brand/logotipo-horizontal-black.svg',
      'public/assets/img/brand/logotipo-horizontal-color.svg',
      'public/assets/img/brand/logotipo-horizontal-white.svg',
      'public/assets/img/brand/logotipo-white.svg',
    ],
  },
  {
    motivo: 'Balimo. Declarada en @font-face pero sin un solo texto que la use: la única regla que la pedía (.hero__brandword) ya no existe en el HTML. Verificado en red: el navegador no la descarga nunca.',
    rutas: ['public/assets/fonts/Balimo-Regular.ttf', 'public/assets/fonts/Balimo-Bold.ttf'],
  },
  {
    motivo: 'Secciones desconectadas a mano. main.js lo dice en sus comentarios: el hero es el de v9 y Casos usa el split de mundos, así que estos dos init nunca se importan.',
    rutas: ['src/scripts/sections/hero.js', 'src/scripts/sections/works.js'],
  },
  {
    motivo: 'Capturas de QA. Son salida regenerable, no fuente: las vuelve a crear tools/qa/titulo-visual.mjs.',
    carpeta: 'tools/qa/salida',
  },
  {
    motivo: 'Herramientas de un solo uso, ya gastadas: hicieron la migración a Astro, trocearon el CSS, generaron los datos y unificaron el camino sin WebGL. Se guardan por si hay que auditar cómo se hizo, pero no las llama nadie.',
    rutas: [
      'tools/migrar-a-astro.mjs', 'tools/trocear-css.mjs',
      'tools/gen-datos.mjs', 'tools/unificar-sin-webgl.mjs',
    ],
  },
];

function archivosDe(g) {
  if (g.rutas) return g.rutas.filter(existsSync);
  const out = [];
  (function rec(d) {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name).replace(/\\/g, '/');
      if (e.isDirectory()) rec(p); else out.push(p);
    }
  })(g.carpeta);
  return out;
}

/* ---- volver atrás ---- */
if (process.argv.includes('--volver')) {
  if (!existsSync(MANIFIESTO)) { console.error('No hay manifiesto: nada que devolver.'); process.exit(1); }
  const m = JSON.parse(readFileSync(MANIFIESTO, 'utf8'));
  let n = 0;
  for (const it of m.archivos) {
    const desde = join(DESTINO, it.ruta);
    if (!existsSync(desde)) continue;
    mkdirSync(dirname(it.ruta), { recursive: true });
    renameSync(desde, it.ruta);
    n++;
  }
  console.log(`  devueltos ${n} archivos a su sitio`);
  process.exit(0);
}

/* ---- mover ---- */
mkdirSync(DESTINO, { recursive: true });
const manifiesto = { fecha: null, archivos: [] };
let kb = 0;

for (const g of GRUPOS) {
  const archivos = archivosDe(g);
  if (!archivos.length) continue;
  console.log(`\n  ${archivos.length} archivos — ${g.motivo.slice(0, 74)}…`);
  for (const r of archivos) {
    const destino = join(DESTINO, r);
    mkdirSync(dirname(destino), { recursive: true });
    const tam = Math.round(statSync(r).size / 1024);
    renameSync(r, destino);                       /* MOVER, jamás copiar */
    manifiesto.archivos.push({ ruta: r.replace(/\\/g, '/'), kb: tam, motivo: g.motivo });
    kb += tam;
  }
}

writeFileSync(MANIFIESTO, JSON.stringify(manifiesto, null, 1));
writeFileSync(join(DESTINO, 'LEEME.md'), `# depurar/

Aquí está lo que la auditoría dio por no usado. **No se ha borrado nada**: los
archivos están movidos, con su ruta original intacta, y \`MANIFIESTO.json\`
guarda de dónde salió cada uno y por qué.

Para devolverlo todo a su sitio:

    node tools/depurar-mover.mjs --volver

Esta carpeta se borra cuando el QA confirme que no falta nada.

${manifiesto.archivos.length} archivos · ${kb} KB
`);

console.log(`\n  movidos ${manifiesto.archivos.length} archivos · ${kb} KB`);
console.log(`  manifiesto en ${MANIFIESTO}`);
console.log(`  para deshacer: node tools/depurar-mover.mjs --volver\n`);
