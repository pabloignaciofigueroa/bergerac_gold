# Bergerac — Estudio digital

Sitio de **Bergerac**, estudio digital en Castro, Chiloé.

Una sola página con seis secciones, cada una con su propio instrumento interactivo
en WebGL. Proyecto **Astro** que compila a estático: lo que se publica no pide
nada a ningún servidor ni CDN.

## Arrancar

```bash
npm install
npm run dev          # → http://localhost:4321   con recarga en caliente
```

Para ver exactamente lo que se va a publicar:

```bash
npm run build        # → dist/
npm run preview      # → http://localhost:4310
```

## Las seis secciones

| # | Sección | Instrumento |
|---|---|---|
| 01 | Hero | **BERGERAC en partículas** — en reposo es tipografía real; al pasar el cursor la palabra se deshace en grano |
| 02 | El estudio | **Isla de Chiloé en 3D** con textura satelital y elevación real |
| 03 | Punto de partida | Travelling horizontal pineado, un color de marca por problema |
| 04 | Método | **Escultura de 7 vistas** que muta a lo largo de las cuatro etapas, con bisagra cromática morado → fucsia |
| 05 | Casos | Split de dos mundos con vídeo real de cada proyecto; al hover pasan a grafito |
| 06 | Contacto | Campo de partículas y formulario |

## Arquitectura

```
src/
  pages/index.astro          compone las seis secciones
  layouts/Base.astro         head, cortina de carga, shell, arranque del bundle
  components/
    shell/                   Loader · SkipLink · Header · MenuOverlay
    secciones/               Hero · Estudio · Partida · Metodo · Casos · Contacto
    partida/ metodo/ casos/  Estacion · Etapa · Caso  (uno por bloque repetido)
  data/                      estaciones, etapas y casos: solo contenido
  styles/
    tokens.css               paleta cerrada, tipografía, motion, temas
    base.css                 reset, @font-face, shell, loader, cursor, menú
    secciones.css            ÍNDICE de la cascada — su orden importa
    secciones/               los quince trozos por sección
  scripts/
    entrada.js               entrada del bundle: globales y arranque
    main.js                  boot único: GSAP, ciclo de escenas, shell cromático
    escenas/                 escenas WebGL independientes (partículas, contacto…)
    sections/                escenas acopladas al scroll (isla, método, partida)
  assets/img/                fotos que optimiza el build (webp + srcset)
public/assets/               fuentes, vídeo, texturas de la isla, favicon
tools/                       servidor de apoyo y arnés de QA
```

**Lo que se publica es autocontenido.** Las dependencias (three.js, GSAP, Lenis)
son de npm y viajan empaquetadas y con tree-shaking dentro de `dist/`.

## Decisiones que conviene conocer antes de tocar el código

- **El JS no son islas de Astro.** Es un boot global único con un `ctx`
  compartido, un solo `requestAnimationFrame` y pins de ScrollTrigger que se
  coordinan entre sí. Astro aquí es capa de plantillas y build, no de runtime.
- **Nada debe importar `three` estáticamente** desde el grafo de `main.js`: son
  700 KB y retrasan la cortina de carga. Las escenas lo cargan al entrar en
  viewport.
- **Los pins de scroll son frágiles.** Cualquier `refresh()` durante un pin activo
  descoloca la sección: para eso está el `safeRefresh` con debounce de `main.js`.
- **El hero mide el DOM.** Las partículas muestrean el `<h1>` real, así que debe
  seguir presente con su caja intacta —se oculta con `opacity`, nunca con
  `display`.
- **El título son dos capas.** En reposo lo dibuja el glifo real a resolución de
  pantalla; las partículas solo aparecen al arrancarse y abren su hueco con una
  máscara que dibujan ellas mismas.
- **El orden del CSS es la cascada** y está escrito a mano. Los imports de
  `Base.astro` y el índice `secciones.css` no se reordenan sin comprobarlo.
- **Accesibilidad.** Todo texto vive en el DOM aunque se dibuje en canvas. Con
  `prefers-reduced-motion` las escenas decorativas no se montan.

## Pendientes

Ver `docs/ESTADO.md`. Los principales: el backend del formulario de contacto, las
fotos definitivas de las cuatro estaciones y los enlaces reales de los casos.
