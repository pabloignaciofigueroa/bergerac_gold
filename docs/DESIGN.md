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
`data-shell` en `main.js` (`color` / `dark` / `light`).

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

Diales, todos al inicio de `hero-particulas.js`: `DOT_BORDE`, `DOT_INT`, `NUCLEO`
(fracción opaca del punto), `JITTER`, y el `presupuesto()` por tamaño de pantalla.

Física: muelle `SPRING 0.024` + `DAMPING 0.90`, repulsión con **distancia mínima**
(satura la fuerza bajo el cursor) y **techo de velocidad** — sin esos dos, las
partículas escapan y no vuelven.

## Motion

- **Reveal estándar**: cortina de color por línea (`data-anim-high`), de v9.
- **Loader**: el isotipo se traza con el progreso real de carga; 0.5s de grafito
  puro antes de que aparezca nada.
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
