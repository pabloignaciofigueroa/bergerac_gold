# MAP — qué hace cada archivo

Mapa para no tener que explorar. Los números de línea envejecen; los nombres de
función y las clases CSS, no: busca por ellos.

## Entrada

| Archivo | Qué es |
|---|---|
| `src/pages/index.astro` (21 líneas) | Compone las seis secciones sobre el layout. Nada más. |
| `src/layouts/Base.astro` | El envoltorio: `<head>`, guardias en línea, cortina de carga, shell y arranque del bundle. **Aquí está el orden de la cascada de CSS.** |
| `src/components/shell/` | `Loader` · `SkipLink` · `Header` · `MenuOverlay`. |
| `src/components/secciones/` | Las seis secciones, con su copy dentro. |
| `src/components/{partida,metodo,casos}/` | `Estacion` · `Etapa` · `Caso`: un componente por bloque que se repetía. |
| `src/data/` | `partida.js` (4 estaciones) · `metodo.js` (4 etapas) · `casos.js` (2 casos). Solo contenido. |
| `astro.config.mjs` | Tres ajustes que NO son los de por defecto, cada uno con su motivo escrito. |
| `tools/server.mjs` | Servidor estático de apoyo. `node tools/server.mjs 4310 dist` sirve el build. |

## CSS — tres capas, en este orden

| Archivo | Contenido |
|---|---|
| `src/styles/tokens.css` (136) | Paleta cerrada (6 colores), alias `--color--*` de v9, temas `[data-theme]`, brands `[data-brand]`, tipografías, motion, z-index. **Todo color nuevo empieza aquí.** |
| `src/styles/base.css` (446) | Reset, `@font-face`, shell (header/footer), loader, cursor, indicador oval, menú overlay, skip-link, wipe-lines, y el bloque final de **arreglos móviles**. |
| `src/styles/secciones.css` | **Índice de la cascada.** Quince `@import` en un orden que no se toca. |
| `src/styles/secciones/*.css` | Los quince trozos. Aparecen dos veces varias secciones porque el CSS tiene dos generaciones —los bloques originales y una segunda tanda que los sobreescribe—; se respetó ese orden en vez de fusionarlas. `movil.css` va el último. |

## JS — boot y sistemas globales

| Archivo | Responsabilidad |
|---|---|
| `src/scripts/entrada.js` | Entrada del bundle: monta `window.gsap`, `ScrollTrigger`, `SplitText`, `CustomEase` y `Lenis` desde npm, y arranca. `globales.js` va aparte para garantizar el orden. |
| `src/scripts/main.js` (240) | **Boot único.** Registra GSAP, crea el ciclo de vida de escenas (`registerScene`/`wake`, un solo rAF), el shell cromático que cambia con la sección, el `safeRefresh` con debounce, el parallax v9 del hero y el arranque de todas las secciones. El objeto `ctx` que reciben los módulos se arma aquí. |
| `src/scripts/motion.js` (158) | Lenis + reveals de cortina. Contrato: `data-anim-high="dirección, color, delay"`. Espera a `fonts.ready` y al evento `lab:open` del loader. |
| `src/scripts/loader.js` (142) | Pantalla de entrada: el isotipo se **traza con el progreso real de carga** (fuentes 25% + imágenes 75%), luego se rellena y sale en dos cortinas. Emite `lab:open`. |
| `src/scripts/pointer.js` (143) | Cursor propio con etiquetas (`data-cursor`), indicador de progreso lateral, botones magnéticos (`data-magnetic`). Todo apagado en táctil/reduced. |
| `src/scripts/menu.js` | Overlay a pantalla completa con las piezas SVG de la marca. Detiene Lenis mientras está abierto. |
| `src/scripts/hero-fit.js` | Mide y escribe el `font-size` del título del hero para que ocupe **exactamente** el ancho entre el logo y el botón menú. Es la fuente de verdad del tamaño: las partículas lo leen. |
| `src/scripts/textroll.js` | Roll de caracteres al hover (`data-anim="text-hover"`). |
| `src/scripts/marquee.js` (74) | Cinta infinita reactiva al scroll. Contrato: `data-marquee` con un único hijo. |
| `src/scripts/plegables.js` (76) | Acordeones animados (`data-plegable`, `data-grupo` para exclusividad). |
| `src/scripts/trazos.js` (70) | Anotaciones manuscritas que se dibujan (`data-trazo`). Hoy sin uso en el HTML. |
| `src/scripts/videos.js` (52) | Los dos vídeos de Casos, cargados y reproducidos **por viewport**. Con `autoplay` en el markup el navegador se bajaba 6,3 MB antes de ver el hero. Contrato: `<video data-src>` sin `src` ni `autoplay`. |
| `src/scripts/instrumentos.js` (110) | **Cargador de escenas**: IntersectionObserver sobre `[data-escena]`, import dinámico, `stop()` al salir del viewport, clicks → `escena.accion(nx, ny)`. También el envío del formulario. |

## JS — escenas independientes (`src/scripts/escenas/`)

Se montan solas por viewport, tienen su propio rAF vía `crearBase`.

| Archivo | Escena |
|---|---|
| `util.js` (91) | **Base compartida**: `crearBase(mount, {fov, z, onFrame, onResize})` crea renderer con alpha, monta el canvas, gestiona resize y expone `start/stop/dispose`. También `seguirPuntero` y `suavizar`, y la `PALETA`. |
| `hero-particulas.js` (660) | **BERGERAC en partículas.** Lo más elaborado del sitio. **Dos capas**: en reposo la palabra la dibuja un quad con el glifo a resolución de pantalla; las partículas aparecen solo al arrancarse y abren su hueco con una máscara que dibujan ellas mismas en un render target. Muestrea el `<h1>` en dos poblaciones (contorno fino con el antialiasing real de la fuente + relleno granulado), física de muelle, repulsión del cursor con saturación y techo de velocidad. Ver `docs/DESIGN.md`. |
| `contacto.js` (130) | Campo de partículas del cierre, en amarillo oscurecido. |
| `proyectos.js` (195) | Antes/después con shader de transición. **Sin uso**: los casos llevan vídeo real. |
| `hero.js` (220) | Bandada de boids. **Sin uso**: reemplazada por las partículas. Se conserva para volver atrás cambiando `data-escena`. |
| `partida.js`, `metodo.js`, `estudio.js` | Escenas de v9 no montadas. Archivo muerto útil como referencia. |

## JS — secciones acopladas al scroll (`src/scripts/sections/`)

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
public/assets/fonts/   Balimo (marca), DemoDisplay (display), Mona Sans (cuerpo)  160 KB
public/assets/img/     brand/ (isotipo, logotipos) e isla/ (3 texturas que carga three.js)
public/assets/video/   SURVEC_WEBPAGE.webm, AS_ARQ_WEBPAGE.webm                    14 MB
src/assets/img/        las fotos del DOM: el build las convierte a webp con srcset
node_modules/     three 0.184.0 (clavado), gsap, lenis — de npm, empaquetados por
                  Vite con tree-shaking: three pasa de 2.028 KB a 706 KB
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
| `data-src` en `<video>` | `videos.js` |
| `data-theme`, `data-brand` | `tokens.css` |
| `data-method-theme` | `metodo.js` + `tokens.css` |
