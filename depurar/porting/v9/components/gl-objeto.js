/* LAB · components/gl-objeto.js — el objeto 3D vivo de la marca
   ─────────────────────────────────────────────────────────────────────────
   CONTRATO:
   <div class="hero-obj" data-gl-objeto [data-gl-lock="#idBoton"]>
     <canvas></canvas>
   </div>
   · Motor WebGL2 propio, autocontenido (OGL es ESM-only → muere en file://,
     gotcha #1). Esfera UV desplazada por ruido 3D en el vertex shader:
     la "silueta de marca hecha carne". Sin assets: la luz de estudio se
     calcula en el fragment y el color es DUOTONO POR TOKENS (ink→accent
     por luminancia + rim), como el sistema fotográfico.
   · Parámetros por marca en tokens.object3d { amp, speed, facet, spin } —
     facet=1 usa normales por derivadas (flat shading): pieza tallada.
   · Vida: sigue al cursor con lerp 0.05 [MEDIDO] + giro idle.
   · TAP TO LOCK [ficha H01]: el botón data-gl-lock para Lenis, la mano rota
     el objeto (drag con inercia); ESC o click liberan. aria-pressed.
   · Fallback: sin WebGL2 / tier base / reduced → no-op y la foto del hero
     (markup hermano .hero-photo) permanece. Si GL arranca, el contenedor
     del hero recibe .gl-on y la foto se oculta por CSS.
   · Perf: DPR ≤ 1.5, pausa fuera de viewport (IntersectionObserver). */
