/* LAB · components/countdown.js — cuenta regresiva con dígitos que ruedan
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO (ficha C01 · referente [MEDIDO]: setInterval 1s sobre fecha objetivo,
   con limpieza de intervalos; el roll de dígitos reutiliza el patrón del roll
   de texto — par apilado que sube):
   <div data-countdown data-countdown-date="2026-12-31T18:00:00"
        [data-countdown-done="en vivo"]></div>          ← contenedor VACÍO:
   el componente construye D/H/M/S. Al llegar a cero muestra el estado done
   (attr, o voice.liveLabel de tokens como fallback).
   Roll por cambio de valor: 0.3s power2.out (rol "micro" de tokens).
   reduced-motion: el valor cambia sin animación.
   A11y: dígitos aria-hidden + lectura sr-only actualizada por minuto
   (evita spam de lectores de pantalla; reglas.md). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  var UNITS = ['d', 'h', 'm', 's'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  LAB.register('countdown', {
    selector: '[data-countdown]',
    init: function (el) {
      var iso = el.getAttribute('data-countdown-date');
      var target = iso ? new Date(iso).getTime() : NaN;
      if (isNaN(target)) { console.warn('[LAB countdown] fecha inválida:', iso); return; }

      var voice = (LAB.tokens && LAB.tokens.voice) || {};
      var doneLabel = el.getAttribute('data-countdown-done') || voice.liveLabel || 'en vivo';

      el.classList.add('lab-countdown');
      el.setAttribute('role', 'timer');

      var cells = {};
      UNITS.forEach(function (k) {
        var cell = document.createElement('div');
        cell.className = 'lab-countdown__cell';
        var digits = document.createElement('div');
        digits.className = 'lab-countdown__digits';
        digits.setAttribute('aria-hidden', 'true');
        var curr = document.createElement('span'); curr.className = 'is-curr';
        var next = document.createElement('span'); next.className = 'is-next';
        digits.appendChild(curr); digits.appendChild(next);
        var label = document.createElement('span');
        label.className = 'lab-countdown__label t-eyebrow';
        label.textContent = k;
        cell.appendChild(digits); cell.appendChild(label);
        el.appendChild(cell);
        cells[k] = { curr: curr, next: next, val: null };
      });
      var sr = document.createElement('span'); sr.className = 'sr-only';
      el.appendChild(sr);

      function compute() {
        var diff = target - Date.now();
        if (diff <= 0) return null;
        return {
          d: pad(Math.floor(diff / 86400000)),
          h: pad(Math.floor(diff % 86400000 / 3600000)),
          m: pad(Math.floor(diff % 3600000 / 60000)),
          s: pad(Math.floor(diff % 60000 / 1000))
        };
      }

      function setCell(k, v, animate) {
        var c = cells[k];
        if (c.val === v) return;
        c.val = v;
        if (!animate || LAB.caps.reduced) { c.curr.textContent = v; return; }
        c.next.textContent = v;
        gsap.timeline({
          onComplete: function () {
            c.curr.textContent = v;
            gsap.set([c.curr, c.next], { yPercent: 0 });
            c.next.textContent = '';
          }
        }).to([c.curr, c.next], { yPercent: -100, duration: 0.3, ease: 'power2.out' });
      }

      function finish(iv) {
        if (iv) clearInterval(iv);
        el.innerHTML = '<span class="lab-countdown__done t-impact-sm">' + doneLabel + '</span>';
      }

      var first = compute();
      if (!first) { finish(); return; }
      UNITS.forEach(function (k) { setCell(k, first[k], false); });
      sr.textContent = first.d + ' días ' + first.h + ' horas ' + first.m + ' minutos';

      var iv = setInterval(function () {
        var v = compute();
        if (!v) { finish(iv); return; }
        UNITS.forEach(function (k) { setCell(k, v[k], true); });
        if (v.s === '00') sr.textContent = v.d + ' días ' + v.h + ' horas ' + v.m + ' minutos';
      }, 1000);

      return { cleanup: function () { clearInterval(iv); } };
    }
  });
})();
