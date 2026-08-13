/* LAB · components/nav-theme.js — nav camaleónico
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (mecánica del referente decodificada [MEDIDO] · motion-spec §6):
   <header data-nav>…</header>                     ← el nav (uno por página)
   <section data-nav-theme-target="dark">…         ← cada sección declara el tema
                                                      que el nav debe adoptar
                                                      cuando ella pasa por debajo
   Mecánica: un ScrollTrigger por sección {start: 'top top', end: 'bottom top'};
   onEnter/onEnterBack aplican el tema al atributo data-nav-theme del nav.
   · Lock de 200ms entre conmutaciones [MEDIDO] — evita parpadeo en secciones
     cortas; al expirar aplica el último tema pendiente.
   · Fallback "light" [MEDIDO] + pasada inicial manual (la sección bajo el nav
     al cargar gana, sin esperar al primer scroll).
   El CSS pinta el nav por [data-nav-theme="…"] con --animation-default. */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  LAB.register('nav-theme', {
    selector: '[data-nav]',
    init: function (nav) {
      var current = null;
      var locked = false, pending = null, lockT = null;

      function apply(theme) {
        if (theme === current) return;
        if (locked) { pending = theme; return; }
        current = theme;
        nav.setAttribute('data-nav-theme', theme);
        locked = true;
        lockT = setTimeout(function () {
          locked = false;
          if (pending && pending !== current) {
            var p = pending; pending = null; apply(p);
          } else { pending = null; }
        }, 200);
      }

      var targets = Array.prototype.slice.call(
        document.querySelectorAll('[data-nav-theme-target]')
      );

      /* pasada inicial: la sección que ya está bajo el nav decide */
      var initial = 'light';
      targets.forEach(function (sec) {
        var r = sec.getBoundingClientRect();
        if (r.top <= 1 && r.bottom > 1) {
          initial = sec.getAttribute('data-nav-theme-target') || 'light';
        }
      });
      apply(initial);

      var triggers = targets.map(function (sec) {
        var theme = sec.getAttribute('data-nav-theme-target') || 'light';
        return ScrollTrigger.create({
          trigger: sec,
          start: 'top top',
          end: 'bottom top',
          onEnter: function () { apply(theme); },
          onEnterBack: function () { apply(theme); }
        });
      });

      return {
        cleanup: function () {
          clearTimeout(lockT);
          triggers.forEach(function (t) { t.kill(); });
        }
      };
    }
  });
})();