(function () {
  'use strict';
  if (!window.LAB || LAB.error) return;

  var VERT = [
    '#version 300 es',
    'precision highp float;',
    'in vec3 aPos;',
    'uniform float uTime; uniform float uAmp; uniform float uSpeed;',
    'uniform mat3 uRot; uniform float uAspect;',
    'uniform vec2 uPos; uniform float uScale;', /* viaje [item 24] */
    'out vec3 vPos; out vec3 vNormal;',
    /* value-noise 3D trilineal + 2 octavas (suficiente para el blob) */
    'float hash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0;',
    '  return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }',
    'float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x);',
    '  f=f*f*(3.0-2.0*f);',
    '  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),',
    '                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),',
    '             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),',
    '                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }',
    'void main(){',
    '  vec3 n = normalize(aPos);',
    '  float t = uTime * uSpeed;',
    '  float d = noise(n*2.1 + t) * 0.7 + noise(n*4.3 - t*0.6) * 0.3;',
    '  vec3 p = n * (1.0 + (d - 0.5) * 2.0 * uAmp);',
    '  p = uRot * p;',
    '  vPos = p; vNormal = uRot * n;',
    /* encuadre DINÁMICO: el radio máximo es (1+amp) — con el factor fijo
       anterior (0.78) los picos del blob DEMO excedían el canvas y se
       recortaban en el borde [QA S22, captura real] */
    '  float fit = 0.9 / (1.0 + uAmp);',
    '  gl_Position = vec4(p.x / uAspect * fit * uScale + uPos.x, p.y * fit * uScale + uPos.y, -p.z * 0.5, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'in vec3 vPos; in vec3 vNormal;',
    'uniform vec3 uColA; uniform vec3 uColB; uniform float uFacet;',
    'out vec4 outColor;',
    'void main(){',
    '  vec3 N = uFacet > 0.5',
    '    ? normalize(cross(dFdx(vPos), dFdy(vPos)))',
    '    : normalize(vNormal);',
    '  vec3 V = vec3(0.0, 0.0, 1.0);',
    /* luz de estudio: key envolvente + spec + rim — sin texturas */
    '  vec3 L1 = normalize(vec3(-0.5, 0.7, 0.6));',
    '  vec3 L2 = normalize(vec3(0.7, -0.3, 0.5));',
    '  float lum = 0.32 + 0.5 * max(dot(N, L1), 0.0)',
    '            + 0.45 * pow(max(dot(reflect(-L2, N), V), 0.0), 18.0);',
    '  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);',
    '  lum = clamp(lum + rim * 0.35, 0.0, 1.0);',
    '  vec3 col = mix(uColB, uColA, lum);',
    '  outColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function hexToRgb(hex) {
    hex = (hex || '#ffffff').trim().replace('#', '');
    if (hex.length === 3) hex = hex.replace(/./g, function (c) { return c + c; });
    var n = parseInt(hex.slice(0, 6), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  /* esfera UV (posiciones + índices) */
  function sphere(lat, lon) {
    var pos = [], idx = [];
    for (var y = 0; y <= lat; y++) {
      var th = y / lat * Math.PI;
      for (var x = 0; x <= lon; x++) {
        var ph = x / lon * Math.PI * 2;
        pos.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
      }
    }
    for (var j = 0; j < lat; j++) for (var i = 0; i < lon; i++) {
      var a = j * (lon + 1) + i, b = a + lon + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
  }

  LAB.register('gl-objeto', {
    selector: '[data-gl-objeto]',
    init: function (wrap) {
      if (!LAB.caps.tierHigh) return;                       /* foto de fallback */
      var canvas = wrap.querySelector('canvas');
      if (!canvas) return;
      var gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
      if (!gl) return;                                       /* fallback silencioso */

      /* ── programa ── */
      function compile(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.warn('[LAB gl] shader:', gl.getShaderInfoLog(s)); return null;
        }
        return s;
      }
      var vs = compile(gl.VERTEX_SHADER, VERT);
      var fs = compile(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return;
      var prg = gl.createProgram();
      gl.attachShader(prg, vs); gl.attachShader(prg, fs); gl.linkProgram(prg);
      if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) return;
      gl.useProgram(prg);

      /* ── geometría ── */
      var geo = sphere(56, 84);
      var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      var vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, geo.pos, gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prg, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
      var ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);
      gl.enable(gl.DEPTH_TEST);

      /* ── uniforms desde TOKENS (duotono + carácter 3D por marca) ── */
      var T = LAB.tokens || {};
      var o3 = T.object3d || { amp: 0.3, speed: 0.25, facet: 0, spin: 0.1 };
      var U = {};
      ['uTime', 'uAmp', 'uSpeed', 'uRot', 'uAspect', 'uColA', 'uColB', 'uFacet', 'uPos', 'uScale']
        .forEach(function (n) { U[n] = gl.getUniformLocation(prg, n); });
      gl.uniform1f(U.uAmp, o3.amp);
      gl.uniform1f(U.uSpeed, o3.speed);
      gl.uniform1f(U.uFacet, o3.facet);
      gl.uniform1f(U.uScale, 1);   /* sin set inicial valdría 0 = invisible */
      gl.uniform2f(U.uPos, 0, 0);
      gl.uniform3fv(U.uColA, hexToRgb(T.color && T.color['accent']));
      gl.uniform3fv(U.uColB, hexToRgb(T.color && T.color['ink']));

      /* ── tamaño / DPR ── */
      function resize() {
        var r = wrap.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.max(2, Math.round(r.width * dpr));
        canvas.height = Math.max(2, Math.round(r.height * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform1f(U.uAspect, canvas.width / canvas.height);
      }
      resize();
      var rT; function onResize() { clearTimeout(rT); rT = setTimeout(resize, 200); }
      addEventListener('resize', onResize);

      /* ── vida: cursor-follow + idle + LOCK con drag e inercia ── */
      var track = LAB.mouse && LAB.mouse.enabled ? LAB.mouse.tracker(0.05) : null;
      var rx = 0, ry = 0;            /* rotación actual */
      var vx = 0, vy = 0;            /* velocidad de drag (lock) */
      var locked = false, dragging = false, lx = 0, lyy = 0;
      var visible = true;

      var lockBtn = null;
      var sel = wrap.getAttribute('data-gl-lock');
      if (sel) lockBtn = document.querySelector(sel);

      function setLocked(v) {
        locked = v;
        /* en lock el objeto viene al CENTRO grande; al soltar, vuelve a su
           parada del viaje [item 24] */
        if (v) {
          lastWay = { x: wayT.x, y: wayT.y, s: wayT.s };
          wayT.x = 0; wayT.y = 0; wayT.s = ways.length ? 0.72 : 1;
        } else if (lastWay) {
          wayT.x = lastWay.x; wayT.y = lastWay.y; wayT.s = lastWay.s;
        }
        document.documentElement.classList.toggle('gl-locked', v);
        if (lockBtn) {
          lockBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
          var on = lockBtn.getAttribute('data-label-on') || 'volver al scroll';
          var off = lockBtn.getAttribute('data-label-off') || 'jugar con la forma';
          lockBtn.textContent = v ? on : off;
        }
        if (LAB.scroll) { if (v) LAB.scroll.stop(); else LAB.scroll.start(); }
      }
      if (lockBtn) {
        lockBtn.addEventListener('click', function (e) { e.preventDefault(); setLocked(!locked); });
        setLocked(false);
      }
      /* teclas de scroll bloqueadas durante el lock (Lenis solo frena rueda
         y touch — el teclado nativo seguiría scrolleando) [fix S20-a] */
      var SCROLL_KEYS = [' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
      addEventListener('keydown', function (e) {
        if (!locked) return;
        if (e.key === 'Escape') { setLocked(false); return; }
        if (SCROLL_KEYS.indexOf(e.key) !== -1) e.preventDefault();
      });

      canvas.addEventListener('pointerdown', function (e) {
        if (!locked) return;
        dragging = true; lx = e.clientX; lyy = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        vy = (e.clientX - lx) * 0.006;
        vx = (e.clientY - lyy) * 0.006;
        lx = e.clientX; lyy = e.clientY;
      });
      canvas.addEventListener('pointerup', function () { dragging = false; });

      var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; });
      io.observe(wrap);

      /* rotación como matriz (columnas) para el shader */
      var m = new Float32Array(9);
      function rotMat(ax, ay) {
        var cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
        m[0] = cy;      m[1] = 0;   m[2] = -sy;
        m[3] = sx * sy; m[4] = cx;  m[5] = sx * cy;
        m[6] = cx * sy; m[7] = -sx; m[8] = cx * cy;
        return m;
      }

      wrap.closest('section') && wrap.closest('section').classList.add('gl-on');

      /* entrada del objeto [item 46]: asienta con la ease de casa cuando la
         cortina despeja (lab:open); sin loader en la página, entra ya */
      var entro = false;
      function entrada() {
        if (entro) return;
        entro = true;
        var ease = gsap.parseEase && gsap.parseEase('lab-settle') ? 'lab-settle' : 'power2.out';
        gsap.from(canvas, { autoAlpha: 0, scale: 0.94, duration: 1.2, ease: ease, delay: 0.15 });
      }
      if (LAB.opened || !document.querySelector('[data-transition]')) entrada();
      else {
        document.addEventListener('lab:open', entrada, { once: true });
        setTimeout(entrada, 4000); /* red de seguridad: si el loader no emite, el objeto entra igual */
      }

      /* ── EL OBJETO VIAJERO [item 24 — el momento top del referente] ────
         Las secciones declaran su parada: data-gl-way="x,y,escala" (clip
         space, y+ hacia abajo). El canvas pasa a FIXED full-viewport y el
         objeto LERPEA entre paradas al scrollear — el lerp ES el viaje.
         Con escala 0 la sección "apaga" el objeto (y se salta el draw). */
      var ways = document.querySelectorAll('[data-gl-way]');
      /* K compensa el salto de lienzo: de 28rem a viewport completo —
         escala 1 de parada ≈ el tamaño original del hero */
      var K = ways.length ? 0.52 : 1;
      var viaje = { x: 0, y: 0, s: K };
      var wayT = { x: 0, y: 0, s: K };
      var lastWay = null;

      /* ── F12 · EL VIAJERO MULTICOLOR: uColA persigue el dominador ──────
         Cada parada tiñe el objeto con el color de su sección (data-brand;
         sin atributo = azul de marca). En ORIGEN (#monumento) no hay UN
         dominador — son LOS 4: el objeto respira por la familia completa
         en un ciclo lento. Mismo lerp 0.055 del viaje: la física de la
         casa, un solo carácter. */
      var COLV = (function () {
        var c = T.color || {};
        return {
          azul: hexToRgb(c.azul || c.accent),
          morado: hexToRgb(c.morado || c.accent),
          fucsia: hexToRgb(c.fucsia || c.accent),
          amarillo: hexToRgb(c.amarillo || c.accent),
          accent: hexToRgb(c.accent)
        };
      })();
      var CICLO = ['azul', 'morado', 'fucsia', 'amarillo'];
      var colV = COLV.accent.slice();
      var colT = COLV.accent;
      var colCiclo = false;
      function colorDeParada(sec) {
        return COLV[sec.getAttribute('data-brand')] || COLV.accent;
      }
      if (ways.length && window.ScrollTrigger) {
        wrap.classList.add('gl-fixed');
        /* CRÍTICO: re-medir YA — el buffer se creó con el wrap pequeño del
           hero y estirado a viewport PIXELA (captura real de Pablo, S31) */
        resize();
        /* parada inicial DETERMINISTA (se entra por arriba; los triggers
           toman el mando al primer scroll — gotcha #37: no fiarse del
           toggle inicial) */
        var p0 = (ways[0].getAttribute('data-gl-way') || '').split(',').map(parseFloat);
        wayT.x = p0[0] || 0; wayT.y = -(p0[1] || 0);
        wayT.s = (isNaN(p0[2]) ? 1 : p0[2]) * K;
        viaje.x = wayT.x; viaje.y = wayT.y; viaje.s = wayT.s;
        colT = colorDeParada(ways[0]);
        colCiclo = ways[0].id === 'monumento';
        colV = colT.slice();
        [].forEach.call(ways, function (sec) {
          var p = (sec.getAttribute('data-gl-way') || '').split(',').map(parseFloat);
          ScrollTrigger.create({
            trigger: sec, start: 'top 55%', end: 'bottom 55%',
            onToggle: function (st) {
              if (st.isActive && !locked) {
                wayT.x = p[0] || 0;
                wayT.y = -(p[1] || 0);
                wayT.s = (isNaN(p[2]) ? 1 : p[2]) * K;
                colCiclo = sec.id === 'monumento';
                if (!colCiclo) colT = colorDeParada(sec);
              }
            }
          });
        });
      }

      var off = LAB.onTick(function (time) {
        if (!visible) return;
        if (locked) {
          ry += vy; rx += vx;
          vy *= 0.94; vx *= 0.94;                 /* inercia */
        } else {
          var tRy = time * o3.spin + (track ? track.nx * 0.55 : 0);
          var tRx = (track ? track.ny * 0.35 : 0) + Math.sin(time * 0.2) * 0.06;
          ry += (tRy - ry) * 0.06;
          rx += (tRx - rx) * 0.06;
        }
        /* el viaje: persecución suave de la parada activa */
        viaje.x += (wayT.x - viaje.x) * 0.055;
        viaje.y += (wayT.y - viaje.y) * 0.055;
        viaje.s += (wayT.s - viaje.s) * 0.055;
        /* el color del viaje [F12]: en ORIGEN respira por los 4 (ciclo
           lento ~12s); en el resto persigue el dominador de la parada */
        if (colCiclo) {
          var ct = time * 0.33;
          var ci = Math.floor(ct) % 4;
          var cf = ct - Math.floor(ct);
          cf = cf * cf * (3 - 2 * cf);
          var cA = COLV[CICLO[ci]], cB = COLV[CICLO[(ci + 1) % 4]];
          colT = [cA[0] + (cB[0] - cA[0]) * cf,
                  cA[1] + (cB[1] - cA[1]) * cf,
                  cA[2] + (cB[2] - cA[2]) * cf];
        }
        colV[0] += (colT[0] - colV[0]) * 0.055;
        colV[1] += (colT[1] - colV[1]) * 0.055;
        colV[2] += (colT[2] - colV[2]) * 0.055;
        gl.uniform3fv(U.uColA, colV);
        /* wrap: float32 pierde precisión con horas de sesión; el salto del
           noise cada 2h es imperceptible [fix S20-c] */
        gl.uniform1f(U.uTime, time % 7200);
        gl.uniformMatrix3fv(U.uRot, false, rotMat(rx, ry));
        gl.uniform2f(U.uPos, viaje.x, viaje.y);
        gl.uniform1f(U.uScale, viaje.s);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (viaje.s < 0.015) return;              /* apagado: sin draw */
        gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0);
      });

      return {
        cleanup: function () {
          off(); io.disconnect(); removeEventListener('resize', onResize);
        }
      };
    }
  });
})();
