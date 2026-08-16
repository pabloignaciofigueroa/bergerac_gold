// Servidor estático mínimo para bergerac_merge (autocontenido).
// Uso: node tools/server.mjs [puerto]  (sirve la carpeta bergerac_merge/)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Uso: node tools/server.mjs [puerto] [directorio]
   El directorio existe para poder levantar DOS versiones a la vez —la de hoy
   y el build de Astro— y compararlas con tools/qa/paridad.mjs. */
const raizRepo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = process.argv[3] ? path.resolve(process.argv[3]) : raizRepo;
/* Puerto propio 4300: NUNCA el 4173 de vgold — si aquel server viejo
   queda corriendo, el navegador mostraría la página equivocada. */
const port = Number(process.argv[2]) || 4300;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webm': 'video/webm',   /* faltaba: los casos salían como octet-stream */
};

const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + p); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

/* KEEP-ALIVE LARGO — no es un detalle, costó media tarde de QA.

   Node cierra las conexiones inactivas a los 5 s por defecto. Si el
   navegador manda una petición por un socket que el servidor está cerrando
   en ese mismo instante, la petición se pierde sin error ninguno: ni 404, ni
   excepción, ni aviso en consola. Simplemente no vuelve.

   Aquí se notaba en que las DOS últimas escenas —Método y Contacto, las que
   piden su código con `import()` dinámico al llegar a su sección, después de
   varios segundos sin pedir nada— no se montaban en un tercio de las
   pasadas. Parecía un fallo de las escenas y no lo era. */
servidor.keepAliveTimeout = 120000;
servidor.headersTimeout = 125000;   /* debe superar al anterior */

servidor.listen(port, () => console.log(`bergerac merge → http://localhost:${port}  (sirviendo ${path.relative(raizRepo, root) || '.'})`))
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[ERROR] El puerto ${port} ya está ocupado por otro servidor.`);
      console.error('Cierra ese proceso (o las ventanas de Node abiertas) y vuelve a intentar.');
    } else {
      console.error('[ERROR]', err.message);
    }
    process.exitCode = 1;
  });
