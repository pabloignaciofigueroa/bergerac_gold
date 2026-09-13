# Bergerac

Sitio oficial: HTML, CSS y JavaScript modular, compilado con Vite. GSAP coordina el movimiento y Three.js renderiza el cubo.

## Desarrollo

`npm ci` y `npm run dev`.

## Publicacion

`npm run build` genera `dist/`. Vercel utiliza `vercel.json`. La fuente principal es `index.html`; `bergerac.html` se sincroniza al compilar.

Solo `dist/` se publica. No contiene respaldos, documentos historicos ni la implementacion Astro anterior.

## Contacto pendiente

El formulario actualmente abre un correo dirigido a pablo@bergerac.cl. El envio automatico desde servidor todavia requiere implementar un proveedor y configurar sus credenciales.

## Validacion

`npm test` ejecuta Playwright. Instalar previamente su navegador con `npx playwright install chromium`.
