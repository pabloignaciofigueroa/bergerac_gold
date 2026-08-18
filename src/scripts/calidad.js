/* ============================================================
   BERGERAC — CALIDAD ADAPTATIVA

   Dos niveles y nada más:

     FULL      Bergerac tal como está diseñada. El objetivo.
     REDUCED   La misma pieza —misma narrativa, mismas animaciones, mismo
               3D— más barata de pintar.

   NO hay un tercer nivel. Si ni siquiera REDUCED es usable, o si el
   contexto se pierde, o si no hay WebGL, entra la red que ya existe:
   `mostrarFijo()` de resiliencia.js. Esa red es manejo de errores, no un
   nivel de calidad, y no se gestiona desde aquí.

   CÓMO SE DECIDE, ENTERO

     arranque    señales obvias: un rasterizador por software arranca en
                 REDUCED las tres escenas caras. Nada más manda.
     calentar    se tiran los primeros 700 ms de animación visible
                 (compilar shaders, subir texturas, primer GC).
     observar    hasta tres ventanas de 1,5 s ≈ 4,5 s ÚTILES, y se deja de
                 mirar para siempre. La calidad no cambia al tercer minuto
                 de visita.
     decidir     mediana del intervalo por ventana. Dos ventanas seguidas
                 por encima del presupuesto → se baja un nivel.
     y se acabó  no hay promoción. Lo que baja no vuelve hasta recargar.

   POR QUÉ LA MEDIANA. Hace el trabajo del percentil y el de la lógica
   anti-pico a la vez: un tirón aislado —un GC, un refresh de ScrollTrigger,
   el compositor— no mueve la mediana de una ventana. Y se lee de un vistazo.

   POR QUÉ NO HAY CIRCULARIDAD. Medir la calidad que tú mismo elegiste solo
   es un problema si existe un camino de vuelta hacia arriba: entonces el
   buen tiempo de un nivel barato se lee como "la máquina va bien, sube", y
   oscila. Sin promoción no hay lazo que realimentar. Por eso no hace falta
   ningún banco de pruebas independiente para calibrar la máquina.

   CADA INSTRUMENTO PAGA LO SUYO. El tiempo de fotograma de una escena nunca
   decide por otra. Que la escultura vaya justa no baja el contacto. Se
   puede porque las cuatro escenas viven en secciones distintas: en la
   práctica solo hay una en pantalla a la vez, así que el intervalo entre
   fotogramas de la página SE PUEDE atribuir a la que está delante. Se mide
   el intervalo y no el coste de `render()` a propósito: `render()` vuelve
   antes de que la GPU termine, así que cronometrarlo mentiría justo en el
   caso que importa, una GPU floja.
   ============================================================ */

export const FULL = 'full';
export const REDUCED = 'reduced';

/* ---- los diales del decisor, todos juntos ---------------------------- */
export const CALENTAMIENTO = 700;    /* ms de animación visible que se tiran */
export const VENTANA = 1500;         /* ms por ventana */
export const VENTANAS_MAX = 3;       /* ~4,5 s útiles y se deja de observar */
export const MIN_MUESTRAS = 3;       /* una ventana con menos no cuenta */
export const SEGUIDAS = 2;           /* ventanas malas consecutivas para actuar */
export const PRESUPUESTO = 28;       /* ms · ~36 fps sostenidos */
export const PRESUPUESTO_JUSTO = 24; /* ms · con poca RAM se es algo menos paciente */
export const EMERGENCIA = 100;       /* ms · ~10 fps, ya estando en REDUCED */

/* ============================================================
   PARTE PURA — sin DOM, sin relojes, sin rAF.
   Es lo que prueba tools/qa/calidad.test.mjs con muestras sintéticas.
   ============================================================ */

