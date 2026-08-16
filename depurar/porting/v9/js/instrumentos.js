/* ============ MAIN ESCENAS — instrumentos Three.js clickeables + UI propia ============
   Cada sección monta un ejemplo oficial de threejs.org/examples adaptado:
     hero      → webgl_gpgpu_birds            (bandada; click = estallido)
     estudio   → webgl_lines_fat              (trazos; click = redibujar)
     partida   → webgl_interactive_raycasting_points (campo; click = marca)
     metodo    → webgl_instancing_dynamic     (retícula; click = onda)
     proyectos → webgl_postprocessing_transition (antes/después; click = alternar)
     contacto  → webgl_interactive_points     (partículas; click = pulso)
   El resto del movimiento de página lo lleva el motor LAB del referente. */

const MODULOS = {
  hero: () => import('./escenas/hero.js'),
  estudio: () => import('./escenas/estudio.js'),
  partida: () => import('./escenas/partida.js'),
  metodo: () => import('./escenas/metodo.js'),
  proyectos: () => import('./escenas/proyectos.js'),
  contacto: () => import('./escenas/contacto.js'),
};

function soportaWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

/* Las escenas se montan SIEMPRE que haya WebGL — aunque el sistema tenga
   los efectos de animación desactivados (prefers-reduced-motion), porque
   son el contenido de la sección, no decoración. Si no hay WebGL, cada
   marco lo dice en vez de quedar vacío. */
if (!soportaWebGL()) {
  document.querySelectorAll('.instrumento-lienzo').forEach(m => {
    m.innerHTML = '<p style="position:absolute;inset:0;display:grid;place-items:center;' +
      'padding:2rem;text-align:center;font:600 14px/1.5 sans-serif;opacity:.6">' +
      'Tu navegador tiene WebGL desactivado — actívalo en la configuración ' +
      'de aceleración de hardware para ver este instrumento.</p>';
  });
}

/* ── escenas ──────────────────────────────────────────────────────────── */
if (soportaWebGL()) {
  const montajes = Array.from(document.querySelectorAll('[data-escena]'));

  const cargador = new IntersectionObserver(entradas => {
    entradas.forEach(async en => {
      const mount = en.target;
      if (!en.isIntersecting) { mount._escena?.stop?.(); return; }
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

  montajes.forEach(m => cargador.observe(m));

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
      // el lienzo va detrás del contenido: el click llega por la sección,
      // solo cuando cae en zona vacía (no formulario, no links)
      const seccion = mount.closest('section');
      seccion.addEventListener('click', e => {
        if (e.target.closest('a, button, input, textarea, label, .formulario, .plegable')) return;
        const [nx, ny] = coordsNorm(mount, e);
        mount._escena?.accion?.(nx, ny);
      });
      return;
    }
    mount.addEventListener('click', e => {
      const [nx, ny] = coordsNorm(mount, e);
      mount._escena?.accion?.(nx, ny);
    });
  }

  // botón "soltar la bandada" del hero
  document.querySelectorAll('[data-accion-escena]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mount = document.querySelector(`[data-escena="${btn.dataset.accionEscena}"]`);
      mount?._escena?.accion?.(0, 0);
    });
  });

  // hover de puertas → el campo de diagnóstico cambia de acento
  document.querySelectorAll('.partida-grid .puerta').forEach(p => {
    p.addEventListener('pointerenter', () => {
      const mount = document.querySelector('[data-escena="partida"]');
      mount?._escena?.setAcento?.(parseInt(p.dataset.puerta, 10) || 0);
    });
  });
}

/* ── plegables (acordeones) ───────────────────────────────────────────── */
const plegables = Array.from(document.querySelectorAll('[data-plegable]'));
plegables.forEach(pl => {
  const boton = pl.querySelector('.plegable-cabeza');
  const cuerpo = pl.querySelector('.plegable-cuerpo');
  if (!boton || !cuerpo) return;
  boton.addEventListener('click', () => {
    const abierto = !cuerpo.hidden;
    const grupo = pl.dataset.grupo;
    if (grupo && !abierto) {
      plegables.filter(o => o !== pl && o.dataset.grupo === grupo).forEach(o => {
        const c = o.querySelector('.plegable-cuerpo');
        if (c) c.hidden = true;
        o.classList.remove('is-open');
        o.querySelector('.plegable-cabeza')?.setAttribute('aria-expanded', 'false');
      });
    }
    cuerpo.hidden = abierto;
    pl.classList.toggle('is-open', !abierto);
    boton.setAttribute('aria-expanded', String(!abierto));
  });
});

/* ── puertas del punto de partida ─────────────────────────────────────── */
const grid = document.querySelector('.partida-grid');
if (grid) {
  const puertas = Array.from(grid.querySelectorAll('.puerta'));
  puertas.forEach(p => {
    p.addEventListener('click', () => {
      const abierta = p.classList.contains('is-open');
      puertas.forEach(o => {
        o.classList.remove('is-open');
        const d = o.querySelector('.puerta-detalle');
        if (d) d.hidden = true;
        const cta = o.querySelector('.puerta-cta');
        if (cta) cta.textContent = '→ abrir';
      });
      if (!abierta) {
        p.classList.add('is-open');
        const d = p.querySelector('.puerta-detalle');
        if (d) d.hidden = false;
        const cta = p.querySelector('.puerta-cta');
        if (cta) cta.textContent = '→ cerrar';
      }
      grid.classList.toggle('has-open', !abierta);
    });
  });
}

/* ── formulario → confirmación (texto aprobado) ───────────────────────── */
const form = document.querySelector('[data-formulario]');
const confirmacion = document.querySelector('.formulario-confirmacion');
if (form && confirmacion) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    form.hidden = true;
    confirmacion.hidden = false;
  });
}
