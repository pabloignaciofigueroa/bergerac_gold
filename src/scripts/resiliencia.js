/* ============================================================
   BERGERAC — RESILIENCIA DE LAS ESCENAS WebGL

   Ninguna escena puede romper la página. Esto no es compatibilidad con
   máquinas viejas: es manejo de errores, como un try/catch o controlar un
   404. Un contexto WebGL se puede perder en cualquier máquina —presión de
   memoria, el driver que se reinicia, la pestaña que pasa mucho rato en
   segundo plano— y hasta ahora, cuando pasaba, ese canvas se quedaba en
   blanco para siempre.

   QUÉ HACE
   · Escucha `webglcontextlost` y evita el comportamiento por defecto (sin
     `preventDefault()` el navegador ni siquiera intenta restaurar).
   · Para la escena y enseña su estado fijo en el mismo sitio.
   · Deja `webglcontextrestored` preparado pero NO reconstruye sola.

   POR QUÉ NO SE RECONSTRUYE SOLA. Si una máquina ha tirado un contexto una
   vez, rehacer la escena la devuelve exactamente a la situación que lo
   provocó y lo normal es volver a perderlo: perder → reconstruir → volver a
   perder, con el usuario viendo parpadear la sección. Se queda en fijo
   hasta que se recargue la página. Es decisión de dirección, no una
   limitación técnica.

   El estado fijo de la fase 3 es provisional: en la fase 5 lo sustituyen
   los fotogramas capturados de las escenas reales.
   ============================================================ */

/* Mounts cuya escena ya cayó en esta sesión. Se consulta antes de montar
   nada, para no reintentar por otra vía (viewport, resize, etc.). */
const caidos = new WeakSet();

export function estaCaida(mount) {
  return !!mount && caidos.has(mount);
}

const TEXTOS = {
  'sin-webgl': 'Este instrumento necesita aceleración gráfica. El contenido de la sección está completo más abajo.',
  perdido: 'El instrumento se detuvo para no afectar al resto de la página. Recarga si quieres volver a verlo.',
  safe: '',   /* la fase 4 lo usa cuando decide no montar por rendimiento */
};

/* Pinta el estado fijo dentro del hueco del instrumento.
   Se crea al vuelo y no vive en el HTML: así el DOM normal queda intacto y
   los comparadores de QA siguen midiendo lo mismo que antes. */
export function mostrarFijo(mount, motivo = 'perdido') {
  if (!mount) return null;
  let fijo = mount.querySelector(':scope > .escena-fija');
  if (!fijo) {
    fijo = document.createElement('div');
    fijo.className = 'escena-fija';
    mount.appendChild(fijo);
  }
  fijo.dataset.motivo = motivo;
  const texto = TEXTOS[motivo];
  fijo.innerHTML = texto ? `<p>${texto}</p>` : '';
  /* Sin `aria-hidden`: si el instrumento no está, esto es lo que hay que
     contar. El texto de la sección sigue completo en el DOM igualmente. */
  return fijo;
}

export function quitarFijo(mount) {
  mount?.querySelector(':scope > .escena-fija')?.remove();
}

/* Engancha la protección a un renderer ya creado.
   Devuelve la función de despegue, para el desmontaje limpio. */
export function protegerContexto(renderer, mount, { alPerder } = {}) {
  const canvas = renderer?.domElement;
  if (!canvas) return () => {};

  const onLost = (ev) => {
    /* imprescindible: sin esto no hay restauración posible y además el
       navegador puede tratar la pérdida como fatal */
    ev.preventDefault();
    if (mount) caidos.add(mount);
    try { alPerder?.(); } catch { /* que un fallo aquí no propague */ }
    if (mount) mostrarFijo(mount, 'perdido');
  };

  const onRestored = () => {
    /* Preparado a propósito. No se reconstruye: ver la cabecera. */
  };

  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  return () => {
    canvas.removeEventListener('webglcontextlost', onLost, false);
    canvas.removeEventListener('webglcontextrestored', onRestored, false);
  };
}

/* Libera la memoria de GPU de una escena.
   `renderer.dispose()` NO suelta geometrías, materiales ni texturas: hay
   que recorrer el grafo. Sin esto, desmontar una escena deja su memoria
   ocupada, que es justo lo que empuja al navegador a tirar contextos. */
export function liberarEscena(scene) {
  if (!scene) return;
  const sueltos = new Set();
  scene.traverse((obj) => {
    obj.geometry?.dispose?.();
    const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
    for (const m of mats) {
      if (sueltos.has(m)) continue;
      sueltos.add(m);
      for (const k in m) {
        const v = m[k];
        if (v && v.isTexture) v.dispose();
      }
      m.dispose?.();
    }
  });
  scene.clear?.();
}
