/* ============================================================
   BERGERAC — GLOBALES DE GSAP Y LENIS

   Módulo aparte y no dentro de entrada.js por una razón de orden: los
   imports estáticos se izan, así que si las asignaciones vivieran junto al
   `import './main.js'` se ejecutarían DESPUÉS de que main.js se evaluara, y
   main.js lee `const { gsap } = window` nada más arrancar. Estando en un
   módulo propio que entrada.js importa primero, se garantiza que corran antes.

   Por qué globales y no imports en cada archivo: el sitio nació sin build y
   una docena de módulos leen gsap, ScrollTrigger, SplitText y Lenis de
   `window`. Reescribirlos todos no aporta nada visible y toca a la vez
   main.js, motion.js, textroll.js, trazos.js y dos secciones. Así el código
   de arriba no se entera y aun así todo viaja empaquetado y con versión
   clavada en package.json.
   ============================================================ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';

window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;
window.SplitText = SplitText;
window.CustomEase = CustomEase;
window.Lenis = Lenis;
