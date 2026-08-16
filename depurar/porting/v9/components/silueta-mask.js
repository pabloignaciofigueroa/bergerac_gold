/* LAB · components/silueta-mask.js — {SILUETA_CONTENEDORA}: la imagen vive
   dentro de la forma de la marca
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (mecánica del referente [MEDIDO]: mask-image por SVG con variante
   móvil propia — cascos del grid, cajas de stats, calendario). DOS modos:
   A) PATH inline (recomendado; file://-safe — gotcha #29):
      <div data-silueta-mask-path="M212 6c98 5 …Z"
           [data-silueta-mask-path-mobile="M…Z"]
           [data-silueta-viewbox="0 0 400 300"]>…</div>
      El componente construye un data-URI (sin CORS); la forma puede viajar
      en el HTML o venir de tokens — ideal para re-skin.
   B) URL de SVG (solo con servidor; en file:// Chrome bloquea la máscara
      externa por CORS y el elemento desaparece):
      <div data-silueta-mask="../assets/masks/forma.svg"
           [data-silueta-mask-mobile="…"]>…</div>
   · El SVG/path define la zona visible con fill negro sobre lienzo vacío.
   · ≤479px usa la variante móvil si existe (regla del referente).
   Sin JS: contenido completo sin máscara (mejora progresiva). Estático. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  function dataUri(d, viewBox) {
    /* width/height explícitos: sin tamaño intrínseco, mask-size:cover no
       escala en Chromium y la silueta pinta diminuta (QA S11) */
    var p = viewBox.split(/\s+/);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox +
              '" width="' + (p[2] || 400) + '" height="' + (p[3] || 300) +
              '"><path fill="#000" d="' + d + '"/></svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  /* resolución de formas por NOMBRE desde tokens.shapes (modo recomendado:
     data-silueta="organica" — el re-skin cambia el path en tokens, no el HTML) */
  function namedPath(name) {
    var shapes = LAB.tokens && LAB.tokens.shapes;
    if (name && shapes && shapes[name]) return shapes[name];
    if (name) console.warn('[LAB silueta] forma no encontrada en tokens.shapes:', name);
    return null;
  }

  LAB.register('silueta-mask', {
    selector: '[data-silueta], [data-silueta-mask], [data-silueta-mask-path]',
    init: function (el) {
      var vb = el.getAttribute('data-silueta-viewbox') || '0 0 400 300';
      var path = namedPath(el.getAttribute('data-silueta')) ||
                 el.getAttribute('data-silueta-mask-path');
      var url = el.getAttribute('data-silueta-mask');

      var main = path ? dataUri(path, vb) : (url ? 'url("' + url + '")' : null);
      if (!main) { console.warn('[LAB silueta] sin path ni url', el); return; }

      el.classList.add('lab-silueta');
      el.style.setProperty('--mask-url', main);

      var mobPath = namedPath(el.getAttribute('data-silueta-mobile')) ||
                    el.getAttribute('data-silueta-mask-path-mobile');
      var mobUrl = el.getAttribute('data-silueta-mask-mobile');
      var mob = mobPath ? dataUri(mobPath, vb) : (mobUrl ? 'url("' + mobUrl + '")' : null);
      if (mob) el.style.setProperty('--mask-url-mobile', mob);
    }
  });
})();