export function mediana(xs) {
  if (!xs.length) return 0;
  const o = [...xs].sort((a, b) => a - b);
  const m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/* Corta las muestras en ventanas y devuelve la mediana de cada una.
   `muestras` son { t, dt } en ms, donde t es tiempo ÚTIL acumulado —solo
   corre mientras el instrumento está en pantalla y animando—. */
export function ventanear(muestras, opts = {}) {
  const {
    calentamiento = CALENTAMIENTO,
    ventana = VENTANA,
    ventanasMax = VENTANAS_MAX,
    minMuestras = MIN_MUESTRAS,
  } = opts;

  const utiles = muestras.filter((m) => m.t >= calentamiento);
  const ventanas = [];
  for (let i = 0; i < ventanasMax; i++) {
    const desde = calentamiento + i * ventana;
    const hasta = desde + ventana;
    const dentro = utiles.filter((m) => m.t >= desde && m.t < hasta);
    if (dentro.length < minMuestras) continue;
    ventanas.push({ desde, hasta, n: dentro.length, mediana: mediana(dentro.map((m) => m.dt)) });
  }
  return ventanas;
}

/* El veredicto. Una sola regla: N ventanas seguidas por encima del techo
   que le toca al nivel en el que estás. */
export function decidir(estado) {
  const {
    nivel,
    ventanas,
    presupuesto = PRESUPUESTO,
    emergencia = EMERGENCIA,
    seguidas = SEGUIDAS,
  } = estado;

  /* En FULL el techo es el presupuesto; ya en REDUCED, lo único que queda
     por detectar es que la escena sea inutilizable de verdad. */
  const techo = nivel === FULL ? presupuesto : emergencia;

  let racha = 0;
  for (const v of ventanas) racha = v.mediana > techo ? racha + 1 : 0;
  if (racha < seguidas) return { accion: 'seguir', racha, techo };

  return nivel === FULL
    ? { accion: 'reducir', racha, techo, motivo: `mediana > ${techo}ms en ${racha} ventanas` }
    : { accion: 'rendirse', racha, techo, motivo: `inutilizable en REDUCED: > ${techo}ms en ${racha} ventanas` };
}

/* ============================================================
   PARTE VIVA — señales del navegador y observación en marcha.
   ============================================================ */

/* Las tres escenas caras. Contacto NO está: en el perfil por software fue
   la única que se sostuvo, y apagar lo que funciona por ser decorativo
   sería nivelar hacia abajo sin motivo. Arranca en FULL y responde por sí. */
const CARAS = ['hero', 'estudio', 'metodo'];

/* La cadena del driver la da la sonda ÚNICA de resiliencia.js. No abrir
   aquí otro contexto: dos sondas permanentes dejaban sin montar a una
   escena en el perfil por software. Ver el comentario de `sondear()`. */
import { rendererDe } from './resiliencia.js';

/* Rasterizador por software: no hay GPU detrás, por mucho que WebGL exista. */
export function esPorSoftware() {
  return /swiftshader|llvmpipe|softpipe|software|basic render|microsoft gdi/i.test(rendererDe());
}

/* Presupuesto de fotograma. `deviceMemory` NO decide el nivel de arranque
   —ya vimos que RAM y núcleos no equivalen a capacidad gráfica— pero sí
   vale como señal conservadora: con poca memoria se es algo menos paciente
   antes de reducir. Es lo único que hace. */
let _forzado = null;
export function presupuestoDe() {
  if (_forzado != null) return _forzado;
  const poca = navigator.deviceMemory && navigator.deviceMemory <= 4;
  return poca ? PRESUPUESTO_JUSTO : PRESUPUESTO;
}

/* Costura para el arnés, no para la página. Estrangular la CPU deja a las
   escenas rozando el techo y el resultado cambia de una pasada a otra: una
   puerta montada sobre eso pasa por suerte. Con un techo imposible la
   bajada ocurre siempre, y así se puede comprobar el camino ENTERO —medir,
   decidir, aplicar el ratio, seguir viva— de forma determinista. */
export function forzarPresupuesto(ms) { _forzado = ms; }

/* `?calidad=reduced` arranca los cuatro instrumentos en REDUCED, y
   `?calidad=full` obliga a FULL. No es una función de la página: es para
   poder VER las dos versiones en la misma máquina y decidir con el ojo si
   REDUCED sigue siendo Bergerac. Sin el parámetro no cambia nada. */
function nivelPedido() {
  try {
    const v = new URLSearchParams(location.search).get('calidad');
    return v === 'reduced' ? REDUCED : v === 'full' ? FULL : null;
  } catch { return null; }
}

/* `?fotograma=1` — la otra costura de URL, y solo para la herramienta que
   captura los fotogramas fijos (tools/capturar-fotogramas.mjs).

   Sin `preserveDrawingBuffer` el búfer se limpia después de pintar y
   `toDataURL()` devuelve un PNG vacío: no hay forma de sacar los píxeles
   EXACTOS que dibujó la escena. Y hacen falta exactos y CON TRANSPARENCIA,
   porque así el fondo lo sigue poniendo el CSS y la bisagra cromática del
   Método sigue funcionando sobre el fotograma.

   Está apagado siempre salvo con el parámetro puesto: mantenerlo encendido
   cuesta memoria y le quita optimizaciones al navegador. */
export function paraCaptura() {
  try { return new URLSearchParams(location.search).get('fotograma') === '1'; }
  catch { return false; }
}

/* Nivel de arranque. Una sola señal manda: un rasterizador por software no
   mueve las tres escenas caras, y eso se sabe sin medir nada. */
export function nivelInicial(instrumento) {
  return nivelPedido() || (esPorSoftware() && CARAS.includes(instrumento) ? REDUCED : FULL);
}

/* Ratio de píxel de REDUCED. Es el dial que más rinde en estas escenas,
   todas limitadas por relleno y no por vértices.

   Baja de 1 a propósito cuando el dispositivo ya está en 1: si no, en las
   máquinas de DPR 1 —que son muchas de las flojas— reducir no haría nada.
   Pintar por debajo de 1 y escalar ablanda un poco la imagen, y solo pasa
   en una máquina que ya se está arrastrando, donde el tirón molesta
   muchísimo más que la blandura. Nunca por debajo de 0,75: ahí sí se ve
   roto en vez de suave. */
export function ratioReducido() {
  return Math.max(0.75, Math.min(window.devicePixelRatio || 1, 2) * 0.5);
}

export function ratioDe(nivel) {
  return nivel === REDUCED ? ratioReducido() : Math.min(window.devicePixelRatio || 1, 2);
}

/* Nivel actual por instrumento, ya haya bajado o no. */
const niveles = new Map();
export function nivelDe(instrumento) {
  if (!niveles.has(instrumento)) niveles.set(instrumento, nivelInicial(instrumento));
  return niveles.get(instrumento);
}

/* Rastro de lo observado, solo para el arnés de QA. Sin esto, cuando una
   bajada no ocurre no hay forma de saber si el decisor se equivocó o si
   simplemente la escena iba bien: habría que adivinar. */
const rastro = new Map();

/* Observa un instrumento durante sus primeros segundos útiles y, si hace
   falta, lo baja UNA vez. Después se apaga sola y no vuelve a mirar.

   La escena llama a `frame()` en cada fotograma que pinta. El tiempo solo
   corre mientras el instrumento está de verdad delante: eso es lo que
   permite atribuirle a él el intervalo de la página. */
export function crearObservador(mount, instrumento, { alReducir, alRendirse } = {}) {
  const nivel0 = nivelDe(instrumento);
  const muestras = [];
  let util = 0;          /* ms de animación visible acumulados */
  let ultimo = null;     /* null = hay que reenganchar el reloj */
  let visible = true;
  let cerrado = false;
  let ultimaVentana = -1;   /* la última ventana ya juzgada */

  /* Solo cuenta cuando este instrumento ocupa la pantalla de verdad. Sin
     esto, el trozo de scroll en que dos escenas se solapan le colgaría a
     una los fotogramas de la otra. */
  let io = null;
  if (mount && typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver((ents) => {
      for (const e of ents) {
        const antes = visible;
        visible = e.intersectionRatio >= 0.5;
        if (visible !== antes) ultimo = null;   /* reengancha, no cuenta el hueco */
      }
    }, { threshold: [0, 0.5, 1] });
    io.observe(mount);
  }

  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    io?.disconnect();
    io = null;
  };

  const frame = () => {
    if (cerrado) return;
    if (!visible || document.visibilityState !== 'visible') { ultimo = null; return; }

    const ahora = performance.now();
    if (ultimo === null) { ultimo = ahora; return; }   /* primer fotograma tras un hueco */
    const dt = ahora - ultimo;
    ultimo = ahora;
    util += dt;
    muestras.push({ t: util, dt });

    /* Solo se decide al CERRAR una ventana, no en cada fotograma.

       Esto no es una optimización de adorno: `ventanear()` recorre el array
       entero tres veces, y el array crece. Llamándolo por fotograma el coste
       sube con el tiempo, y en una máquina ya lenta ese trabajo extra en el
       hilo principal es justo lo último que hace falta —llegó a dejar sin
       terminar el arranque de una escena en el perfil por software—. El
       vigilante no puede costar más que lo que vigila. */
    if (util < CALENTAMIENTO + VENTANA * SEGUIDAS) return;
    const cerradas = Math.floor((util - CALENTAMIENTO) / VENTANA);
    if (cerradas === ultimaVentana) return;
    ultimaVentana = cerradas;

    const ventanas = ventanear(muestras);
    const nivel = niveles.get(instrumento) || nivel0;
    /* el presupuesto se lee AQUÍ y no al montar: así el arnés puede forzarlo
       con las escenas ya en marcha */
    const v = decidir({ nivel, ventanas, presupuesto: presupuestoDe() });
    rastro.set(instrumento, {
      util: Math.round(util),
      muestras: muestras.length,
      medianas: ventanas.map((w) => +w.mediana.toFixed(1)),
      techo: v.techo,
      racha: v.racha,
    });

    if (v.accion === 'reducir') {
      niveles.set(instrumento, REDUCED);
      cerrar();
      try { alReducir?.(v); } catch { /* que un fallo aquí no pare la escena */ }
      return;
    }
    if (v.accion === 'rendirse') {
      cerrar();
      try { alRendirse?.(v); } catch { /* idem */ }
      return;
    }
    /* se acabó el tiempo de mirar: la calidad no cambia más en esta visita */
    if (util >= CALENTAMIENTO + VENTANA * VENTANAS_MAX) cerrar();
  };

  return { frame, destruir: cerrar, get nivel() { return niveles.get(instrumento) || nivel0; } };
}

/* Lo que lee el arnés de QA. No lo usa la página. */
export function diagnostico() {
  return {
    renderer: rendererDe(),
    porSoftware: esPorSoftware(),
    presupuesto: presupuestoDe(),
    deviceMemory: navigator.deviceMemory || null,
    dpr: window.devicePixelRatio || 1,
    ratioReducido: ratioReducido(),
    niveles: Object.fromEntries(niveles),
    rastro: Object.fromEntries(rastro),
  };
}

if (typeof window !== 'undefined') {
  window.__calidad = { diagnostico, nivelDe, forzarPresupuesto, FULL, REDUCED };
}
