# WORKFLOW — cómo trabajamos

## Cómo trabaja Pablo

- **Paso a paso.** Un cambio, se muestra, se aprueba, siguiente. No encadenar tres
  cambios grandes y presentarlos juntos: si algo sale mal no se sabe cuál fue.
- **Revisa con capturas.** Manda pantallazos señalando el problema. Léelos con
  atención antes de tocar nada: casi siempre el defecto está señalado ahí.
- **Cuando pide opciones, las quiere de verdad.** Si dice "cuéntame" o "dame un
  plan", **no ejecutar**: analizar, exponer alternativas con su coste, recomendar
  una y esperar.
- **No le gusta que se rompa lo aprobado.** Antes de tocar una sección terminada,
  verificar que sigue funcionando después.

## La regla que más ha costado: QA antes de entregar

Varias veces se reportó "listo" sin verificar y estaba roto. **Nunca más.**

```bash
npm run build                    # el arnés mide el BUILD, no el dev
npm run preview                  # sirve dist/ en 4310
QA_URL=http://127.0.0.1:4310/ node tools/qa/qa.mjs
```

Sin `QA_URL` apunta a 4300, que es donde se sirve la versión anterior cuando se
está comparando. Para el día a día basta `npm run dev` (4321), pero **lo que se
verifica antes de entregar es el build**.

Pruebas sueltas: `arranque` · `hero` · `titulo` · `volver` · `movil` · `reduce` · `fps` · `color` · `foto`

```bash
node tools/qa/qa.mjs movil       # solo responsive
node tools/qa/qa.mjs foto 390    # capturas a 390px → tools/qa/salida/
```

Si falta el navegador automatizado: `npm i --no-save puppeteer-core`
(usa el Chrome del sistema, no descarga nada).

### Qué verifica cada prueba

| Prueba | Qué comprueba |
|---|---|
| `arranque` | **La cortina de carga es lo primero que se ve.** Con la red estrangulada a 1,2 Mbps, registra fotograma a fotograma si hay algo opaco cubriendo, y que al final se retire. |
| `hero` | Las partículas montan, el canvas existe, el `<h1>` queda oculto pero presente, consola limpia. |
| `titulo-visual.mjs` | Script aparte, no es una prueba: genera las imágenes para mirar el título — la comparación a 4 aumentos contra el texto real y el desarme en cuatro posiciones de cursor. |
| `titulo` | **Definición del título contra el texto real.** Rasteriza el mismo `<h1>` glifo a glifo y compara. No entra en la suite por defecto (tarda ~2 min): se corre a mano al tocar el hero. |
| `volver` | **Mide la física, no una captura.** Reposo → paseo lento sobre las letras → retirada: comprueba que desarma de verdad, que nada se escapa y que todo vuelve a 0px. |
| `movil` | 390/360/768: sin scroll horizontal y ningún titular fuera de margen. |
| `reduce` | Con `prefers-reduced-motion` no monta escenas y el título queda nítido. |
| `fps` | Holgura de rendimiento con el cursor en movimiento continuo. |
| `foto` | Capturas de las seis secciones al ancho que se le pase. |

**Comparar capturas byte a byte no sirve** para las partículas: tienen un pulso
senoidal y dos fotos nunca son idénticas. Por eso el módulo expone
`window.__particulas.maxDesplazamiento()` — se mide el estado real.

Lo mismo con la escultura del Método, que está animada: `window.__metodo.encuadre()`
proyecta su caja envolvente y dice qué fracción cae dentro del marco (con
`fiable: false` cuando una esquina se va detrás de la cámara y la proyección
deja de significar nada).

En `titulo` hay dos trampas que ya costaron una tarde. **Hay que medir a
DPR 2**: a DPR 1 el mismo build da 0,01% de fisuras y a DPR 2 da 0,24%, porque
el glifo se rasteriza a 1x y en retina cada partícula abarca dos píxeles de
dispositivo. Y **hay que calibrar cada captura por separado**: el campo lleva
el parallax del hero, y con un solo calibrado global la deriva entre capturas
se contabiliza como agujeros — daba números que contradecían lo que se ve en
pantalla. Se mide solo el interior profundo (a 3px de cualquier borde), donde
un error de registro de un píxel no puede llegar. Validada al revés, como las
demás: con el código anterior acusa 0,241%.

Y en `arranque`, ojo con cómo se mide: cuando el fallo existía, el `<div>` del
loader **ya estaba en el DOM y era el elemento superior**, solo que transparente.
Un `elementFromPoint` habría respondido "tapado" y no habría cazado nada. Hay que
mirar si algo es realmente **opaco**. La prueba se validó reintroduciendo el fallo
a propósito: sin el arreglo acusa 1291 fotogramas descubiertos.

