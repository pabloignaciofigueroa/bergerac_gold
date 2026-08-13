/* LAB · components/cursor.js — cursor propio con estados
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO: <div data-lab-cursor></div> una vez por página (el componente
   construye punto + halo + label). Los targets declaran su etiqueta con
   data-cursor="ver" | "drag" | "abrir"…; cualquier <a>/<button> sin
   etiqueta simplemente agranda el halo. mix-blend-mode: difference —
   se invierte sobre cualquier tema [patrón del referente].
   El punto persigue rápido (lerp 0.35), el halo lento (lerp 0.12) — la
   distancia entre ambos ES la sensación de vida. Solo puntero fino;
   el cursor nativo se oculta vía CSS en tier high. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('lab-cursor', {
    selector: '[data-lab-cursor]',
    init: function (root) {
      if (!LAB.mouse || !LAB.mouse.enabled) { root.style.display = 'none'; return; }

      root.classList.add('lab-cursor');
      root.setAttribute('aria-hidden', 'true');
      var dot = document.createElement('div'); dot.className = 'lab-cursor__dot';
      var halo = document.createElement('div'); halo.className = 'lab-cursor__halo';
      var label = document.createElement('span'); label.className = 'lab-cursor__label';
      halo.appendChild(label);
      root.appendChild(halo); root.appendChild(dot);

      var tDot = LAB.mouse.tracker(0.35);
      var tHalo = LAB.mouse.tracker(0.12);
      var scale = 1, targetScale = 1;
      var vozDrag = (LAB.tokens && LAB.tokens.voice && LAB.tokens.voice.dragLabel) || 'arrastra';
      var enLock = false;

      var off = LAB.onTick(function () {
        /* estado "arrastra" mientras el objeto GL está en lock [fix S20-b] */
        var gl = document.documentElement.classList.contains('gl-locked');
        if (gl !== enLock) {
          enLock = gl;
          label.textContent = gl ? vozDrag : '';
          targetScale = gl ? 2.4 : 1;
          root.classList.toggle('is-active', gl);
        }
        scale += (targetScale - scale) * 0.2;
        dot.style.transform = 'translate3d(' + tDot.x + 'px,' + tDot.y + 'px,0) translate(-50%,-50%)';
        halo.style.transform = 'translate3d(' + tHalo.x + 'px,' + tHalo.y + 'px,0) translate(-50%,-50%) scale(' + scale.toFixed(3) + ')';
      });

      function over(e) {
        if (enLock) return;
        var t = e.target.closest ? e.target.closest('[data-cursor], a, button, input') : null;
        if (!t) { targetScale = 1; label.textContent = ''; root.classList.remove('is-active'); return; }
        var txt = t.getAttribute && t.getAttribute('data-cursor');
        label.textContent = txt || '';
        targetScale = txt ? 2.6 : 1.8;
        root.classList.add('is-active');
      }
      document.addEventListener('mouseover', over);
      document.addEventListener('mouseout', over);

      return {
        cleanup: function () {
          off();
          document.removeEventListener('mouseover', over);
          document.removeEventListener('mouseout', over);
        }
      };
    }
  });
})();
