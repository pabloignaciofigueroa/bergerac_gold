/* ============================================================
   PUNTO DE PARTIDA — los cuatro problemas

   El copy es de Pablo: no se reescribe.
   Cada estación lleva su color de marca (01 morado, 02 fucsia, 03 amarillo,
   04 azul) y el CSS lo saca de `data-station`, así que el ORDEN de este
   array no se cambia sin mirar antes sections.css.
   Las fotos son de relleno heredadas de v9: sustituirlas por material real
   manteniendo los nombres (ver docs/ESTADO.md).
   ============================================================ */

export const estaciones = [
  {
    station: '1',
    num: '01',
    problema: 'La marca ya no refleja lo que somos.',
    foto: 'assets/img/photos/m-origen.jpg',
    parrafo: 'Puede que no sea necesario reemplazarla por completo. Primero revisamos qué sigue teniendo valor, qué perdió coherencia y qué necesita evolucionar para volver a representar correctamente al proyecto.',
    etiqueta: 'Lo primero que miraríamos',
    campos: 'Identidad · percepción · consistencia',
    accion: 'Entender este problema',
  },
  {
    station: '2',
    num: '02',
    problema: 'Lo que hacemos tiene valor, pero cuesta explicarlo.',
    foto: 'assets/img/photos/g-archivo.jpg',
    parrafo: 'Cuando algo tiene valor, pero cuesta comprenderlo, el problema no siempre está en la calidad del proyecto. Puede estar en el mensaje, en el orden de la información o en la forma en que se presenta.',
    etiqueta: 'Lo primero que miraríamos',
    campos: 'Propuesta · relato · jerarquía',
    accion: 'Entender este problema',
  },
  {
    station: '3',
    num: '03',
    problema: 'Nuestra presencia digital quedó atrás o creció sin orden.',
    foto: 'assets/img/photos/g-estudio.jpg',
    parrafo: 'Una página puede contener buena información y aun así no funcionar como sistema. Revisamos qué se acumuló, qué falta, cómo debe organizarse y qué recorrido necesita la persona que llega.',
    etiqueta: 'Lo primero que miraríamos',
    campos: 'Contenido · estructura · experiencia',
    accion: 'Entender este problema',
  },
  {
    station: '4',
    num: '04',
    problema: 'Tenemos una idea, pero todavía no sabemos qué forma necesita.',
    foto: 'assets/img/photos/m-nebula.jpg',
    parrafo: 'Una idea abierta no tiene que convertirse inmediatamente en una página, una marca o una aplicación. Primero definimos qué problema busca resolver y cuál es la primera forma que permitiría comprenderla y probarla.',
    etiqueta: 'Lo primero que miraríamos',
    campos: 'Propósito · alcance · primera versión',
    accion: 'Entender este problema',
  },
];
