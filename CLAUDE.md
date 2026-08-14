# Bergerac — contexto de trabajo

Sitio de **Bergerac**, estudio digital en Castro, Chiloé. Página única, seis
secciones, cada una con su instrumento WebGL. Sin dependencias externas.

> **Lee primero esto, no explores el código a ciegas.** Si necesitas más detalle:
> `docs/MAP.md` (qué hace cada archivo) · `docs/DESIGN.md` (decisiones y por qué)
> · `docs/WORKFLOW.md` (cómo trabajamos y cómo se hace QA) · `docs/ESTADO.md`
> (dónde quedamos y qué falta).

## Arrancar

```bash
node tools/server.mjs          # → http://localhost:4300
```

El puerto **4300** es propio; el 4173 pertenece a la versión antigua `bergerac_vgold`.
Si algo se ve “viejo”, casi siempre es un servidor antiguo en 4173 o caché del
navegador: recargar con **Ctrl+Shift+R**.

No funciona abriendo `index.html` con doble clic (módulos ES bloqueados en `file://`).

## Reglas del proyecto

1. **Autocontenido.** Nada de CDNs ni rutas fuera de esta carpeta. Lo que se
   necesite se copia dentro y se usa desde dentro.
2. **QA antes de entregar.** Nunca reportar “listo” sin verificar en Chrome real.
   El arnés ya existe: `node tools/qa/qa.mjs` (ver `docs/WORKFLOW.md`).
3. **Una cosa a la vez.** Pablo trabaja por pasos y revisa cada uno. No encadenar
   varios cambios grandes sin mostrar resultado.
4. **Los textos son de Pablo.** No reescribir copy salvo que lo pida.
5. **Español** en comentarios, commits y documentación.

## Trampas que ya nos costaron tiempo

- **Pins de ScrollTrigger.** Partida, Método y el anclaje de lectura de cada etapa
  usan `pin`. Un `refresh()` mientras un pin está activo descoloca la sección: por
  eso existe `safeRefresh` con debounce en `main.js`. No llamar `ScrollTrigger.refresh()`
  directamente desde una sección.
- **El `<h1>` del hero se mide.** Las partículas muestrean el título real (fuente,
  talla y posición que le da `hero-fit.js`). El `<h1>` debe seguir en el DOM con su
  caja intacta: se oculta con `opacity`, **nunca** con `display:none` ni `visibility`.
- **Nada de blending aditivo sobre el azul.** El grafito en aditivo es invisible.
  Las partículas usan alpha-over **premultiplicado** (el contexto WebGL es
  `premultipliedAlpha: true`).
- **Fuerzas 1/distancia.** Siempre con distancia mínima y techo de velocidad, o las
  partículas salen disparadas fuera de la sección y no vuelven.
- **`crearBase` llama a `resize()` de forma síncrona.** Cualquier variable que use
  su callback `onResize` debe declararse **antes** de llamarlo (zona muerta temporal).
- **Balimo no tiene acentos ni el punto medio (·).** Si un texto en esa fuente los
  lleva, el navegador los rellena con otra tipografía y se ven en negrita. Evitarlos
  en los textos que usan `--font-brand`.
- **La slab es muy ancha.** En móvil, un titular de 9–10 letras a 15vw se sale de la
  pantalla. Las tallas móviles están acotadas al final de `sections.css`.

## Estado

Sitio terminado y publicado en <https://github.com/pabloignaciofigueroa/bergerac_gold>.
Pendientes reales en `docs/ESTADO.md`.
