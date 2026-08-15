/* ============================================================
   BERGERAC — ENTRADA ÚNICA DEL BUNDLE

   Puente entre las dependencias de npm y el código del sitio.

   El sitio nació sin build: GSAP, ScrollTrigger, SplitText, CustomEase y
   Lenis entraban por <script defer> y vivían en `window`, y una docena de
   módulos los leen de ahí (`const { gsap } = window`, `new window.Lenis`,
   `window.SplitText`). Al pasar a npm se podría haber reescrito esa docena
   de archivos para que importen lo suyo, pero eso es tocar main.js,
   motion.js, textroll.js, trazos.js, sections/estudio.js y sections/hero.js
   de una vez, sin ninguna ganancia visible y con todo el riesgo.

   Así que se conservan los globales, pero puestos desde el bundle: el
   código de arriba no se entera y aun así GSAP viaja empaquetado y con
   versión clavada en package.json. El premio de verdad de haber pasado a
   npm es three, que sí se importa por nombre en las escenas y ahora entra
   con tree-shaking en vez de los 2 MB del build completo.

   El ORDEN importa: main.js lee `window.gsap` en cuanto se evalúa, así que
   las asignaciones tienen que estar hechas antes. Por eso viven en
   globales.js y no aquí: los imports estáticos se izan, y puestas en este
   archivo correrían DESPUÉS de que main.js se evaluara.
   ============================================================ */

import './globales.js';

/* Estáticos, y en este orden. Los módulos ES se evalúan en profundidad y en
   orden de importación, así que globales.js corre antes que main.js y los
   `window.gsap` de arriba ya están puestos cuando main.js se evalúa.
   Con `await import()` funcionaba igual, pero encadenaba una descarga tras
   otra: el navegador no descubría main.js hasta tener este archivo entero, y
   con la red estrangulada eso retrasaba la cortina de carga. */
import './main.js';
import './instrumentos.js';
