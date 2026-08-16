/* ============================================================
   BERGERAC MERGE — TEXT-ROLL (roll de hover por caracteres, v9)
   Contrato v9: <a data-anim="text-hover" [data-text-hover-offset]>Label</a>
   Sin label duplicado: cada carácter lleva text-shadow una línea
   abajo; al hover los chars suben y la sombra ocupa su lugar dentro
   de la ventana de recorte. duration .6 · stagger .02 · power3.out.
   Hover-only: se omite en táctil y reduced. Si el roll vive en un
   span dentro de un botón/link, el hover escucha en el host entero.
   ============================================================ */

export function initTextRoll(ctx) {
  const { gsap, caps } = ctx;
  if (!caps || !caps.tierHigh || !gsap || !window.SplitText) return;

  const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    document.querySelectorAll("[data-anim='text-hover']").forEach((el) => {
      if (el.classList.contains('lab-roll')) return;
      el.classList.add('lab-roll');

      const split = new window.SplitText(el, { type: 'chars', charsClass: 'roll-char' });
      const chars = split.chars;
      if (!chars.length) return;

      const fixed = el.getAttribute('data-text-hover-offset');
      const h = chars[0].offsetHeight;
      const offset = fixed || (-h + 'px');

      /* ventana de recorte a una línea (aísla los chars de layouts flex) */
      const win = document.createElement('span');
      win.className = 'roll-window';
      while (el.firstChild) win.appendChild(el.firstChild);
      el.appendChild(win);
      win.style.height = h + 'px';

      chars.forEach((c) => {
        c.style.textShadow = '0 ' + (fixed ? fixed.replace('-', '') : h + 'px') + ' currentColor';
      });

      const to = (y) => gsap.to(chars, { y, duration: 0.6, stagger: 0.02, ease: 'power3.out', overwrite: true });
      const enter = () => to(offset);
      const leave = () => to(0);

      const host = el.closest('a, button') || el;
      host.addEventListener('mouseenter', enter);
      host.addEventListener('mouseleave', leave);
      host.addEventListener('focus', enter);
      host.addEventListener('blur', leave);
    });
  });
}
