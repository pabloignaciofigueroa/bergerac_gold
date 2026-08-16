/* ============================================================
   BERGERAC MERGE — CARGADOR DE ESCENAS (F9: loader v9 portado)
   Monta las escenas Three.js declaradas con [data-escena] cuando
   entran en viewport (lazy) y las pausa al salir. Los clicks se
   traducen a coordenadas normalizadas → escena.accion(nx, ny).
   [data-accion-escena="hero"] dispara la acción desde un botón.
   Las escenas son CONTENIDO (se montan aunque haya reduced-motion);
   sin WebGL, los marcos .instrumento-lienzo lo explican.
   Escenas activas por fase: hero (F9). Las demás entran cuando su
   sección se decida (F11, F13, F15, F17, F18).
   ============================================================ */

const MODULOS = {
  'hero-particulas': () => import('./escenas/hero-particulas.js'),
  /* la bandada queda disponible: volver atrás es cambiar data-escena */
  hero: () => import('./escenas/hero.js'),
  estudio: () => import('./escenas/estudio.js'),
  partida: () => import('./escenas/partida.js'),
  metodo: () => import('./escenas/metodo.js'),
  proyectos: () => import('./escenas/proyectos.js'),
  contacto: () => import('./escenas/contacto.js'),
};

import { mostrarFijo, estaCaida } from './resiliencia.js';

function soportaWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

if (!soportaWebGL()) {
  /* Mismo camino que la pérdida de contexto: un solo estado fijo para las
     dos situaciones, con estilos en la hoja y no incrustados aquí. En la
     fase 5 este hueco lo ocupa el fotograma de la escena real. */
  document.querySelectorAll('.instrumento-lienzo').forEach((m) => mostrarFijo(m, 'sin-webgl'));
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
