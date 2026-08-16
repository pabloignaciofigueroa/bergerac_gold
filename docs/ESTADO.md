# ESTADO — dónde quedamos

Actualizado: **16 agosto 2026**

## Fase 4 — calidad adaptativa (hecha)

Dos niveles, FULL y REDUCED, en `src/scripts/calidad.js`. No hay tercer nivel:
si ni REDUCED sirve, entra la red de `resiliencia.js`. No hay promoción, y esa
ausencia es lo que hace imposible la oscilación —por eso tampoco hace falta
ningún banco de pruebas para calibrar la máquina—.

Verificado: los cuatro instrumentos siguen en FULL con GPU real; bajo
SwiftShader arrancan en REDUCED Hero, Estudio y Método, y **Contacto se queda
en FULL** porque es el único que se sostiene ahí. El título pasa `qa titulo`
idéntico en los dos niveles (0,000 % de fisuras, cobertura 1.0000) y el lienzo
real encoge de 2880 a 1440 px al bajar.

## Pendiente real y concreto

**Una escena que nunca llega a montarse deja su hueco vacío.** La red de la
fase 3 cubre la pérdida de contexto y la ausencia de WebGL, pero no el caso
"la escena no arrancó". Se destapó midiendo bajo SwiftShader: ahí Método y
Contacto —las dos que cargan su código con `import()` dinámico— a veces no
llegan a montarse, sin error, sin fallo de red y sin que su observador de
viewport se dispare. Medido 3/3 limpias en GPU real y 5/5 fallidas bajo
SwiftShader, con la misma tasa antes y después de la fase 4: **es anterior a
ella y no lo introdujo**.

Lo natural es cerrarlo en la fase 5, cuando existan los fotogramas: si una
escena lleva unos segundos en pantalla y no ha montado, se enseña su fotograma.
Mientras tanto `tools/qa/resiliencia.mjs` corre en GPU real por defecto y con
`SW=1` bajo software, donde acusa el problema.

## Situación

**El sitio es ahora un proyecto Astro.** Se migró en cinco fases, cada una con su
puerta de calidad. Lo que cambió para quien lo mantiene:

| | antes | ahora |
|---|---|---|
| el HTML | 621 líneas con todo el copy | 21 líneas que componen seis secciones |
| el CSS | `sections.css` de 1.521 líneas | quince archivos por sección, una hoja empaquetada |
| bloques repetidos | 344 líneas de copiar-pegar | tres componentes y tres archivos de datos |
| carga inicial | 3,17 MB | **1,73 MB** |
| three.js | 2.028 KB vendorizados | **706 KB** con tree-shaking |
| cortina de carga (red lenta) | 8,6 s | **3,5 s** |

Arrancar: `npm run dev`. Verificar: `npm run build && npm run preview` y el arnés
contra 4310.


Sitio **terminado y publicado**. Las seis secciones funcionan, móvil verificado,
suite de QA en verde. Repo: <https://github.com/pabloignaciofigueroa/bergerac_gold>

Últimas sesiones (14 ago):

**Sesión 1 — auditoría y cinco arreglos.** Contraste del nav en el Método,
carga inicial de 9,5 MB a 3,2 MB, encuadre de la escultura en pantalla vertical,
metadatos para compartir el enlace, y limpieza. Publicado en `d5c71cf`.

**Sesión 2 — el título del hero.** Pablo señaló fisuras dentro de las letras y
bordes sin definir. Se rehízo en dos capas y quedó aprobado. El recorrido está
en `docs/DESIGN.md`; el resumen es:

1. Se descartó que fuera cuestión de diales. El relleno incumplía la regla de
   cobertura por tres sitios a la vez y el disco caía a 3,69 px cuando hacían
   falta 5,61 — y como la talla se sortea una vez al construir, fallaba siempre
   en las mismas celdas.
2. Se descartó subir resolución (muestrear a DPR): un campo de discos necesita
   apilar π/2 ≈ 1,57 de solape para no dejar huecos, y ese número no cambia con
   la escala. 1,57 capas de alpha-over convierten un borde al 50% en un 66%.
   Pagaba ×4 partículas para conservar el mismo error.
3. Se rehízo en **dos capas**: glifo real en reposo, partículas solo al
   arrancarse, con la máscara de vaciado dibujada por las propias partículas en
   un render target.

Resultado: cobertura 1,0000 (indistinguible del texto real), 125–134 fps frente
a los 85 de antes.

