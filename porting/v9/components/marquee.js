/* LAB · components/marquee.js — cinta infinita reactiva al scroll
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (ficha H02 · motion-spec §8):
   <div data-marquee [data-marquee-speed="80"] [data-marquee-direction="1"]
        [data-marquee-reactive]>
     <div> …contenido de una tanda (texto, logos)… </div>   ← ÚNICO hijo: el track
   </div>
   · data-marquee-speed      px/segundo base (default 80)
   · data-marquee-direction  1 = avanza hacia la izquierda · -1 = hacia la derecha
   · data-marquee-reactive   presente → la cinta acelera con |velocity| del bus
                             e INVIERTE su sentido con la dirección del scroll
                             [MEDIDO en referente: timeScale × velocity, signo]
   Mecánica: clona el track hasta cubrir 2× el contenedor y avanza un offset
   con el ticker ÚNICO (sin tween): x se envuelve módulo ancho-de-track →
   loop sin costura. Clones con aria-hidden (reglas.md: a11y de serie).
   reduced-motion → cinta estática (motion-spec §13). Rebuild en resize (200ms). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('marquee', {
    selector: '[data-marquee]',
    init: function (el) {
      var track = el.firstElementChild;
      if (!track) { console.warn('[LAB marquee] sin track hijo', el); return; }

      var speed    = parseFloat(el.getAttribute('data-marquee-speed')) || 80;
      var baseDir  = parseInt(el.getAttribute('data-marquee-direction'), 10) || 1;
      var reactive = el.hasAttribute('data-marquee-reactive');

      el.classList.add('lab-marquee');

      var mover = document.createElement('div');
      mover.className = 'lab-marquee__mover';
      track.classList.add('lab-marquee__track');
      el.insertBefore(mover, track);
      mover.appendChild(track);

      /* cinta estática y accesible si reduced */
      if (LAB.caps.reduced) return;

      var w = 0;
      function build() {
        for (var i = mover.children.length - 1; i > 0; i--) mover.removeChild(mover.children[i]);
        w = Math.max(track.offsetWidth, 1);
        var copies = Math.max(2, Math.ceil((el.offsetWidth * 2) / w));
        for (var j = 0; j < copies; j++) {
          var c = track.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          mover.appendChild(c);
        }
      }
      build();

      var x = 0;            /* offset acumulado en px */
      var ts = baseDir;     /* timeScale suavizado */
      var stretch = 1;      /* scaleX por velocidad [item 49] */
      var off = LAB.onTick(function (t, dMs) {
        var v = LAB.scroll ? LAB.scroll.velocity() : 0;
        var dirScroll = (reactive && LAB.scroll) ? LAB.scroll.direction() : 1;
        var target = baseDir * dirScroll * (1 + Math.abs(v) / 150);
        /* vida bajo el cursor: la X de la mano acelera/frena sutilmente */
        if (el.hasAttribute('data-marquee-mouse') && LAB.mouse && LAB.mouse.enabled) {
          target *= (1 + LAB.mouse.raw.nx * 0.18);
        }
        target = Math.max(-3, Math.min(3, target));          /* clamp ±3 [motion-spec §8] */
        ts += (target - ts) * 0.1;                           /* lerp de la casa */
        x += speed * ts * (dMs / 1000);
        var wrapped = ((x % w) + w) % w;
        /* estiramiento por velocidad [item 49, bloque 4]: la cinta se
           tensa con el scroll y asienta sola (lerp) — máx 6% */
        /* máx 1.5%: sobre displays de miles de px, un 6% corría los glifos
           ±150px por golpe de rueda — mareo, no vida [auditoría S26] */
        var sTarget = 1 + Math.min(Math.abs(LAB.scroll ? LAB.scroll.velocity() : 0) * 0.0012, 0.015);
        stretch += (sTarget - stretch) * 0.1;
        mover.style.transform = 'translate3d(' + (-wrapped) + 'px,0,0) scaleX(' + stretch.toFixed(4) + ')';
      });

      var rT;
      function onResize() { clearTimeout(rT); rT = setTimeout(build, 200); }
      addEventListener('resize', onResize);

      return { cleanup: function () { off(); removeEventListener('resize', onResize); } };
    }
  });
})();
