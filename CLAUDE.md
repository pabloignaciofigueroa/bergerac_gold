# Bergerac — contexto de trabajo

Sitio de **Bergerac**, estudio digital en Castro, Chiloé. Página única, seis
secciones, cada una con su instrumento WebGL. Proyecto **Astro** con build.

> **Lee primero esto, no explores el código a ciegas.** Si necesitas más detalle:
> `docs/MAP.md` (qué hace cada archivo) · `docs/DESIGN.md` (decisiones y por qué)
> · `docs/WORKFLOW.md` (cómo trabajamos y cómo se hace QA) · `docs/ESTADO.md`
> (dónde quedamos y qué falta).

## Arrancar

```bash
npm install          # la primera vez
npm run dev          # → http://localhost:4321  (Astro, con recarga)
```

Para probar lo que se va a publicar de verdad:

```bash
npm run build        # → dist/
npm run preview      # → http://localhost:4310  (sirve dist/)
```

El arnés de QA apunta por defecto a **4300**. Para medir contra el build:
`QA_URL=http://127.0.0.1:4310/ node tools/qa/qa.mjs`.

## Cómo está montado

- **Astro estático.** `astro build` escupe `dist/` y eso se copia a cualquier
  hosting. No hay servidor ni SSR.
- `src/pages/index.astro` compone seis secciones sobre `src/layouts/Base.astro`.
- El copy vive en cada sección; los bloques repetitivos (estaciones, etapas,
  casos) salen de `src/data/`.
- **El JS es un boot global único**, no islas de Astro. Un solo `ctx`
  compartido, un solo `requestAnimationFrame`, y pins de ScrollTrigger que se
  coordinan entre sí. No trocearlo en componentes con `client:*`.
- `src/scripts/entrada.js` es la entrada del bundle: monta los globales que el
  código espera (`window.gsap`, `window.SplitText`, `window.Lenis`) y arranca.

## Reglas del proyecto

1. **Autocontenido en lo que se publica.** `dist/` no pide nada a ningún CDN.
   Las dependencias (three, GSAP, Lenis) son de npm y viajan empaquetadas —esto
   cambió al migrar a Astro; antes estaban vendorizadas en el repo.
2. **QA antes de entregar.** Nunca reportar “listo” sin verificar en Chrome real.
   El arnés ya existe: `node tools/qa/qa.mjs` (ver `docs/WORKFLOW.md`).
3. **Una cosa a la vez.** Pablo trabaja por pasos y revisa cada uno. No encadenar
   varios cambios grandes sin mostrar resultado.
4. **Los textos son de Pablo.** No reescribir copy salvo que lo pida.
5. **Español** en comentarios, commits y documentación.

## Trampas que ya nos costaron tiempo

- **Una escena WebGL nunca puede romper la página.** Todo contexto pasa por
  `protegerContexto` de `src/scripts/resiliencia.js`: si se pierde, la escena se
  para y su hueco enseña el estado fijo. **No se reconstruye sola** — rehacerla
  la devuelve a la situación que tiró el contexto y suele volver a perderlo.
  Se queda en fijo hasta recargar, y es decisión de dirección, no una
  limitación. Lo vigila `node tools/qa/resiliencia.mjs`.
- **La calidad tiene DOS niveles, no tres.** FULL es Bergerac; REDUCED es la
  misma pieza más barata de pintar. No existe un tercer nivel: si ni REDUCED
  sirve, o se pierde el contexto, o no hay WebGL, entra la red de
  `resiliencia.js`, que es manejo de errores y no un nivel. Todo vive en
  `src/scripts/calidad.js`.
- **No hay promoción, y esa es la pieza que lo sostiene.** Lo que baja no
  vuelve hasta recargar. Medir la calidad que tú mismo elegiste solo es
  circular si existe camino de vuelta arriba: sin él, el buen tiempo de un
  nivel barato no puede leerse como "sube". Por eso NO hace falta ningún
  banco de pruebas para calibrar la máquina. No añadir promoción.
- **Cada instrumento paga lo suyo.** El tiempo de fotograma de una escena no
  decide por otra. Contacto NO baja por ser decorativo: en el perfil por
  software fue la única que se sostuvo. Se puede atribuir el intervalo de la
  página a una escena porque solo hay una en pantalla a la vez.
- **La CPU estrangulada no simula una GPU débil.** Sirve para probar que el
  mecanismo de bajada funciona. No reduce el relleno, que es donde sufren
  estas escenas, y deja a varias rozando el techo: por eso la puerta exige el
  contrato y no un resultado concreto. Lo determinista es el perfil `forzado`.
