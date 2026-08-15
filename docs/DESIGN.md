# DESIGN — sistema y decisiones

Lo que está decidido y **por qué**. Si algo aquí se contradice con el código, gana
el código: avisar y actualizar este archivo.

## Origen

El sitio es la fusión de dos versiones anteriores, resuelta sección por sección:

- **`bergerac_vgold`** aportó el esqueleto y las piezas 3D (isla de Chiloé,
  escultura del Método, travelling del Punto de partida).
- **`bergerac_v9`** aportó toda la piel: tipografía, color, motion, cursor, menú,
  loader, marquees.

Regla que rigió la fusión: *el esqueleto de vgold es aceptable, su acabado es
deficiente; los reveals y el motion de v9 son buenos*. Y: **v9 mostraba demasiado
texto**, así que en cada sección se podó.

## Color

Paleta **cerrada de seis**. No introducir colores nuevos.

| Token | Hex | Uso |
|---|---|---|
| `--blue` | `#00a1ff` | Hero |
| `--purple` | `#6f02ba` | Método (primera mitad), estación 01 |
| `--fuchsia` | `#fb0278` | Método (segunda mitad), Casos, estación 02 |
| `--yellow` | `#ffb701` | Contacto, estación 04 |
| `--graphite` | `#252522` | Tinta, Punto de partida |
| `--warm-white` | `#fdfcfa` | Estudio, Casos |

**Isotipo camaleónico** (regla explícita de Pablo): sobre fondo de color → negro;
sobre grafito → blanco; sobre blanco → sus colores originales. Implementado con
`data-shell` en `main.js` (`color` / `dark` / `light` / `color-oscuro`).

El cuarto estado, `color-oscuro`, salió de medir el contraste del nav (11px,
opacidad .82). Con grafito ninguno de los tres colores oscuros llegaba al 4.5:1
que pide AA:

| Fondo | Grafito | Negro puro | Blanco cálido |
|---|---|---|---|
| Azul `#00a1ff` | 4.24 | **6.21** | 2.26 |
| Fucsia `#fb0278` | 3.48 | **4.79** | 2.83 |
| Amarillo `#ffb701` | 5.91 | **9.02** | 1.54 |
| Morado `#6f02ba` | 1.71 | 2.28 | **6.03** |

De ahí la regla actual: sobre los tres colores **claros** la tinta es negro puro
(el salto desde grafito es imperceptible a esa talla y hace pasar los tres);
el **morado** es fondo oscuro y ninguna tinta negra lo salva, así que ahí el
header entero se invierte a blanco cálido — que es lo que la regla camaleónica
pide sobre cualquier fondo oscuro. Lo decide `refreshShell` leyendo la bisagra
cromática del Método.

**Un color por problema** en el Punto de partida: 01 morado, 02 fucsia, 03 amarillo,
04 azul. Cubre número, regla, marco de la foto, esquinas y panel desplegable.

## Tipografía

**v9 es la maestra.** Las fuentes de vgold (Bricolage, Manrope, Instrument Serif)
fueron eliminadas del proyecto.

| Rol | Fuente | Dónde |
|---|---|---|
| Display | **DemoDisplay** (slab) | Titulares, marquees, palabras gigantes |
| Cuerpo | **Mona Sans** | Textos, formularios, navegación |
| Marca | **Balimo** | Solo piezas de marca. Ojo: **sin acentos ni `·`** |

Reglas de talla ya acordadas:
- Títulos de sección 02, 03 y Método: la misma escala (`clamp(42px, 6.8vw, 94px)`);
  el del Método al 80% de esa.
- Todos los titulares en **mayúsculas**.
- El título del hero se ajusta por JS al ancho exacto entre logo y menú.
- En móvil, tallas acotadas al final de `sections.css` (la slab desborda).

## Las seis secciones

| # | Qué se decidió | Origen |
|---|---|---|
| 01 Hero | Estructura y textos de v9 **literales**. Foto recortada con una pieza del isotipo. Marquee "trae tu marca / proyecto / idea". El título es el campo de partículas. | v9 |
| 02 Estudio | Estructura v9 con la firma a mano. La **isla 3D flota libre a la derecha**, sin marco, detrás de los textos y delante del fondo. | mixto |
| 03 Partida | **Travelling horizontal** de vgold. Cada problema en dos columnas: foto a la izquierda, título + acción a la derecha. | vgold |
| 04 Método | **Flujo escultórico** de vgold, con portada y cierre "METODO" centrados, y anclaje de lectura de ~1 pantalla por etapa. | vgold |
| 05 Casos | **Split de dos mundos** de v9, ambos en blanco cálido; al hover el mundo entero pasa a grafito. Vídeo real de cada proyecto. | v9 |
| 06 Contacto | v9 **literal**, con footer de vgold eliminado. | v9 |

Descartados por decisión: bandada de boids del hero, campo de diagnóstico, retícula
del Método, antes/después generativo de los casos, viaje Z de works.

### La escultura en pantalla vertical

