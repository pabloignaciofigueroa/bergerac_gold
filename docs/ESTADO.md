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

## Fase 5 — la red visual (hecha)

Cinco fotogramas sacados de las escenas reales con `toDataURL()`: la isla y
cuatro del Método, uno por etapa. No son ilustraciones parecidas, son el
instrumento detenido, así que no hay una segunda dirección de arte que
mantener. Van con **canal alfa**: el fondo lo sigue poniendo el CSS y la
bisagra cromática sigue viva por debajo.

Se ven en cuatro casos y en ninguno más: no hay WebGL, se pierde el contexto,
**la escena no llega a arrancar** —el hueco que quedaba abierto— o se pidió
menos movimiento. En FULL y en REDUCED no se descarga ni uno; son 392 KB que
el visitante normal no ve pasar, y lo vigila `npm run fotogramas`.

Hero y Contacto no llevan fotograma, y esa es la resolución: el título va en
tipografía real y el formulario está completo. Por eso los dos ya iban
`aria-hidden`.

Una trampa que costaría cara y queda anotada: **la bisagra cromática la mueve
la escultura**. Sin ella la sección se quedaría morada de principio a fin y
los dos fotogramas con luz fucsia caerían sobre morado. Por eso el mismo
disparador cambia el fotograma y el tema.

`color-mix()` lleva respaldo solo en los ocho bordes, que es donde perder la
declaración deja el elemento SIN borde. `@property` ya degradaba solo: la
variable está definida localmente y sin soporte únicamente se pierde la
animación.

## Depuración (terminada, con una corrección propia)

Una auditoría posterior, que volvió a ejecutar todo desde cero en vez de
confiar en los commits anteriores, encontró que la limpieza se había quedado
a mitad: 28 selectores CSS muertos seguían sin tocar en seis archivos, y dos
de ellos habían sido protegidos por error en la sesión anterior tras una
verificación manual floja. Corregido:

- **Carpetas vacías fuera.** `porting/` y sus subcarpetas no las rastreaba
  git —no viajaban a ningún despliegue— pero quedaban en el disco local tras
  borrar sus 54 archivos. `rmdir` recursivo.
- **`.site-header__cta` (base.css), fuera.** Se había dado por viva por un
  grep que encontró la clase en `main.js:114` — pero esa línea solo la
  CONSULTA (`classList.contains`) para preguntar si un enlace la lleva;
  ningún enlace la lleva nunca. 21 líneas de un botón de header que el diseño
  actual no tiene.
- **`estudio.css`, del 71 % muerto al 0 %.** Ocho clases —`.estudio__layout`,
  `.estudio__piece`, `.estudio__content`, `.estudio__title`, `.estudio__body`,
  `.estudio__disclosure`, `.estudio__mirada`— eran de una estructura de
  markup anterior a `Estudio.astro`. El archivo se quedó fuera del alcance
  de la limpieza anterior sin que quedara dicho en ningún sitio.
- **Un fallback que no protegía nada, corregido.** `responsive-fino.css`
  tenía `.estudio--sin3d .estudio__piece/.estudio__layout`: la clase
  `estudio--sin3d` sí se sigue añadiendo (`estudio.js:612`), pero sus
  reglas apuntaban a las mismas clases muertas del punto anterior, así que
  no hacían nada. El fallback real hoy es el fotograma de `mostrarFijo()`
  (fase 5); la regla vieja no protegía nada y se quitó.
- **Diez reglas sueltas más** en `estudio-v9.css` (`.instrumento--ancho`,
  `.plegable + .plegable` —nunca hay dos `.plegable` contiguos—,
  `.meta-row`, `.works__media` ×3), `hero-v9.css` (`.hero-meta`) y
  `metodo.css` (`.metodo__eyebrow`).
- **`trazos.js` entero, quitado.** `docs/MAP.md` ya decía "hoy sin uso en
  el HTML": ningún elemento lleva `data-trazo`, así que `initTrazos()`
  corría en cada visita —dentro del bundle principal de 207 KB— sin
  encontrar nunca nada que animar. Sus tres reglas CSS (`.anota`,
  `.trazo-svg`, `.trazo-svg path`) habían sido dadas por vivas en la
  auditoría por un `grep` que hacía coincidir "anota" dentro de la palabra
  "anota**ciones**" de un comentario — el detector automático las tenía
  bien marcadas como muertas desde el principio.
- **`sharp` declarada donde debía.** `tools/capturar-fotogramas.mjs` la
  importa directamente, pero solo resolvía por ser dependencia transitiva
  de Astro. Añadida a `devDependencies` con la versión instalada, para que
  no dependa de una relación interna de Astro que puede cambiar.

Verificado con el detector re-ejecutado tras cada corrección: de 496 reglas
originales, **302 encajan con algo — el mismo número antes y después de
todas las correcciones**, prueba de que no se rompió nada. Solo queda 1
selector sin encajar: un `:has()` en Partida que se activa al pulsar
"ver más", interacción que el guion de recorrido automático no dispara —
confirmado vivo por `grep` directo, no se toca.

## Pendientes## Pendientes

Ninguno abierto de las fases 3, 4 y 5. Lo que queda anotado:

- El comparador `estilos` ya no puede medir contra el sitio pre-Astro: esa
  referencia dejó de arrancar cuando las dependencias vendorizadas pasaron a
  npm. Hoy verifica que bajar a REDUCED no mueve la composición.
- `isla-satelite.jpg` sigue pesando 501 KB. El recorte real es de resolución
  y necesita tu ojo, no una recompresión.

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
