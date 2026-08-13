/* LAB · components/transition.js — loader + cortina de página (receta 2D propia)
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (motion-spec §5 — en el referente loader y transición son UN sistema):
   <div data-transition aria-hidden="true">
     <p class="lab-transition__gag"></p>          ← se rellena con voice.gagLoader
   </div>                                          (primero en <body>)
   REQUISITO de página: en <head>, tras tokens.js, el flip síncrono
   <script>document.documentElement.className='js'</script> — cubre el PRIMER
   paint (equivale al runtime bloqueante del referente). Sin JS, el overlay
   queda display:none (html.no-js) y nada bloquea el contenido.
   Coreografía:
   · Carga inicial: gag 0.4s in / beat / 0.3s out → cortina sube (clip-path
     inset) 0.9s expo.inOut [rol "big" de tokens].
   · Navegación interna: intercepta <a> relativos, baja la cortina 0.6s,
     navega; sessionStorage acorta la próxima apertura (sin gag).
   · reduced-motion: overlay fuera y sin intercepción (navegación nativa). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('transition', {
    selector: '[data-transition]',
    init: function (el) {
      var gag = el.querySelector('.lab-transition__gag');
      if (gag && !gag.textContent.trim() && LAB.tokens && LAB.tokens.voice) {
        gag.textContent = LAB.tokens.voice.gagLoader || '';
      }

      if (LAB.caps.reduced) { el.style.display = 'none'; return; }

      var fast = sessionStorage.getItem('lab-nav') === '1';
      sessionStorage.removeItem('lab-nav');

      /* ── el gag ES arte [item 32 + re-armado S28]: el MONOGRAMA de la
         marca se firma en la cortina (con la silueta como fallback) ────── */
      var arte = null;
      var shapes = (LAB.tokens && LAB.tokens.shapes) || {};
      var dArte = shapes.monograma || shapes.organica;
      if (dArte && !fast) {
        arte = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arte.setAttribute('viewBox', '0 0 400 300');
        arte.setAttribute('class', 'lab-transition__arte' +
                          (shapes.monograma ? ' is-mono' : ''));
        arte.setAttribute('aria-hidden', 'true');
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', dArte);
        arte.appendChild(p);
        el.insertBefore(arte, gag || null);
        var L = 0;
        try { L = p.getTotalLength(); } catch (e) { /* sin layout aún */ }
        if (L > 0) { p.style.strokeDasharray = L; p.style.strokeDashoffset = L; }
      }

      /* ── DOS ACTOS [item 44]: cortina ink + franja accent que la persigue */
      var acto1 = document.createElement('div');
      acto1.className = 'lab-transition__acto is-1';
      var acto2 = document.createElement('div');
      acto2.className = 'lab-transition__acto is-2';
      el.appendChild(acto2);
      el.appendChild(acto1);

      /* ── PRELOADER REAL [item 72, bloque 8]: el monograma se dibuja con
         el PROGRESO DE CARGA (fonts 25% + imágenes eager 75%), no con un
         tween de tiempo fijo. Mínimo 750ms (sin parpadeo en caché),
         techo de seguridad 6s. fast (navegación interna): sin fase. ────── */
      var pct = null;
      if (arte && !fast) {
        pct = document.createElement('span');
        pct.className = 'lab-transition__pct t-eyebrow';
        pct.textContent = '0%';
        el.insertBefore(pct, acto2);
      }

      function abrirTl() {
        /* OVERLAP [item 38]: el gag sale MIENTRAS la cortina arranca y el
           arte se funde EN el arranque, no antes */
        var tl = gsap.timeline();
        var tCort = fast ? 0 : (arte ? 0.55 : 0.5);
        if (arte && !fast) {
          tl.to(arte, { scale: 1.05, duration: 0.3, ease: 'power1.inOut', yoyo: true, repeat: 1,
                        transformOrigin: '50% 50%' }, 0)
            .to([arte, pct], { autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, tCort);
        }
        if (gag && !fast) {
          tl.to(gag, { autoAlpha: 0, y: '-0.5em', duration: 0.3, ease: 'power2.in' }, tCort - 0.1);
        }
        tl.call(function () {
          LAB.opened = true;
          document.dispatchEvent(new CustomEvent('lab:open'));
        }, [], tCort);
        tl.to(acto1, { yPercent: -100, duration: fast ? 0.7 : 0.9, ease: 'expo.inOut' }, tCort)
          .to(acto2, { yPercent: -100, duration: fast ? 0.7 : 0.9, ease: 'expo.inOut' },
              tCort + (fast ? 0.06 : 0.12))
          .set(el, { display: 'none' });
      }

      if (arte && !fast) {
        var path = arte.firstChild;
        var L2 = parseFloat(path.style.strokeDasharray) || 0;
        if (gag) gsap.to(gag, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.3 });

        var t0 = Date.now();
        var eager = [].filter.call(document.images, function (i) {
          return i.getAttribute('loading') !== 'lazy';
        });
        var hechas = 0, fontsOK = false, abierto = false, seguridad;
        function cargada() { hechas++; update(); }
        eager.forEach(function (i) {
          if (i.complete) hechas++;
          else {
            i.addEventListener('load', cargada, { once: true });
            i.addEventListener('error', cargada, { once: true });
          }
        });
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () { fontsOK = true; update(); });
        } else { fontsOK = true; }

        function update() {
          if (abierto) return;
          var p = (fontsOK ? 0.25 : 0) +
                  0.75 * (eager.length ? hechas / eager.length : 1);
          if (pct) pct.textContent = Math.round(p * 100) + '%';
          if (L2 > 0) gsap.to(path, { strokeDashoffset: L2 * (1 - p),
            duration: 0.45, ease: 'power1.out', overwrite: true });
          if (p >= 0.999) {
            clearTimeout(seguridad);
            abierto = true;
            setTimeout(abrirTl, Math.max(120, 750 - (Date.now() - t0)));
          }
        }
        seguridad = setTimeout(function () {
          fontsOK = true; hechas = eager.length; update();
        }, 6000);
        update();
      } else {
        abrirTl();
      }

      /* ── cierre e intercepción de navegación interna ────────────────── */
      function onClick(e) {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || /^[a-z]+:/i.test(href)) return; /* solo relativos */
        e.preventDefault();
        sessionStorage.setItem('lab-nav', '1');
        gsap.set(el, { display: 'grid' });
        gsap.set([acto1, acto2], { yPercent: 100 });
        if (gag) gsap.set(gag, { autoAlpha: 0 });
        if (arte) gsap.set(arte, { autoAlpha: 0 });
        /* al cerrar, el accent entra PRIMERO y la tinta lo cubre (espejo) */
        gsap.to(acto2, { yPercent: 0, duration: 0.55, ease: 'expo.inOut' });
        gsap.to(acto1, {
          yPercent: 0, duration: 0.55, ease: 'expo.inOut', delay: 0.08,
          onComplete: function () { location.href = href; }
        });
      }
      document.addEventListener('click', onClick);

      return { cleanup: function () { document.removeEventListener('click', onClick); } };
    }
  });
})();