## Pendientes reales

### 1. Backend del formulario de contacto
El formulario valida y muestra la confirmación, pero **no envía a ninguna parte**.
Falta definir `data-endpoint` en `<form class="formulario">` (POST JSON). Sin
endpoint, el flujo se completa en local. Decidir servicio (Formspree, un endpoint
propio, etc.).

### 2. Fotos definitivas del Punto de partida
Las cuatro estaciones usan fotos de relleno heredadas de v9
(`assets/img/photos/`: `m-origen`, `g-archivo`, `g-estudio`, `m-nebula`).
Sustituir por material real manteniendo los nombres.

### 3. Enlaces reales de los casos
"visitar survec ↗" y "visitar as arquitectura ↗" apuntan a `#proyectos`.
Poner las URLs verdaderas.

### 4. Dominio y despliegue
No hay hosting configurado. El sitio es estático puro: cualquier hosting sirve
(GitHub Pages, Netlify, Vercel). Nada que compilar.

**Confirmar el dominio.** Los `og:` del `<head>` necesitan URL absoluta y están
puestos con `https://bergerac.cl/`, deducido del correo del estudio. Si el sitio
acaba en otra dirección hay que cambiarlo en tres sitios: `canonical`, `og:url`
y `og:image`.

## Auditoría y rendimiento (15 ago)

Tras migrar se auditó el sitio en seis perfiles —de escritorio con fibra a
un móvil con 3G y la CPU frenada seis veces— con `tools/qa/auditoria.mjs`.
Salió bien lo importante: cero errores de consola en los seis, controles
funcionando en todos, y los modos degradados correctos (sin WebGL avisa y
funciona; con reduced-motion no monta escenas y la página pasa de 21.799 a
15.311px al soltar los pins).

**Fase 1 — bloqueo del hilo principal.** El plan era trocear la construcción
de las partículas, y medir antes de tocar demostró que estaba mal: construir
cuesta 32 ms en escritorio y 130-206 ms con la CPU frenada, y el bucle de
física 9 ms por frame. El perfilador de CPU señaló a otros: la creación de
los CUATRO contextos WebGL, la subida de uniforms de three, y GSAP con
ScrollTrigger (1.700 ms de JavaScript puro). Lo que sí se arregló fue que
`construir()` corría tres veces; ahora hay una firma que lo evita.

  tareas largas 30 -> 25 · bloqueo 9.015 -> 7.953 ms · peor 1.268 -> 1.035 ms

**Fase 2 — los vídeos.** De 13,59 MB a 3,27 en escritorio y 1,55 en móvil.
Ya eran VP9 sin audio a 30 fps: sobraba bitrate, no resolución. Recodificados
a CRF 34 (SSIM 0,9855 y 0,9936, verificado además con fotogramas 1:1 en
zonas de texto pequeño). Hay dos codificaciones y videos.js elige midiendo
el hueco real por la densidad de pantalla. En 3G, de 68 s a 8.

**Lo que queda del plan**, con la fase 3 ya replanteada por lo que enseñó el
perfilador:

- **Fase 3** — bajar de cuatro contextos WebGL a uno, y ver si GSAP puede
  arrancar más tarde. Toca la arquitectura de escenas.
- **Fase 4** — la textura de la isla y auditar qué de three.js sigue entrando.
- **Fase 5** — decidir la duración de la cortina de carga (5,9 s en
  escritorio, 8,3 en tablet lenta: es la coreografía diseñada, pero ahora hay
  número) y auditoría final.

Cuidado con una cosa al leer los números de bloqueo: el entorno de QA usa
WebGL por software, sin GPU, y crear un contexto así es mucho más caro que
en una máquina real. Lo estructural —cuatro contextos en vez de uno— sí se
sostiene; los milisegundos exactos, no.

## El peso que queda

Tras la migración, la carga inicial son 1,73 MB. Los dos bultos:

- **three.js, 706 KB.** Ya con tree-shaking. Bajarlo más significaría prescindir
  de partes del motor y no compensa.
- **`isla-satelite.jpg`, 501 KB.** Es la textura de la isla y la carga three.js en
  runtime. Probé a pasarla a webp y solo baja a 443 KB: es imagen satelital muy
  detallada y el formato apenas la comprime. **El recorte de verdad sería bajarle
  la resolución** —está a 1200×2055 para mostrarse en unos 400px de pantalla—,
  pero eso toca el acabado de una sección aprobada y lo tiene que ver Pablo.
  A ojo, a la mitad de resolución serían unos 130 KB.

