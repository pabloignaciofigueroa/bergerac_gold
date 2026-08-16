/* ============================================================
   QA — EL DECISOR DE CALIDAD, EN SECO

   Sin navegador, sin DOM, sin relojes: se le dan muestras de fotograma
   inventadas y se comprueba qué decide. Corre en milisegundos, así que se
   puede lanzar en cada cambio sin pensárselo.

   Lo que se prueba es la parte pura de src/scripts/calidad.js. La parte
   viva —señales del navegador, observación en marcha— la prueba
   tools/qa/calidad.mjs en Chrome de verdad.

   Uso: node tools/qa/calidad.test.mjs
   ============================================================ */

import {
  FULL, REDUCED, mediana, ventanear, decidir,
  CALENTAMIENTO, VENTANA, VENTANAS_MAX, PRESUPUESTO, EMERGENCIA,
} from '../../src/scripts/calidad.js';

let fallos = 0;
const ok = (cond, etiqueta, detalle = '') => {
  if (!cond) fallos++;
  console.log(`  ${cond ? 'OK  ' : 'FALLA'}  ${etiqueta}${detalle ? '  ·  ' + detalle : ''}`);
};

/* Genera muestras a un ritmo dado. `dts` puede ser un número (constante) o
   una función (i) => ms. `total` es el tiempo útil a cubrir. */
function muestrear(dts, total = CALENTAMIENTO + VENTANA * VENTANAS_MAX + 200) {
  const f = typeof dts === 'function' ? dts : () => dts;
  const out = [];
  let t = 0, i = 0;
  while (t < total) { const dt = f(i++); t += dt; out.push({ t, dt }); }
  return out;
}

const veredicto = (muestras, nivel = FULL, opts = {}) =>
  decidir({ nivel, ventanas: ventanear(muestras), ...opts });

console.log('\n[calidad] el decisor, con muestras sintéticas');

/* ---- la mediana ---- */
ok(mediana([1, 2, 3]) === 2, 'mediana impar');
ok(mediana([1, 2, 3, 4]) === 2.5, 'mediana par');
ok(mediana([]) === 0, 'mediana de nada no revienta');
ok(mediana([16, 16, 16, 200]) === 16, 'un pico no mueve la mediana', '16/16/16/200 → 16');

/* ---- el caso normal: una máquina sana se queda en FULL ---- */
{
  const v = veredicto(muestrear(16.7));
  ok(v.accion === 'seguir', '60 fps sostenidos · se queda en FULL', `racha ${v.racha}`);
}
{
  /* 40 fps: por debajo de 60 pero por encima del presupuesto de 28 ms */
  const v = veredicto(muestrear(25));
  ok(v.accion === 'seguir', '40 fps sostenidos · se queda en FULL', `mediana 25 < ${PRESUPUESTO}`);
}

/* ---- degradación sostenida: baja ---- */
{
  const v = veredicto(muestrear(40));
  ok(v.accion === 'reducir', '25 fps sostenidos · baja a REDUCED', v.motivo || '');
}
{
  const v = veredicto(muestrear(500));
  ok(v.accion === 'reducir', '2 fps · baja a REDUCED', `racha ${v.racha}`);
}

/* ---- EL CASO QUE IMPORTA: un pico aislado no es un veredicto ---- */
{
  /* 16,7 ms todo el rato y un solo fotograma de 200 ms — un GC, un refresh
     de ScrollTrigger, el compositor despertando */
  const m = muestrear((i) => (i === 40 ? 200 : 16.7));
  const v = veredicto(m);
  ok(v.accion === 'seguir', 'un pico de 200 ms entre 16,7 ms · NO baja', `racha ${v.racha}`);
}
{
  /* tres picos repartidos, uno por ventana: tampoco */
  const m = muestrear((i) => (i % 37 === 0 ? 180 : 16.7));
  const v = veredicto(m);
  ok(v.accion === 'seguir', 'un pico por ventana · NO baja', `racha ${v.racha}`);
}
{
  /* una sola ventana mala entre dos buenas: hacen falta DOS seguidas */
  const m = muestrear((i) => (i > 90 && i < 130 ? 60 : 16.7));
  const v = veredicto(m);
  ok(v.accion === 'seguir', 'una sola ventana mala · NO baja', `racha ${v.racha}`);
}

/* ---- calentamiento: los primeros 700 ms no cuentan ---- */
{
  /* arranque horrible —compilar shaders— y después va fino */
  const m = [];
  let t = 0;
  while (t < CALENTAMIENTO) { t += 300; m.push({ t, dt: 300 }); }
  while (t < CALENTAMIENTO + VENTANA * VENTANAS_MAX + 200) { t += 16.7; m.push({ t, dt: 16.7 }); }
  const v = veredicto(m);
  ok(v.accion === 'seguir', 'un arranque lento no condena la escena', 'los 700 ms de calentamiento se tiran');
}
{
  const vs = ventanear(muestrear(16.7));
  ok(vs.length > 0 && vs[0].desde === CALENTAMIENTO, 'la primera ventana empieza tras el calentamiento');
  ok(vs.length <= VENTANAS_MAX, 'nunca se miran más de 3 ventanas', `${vs.length} ventanas`);
}

