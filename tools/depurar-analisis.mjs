/* ============================================================
   ANÁLISIS PREVIO A LA DEPURACIÓN

   Decide qué archivos NO se usan. No mueve nada: mira y clasifica.

   CÓMO. No basta buscar nombres sueltos: hay `main.js`, `hero.js` o
   `contacto.js` repetidos en varias carpetas, y buscar por nombre hace que
   se "citen" entre ellos. Aquí se sigue el GRAFO DE VERDAD:

     1. se parte de los puntos de entrada —las páginas de Astro, la config y
        los scripts de package.json—
     2. de cada archivo se sacan sus imports, sus @import, sus url() y sus
        src/href, y se RESUELVEN como rutas relativas reales
     3. se repite hasta que no aparece nada nuevo

   Lo que queda fuera de ese alcance es candidato. Los archivos de `public/`
   no se importan, se copian: para esos se busca su ruta pública como texto
   dentro de los archivos que SÍ son alcanzables.

   Es a propósito conservador: basta una referencia para que un archivo se
   quede. Cuesta mucho menos dejar uno de más que romper el sitio, y el paso
   siguiente —mover y volver a pasar todas las puertas— confirma la decisión.

   Uso: node tools/depurar-analisis.mjs
   ============================================================ */

import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, basename } from 'node:path';

const RAIZ = process.cwd();
const IGNORAR = new Set(['node_modules', '.git', 'dist', 'qa-out', '.astro', 'depurar']);

const todos = [];
(function recorrer(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) recorrer(p);
    else todos.push({ ruta: relative(RAIZ, p).replace(/\\/g, '/'), kb: Math.round(statSync(p).size / 1024) });
  }
})(RAIZ);

const existe = (r) => todos.some((f) => f.ruta === r);
const leer = (r) => { try { return readFileSync(join(RAIZ, r), 'utf8'); } catch { return ''; } };

/* ---- puntos de entrada ---- */
const entradas = new Set();
for (const f of todos) if (/^src\/pages\/.*\.astro$/.test(f.ruta)) entradas.add(f.ruta);
entradas.add('astro.config.mjs');
/* lo que arranca desde package.json */
try {
  const pkg = JSON.parse(leer('package.json'));
  for (const cmd of Object.values(pkg.scripts || {})) {
    for (const m of String(cmd).matchAll(/(tools\/[\w./-]+\.mjs)/g)) entradas.add(m[1]);
  }
} catch { }

/* ---- extraer referencias de un archivo y resolverlas ---- */
const EXT_PRUEBA = ['', '.js', '.mjs', '.ts', '.astro', '.css', '/index.js', '/index.astro'];

function referencias(ruta) {
  const txt = leer(ruta);
  if (!txt) return [];
  const crudas = new Set();

  /* imports de JS/TS/Astro, estáticos y dinámicos */
  for (const m of txt.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) crudas.add(m[1]);
  /* @import de CSS */
  for (const m of txt.matchAll(/@import\s+['"]([^'"]+)['"]/g)) crudas.add(m[1]);
  /* url() de CSS */
  for (const m of txt.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) crudas.add(m[1]);
  /* src / href de HTML y Astro */
  for (const m of txt.matchAll(/(?:src|href)\s*=\s*['"]([^'"]+)['"]/g)) crudas.add(m[1]);

  const salidas = [];
  for (const c of crudas) {
    if (/^(https?:|data:|mailto:|tel:|#)/.test(c)) continue;
    if (!c.startsWith('.') && !c.startsWith('/') && !c.startsWith('src/') && !c.startsWith('tools/')) {
      continue;                                        /* paquete de npm */
    }
    const bases = c.startsWith('/')
      ? [join(RAIZ, 'public', c), join(RAIZ, c.slice(1))]
      : [resolve(RAIZ, dirname(ruta), c), resolve(RAIZ, c)];
    for (const b of bases) {
      for (const ext of EXT_PRUEBA) {
        const cand = relative(RAIZ, b + ext).replace(/\\/g, '/');
        if (existe(cand)) { salidas.push(cand); break; }
      }
    }
  }
  return salidas;
}

/* ---- recorrer el grafo ---- */
const alcanzables = new Set();
const cola = [...entradas];
const porQue = {};
while (cola.length) {
  const r = cola.shift();
  if (alcanzables.has(r) || !existe(r)) continue;
  alcanzables.add(r);
  for (const hijo of referencias(r)) {
    if (!alcanzables.has(hijo)) { cola.push(hijo); (porQue[hijo] ||= []).push(r); }
  }
}

/* ---- public/: se copia, no se importa. Se busca su ruta como texto
       dentro de lo que YA es alcanzable, y también en el HTML publicado. ---- */
const textoAlcanzable = [...alcanzables].map(leer).join('\n');
const htmlPublicado = existsSync(join(RAIZ, 'dist/index.html')) ? leer('dist/index.html') : '';
const cssPublicado = (() => {
  const d = join(RAIZ, 'dist/_astro');
  if (!existsSync(d)) return '';
  return readdirSync(d).filter((f) => f.endsWith('.css') || f.endsWith('.js'))
    .map((f) => { try { return readFileSync(join(d, f), 'utf8'); } catch { return ''; } }).join('\n');
})();
const todoElTexto = textoAlcanzable + '\n' + htmlPublicado + '\n' + cssPublicado;

for (const f of todos) {
  if (!f.ruta.startsWith('public/')) continue;
  const publica = f.ruta.replace(/^public\//, '');
  if (todoElTexto.includes(publica) || todoElTexto.includes(basename(f.ruta))) {
    alcanzables.add(f.ruta);
    porQue[f.ruta] = ['(citado como ruta pública)'];
  }
}

/* ---- los que se quedan pase lo que pase ---- */
const INTOCABLES = [
  /^package(-lock)?\.json$/, /^astro\.config\.mjs$/, /^\.gitignore$/, /^\.gitattributes$/,
  /^README\.md$/, /^CLAUDE\.md$/, /^docs\//, /^src\/pages\//,
];

const res = { alcanzables: [], candidatos: [], intocables: [] };
for (const f of todos) {
  if (INTOCABLES.some((re) => re.test(f.ruta))) res.intocables.push(f);
  else if (alcanzables.has(f.ruta)) res.alcanzables.push({ ...f, porQue: (porQue[f.ruta] || []).slice(0, 3) });
  else res.candidatos.push(f);
}

mkdirSync('qa-out/depurar', { recursive: true });
writeFileSync('qa-out/depurar/analisis.json', JSON.stringify(res, null, 1));

const suma = (a) => a.reduce((n, x) => n + x.kb, 0);
console.log(`\n  archivos            ${todos.length}`);
console.log(`  intocables          ${res.intocables.length}`);
console.log(`  alcanzables         ${res.alcanzables.length}  (${suma(res.alcanzables)} KB)`);
console.log(`  SIN ALCANZAR        ${res.candidatos.length}  (${suma(res.candidatos)} KB)\n`);

const porCarpeta = {};
for (const f of res.candidatos) {
  const k = f.ruta.includes('/') ? f.ruta.split('/').slice(0, 2).join('/') : '(raíz)';
  (porCarpeta[k] ||= []).push(f);
}
for (const [k, v] of Object.entries(porCarpeta).sort((a, b) => suma(b[1]) - suma(a[1]))) {
  console.log(`  ${k.padEnd(22)} ${String(v.length).padStart(3)} archivos · ${String(suma(v)).padStart(5)} KB`);
}
console.log('\n  detalle en qa-out/depurar/analisis.json\n');
