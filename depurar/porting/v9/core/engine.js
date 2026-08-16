/* LAB · core/engine.js — el motor: UN ticker, gates de capacidad, escáner data-*
   ─────────────────────────────────────────────────────────────────────────
   Contrato (reglas.md):
   · UN solo ticker rAF (gsap.ticker). Nadie más llama requestAnimationFrame.
     Los componentes se suscriben con LAB.onTick(fn) → fn(timeSec, deltaMs).
   · Componentes por atributo: LAB.register(nombre, { selector, init(el, LAB) }).
     El motor los monta en boot() y en scan(root) para DOM nuevo. init puede
     devolver { cleanup() } — se guarda en el elemento para re-instanciar.
   · Gates: LAB.caps = { reduced, touch, tierHigh } — tierHigh replica el gate
     del referente [MEDIDO]: (hover: none), (pointer: coarse) ⇒ tier base.
   · Boot espera document.fonts.ready antes de escanear (gotcha #13: los splits
     con la fuente sin cargar miden líneas falsas).
   Requiere: vendor/gsap.min.js cargado antes. */
window.LAB = (function () {
  'use strict';

  if (!window.gsap) {
    console.error('[LAB] gsap no encontrado — carga vendor/gsap.min.js antes de core/engine.js');
    return { error: 'no-gsap' };
  }

  /* ── capacidades ─────────────────────────────────────────────────────── */
  var mmReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mmTouch   = window.matchMedia('(hover: none), (pointer: coarse)');
  var caps = {
    reduced: mmReduced.matches,
    touch: mmTouch.matches,
    tierHigh: !mmTouch.matches && !mmReduced.matches
  };

  /* ── ticker único ────────────────────────────────────────────────────── */
  var tickFns = [];
  function onTick(fn) {
    tickFns.push(fn);
    return function off() {
      var i = tickFns.indexOf(fn);
      if (i > -1) tickFns.splice(i, 1);
    };
  }
  gsap.ticker.add(function (time, deltaMS) {
    for (var i = 0; i < tickFns.length; i++) tickFns[i](time, deltaMS);
  });

  /* ── registro y escáner de componentes ───────────────────────────────── */
  var registry = [];
  var booted = false;

  function mount(entry, el) {
    el.__lab = el.__lab || {};
    if (el.__lab[entry.name]) return;               /* ya montado */
    /* BLINDAJE [S42]: un init que lanza NO mata el scan — error visible */
    try {
      var instance = entry.def.init(el, api);
      el.__lab[entry.name] = instance || true;
    } catch (err) {
      el.__lab[entry.name] = 'error';
      console.error('[LAB] init de "' + entry.name + '" lanzo:', err);
      try {
        var ev = new ErrorEvent('error', { message: 'init ' + entry.name + ': ' +
          (err && err.message ? err.message : err), filename: 'engine.js', lineno: 0 });
        window.dispatchEvent(ev);
      } catch (e2) {}
    }
  }

  function scan(root, only) {
    var scope = root || document;
    registry.forEach(function (entry) {
      if (only && entry.name !== only) return;
      var nodes = scope.querySelectorAll(entry.def.selector);
      for (var i = 0; i < nodes.length; i++) mount(entry, nodes[i]);
    });
  }

  function register(name, def) {
    if (!def || !def.selector || typeof def.init !== 'function') {
      console.warn('[LAB] register("' + name + '") inválido: falta selector o init()');
      return;
    }
    registry.push({ name: name, def: def });
    if (booted) scan(document, name);               /* registro tardío permitido */
  }

  /* ── boot ────────────────────────────────────────────────────────────── */
  function boot() {
    var html = document.documentElement;
    html.classList.remove('no-js');
    html.classList.add('js');
    html.setAttribute('data-tier', caps.tierHigh ? 'high' : 'base');
    if (caps.reduced) html.setAttribute('data-reduced', 'true');

    var fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready : Promise.resolve();

    fontsReady.then(function () {
      booted = true;
      scan(document);
      html.classList.add('lab-ready');
      document.dispatchEvent(new CustomEvent('lab:ready'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ── API pública ─────────────────────────────────────────────────────── */
  var api = {
    version: '0.1.0',
    caps: caps,
    tokens: window.LAB_TOKENS || null,
    register: register,
    scan: scan,
    onTick: onTick
  };
  return api;
})();