- **Reducir partículas del título es seguro para la cobertura.** `muestrear()`
  escala `gapBorde` y `gapInt` juntos, el radio sale de `gapInt·DOT_INT·NUCLEO`
  y el desorden de `gapInt·JITTER`: todo proporcional al paso, así que la
  desigualdad queda en constantes. Verificado: 0,000 % de fisuras y cobertura
  1.0000 en los dos niveles. Lo que NO es invariante son las constantes
  mismas — eso sigue valiendo.
- **`?calidad=reduced` y `?calidad=full`** fuerzan el nivel para poder ver las
  dos versiones en la misma máquina.
- **Pins de ScrollTrigger.** Partida, Método y el anclaje de lectura de cada etapa
  usan `pin`. Un `refresh()` mientras un pin está activo descoloca la sección: por
  eso existe `safeRefresh` con debounce en `main.js`. No llamar `ScrollTrigger.refresh()`
  directamente desde una sección.
- **El `<h1>` del hero se mide.** Las partículas muestrean el título real (fuente,
  talla y posición que le da `hero-fit.js`). El `<h1>` debe seguir en el DOM con su
  caja intacta: se oculta con `opacity`, **nunca** con `display:none` ni `visibility`.
- **El título son DOS capas.** En reposo lo dibuja un quad con el glifo a
  resolución de pantalla; las partículas solo aparecen al arrancarse y abren el
  hueco con una máscara que dibujan ellas mismas en un render target. La máscara
  con rejilla de CPU ya se probó y borra a cuadros. Ojo: el render target tiene la
  coordenada v invertida respecto al lienzo del glifo.
- **Las partículas del título tienen una regla de cobertura.** El disco sólido debe
  alcanzar el centro de la celda de su retícula, contando el desorden:
  `paso·DOT·NUCLEO·2 ≥ (paso + 2·jitter)·√2`. Nada que encoja el punto en reposo
  —talla aleatoria, pulso, bajar `DOT_INT`— sin rehacer esa cuenta. Se mide con
  `node tools/qa/qa.mjs titulo`, y hay que mirarlo **a DPR 2**: a DPR 1 no se ve.
- **La cortina de carga se pinta desde el HTML, no desde el CSS empaquetado.**
  `loader.js` va en el bundle y sus capas opacas las crea él: hasta que corre, el
  sitio ya estaría a la vista. Cubren `html.cargando` y un `<style is:inline>` en
  `Base.astro`. No mover ese bloque ni quitarle el `is:inline`, y no quitar
  `class="cargando"` del `<html>`: quien lo retira es `loader.js`.
- **El orden de los imports de CSS en `Base.astro` ES la cascada.** tokens → base
  → el índice de secciones, y dentro de ese índice los quince trozos en su orden.
  Reordenar rompe el tema. Lo comprueba `node tools/qa/estilos.mjs`.
- **Nada que importe `three` de forma estática en el grafo de `main.js`.** Son
  700 KB y bloquearían el arranque: la cortina llegaba 8,6 s tarde. Las escenas lo
  importan dinámicamente cuando entran en viewport.
- **Nada de blending aditivo sobre el azul.** El grafito en aditivo es invisible.
  Las partículas usan alpha-over **premultiplicado**.
- **Fuerzas 1/distancia.** Siempre con distancia mínima y techo de velocidad.
- **`crearBase` llama a `resize()` de forma síncrona.** Cualquier variable que use
  su callback `onResize` debe declararse **antes** de llamarlo.
- **Balimo no tiene acentos ni el punto medio (·).** Evitarlos en `--font-brand`.
- **La slab es muy ancha.** En móvil un titular de 9–10 letras a 15vw se sale.
  Las tallas móviles están acotadas en `src/styles/secciones/movil.css`, que va
  el último de la cascada.
- **`autoplay` gana a `preload="metadata"`.** Los vídeos van con `data-src` y los
  monta `videos.js` por viewport.
- **El `fov` de three es vertical.** Una cámara encuadrada en apaisado pierde campo
  horizontal en retrato; ver `ajusteRetrato` en `sections/metodo.js`.
- **El grafito no es legible sobre morado ni fucsia** a talla de nav. El header
  tiene cuatro estados por eso, no tres.

## Estado

Sitio terminado y publicado en <https://github.com/pabloignaciofigueroa/bergerac_gold>.
Pendientes reales en `docs/ESTADO.md`.
