// Servidor estático mínimo para bergerac_merge (autocontenido).
// Uso: node tools/server.mjs [puerto]  (sirve la carpeta bergerac_merge/)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
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
};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found: ' + p); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log(`bergerac merge → http://localhost:${port}`))
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[ERROR] El puerto ${port} ya está ocupado por otro servidor.`);
      console.error('Cierra ese proceso (o las ventanas de Node abiertas) y vuelve a intentar.');
    } else {
      console.error('[ERROR]', err.message);
    }
    process.exitCode = 1;
  });