## Los dos comparadores de la migración

Existen porque al pasar a Astro hacía falta demostrar que el sitio no cambiaba.
Siguen siendo útiles para cualquier cambio grande.

```bash
node tools/qa/estilos.mjs http://127.0.0.1:4300 http://127.0.0.1:4310
node tools/qa/paridad.mjs http://127.0.0.1:4300 http://127.0.0.1:4310
```

**`estilos.mjs` es el bueno para tocar CSS.** Compara los estilos computados
elemento por elemento: si se rompe el orden de la cascada, sale el elemento y la
propiedad exactos. Es determinista.

**`paridad.mjs` compara píxeles** y es útil en escritorio, donde su ruido propio
es 0%. En móvil no: llegó a un 3,64% midiendo la referencia contra sí misma, y no
se le puede pedir un veredicto ahí. Por eso calcula su propio umbral capturando
la referencia dos veces.

### La lección que costó toda una tarde

Los dos comparadores dieron diagnósticos FALSOS antes de ser fiables, y siempre
por el mismo motivo: **al intentar estabilizar la medida, la medida deja de medir
lo que dice medir**.

- Pausar la animación y navegar con `scrollIntoView` → 56% comparando el sitio
  consigo mismo. Lenis va sobre `gsap.ticker`; al dormirlo, los pins quedaban
  indefinidos.
- El marquee es una cinta infinita: nunca se asienta → 1,9%.
- Los reveals de cortina congelados a medias → 3,75% y 18,9%.
- `gsap.set('*', {clearProps:'all'})` borra estilos que GSAP puso legítimamente
  —alturas de desplegables— y cuáles borra depende de qué había corrido: acusaba
  un nav de 39px contra 21px cuando en la página real los dos miden 26.

**Ningún comparador vale hasta que da verde contra sí mismo.** Es lo primero que
hay que comprobar antes de creerle nada.

## Diagnosticar sin adivinar

Cuando algo no se ve como debería, medir antes de tocar:

```js
// en la consola del navegador
window.__particulas.total()                    // cuántas partículas hay
window.__particulas.maxDesplazamiento()        // cuánto se alejó la más suelta
ScrollTrigger.getAll().filter(t => t.pin)      // qué pins existen y dónde
document.documentElement.scrollWidth - document.documentElement.clientWidth  // desborde
```

Para encontrar **qué elemento desborda** en móvil (así se cazó el menú overlay):

```js
const W = document.documentElement.clientWidth;
[...document.querySelectorAll('*')]
  .filter(el => el.getBoundingClientRect().right > W + 1)
  .map(el => el.tagName + '.' + el.className);
```

## Errores que ya cometimos — no repetir

1. **Reportar sin verificar.** Coste: varias rondas perdidas.
2. **Medir el dev en vez del build.** `npm run dev` no minifica ni empaqueta
   igual. Lo que se verifica antes de entregar es `dist/`, servido en 4310.
3. **Tocar varias cosas a la vez** y no saber cuál rompió qué.
4. **Procesos de Chrome sin cerrar.** Nueve instancias zombis de pruebas
   anteriores dieron 29 fps donde en realidad había 84 — y casi provocan que se
   revirtiera un cambio que estaba bien. Antes de medir rendimiento:
   `Get-Process chrome | Stop-Process -Force`.
5. **Dar por bueno un arreglo visual con una sola captura.** El vaciado del
   título salía limpio en la posición que probé y a cuadros en las demás.
   `tools/qa/titulo-visual.mjs desarme` prueba cuatro por eso.
6. **Confiar en una medición mal planteada.** Un test que comparaba imágenes daba
   "roto" cuando el sitio estaba bien, y otro que medía el polvo ambiental daba
   "no vuelve" cuando la palabra sí volvía. Si un resultado sorprende, **dudar
   primero de la medición**.
7. **Asumir que un cambio de CSS no afecta al JS.** El hero mide el DOM: cambiar
   la tipografía o el layout del `<h1>` cambia las partículas.

## Git

Repo: <https://github.com/pabloignaciofigueroa/bergerac_gold> · rama `main`.

Commits en español, explicando **qué cambia para el usuario**, no qué líneas se
tocaron. Terminar con la línea de coautoría.

## Servidor

`tools/server.mjs`, puerto 4300, sin caché. Si el puerto está ocupado avisa y sale
(no falla en silencio, que fue otro problema real).