## Por dónde seguir afinando el título

Lo que queda abierto, por si mañana se quiere apretar más:

- **La precompensación del solape del borde.** Se probó y se descartó, pero con
  el arnés que calibraba mal — ese descarte no vale. Hoy ya casi no aplica,
  porque el reposo lo dibuja el glifo, pero afectaría al grano en movimiento.
- **El umbral de aparición** (`uVisIn`/`uVisOut`, 0,8 y 9 px) se eligió a ojo.
  Sube o baja lo abrupto que se siente el desarme.
- **El tamaño del disco de la máscara** lleva un ×1,15 para cerrar costuras. Si
  se ve que la letra adelgaza al desarmarse, ese factor es el sospechoso.
- **El retorno tarda ~9 s** tras un barrido concentrado. Es el muelle de siempre
  (`SPRING 0.024`), nadie lo ha tocado — pero si se quiere más ágil, ahí está.

## Ideas mencionadas pero no abordadas

- Humo volumétrico real con shader dentro de las letras (se probó y se descartó;
  quedó el campo de partículas, que Pablo aprobó).
- Reutilizar la retícula del Método o el campo de diagnóstico en otra sección
  (ambas escenas siguen en `assets/js/escenas/`, sin montar).

## Cosas que están así a propósito

No "arreglar" esto sin preguntar:

- **`escenas/hero.js`** (bandada de boids) y **`escenas/proyectos.js`**
  (antes/después) no se usan. Se conservan para poder volver atrás cambiando un
  `data-escena` en el HTML.
- **`sections/works.js`** está desconectado del boot: la sección Casos usa el split
  de mundos en CSS, no el viaje Z.
- **`porting/v9/`** es material de referencia ya integrado. No se carga en runtime.
- **`BERGERAC-particulas_v1.html`** es el demo original del efecto, se conserva
  como referencia. (Estuvo borrado del árbol de trabajo sin commitear; recuperado.)
- **`vendor/OrbitControls.js`** SÍ se eliminó: no lo importaba nadie en todo el
  repo. Era resto del editor de vistas del Método, que ya no existe. Si algún día
  hace falta re-encuadrar la escultura a mano, está en el historial de git.
- El **texto del marquee del hero** dice "trae tu marca / proyecto / idea" sin
  acentos ni punto medio: Balimo no tiene esos glifos y el navegador los sustituye
  con otra fuente, viéndose en negrita.

## Errores de esta sesión, para no repetirlos

Están en `docs/WORKFLOW.md` y en la cabecera de `hero-particulas.js`, pero
conviene tenerlos juntos:

1. **Medí en la pantalla equivocada.** El primer veredicto fue "el interior está
   perfecto" con 0,09% de fallos… a DPR 1. En retina el mismo build daba 1,06%.
   El título **se mide a DPR 2**.
2. **El arnés calibraba una sola vez.** El campo lleva el parallax del hero y la
   deriva entre capturas se contaba como agujeros: la medida decía que un
   arreglo empeoraba las cosas cuando a ojo mejoraban. Ahora calibra por captura.
3. **Di por bueno el vaciado con una sola captura.** El borrado salía a cuadros
   en otras posiciones de cursor y la entrega volvió rechazada, con razón. Para
   eso está ahora `tools/qa/titulo-visual.mjs desarme`, que prueba cuatro.
4. **Procesos de Chrome zombis falsean el fps.** Nueve pruebas sin cerrar dieron
   29 fps donde había 84. Cerrar Chrome entre medidas de rendimiento.
5. **Una métrica mal planteada miente con seguridad.** Dos veces en una tarde.
   Si un número contradice lo que se ve, dudar del número primero.

## Si mañana hay que retomar rápido

1. `npm install` (si es la primera vez) y `npm run dev` → <http://localhost:4321>
2. Leer `CLAUDE.md` (trampas conocidas) y este archivo.
3. `docs/MAP.md` para localizar el archivo que toca.
4. `docs/DESIGN.md` si la duda es "por qué está así".
5. Tras cualquier cambio: `npm run build && npm run preview`, y el arnés
   contra el build: `QA_URL=http://127.0.0.1:4310/ node tools/qa/qa.mjs`
6. Si se toca el hero, además: `node tools/qa/qa.mjs titulo` (número) y
   `node tools/qa/titulo-visual.mjs` (imágenes para mirarlas).
