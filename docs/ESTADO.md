# ESTADO — dónde quedamos

Actualizado: **14 agosto 2026**

## Situación

Sitio **terminado y publicado**. Las seis secciones funcionan, móvil verificado,
suite de QA en verde. Repo: <https://github.com/pabloignaciofigueroa/bergerac_gold>

Última sesión (14 ago): auditoría completa del sitio y cinco arreglos —
contraste del nav en el Método, carga inicial de 9,5 MB a 3,2 MB, encuadre de la
escultura en pantalla vertical, metadatos para compartir el enlace y limpieza.

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

## Si mañana hay que retomar rápido

1. `node tools/server.mjs` → <http://localhost:4300>
2. Leer `CLAUDE.md` (trampas conocidas) y este archivo.
3. `docs/MAP.md` para localizar el archivo que toca.
4. `docs/DESIGN.md` si la duda es "por qué está así".
5. Tras cualquier cambio: `node tools/qa/qa.mjs`