Las nueve vistas del Método tienen posición de cámara y `fov` escritos a mano
mirando una pantalla apaisada, más un `SHIFT` lateral para que la figura conviva
al lado del copy. En retrato eso se rompía dos veces: el `fov` de three es
**vertical**, así que al estrecharse el marco el campo horizontal se hunde y la
escultura se sale por los lados; y el copy ya no está al lado sino debajo, con lo
que el `SHIFT` solo la empujaba más afuera. Resultado medido en 390px: bloques de
color plano con una esquirla de escultura en una esquina.

Se corrige alejando la cámara del target lo justo para recuperar el ancho perdido
y anulando el `SHIFT` lateral. El umbral es el **cuadrado**, no la proporción de
diseño (1.6): así el escritorio queda intacto en cualquier ventana apaisada — que
es como se aprobó — y el ajuste entra de forma continua, sin salto al redimensionar.

Para no juzgarlo por capturas (que con la escultura animada nunca son iguales),
`window.__metodo.encuadre()` proyecta la caja envolvente y devuelve qué fracción
cae dentro del marco. Avisa con `fiable: false` cuando una esquina queda detrás
de la cámara y la proyección deja de tener sentido.

## El hero en partículas — el detalle fino

Es la pieza con más ingeniería. Objetivo: **que se lea como una fuente definida y
que al pasar el cursor sorprenda descubrir que son partículas**.

**Dos poblaciones distintas** (esto es lo que da la definición):

- **Contorno**: paso fino (~1.2px), **sin desorden**, y cada partícula lleva la
  opacidad real del píxel del glifo — hereda el antialiasing que calculó la fuente.
  Por eso los remates de la slab tienen esquinas rectas.
- **Relleno**: paso grueso (~3px) y con desorden. Solo tiene que tapar.

La banda del contorno **acaba exactamente donde empieza el relleno** (el radio de
exclusión es el radio sólido del punto de relleno): ni hueco entre ambos, ni relleno
desbordando la letra.

**La sorpresa**: en reposo las partículas del contorno valen ~1 píxel con opacidad
parcial (invisibles como partículas, perfectas como tipografía). Al arrancarse
**crecen 2.4× y ganan opacidad plena** — recién ahí se revelan como granos.

**Sin color de excitación** (decisión de Pablo): siempre grafito. El desarme se lee
por movimiento y tamaño.

### Dos capas: por qué el reposo no lo dibujan las partículas

El título en reposo es un **quad con el glifo rasterizado a resolución de
pantalla**. No es comodidad: un campo de discos no puede ser nítido, por
geometría. Para no dejar huecos, el disco sólido debe alcanzar el centro de su
celda (`diámetro ≥ celda·√2`), y eso obliga a **1,57 discos apilados sobre cada
punto**, un número que no cambia con la escala. Con 1,57 capas de alpha-over un
píxel al 50% se pinta al 66%: la rampa de antialiasing se aplasta y la letra se
lee engordada. Por eso también se descartó muestrear a DPR: pagaba ×4 partículas
para conservar el mismo error.

Las partículas aparecen solo al arrancarse, y **la máscara que abre el glifo la
dibujan ellas mismas** en una pasada a un render target: cada una pinta un disco
en su casa con su grado de arranque. La letra se abre con la forma del grano y se
cierra sola según vuelven.

Se probó antes con una rejilla en CPU y no sirve: borra en celdas y la letra se
come a cuadros. Tres detalles que costaron y que no hay que repetir: el render
target tiene la v invertida respecto al lienzo (sin voltearla deja hilos de letra
sin borrar); el disco de la máscara debe ser al menos tan grande como la tinta
que borra; y el umbral para aparecer (~1px) tiene que ser mucho menor que el de
engordar el grano, o la letra aguanta entera y se rompe de golpe.

## Motion

- **Reveal estándar**: cortina de color por línea (`data-anim-high`), de v9.
- **Loader**: el isotipo se traza con el progreso real de carga; 0.5s de grafito
  puro antes de que aparezca nada. Lo que **cubre** desde el primer pintado no es
  el loader sino `html.cargando` más un `<style>` crítico en línea: `loader.js`
  es un módulo y hasta que corre no existen sus cortinas, así que antes se veía
  el hero y la pantalla de carga llegaba después. El traspaso (quitar `cargando`
  y el fondo del contenedor) ocurre en cuanto los dos actos están montados; si no,
  al subir las cortinas asomaría grafito en vez de la página.
- **Parallax del hero**: estilo v9 — el título deriva **contra** el cursor (−9px) y
  el número fantasma lo **sigue** (+30px). El movimiento opuesto es lo que crea la
  profundidad. Cuando las partículas están activas, el título lo mueve el canvas.
- **Desplegables**: 0.42s de apertura con easing, contenido en cascada. Nunca de golpe.
- **Bisagra cromática del Método**: morado → fucsia exactamente en el **punto medio**
  entre la liberación de "Definir" y el anclaje de "Construir".

## Accesibilidad

- Todo el texto vive en el DOM aunque se dibuje en canvas.
- `prefers-reduced-motion`: las escenas decorativas no se montan, el título del hero
  queda como texto nítido, los reveals no corren.
- Sin WebGL: la página funciona completa, solo sin instrumentos.
- Skip-link, focus visible, `aria-expanded` en desplegables.
- Los subrayados bajo los links del menú están **prohibidos** (regla de Pablo): el
  hover es el text-roll.