/* ---- el warm-up es por TIEMPO, no por fotogramas ----
   Es la corrección de Pablo: a 2 fps, esperar 45 fotogramas serían 22 s. */
{
  const m = muestrear(500);                       /* 2 fps */
  const vs = ventanear(m);
  ok(vs.length >= 2, 'a 2 fps ya hay ventanas que juzgar en pocos segundos',
     `${vs.length} ventanas dentro de ${CALENTAMIENTO + VENTANA * VENTANAS_MAX} ms útiles`);
  const decidido = CALENTAMIENTO + VENTANA * 2;
  ok(decidido <= 4000, 'la decisión cae dentro de ~4 s útiles', decidido + ' ms');
}

/* ---- una ventana con muy pocas muestras no cuenta ---- */
{
  const m = [{ t: 800, dt: 400 }, { t: 1200, dt: 400 }];
  ok(ventanear(m).length === 0, 'una ventana con menos de 3 muestras se descarta');
}

/* ---- monotonía: lo que baja no vuelve ---- */
{
  /* ya en REDUCED y yendo bien: no pasa nada, y desde luego no sube */
  const v = veredicto(muestrear(16.7), REDUCED);
  ok(v.accion === 'seguir', 'en REDUCED e yendo fino · sigue en REDUCED, no sube', 'no hay promoción');
}
{
  /* Malo, bueno, malo: DOS ventanas malas, pero no seguidas. La racha se
     reinicia. Se exige degradación sostenida, no acumulada — si no, una
     página con dos tirones separados acabaría degradada sin motivo.
     Las ventanas se dan a mano: decidir() es pura y no necesita muestras. */
  const v = decidir({ nivel: FULL, ventanas: [{ mediana: 60 }, { mediana: 16.7 }, { mediana: 60 }] });
  ok(v.accion === 'seguir', 'malo/bueno/malo · la racha se reinicia, no baja', `racha ${v.racha}`);

  const w = decidir({ nivel: FULL, ventanas: [{ mediana: 16.7 }, { mediana: 60 }, { mediana: 60 }] });
  ok(w.accion === 'reducir', 'bueno/malo/malo · dos seguidas sí bajan', `racha ${w.racha}`);
}
{
  /* LA INVARIANTE, por enumeración: no existe ninguna entrada que, estando
     en REDUCED, devuelva algo que suba el nivel. La escalera solo baja.
     Se barre de 1 a 400 ms de intervalo, constante y con picos. */
  const acciones = new Set();
  for (let ms = 1; ms <= 400; ms += 1) {
    acciones.add(veredicto(muestrear(ms), REDUCED).accion);
    acciones.add(veredicto(muestrear((i) => (i % 11 === 0 ? ms * 8 : ms)), REDUCED).accion);
  }
  const sube = [...acciones].some((a) => a !== 'seguir' && a !== 'rendirse');
  ok(!sube, 'desde REDUCED no existe ninguna entrada que suba el nivel',
     '800 barridos → {' + [...acciones].join(', ') + '}');
}

/* ---- la emergencia: solo desde REDUCED y solo si es inutilizable ---- */
{
  const v = veredicto(muestrear(150), REDUCED);
  ok(v.accion === 'rendirse', '~7 fps ya en REDUCED · entrega a la red de la fase 3', v.motivo || '');
}
{
  const v = veredicto(muestrear(40), REDUCED);
  ok(v.accion === 'seguir', '25 fps en REDUCED · NO se rinde', `40 < ${EMERGENCIA}`);
}
{
  const v = veredicto(muestrear(150), FULL);
  ok(v.accion === 'reducir', 'desde FULL nunca se salta directo a la red', 'primero REDUCED');
}

/* ---- cada instrumento paga lo suyo ---- */
{
  /* dos instrumentos, mismas ventanas de entrada, estados independientes:
     el veredicto de uno no toca al otro porque decidir() es pura y no
     comparte nada entre llamadas */
  const pesado = veredicto(muestrear(45), FULL);
  const barato = veredicto(muestrear(9), FULL);
  ok(pesado.accion === 'reducir' && barato.accion === 'seguir',
     'una escena pesada no arrastra a una barata', `pesada:${pesado.accion} barata:${barato.accion}`);
}

/* ---- deviceMemory como señal conservadora, no como sentencia ---- */
{
  /* 26 ms: pasa el presupuesto normal (28) y no el justo (24) */
  const m = muestrear(26);
  const normal = decidir({ nivel: FULL, ventanas: ventanear(m), presupuesto: 28 });
  const justo = decidir({ nivel: FULL, ventanas: ventanear(m), presupuesto: 24 });
  ok(normal.accion === 'seguir', 'con RAM normal, 26 ms se tolera');
  ok(justo.accion === 'reducir', 'con poca RAM se es menos paciente, pero se sigue midiendo',
     'la RAM no decide sola: ajusta el techo');
}

console.log(fallos === 0 ? '\nEl decisor hace lo que dice.\n' : `\n${fallos} comprobación(es) fallaron.\n`);
process.exitCode = fallos === 0 ? 0 : 1;
