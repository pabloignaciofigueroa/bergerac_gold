/* ============================================================
   BERGERAC — CARGADOR DE ESCENAS

   Monta las escenas de three declaradas con [data-escena] cuando entran en
   viewport, y las pausa al salir. Los clicks se traducen a coordenadas
   normalizadas → escena.accion(nx, ny).

   SOLO HAY DOS, y el mapa lista exactamente las dos que existen en el HTML.
   Hubo cinco más —hero (la bandada), estudio, partida, metodo y proyectos—
   de cuando cada sección iba a llevar su propia escena aquí. Ninguna llegó a
   usarse: la isla y la escultura acabaron viviendo en sections/, con su
   propio ciclo de vida. Se han quitado porque un `import()` en este mapa
   basta para que su código VIAJE al publicado aunque nadie lo monte, y esas
   cinco se traían además los complementos de líneas de three.

   Si algún día vuelve una, se añade su archivo y su línea aquí.
   ============================================================ */

const MODULOS = {
  'hero-particulas': () => import('./escenas/hero-particulas.js'),
  contacto: () => import('./escenas/contacto.js'),
};

import { estaCaida, soportaWebGL, marcarSinWebGL } from './resiliencia.js';

if (!soportaWebGL()) {
  /* Mismo camino que la pérdida de contexto: un solo estado fijo para las
     dos situaciones, con estilos en la hoja y no incrustados aquí. En la
     fase 5 este hueco lo ocupa el fotograma de la escena real.
     Marca los cuatro huecos, no solo los que cuelgan de esta carga: el
     estudio y el método arrancan por su cuenta desde main.js. */
  marcarSinWebGL();
} else {
  const montajes = Array.from(document.querySelectorAll('[data-escena]'));

  const cargador = new IntersectionObserver((entradas) => {
    entradas.forEach(async (en) => {
      const mount = en.target;
      if (!en.isIntersecting) { mount._escena?.stop?.(); return; }
      if (estaCaida(mount)) return;   /* su contexto ya se perdió en esta sesión */
      if (!mount._escena) {
        if (mount._cargando) return;
        mount._cargando = true;
        const nombre = mount.dataset.escena;
        try {
          const mod = await MODULOS[nombre]();
          mount._escena = await mod.init(mount);
          conectarClicks(mount);
        } catch (err) {
          console.warn(`[escena ${nombre}] no pudo iniciarse:`, err);
          mount._escena = { start() {}, stop() {} };
        }
        mount._cargando = false;
      }
      mount._escena.start?.();
    });
  }, { rootMargin: '200px 0px' });

  montajes.forEach((m) => cargador.observe(m));

  function coordsNorm(el, e) {
    const r = el.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width - .5) * 2,
      -((e.clientY - r.top) / r.height - .5) * 2,
    ];
  }

  function conectarClicks(mount) {
    const nombre = mount.dataset.escena;
    if (nombre === 'contacto') {
      /* el lienzo va detrás del contenido: el click llega por la sección,
         solo cuando cae en zona vacía */
      const seccion = mount.closest('section');
      seccion.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input, textarea, label, form, .disclosure')) return;
        const [nx, ny] = coordsNorm(mount, e);
        mount._escena?.accion?.(nx, ny);
      });
      return;
    }
    mount.addEventListener('click', (e) => {
      const [nx, ny] = coordsNorm(mount, e);
      mount._escena?.accion?.(nx, ny);
    });
  }

  /* botón "soltar la bandada" del hero */
  document.querySelectorAll('[data-accion-escena]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mount = document.querySelector(`[data-escena="${btn.dataset.accionEscena}"]`);
      mount?._escena?.accion?.(0, 0);
    });
  });
}

/* ── formulario → confirmación (texto aprobado v9 — F18) ─────────────── */
const form = document.querySelector('[data-formulario]');
const confirmacion = document.querySelector('.formulario-confirmacion');
if (form && confirmacion) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.hidden = true;
    confirmacion.hidden = false;
  });
}
