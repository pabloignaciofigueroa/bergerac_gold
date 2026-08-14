# MAP — qué hace cada archivo

Mapa para no tener que explorar. Los números de línea envejecen; los nombres de
función y las clases CSS, no: busca por ellos.

## Entrada

| Archivo | Qué es |
|---|---|
| `index.html` (566 líneas) | **Todo el copy del sitio.** Una sola página, seis `<section>`. También el importmap de three.js, el guardia `file://` y el markup del loader. |
| `tools/server.mjs` | Servidor estático de desarrollo, puerto 4300. |
| `INICIAR_MERGE.cmd` | Doble clic: levanta el servidor y abre el navegador. |

## CSS — tres capas, en este orden

| Archivo | Contenido |
|---|---|
| `assets/css/tokens.css` (136) | Paleta cerrada (6 colores), alias `--color--*` de v9, temas `[data-theme]`, brands `[data-brand]`, tipografías, motion, z-index. **Todo color nuevo empieza aquí.** |
| `assets/css/base.css` (418) | Reset, `@font-face`, shell (header/footer), loader, cursor, indicador oval, menú overlay, skip-link, wipe-lines, y el bloque final de **arreglos móviles**. |
| `assets/css/sections.css` (1521) | Las seis secciones. Crece por el final: los ajustes de QA están añadidos al fondo, agrupados por tema. |

## JS — boot y sistemas globales

| Archivo | Responsabilidad |
|---|---|
| `assets/js/main.js` (240) | **Boot único.** Registra GSAP, crea el ciclo de vida de escenas (`registerScene`/`wake`, un solo rAF), el shell cromático que cambia con la sección, el `safeRefresh` con debounce, el parallax v9 del hero y el arranque de todas las secciones. El objeto `ctx` que reciben los módulos se arma aquí. |
| `assets/js/motion.js` (158) | Lenis + reveals de cortina. Contrato: `data-anim-high="dirección, color, delay"`. Espera a `fonts.ready` y al evento `lab:open` del loader. |
| `assets/js/loader.js` (142) | Pantalla de entrada: el isotipo se **traza con el progreso real de carga** (fuentes 25% + imágenes 75%), luego se rellena y sale en dos cortinas. Emite `lab:open`. |
| `assets/js/pointer.js` (143) | Cursor propio con etiquetas (`data-cursor`), indicador de progreso lateral, botones magnéticos (`data-magnetic`). Todo apagado en táctil/reduced. |
| `assets/js/menu.js` | Overlay a pantalla completa con las piezas SVG de la marca. Detiene Lenis mientras está abierto. |
| `assets/js/hero-fit.js` | Mide y escribe el `font-size` del título del hero para que ocupe **exactamente** el ancho entre el logo y el botón menú. Es la fuente de verdad del tamaño: las partículas lo leen. |
| `assets/js/textroll.js` | Roll de caracteres al hover (`data-anim="text-hover"`). |
| `assets/js/marquee.js` (74) | Cinta infinita reactiva al scroll. Contrato: `data-marquee` con un único hijo. |
| `assets/js/plegables.js` (76) | Acordeones animados (`data-plegable`, `data-grupo` para exclusividad). |
| `assets/js/trazos.js` (70) | Anotaciones manuscritas que se dibujan (`data-trazo`). Hoy sin uso en el HTML. |
| `assets/js/instrumentos.js` (110) | **Cargador de escenas**: IntersectionObserver sobre `[data-escena]`, import dinámico, `stop()` al salir del viewport, clicks → `escena.accion(nx, ny)`. También el envío del formulario. |

## JS — escenas independientes (`assets/js/escenas/`)

Se montan solas por viewport, tienen su propio rAF vía `crearBase`.

| Archivo | Escena |
|---|---|
| `util.js` (91) | **Base compartida**: `crearBase(mount, {fov, z, onFrame, onResize})` crea renderer con alpha, monta el canvas, gestiona resize y expone `start/stop/dispose`. También `seguirPuntero` y `suavizar`, y la `PALETA`. |
| `hero-particulas.js` (519) | **BERGERAC en partículas.** Lo más elaborado del sitio: muestrea el `<h1>` en dos poblaciones (contorno fino con el antialiasing real de la fuente + relleno granulado), física de muelle, repulsión del cursor con saturación y techo de velocidad. Ver `docs/DESIGN.md`. |
| `contacto.js` (130) | Campo de partículas del cierre, en amarillo oscurecido. |
| `proyectos.js` (195) | Antes/después con shader de transición. **Sin uso**: los casos llevan vídeo real. |
| `hero.js` (220) | Bandada de boids. **Sin uso**: reemplazada por las partículas. Se conserva para volver atrás cambiando `data-escena`. |
| `partida.js`, `metodo.js`, `estudio.js` | Escenas de v9 no montadas. Archivo muerto útil como referencia. |

## JS — secciones acopladas al scroll (`assets/js/sections/`)

Reciben `ctx` desde `main.js` y usan ScrollTrigger.

| Archivo | Sección |
|---|---|
| `estudio.js` (537) + `isla-geo.js` (339) | **Isla de Chiloé 3D**: pipeline de máscara + elevación Terrarium + satelital. `isla-geo.js` construye la malla y el contorno. |
| `metodo.js` (364) + `sculpture-v2.js` (342) | **Escultura de 7 vistas** ligada al scroll. `metodo.js` mapea scroll → T normalizado, con los tramos anclados descontados (`remapT`), y controla la bisagra cromática. `sculpture-v2.js` es la geometría. |
| `partida.js` (84) | Travelling horizontal pineado, con la estación activa resaltada. |
| `works.js` (135) | Viaje Z de los casos. **Desconectado** en `main.js`: la sección usa el split de mundos v9 en CSS. |
| `contacto.js` (256) | Grilla tonal en canvas 2D, validación y envío del formulario. |
| `hero.js` (454) | Campo magnético del hero vgold. **Sin uso.** |

## Recursos

```
assets/fonts/    Balimo (marca), DemoDisplay (display), Mona Sans (cuerpo)   160 KB
assets/img/      brand/ (isotipo, logotipos, firma), isla/ (3 texturas), photos/   1.2 MB
assets/video/    SURVEC_WEBPAGE.webm, AS_ARQ_WEBPAGE.webm                     14 MB
assets/js/vendor/ three.js r184, GSAP, ScrollTrigger, SplitText, CustomEase, Lenis  2.2 MB
porting/v9/      Material de la versión v9 ya integrado. Referencia, no se carga.
```

## Contratos por atributo

Buscar por estos atributos es la forma más rápida de encontrar dónde se activa algo:

| Atributo | Módulo |
|---|---|
| `data-escena="x"` | `instrumentos.js` → `escenas/x.js` |
| `data-anim-high` | `motion.js` (reveal de cortina) |
| `data-anim="text-hover"` | `textroll.js` |
| `data-magnetic`, `data-cursor` | `pointer.js` |
| `data-marquee` | `marquee.js` |
| `data-plegable`, `data-grupo` | `plegables.js` |
| `data-menu-toggle`, `data-menu-overlay` | `menu.js` |
| `data-theme`, `data-brand` | `tokens.css` |
| `data-method-theme` | `metodo.js` + `tokens.css` |
