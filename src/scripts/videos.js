/* ============================================================
   BERGERAC — VÍDEOS POR VIEWPORT
   Los dos casos pesan 14 MB entre ambos. Con `autoplay` en el markup
   el navegador se los baja nada más abrir la página aunque la sección
   esté a 15.000px de scroll: medido, 6,3 MB antes de ver el hero.
   `preload="metadata"` no lo evita — autoplay manda sobre preload.
   Aquí el vídeo entra con preload="none" y sin autoplay: la fuente se
   asigna cuando la sección se acerca, y se reproduce solo mientras
   está a la vista. Mismo comportamiento visible, carga diferida real.
   Contrato: <video data-src="…"> (sin src, sin autoplay).
   ============================================================ */

/* Cuál de las dos codificaciones toca.
   Se mide el hueco DE VERDAD y se multiplica por la densidad de la
   pantalla, en vez de adivinar por el ancho de la ventana: un móvil de
   390px con DPR 3 necesita 1026 píxeles reales —más que una tablet de
   1024 con DPR 2, que necesita 820—, y por ancho de ventana se elegiría
   justo al revés. Por encima de 1100 va la grande (1742px). */
function fuenteDe(v) {
  const sm = v.dataset.srcSm;
  if (!sm) return v.dataset.src;
  const hueco = (v.closest('.caso-video') || v).getBoundingClientRect().width;
  const reales = hueco * (window.devicePixelRatio || 1);
  return reales > 1100 ? v.dataset.src : sm;
}

export function initVideos() {
  const videos = [...document.querySelectorAll('video[data-src]')];
  if (!videos.length) return;

  /* Sin IntersectionObserver no hay carga diferida posible: se asigna
     todo de una y que el navegador decida. */
  if (!('IntersectionObserver' in window)) {
    videos.forEach((v) => { v.src = fuenteDe(v); v.play?.().catch(() => {}); });
    return;
  }

  /* Dos observadores con márgenes distintos: uno reserva la descarga
     con antelación, el otro decide play/pause en el borde real. */
  const cargador = new IntersectionObserver((entradas, obs) => {
    entradas.forEach((en) => {
      if (!en.isIntersecting) return;
      const v = en.target;
      if (!v.src) v.src = fuenteDe(v);
      obs.unobserve(v);
    });
  }, { rootMargin: '600px 0px' });

  const reproductor = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) {
        if (!v.src) v.src = fuenteDe(v);
        /* play() rechaza si el navegador aún no lo permite: no es un
           error que deba ensuciar la consola. */
        v.play?.().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { threshold: 0.1 });

  videos.forEach((v) => { cargador.observe(v); reproductor.observe(v); });
}
