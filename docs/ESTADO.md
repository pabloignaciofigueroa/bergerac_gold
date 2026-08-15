# ESTADO — dónde quedamos

Actualizado: **14 agosto 2026**

## Situación

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

1. `node tools/server.mjs` → <http://localhost:4300>
2. Leer `CLAUDE.md` (trampas conocidas) y este archivo.
3. `docs/MAP.md` para localizar el archivo que toca.
4. `docs/DESIGN.md` si la duda es "por qué está así".
5. Tras cualquier cambio: `node tools/qa/qa.mjs`
6. Si se toca el hero, además: `node tools/qa/qa.mjs titulo` (número) y
   `node tools/qa/titulo-visual.mjs` (imágenes para mirarlas).
