/* ============================================================
   BERGERAC MERGE — AJUSTE DEL TÍTULO DEL HERO
   "BERGERAC" debe alinear EXACTO con el contenedor del header:
   a la izquierda con el logo, a la derecha con el botón menú.
   Se mide el ancho real del texto con la fuente cargada y se
   escala la font-size para ocupar el ancho útil del contenedor.
   Corre antes de que SplitText parta el título (mismo fonts.ready,
   registrado primero) y se re-ajusta en resize.
   ============================================================ */

export function initHeroFit() {
  const h1 = document.querySelector('.hero-word');
  const span = h1 && h1.querySelector('span');
  const box = h1 && h1.closest('.c');
  if (!h1 || !span || !box) return;

  function fit() {
    const cs = getComputedStyle(box);
    const util = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (util <= 0) return;
    /* medir a talla de referencia y escalar en proporción exacta */
    h1.style.fontSize = '100px';
    const w = span.offsetWidth;
    if (w > 0) h1.style.fontSize = (100 * util / w).toFixed(2) + 'px';
  }

  const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  ready.then(fit);

  /* respuesta inmediata: re-ajuste por frame durante el resize (rAF),
     sin esperas — el título sigue el borde de la ventana en vivo */
  let raf = 0;
  addEventListener('resize', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; fit(); });
  });
}
