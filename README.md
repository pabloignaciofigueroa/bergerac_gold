# Bergerac — Estudio digital

Sitio de **Bergerac**, estudio digital en Castro, Chiloé.

Una sola página con seis secciones, cada una con su propio instrumento interactivo
en WebGL. Sin dependencias externas: todo se sirve desde esta carpeta.

## Cómo verlo

Doble clic en `INICIAR_MERGE.cmd`, o bien:

```
node tools/server.mjs
```

y abrir <http://localhost:4300>.

> No funciona abriendo `index.html` con doble clic: el sitio usa módulos ES y el
> navegador los bloquea en `file://`. La propia página lo advierte si ocurre.

## Las seis secciones

| # | Sección | Instrumento |
|---|---|---|
| 01 | Hero | **BERGERAC en partículas** — la palabra se lee como tipografía y se disgrega al paso del cursor |
| 02 | El estudio | **Isla de Chiloé en 3D** con textura satelital y elevación real |
| 03 | Punto de partida | Travelling horizontal pineado, un color de marca por problema |
| 04 | Método | **Escultura de 7 vistas** que muta a lo largo de las cuatro etapas, con bisagra cromática morado → fucsia |
| 05 | Casos | Split de dos mundos con vídeo real de cada proyecto; al hover pasan a grafito |
| 06 | Contacto | Campo de partículas y formulario |

## Arquitectura

```
index.html              una sola página, todo el copy
assets/
  css/
    tokens.css          paleta cerrada, tipografía, motion, temas por sección
    base.css            reset, fuentes, shell, loader, cursor, menú
    sections.css        las seis secciones
  js/
    main.js             boot único: GSAP, ciclo de vida de escenas, shell cromático
    motion.js           Lenis + reveals de cortina (contrato data-anim-high)
    loader.js           pantalla de entrada: el isotipo se traza con la carga real
    pointer.js          cursor con etiquetas, indicador de progreso, magnetismo
    menu.js             overlay a pantalla completa con las piezas de la marca
    hero-fit.js         alinea el título del hero entre el logo y el menú
    instrumentos.js     carga perezosa de escenas por viewport
    escenas/            escenas WebGL independientes (partículas, contacto…)
    sections/           escenas acopladas al scroll (isla, partida, método, works)
    vendor/             three.js, GSAP, ScrollTrigger, SplitText, Lenis
  fonts/  img/  video/
tools/server.mjs        servidor estático de desarrollo
```

**Autocontenido:** ningún recurso se pide a un CDN ni a rutas externas.

## Decisiones que conviene conocer antes de tocar el código

- **Un solo `requestAnimationFrame`.** El boot registra las escenas y las despierta;
  ninguna abre su propio bucle salvo las de `escenas/`, que además se apagan al salir
  del viewport.
- **Los pins de scroll son frágiles.** Partida, Método y el anclaje de lectura de cada
  etapa usan `pin` de ScrollTrigger. Cualquier `refresh()` durante un pin activo
  descoloca la sección: para eso existe el `safeRefresh` con debounce de `main.js`.
- **El hero mide el DOM.** Las partículas del título muestrean el `<h1>` real
  (fuente, talla y posición que le da `hero-fit.js`), así que el `<h1>` debe seguir
  en el DOM y con su caja intacta — se oculta con `opacity`, nunca con `display`.
- **Blending premultiplicado.** Las partículas grafito sobre el azul usan alpha-over
  premultiplicado, no aditivo: en aditivo el grafito sería invisible.
- **Accesibilidad.** Todo texto vive en el DOM aunque se dibuje en canvas.
  Con `prefers-reduced-motion` las escenas decorativas no se montan y el contenido
  queda estático y legible.

## Pendientes

- Backend del formulario de contacto: definir `data-endpoint` en
  `<form class="formulario">` (POST JSON). Sin endpoint, el flujo se completa en local.
- Imágenes definitivas para las cuatro estaciones del Punto de partida.
