/* ============================================================
   MÉTODO — las cuatro etapas

   El copy es de Pablo: no se reescribe.
   `view` es el índice de vista de la escultura: metodo.js lo usa para
   saber qué encuadre corresponde a cada etapa, así que NO se toca sin
   mirar DEFAULT_VIEWS en sections/metodo.js.
   La bisagra cromática (morado → fucsia) salta en el anclaje de Construir.
   ============================================================ */

export const etapas = [
  {
    view: '2',
    slug: 'estudiar',
    num: '01',
    nombre: 'Estudiar',
    lead: 'Reconocemos qué ya tiene valor, qué está generando distancia y qué necesita comprenderse antes de intervenir.',
    accion: 'Profundizar en esta etapa',
    panel: 'metodo-deep-1',
    campos: [
      { titulo: 'Observamos', texto: 'Historia, contexto, audiencias, identidad, contenidos, experiencia actual y restricciones reales.' },
      { titulo: 'Contrastamos', texto: 'Lo que el proyecto es, lo que intenta comunicar y lo que las personas alcanzan a percibir.' },
      { titulo: 'Resultado', texto: 'Una lectura compartida del punto de partida.', resultado: true },
    ],
  },
  {
    view: '3',
    slug: 'definir',
    num: '02',
    nombre: 'Definir',
    lead: 'Convertimos lo aprendido en una dirección clara: qué conservar, qué cambiar y qué sistema necesita el proyecto.',
    accion: 'Profundizar en esta etapa',
    panel: 'metodo-deep-2',
    campos: [
      { titulo: 'Idea rectora', texto: 'Definimos el principio que mantendrá unidas las decisiones posteriores.' },
      { titulo: 'Estructura', texto: 'Ordenamos mensaje, contenidos, jerarquías, recorridos y prioridades.' },
      { titulo: 'Alcance', texto: 'Determinamos qué corresponde construir ahora y qué puede esperar.' },
      { titulo: 'Resultado', texto: 'Una dirección que permite decidir sin improvisar ni acumular.', resultado: true },
    ],
  },
  {
    view: '4',
    slug: 'construir',
    num: '03',
    nombre: 'Construir',
    lead: 'Traducimos la dirección en el sistema, las piezas y las experiencias que el proyecto realmente necesita.',
    accion: 'Profundizar en esta etapa',
    panel: 'metodo-deep-3',
    campos: [
      { titulo: 'Sistema', texto: 'Definimos la identidad, el lenguaje, la estructura y las reglas que permiten mantener coherencia.' },
      { titulo: 'Producción', texto: 'Diseñamos y desarrollamos las piezas necesarias según el alcance acordado.' },
      { titulo: 'Integración', texto: 'Cada parte se construye considerando cómo se relaciona con las demás.' },
      { titulo: 'Resultado', texto: 'Una solución real, usable y preparada para mantenerse.', resultado: true },
    ],
  },
  {
    view: '5',
    slug: 'afinar',
    num: '04',
    nombre: 'Afinar',
    lead: 'Probamos, corregimos y completamos la respuesta hasta que pueda funcionar, sostenerse y evolucionar.',
    accion: 'Profundizar en esta etapa',
    panel: 'metodo-deep-4',
    campos: [
      { titulo: 'Revisión', texto: 'Evaluamos claridad, coherencia, comportamiento, legibilidad y funcionamiento en condiciones reales.' },
      { titulo: 'Corrección', texto: 'Ajustamos aquello que todavía no expresa correctamente la dirección definida.' },
      { titulo: 'Preparación', texto: 'Ordenamos la entrega, las reglas de uso y la base necesaria para futuras evoluciones.' },
      { titulo: 'Resultado', texto: 'Un sistema que no depende de la improvisación para seguir funcionando.', resultado: true },
    ],
  },
];
